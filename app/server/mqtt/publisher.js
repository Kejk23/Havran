const {MQTT_URL, MQTT_TOPIC} = require('../env')
const createClient = require('./createClient')
const {Point} = require('@influxdata/influxdb-client')
const {
  generateTemperature,
  generateHumidity,
  generatePressure,
  generateCO2,
  generateTVOC,
  generateGPXData,
} = require('./util/generateValue')
const {parentPort} = require('worker_threads')

let sendDataHandle = -1

let gpxData
require('fs').readFile('./apis/gpxData.json', (_err, data) => {
  gpxData = JSON.parse(data.toString('utf-8'))
})

parentPort.on('message', async (data) => {
  if (!(MQTT_URL && MQTT_TOPIC))
    throw new Error('MQTT_URL and MQTT_TOPIC not specified')

  clearInterval(sendDataHandle)

  if (!data.running) {
    sendDataHandle = -1
    return
  }

  const client = await createClient()
  console.log('Publishing to', MQTT_TOPIC, 'at', MQTT_URL)

  const sendData = async () => {
    const point = new Point('environment')
    const now = Date.now()

    if (gpxData) {
      const [lat, lon] = generateGPXData(gpxData, now)
      point.floatField('Lat', lat)
      point.floatField('Lon', lon)
    }

    point
      .floatField('Temperature', generateTemperature(now))
      .floatField('Humidity', generateHumidity(now))
      .floatField('Pressure', generatePressure(now))
      .intField('CO2', generateCO2(now))
      .intField('TVOC', generateTVOC(now))
      .tag('TemperatureSensor', 'virtual_TemperatureSensor')
      .tag('HumiditySensor', 'virtual_HumiditySensor')
      .tag('PressureSensor', 'virtual_PressureSensor')
      .tag('CO2Sensor', 'virtual_CO2Sensor')
      .tag('TVOCSensor', 'virtual_TVOCSensor')
      .tag('GPSSensor', 'virtual_GPSSensor')
      .tag('clientId', 'virtual_device')
    point.timestamp(now * 10 ** 6)
    const influxLineProtocolData = point.toLineProtocol()
    try {
      await client.publish(MQTT_TOPIC, influxLineProtocolData)
    } catch (e) {
      console.error('Unable to publish data: ', e)
    }
  }

  await sendData()
  sendDataHandle = setInterval(sendData, data.sendInterval)
})
