const express = require('express')
const env = require('../env')
const {stringify} = require('yaml') // eslint-disable-line node/no-unpublished-require
const {
  getDevices,
  createDevice,
  removeDeviceAuthorization,
  createDeviceAuthorization,
  setDeviceType,
} = require('../influxdb/devices')
const dynamicRouter = require('../dynamic')
const {
  getAuthorization,
  isBucketRWAuthorized,
} = require('../influxdb/authorizations')
const {getBucket} = require('../influxdb/buckets')

const router = express.Router()
function handleError(wrapped) {
  return async function (req, res, next) {
    try {
      await wrapped(req, res)
    } catch (e) {
      next(e)
    }
  }
}

function getDefaultWriteEndpoint() {
  if (env.KAFKA_HOST && env.KAFKA_TOPIC) {
    return '/kafka'
  }
  if (env.MQTT_URL && env.MQTT_TOPIC) {
    return '/mqtt'
  }
  return '/influx'
}

// send simple response in text/plain when requested (arduino)
router.use(function responseTextInPlaceOfJson(req, res, next) {
  if (
    req.header('accept') === 'text/plain' ||
    req.query.accept === 'text/plain'
  ) {
    const oldJson = res.json

    res.json = function (...args) {
      const [body] = args
      if (typeof body === 'object' && body !== null) {
        res.send(stringify(body))
      } else {
        oldJson.apply(res, args)
      }
    }
  }
  next()
})

router.get(
  '/health',
  handleError(async (_req, res) => {
    res.json({})
  })
)

// return environment for a specific device by its ID
router.get(
  '/env/:deviceId',
  handleError(async (req, res) => {
    const deviceId = req.params.deviceId
    let device = (await getDevices(deviceId))[deviceId] || {}
    let registered = false
    let authorizationValid = !!device.key
    if (authorizationValid) {
      // validate that device authorization exists
      let authorization
      try {
        authorization = await getAuthorization(device.key)
      } catch (e) {
        console.error(
          'device=%s authorization %s does not exist!',
          deviceId,
          device.key,
          e
        )
        authorizationValid = false
      }
      if (
        authorization &&
        !isBucketRWAuthorized(authorization, (await getBucket()).id)
      ) {
        console.warn(
          'device=%s deleting authorization %s, it does not grant access to %s!',
          deviceId,
          device.key,
          env.INFLUX_BUCKET
        )
        try {
          authorization = await removeDeviceAuthorization(deviceId, device.key)
        } catch (e) {
          console.error(
            'device=%s invalid authorization %s cannot be deleted!',
            deviceId,
            device.key,
            e
          )
        }
        authorizationValid = false
      }
    }
    if (!authorizationValid) {
      if (req.query.register !== 'false') {
        if (device.key) {
          // recreate authorization if the present is invalid
          const {
            id: key,
            token,
            updatedAt,
          } = await createDeviceAuthorization(deviceId)
          device = {...device, key, token, updatedAt}
        } else {
          device = await createDevice(deviceId)
        }
        registered = true
      } else {
        res.status(403)
        return res.json({
          id: deviceId,
          registered,
        })
      }
    }
    const result = {
      influx_url: env.INFLUX_URL,
      influx_org: env.INFLUX_ORG,
      influx_token: device.token,
      influx_bucket: env.INFLUX_BUCKET,
      id: deviceId,
      device: device.device,
      default_lon: 14.4071543,
      default_lat: 50.0873254,
      measurement_interval: 60,
      newlyRegistered: registered,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      serverTime: new Date().toISOString(),
      configuration_refresh: env.configuration_refresh,
      write_endpoint: getDefaultWriteEndpoint(),

      kafka_url: env.KAFKA_HOST,
      kafka_topic: env.KAFKA_TOPIC,

      mqtt_url: env.MQTT_URL,
      mqtt_topic: env.MQTT_TOPIC,
      mqtt_user: env.MQTT_USERNAME,
      mqtt_password: env.MQTT_PASSWORD,
      mqtt_options: env.MQTT_OPTIONS,
    }
    res.json(result)
  })
)

// return all devices as {key: string, deviceId:string, createdAt: string}[]
router.get(
  '/devices',
  handleError(async (_req, res) => {
    const devices = Object.values(await getDevices())
    res.json(
      devices
        .filter((x) => x.deviceId && x.key) // ignore deleted or unknown devices
        .sort((a, b) => a.deviceId.localeCompare(b.deviceId))
    )
  })
)

// delete device supplied by the given deviceId
router.delete(
  '/devices/:deviceId',
  handleError(async (req, res) => {
    const deviceId = req.params.deviceId
    const removed = await removeDeviceAuthorization(deviceId)
    if (removed) {
      res.status(204)
      res.send('Device authorization removed')
      return
    }
    res.status(404)
    res.send(`Device not found!`)
  })
)

router.get(
  '/gpxVirtual',
  handleError(async (_req, res) => {
    require('fs').readFile('./apis/gpxData.json', (_err, data) => {
      res.setHeader('Content-Type', 'application/json')
      res.send(data.toString('utf-8'))
    })
  })
)

router.post(
  '/devices/:deviceId/type/:type',
  handleError(async (req, res) => {
    const deviceId = req.params.deviceId
    const deviceType = req.params.type
    try {
      await setDeviceType(deviceId, deviceType)
      res.status(204)
      res.send('Device type set')
    } catch (e) {
      res.status(404)
      res.send(`Device not found!`)
    }
  })
)

router.use('/dynamic', dynamicRouter)

// all other routes are not supported!
router.all('*', (_, res) => {
  res.status(404)
  res.send('Not Found!')
})

router.use((err, _req, res, next) => {
  // console.error(err)
  if (res.headersSent) {
    return next(err)
  }
  res.status(500)
  res.send(String(err))
})

module.exports = router
