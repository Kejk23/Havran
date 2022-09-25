/** InfluxDB URL */
const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086'
/** InfluxDB authorization token */
const INFLUX_TOKEN = process.env.INFLUX_TOKEN || 'my-token'
/** Organization within InfluxDB  */
const INFLUX_ORG = process.env.INFLUX_ORG || 'my-org'
/** InfluxDB bucket  */
const INFLUX_BUCKET = process.env.INFLUX_BUCKET || 'iot_center'
/** InfluxDB bucket that stores registered devices  */
const INFLUX_BUCKET_AUTH = process.env.INFLUX_BUCKET_AUTH || 'iot_center'
/** InfluxDB bucket that stores dashboards and other config  */
const INFLUX_BUCKET_CONFIG = process.env.INFLUX_BUCKET_CONFIG || 'iot_center'

/** optional Kafka Host */
const KAFKA_HOST = process.env.KAFKA_HOST
/** optional Kafka Topic */
const KAFKA_TOPIC = process.env.KAFKA_TOPIC

/** MQTT URL is required to use MQTT to write data when set, see https://github.com/mqttjs/MQTT.js#connect for available values */
const MQTT_URL = process.env.MQTT_URL
/** MQTT topic it is required to use MQTT to write data */
const MQTT_TOPIC = process.env.MQTT_TOPIC
/** optional MQTT username */
const MQTT_USERNAME = process.env.MQTT_USERNAME
/** optional MQTT password */
const MQTT_PASSWORD = process.env.MQTT_PASSWORD
const MQTT_OPTIONS_DEFAULT = '{"connectTimeout":10000}'
/** optional JSON encoded MQTT options, see https://github.com/mqttjs/MQTT.js#client */
const MQTT_OPTIONS = process.env.MQTT_OPTIONS || MQTT_OPTIONS_DEFAULT

/** If demo is initialized on server start */
const INITIALIZE_DEMO_DAHBOARD =
  (process.env.INITIALIZE_DEMO_DAHBOARD || '').toLocaleLowerCase() !== 'false'

/** Port for discover service. Pass false to disable. Mind that port must be same on client for discover to work */
const UDP_PORT =
  process.env.UDP_PORT === 'false' ? undefined : +process.env.UDP_PORT || 5001

// Defaults when on boarding a fresh new InfluxDB instance
/** InfluxDB user  */
const ONBOARDING_USERNAME = 'my-user'
/** InfluxDB password  */
const ONBOARDING_PASSWORD = 'my-password'

/** recommended interval for client's to refresh configuration in seconds */
const CONFIGURATION_REFRESH = 3600

function logEnvironment() {
  console.log(`INFLUX_URL=${INFLUX_URL}`)
  console.log(`INFLUX_TOKEN=${INFLUX_TOKEN ? '***' : ''}`)
  console.log(`INFLUX_ORG=${INFLUX_ORG}`)
  console.log(`INFLUX_BUCKET=${INFLUX_BUCKET}`)
  console.log(`INFLUX_BUCKET_AUTH=${INFLUX_BUCKET_AUTH}`)
  if (KAFKA_HOST) {
    console.log(`KAFKA_HOST=${KAFKA_HOST}`)
  }
  if (KAFKA_TOPIC) {
    console.log(`KAFKA_TOPIC=${KAFKA_TOPIC}`)
  }
  if (MQTT_URL) {
    console.log(`MQTT_URL=${MQTT_URL}`)
  }
  if (MQTT_TOPIC) {
    console.log(`MQTT_TOPIC=${MQTT_TOPIC}`)
  }
  if (MQTT_USERNAME) {
    console.log(`MQTT_USERNAME=${MQTT_USERNAME}`)
  }
  if (MQTT_URL) {
    console.log(`MQTT_OPTIONS=${MQTT_OPTIONS}`)
  }
}

module.exports = {
  INFLUX_URL,
  INFLUX_TOKEN,
  INFLUX_ORG,
  ONBOARDING_USERNAME,
  ONBOARDING_PASSWORD,
  CONFIGURATION_REFRESH,
  INFLUX_BUCKET,
  INFLUX_BUCKET_AUTH,
  INFLUX_BUCKET_CONFIG,
  logEnvironment,
  KAFKA_HOST,
  KAFKA_TOPIC,
  MQTT_URL,
  MQTT_TOPIC,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_OPTIONS,
  INITIALIZE_DEMO_DAHBOARD,
  UDP_PORT,
}
