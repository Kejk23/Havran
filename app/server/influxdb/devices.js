const {Point, flux, HttpError} = require('@influxdata/influxdb-client')
const influxdb = require('./influxdb')
const {
  deleteAuthorization,
  createIoTAuthorization,
} = require('./authorizations')
const {INFLUX_ORG, INFLUX_BUCKET_AUTH} = require('../env')

/**
 * @typedef {import("@influxdata/influxdb-client-apis").Authorization} Authorization
 */

/**
 * @typedef {object} DeviceRegistration
 * @prop {string} deviceId
 * @prop {string} key
 * @prop {string} createdAt
 * @prop {string} updatedAt
 * @prop {string} [token]
 */

/**
 * Gets devices or a particular device when deviceId is specified. Tokens
 * are not returned unless deviceId is specified. It can also return devices
 * with empty/unknown key, such devices can be ignored (InfluxDB authorization is not associated).
 * @param {string} [deviceId]
 * @returns {Promise<Record<string, DeviceRegistration>>} record key is deviceId.
 */
async function getDevices(deviceId) {
  const queryApi = influxdb.getQueryApi(INFLUX_ORG)
  const deviceFilter =
    deviceId !== undefined
      ? flux` and r.deviceId == "${deviceId}"`
      : flux` and r._field != "token"`
  const fluxQuery = flux`from(bucket:${INFLUX_BUCKET_AUTH}) 
    |> range(start: 0) 
    |> filter(fn: (r) => r._measurement == "deviceauth"${deviceFilter})
    |> last()`
  const devices = {}
  console.log('*** QUERY ***')
  return await new Promise((resolve, reject) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row)
        const deviceId = o.deviceId
        if (!deviceId) {
          return
        }
        const device = devices[deviceId] || (devices[deviceId] = {deviceId})
        device[o._field] = o._value
        if (!device.updatedAt || device.updatedAt < o._time) {
          device.updatedAt = o._time
        }
      },
      error: reject,
      complete() {
        resolve(devices)
      },
    })
  })
}

/**
 * Creates a new device with associated InfluxDB authorization.
 * @param {string} deviceId
 * @returns {Promise<DeviceRegistration>}.
 */
async function createDevice(deviceId) {
  console.log(`createDevice: deviceId=${deviceId}`)

  const writeApi = influxdb.getWriteApi(INFLUX_ORG, INFLUX_BUCKET_AUTH)
  const createdAt = new Date().toISOString()
  const point = new Point('deviceauth')
    .tag('deviceId', deviceId)
    .stringField('createdAt', createdAt)
  writeApi.writePoint(point)
  await writeApi.close()
  const {id: key, token} = await createDeviceAuthorization(deviceId)
  return {deviceId, createdAt, updatedAt: createdAt, key, token}
}

/**
 * Removes authorization from a specified device including
 * InfluxDB authorization.
 * @param {string} deviceId
 * @param {string} key optional key of InfluxDB authorization
 * @returns {Promise<boolean>} true if it was removed
 */
async function removeDeviceAuthorization(deviceId, key) {
  console.log(`removeDeviceAuthorization: deviceId=${deviceId}`)
  if (!key) {
    const devices = await getDevices(deviceId)
    const device = devices[deviceId]
    if (!device || !device.key) {
      // device is not available or authorization is already removed
      return false
    }
    key = device.key
  }
  // delete authorization object
  try {
    await deleteAuthorization(key)
  } catch (e) {
    if (!(e instanceof HttpError) || e.statusCode !== 404) {
      // device authorization does not exist
      throw e
    }
  }
  // set empty key and token for the device
  const writeApi = influxdb.getWriteApi(INFLUX_ORG, INFLUX_BUCKET_AUTH, 'ms', {
    batchSize: 2,
  })
  const point = new Point('deviceauth')
    .tag('deviceId', deviceId)
    .stringField('key', '')
    .stringField('token', '')
  writeApi.writePoint(point)
  await writeApi.close()
  return true
}

/**
 * Creates and assigns authorization to the specified device.
 * @param {string} deviceId
 * @returns {Promise<Authorization>}
 */
async function createDeviceAuthorization(deviceId) {
  console.log(`createDeviceAuthorization: deviceId=${deviceId}`)
  const authorization = await createIoTAuthorization(deviceId)
  // set empty key and token for the device
  const writeApi = influxdb.getWriteApi(INFLUX_ORG, INFLUX_BUCKET_AUTH, 'ms', {
    batchSize: 2,
  })
  const point = new Point('deviceauth')
    .tag('deviceId', deviceId)
    .stringField('key', authorization.id)
    .stringField('token', authorization.token)
  writeApi.writePoint(point)
  await writeApi.close()
  return authorization
}

/**
 * Change type of device.
 * @param {string} deviceId
 * @param {string} type
 * @returns {Promise<void>}
 */
async function setDeviceType(deviceId, type) {
  console.log(`setDeviceType: deviceId=${deviceId} type=${type}`)
  const device = (await getDevices(deviceId))[deviceId]
  if (!device)
    throw new Error(`Cannot set device type for ${deviceId} device not exists!`)

  // set empty key and token for the device
  const writeApi = influxdb.getWriteApi(INFLUX_ORG, INFLUX_BUCKET_AUTH, 'ms', {
    batchSize: 2,
  })
  const point = new Point('deviceauth')
    .tag('deviceId', deviceId)
    .stringField('device', type)
  writeApi.writePoint(point)
  await writeApi.close()
}

module.exports = {
  getDevices,
  createDevice,
  removeDeviceAuthorization,
  createDeviceAuthorization,
  setDeviceType,
}
