const {MQTT_URL, MQTT_TOPIC} = require('../env')
const createClient = require('./createClient')

if (MQTT_URL && MQTT_TOPIC) {
  ;(async function () {
    const client = await createClient()
    await client.subscribe(MQTT_TOPIC)
    console.log('Subscribed to', MQTT_TOPIC, 'at', MQTT_URL)
    await client.subscribe('test')
    console.log('Subscribed to', 'test', 'at', MQTT_URL)
    client.on('message', function (topic, buffer) {
      const message = buffer.toString()
      console.log(
        `${message.toString().split('\n').length} lines received at ${topic}`
      )
      console.log(message)
    })
    async function onShutdown() {
      try {
        await client.end()
      } catch (error) {
        console.error('ERROR: MQTT finalization failed', error)
      }
    }
    process.on('SIGINT', onShutdown)
    process.on('SIGTERM', onShutdown)
  })().catch(console.error)
} else {
  console.log('Please specify both MQTT_URL and MQTT_TOPIC')
}
