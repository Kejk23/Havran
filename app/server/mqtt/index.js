const express = require('express')
const {MQTT_TOPIC, MQTT_URL} = require('../env')
const createClient = require('./createClient')
const setupWsBroker = require('./ws/broker')
const {Worker} = require('worker_threads')

const publisherDefaultSettings = {
  running: true,
  sendInterval: 100,
}
let publisherSettings = publisherDefaultSettings

const worker = new Worker('./mqtt/publisher.js')

const MQTT_ENABLED = !!(MQTT_URL && MQTT_TOPIC)

// returns a router instance using an MQTT client configured from env
async function mqttRouter() {
  const router = express.Router()
  router.use('/enabled', (req, res) => {
    res.send(JSON.stringify(MQTT_ENABLED))
  })

  if (!MQTT_ENABLED) {
    return router
  }

  const client = await createClient()
  // bigger bodies are expected
  router.use(express.text({limit: '10mb'}))

  worker.postMessage(publisherDefaultSettings)

  router.get('/settings', async (req, res) => {
    res.json(publisherSettings)
  })

  router.post('/settings', async (req, res) => {
    publisherSettings = JSON.parse(req.body)
    worker.postMessage(publisherSettings)
    res.end()
  })

  // register an InfluxDB-compatible write endpoint forwards data to MQTT
  router.post('/api/v2/write', async (req, res) => {
    if (!client) {
      res.status(500)
      res.end('MQTT is not configured!')
      return
    }
    const influxLineProtocolData = req.body
    try {
      await client.publish(MQTT_TOPIC, influxLineProtocolData)
    } catch (e) {
      res.status(500)
      console.error('MQTT producer error', e)
      res.end('MQTT producer error')
      return
    }
    res.status(204)
    res.end()
  })
  if (!client) return router

  await setupWsBroker(client, router)

  return router
}

module.exports = mqttRouter
