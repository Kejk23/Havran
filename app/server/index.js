/* eslint-disable no-process-exit */
const express = require('express')
const path = require('path')
const fs = require('fs/promises')
const proxy = require('express-http-proxy')

const apis = require('./apis')
const kafka = require('./kafka')
const mqtt = require('./mqtt')
const onboardInfluxDB = require('./influxdb/onboarding')
const {logEnvironment, INFLUX_URL} = require('./env')
const {monitorResponseTime, startProcessMonitoring} = require('./monitor')
const {addWebSockets} = require('./ws')
const {initUdp} = require('./apis/udp')

const UI_BUILD_DIR = path.join(__dirname, '..', 'ui', 'dist')

// terminate on DTRL+C or CTRL+D
process.on('SIGINT', () => process.exit())
process.on('SIGTERM', () => process.exit())
console.log(require('./banner.json'))

/**
 * @param {string} path
 */
async function exists(path) {
  try {
    await fs.access(path)
    return true
  } catch (e) {
    return false
  }
}

async function startApplication() {
  const app = express()
  addWebSockets(app)

  // monitor application response time
  monitorResponseTime(app)

  // APIs
  app.use('/api', apis)

  // Kafka write
  app.use('/kafka', kafka)

  // MQTT write
  app.use('/mqtt', await mqtt())

  // start proxy to InfluxDB to avoid CORS blocking with InfluXDB OSS v2 Beta
  app.use('/influx', proxy(INFLUX_URL))
    console.log(`Enable proxy from /influx/* to ${INFLUX_URL}/*`)

  // UI
  if (await exists(UI_BUILD_DIR)) {
    app.use(express.static(UI_BUILD_DIR))
    const indexFile = await fs.readFile(path.join(UI_BUILD_DIR, 'index.html'))
    // assume UI client navigation
    app.get('*', (_req, res) => {
      res.status(200)
      res.setHeader('Content-Type', 'text/html')
      res.end(indexFile)
    })
  }

  // onboard a new InfluxDB instance
  await onboardInfluxDB()

  // start monitoring node process
  startProcessMonitoring()

  // start HTTP server
  const port = process.env.SERVER_PORT || 5000
  app.listen(port, process.env.HOSTNAME || '0.0.0.0')

  try {
    initUdp()
  } catch (e) {
    console.error(`Failed to initialize UDP`, e)
  }

  logEnvironment()
  console.log(`Listening on http://localhost:${port}`)
}

startApplication().catch((e) => {
  console.error('Failed to start: ', e)
  process.exitCode = 1
})
