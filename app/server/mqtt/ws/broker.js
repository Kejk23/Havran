const {MQTT_TOPIC} = require('../../env')
const {forEachWebSocket} = require('../../ws')
const parseLineProtocol = require('./lpParser')

function parseLineProtocolWithTopic(topic, buffer) {
  const points = parseLineProtocol(buffer)
  if (!points || points.length === 0) return
  // add topic tag pair
  const topicTagPair = `topic=${topic}`
  points.forEach((x) => x.tagPairs.push(topicTagPair))
  return points
}

const MQTT_PARSERS = {
  [MQTT_TOPIC]: parseLineProtocolWithTopic,
  test: parseLineProtocolWithTopic,
}

/**
 * Setups express router to forward and filter MQTT messages
 * to web sockets according to their subscriptions.
 *
 * @param {mqtt.MQTTClient} client MQTT Client
 * @param {express.Router} router express router to setup
 */
async function setupWsBroker(client, router) {
  // subscribe to MQTT
  for (const topic in MQTT_PARSERS) {
    await client.subscribe(topic)
  }
  // route to web sockets
  client.on('message', function (topic, buffer) {
    try {
      const points = MQTT_PARSERS[topic](topic, buffer)
      if (!points || points.length === 0) return

      forEachWebSocket((ws) => {
        if (ws.subscription) {
          const filtered = points.filter((point) => {
            for (const s of ws.subscription) {
              if (s.measurement !== point.measurement) continue

              let tagsMatched = 0
              for (const filter of s.tags)
                for (const tagPair of point.tagPairs)
                  if (filter === tagPair) {
                    tagsMatched++
                    break
                  }

              if (tagsMatched === s.tags.length) return true
            }
            return false
          })

          if (filtered.length) ws.send(JSON.stringify(filtered))
        }
      })
    } catch (e) {
      process.stderr.write('Error while processing MQTT message ' + e)
    }
  })

  router.ws('/', async function (ws) {
    ws.on('message', function (data) {
      const payload = data.toString('utf-8')
      if (payload.startsWith('subscribe:')) {
        try {
          const subscription = JSON.parse(
            payload.substring('subscribe:'.length)
          )
          if (subscription) {
            if (!Array.isArray(subscription)) {
              process.stderr.write(
                'subscription message must contain an array of all subscriptions, but:' +
                  JSON.stringify(subscription)
              )
              return
            }
            for (const s of subscription) {
              if (!s.measurement) {
                process.stderr.write(
                  'subscription ignored, missing measurement in: ' +
                    JSON.stringify(s)
                )
                return
              }
              if (!Array.isArray(s.tags)) {
                process.stderr.write(
                  'subscription ignored, array of tags with key=value pairs expected in: ' +
                    JSON.stringify(s)
                )
                return
              }
            }
          }
          ws.subscription = subscription
        } catch (e) {
          process.stderr.write('unparseable subscribe message' + payload)
        }
      } else {
        process.stderr.write(
          "unknown ws message, should start with 'subscribe:'" + payload
        )
      }
    })
  })
}
// example client exchange:
// ws =  new WebSocket("ws://" + location.host + "/mqtt/")
// ws.send('subscribe:[{"measurement":"environment", "tags":["a=b"]}]')
// ws.onMessage = ({data}) => process.stdout.write(data)
// // example message: [{"measurement":"environment","tagPairs":["CO2Sensor=virtual_CO2Sensor","a=b"],"fields":{"CO2":2572}, "timestamp": "1629357840000000000"}]
// ws.send('subscribe:false') // unsubscribe

module.exports = setupWsBroker
