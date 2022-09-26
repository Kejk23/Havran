const mqtt = require('async-mqtt')
const {
  MQTT_URL,
  MQTT_TOPIC,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_OPTIONS,
} = require('.../env')

/**
 * Creates a promise that returns a connected MQTT
 * client initialized from environment options or
 * returns null if no MQTT environment options are specified.
 * @returns Promise<AsyncMqttClient | null>
 */
function createClient2() {
  if (MQTT_URL && MQTT_TOPIC) {
    try {
      console.log('Initializing MQTT client')
      const options = JSON.parse(MQTT_OPTIONS)
      if (MQTT_USERNAME && MQTT_PASSWORD) {
        Object.assign(options, {
          username: MQTT_USERNAME,
          password: MQTT_PASSWORD,
        })
      }
      return mqtt.connectAsync(MQTT_URL, options, false)
    } catch (e) {
      return Promise.reject(e)
    }
  }
  return Promise.resolve(null)
}

module.exports = createClient2
