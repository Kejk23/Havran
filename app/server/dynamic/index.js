/* 
  *----------------------------------------------*
  |-- endpoint for managing dynamic dashboards --|
  *----------------------------------------------*
*/
const express = require('express')
const {
  INFLUX_BUCKET_CONFIG,
  INFLUX_ORG,
  INITIALIZE_DEMO_DAHBOARD,
} = require('../env')

const influxdb = require('../influxdb/influxdb')
const {Point, flux} = require('@influxdata/influxdb-client')

const router = express.Router()
const {loadDemoDashoards} = require('./demoDashboard')

// TODO: add error handling

const MEASUREMENT_DASHBOARD_WEB = 'dashboard-web'

/**
 * @param {"dashboard" | "svg"} type
 * @param {string} key
 * @param {string} data
 */
async function store(type, key, data) {
  const writeApi = influxdb.getWriteApi(INFLUX_ORG, INFLUX_BUCKET_CONFIG, 'ms')
  const point = new Point(MEASUREMENT_DASHBOARD_WEB)
    .stringField('data', data)
    .tag('key', key)
    .tag('type', type)
  writeApi.writePoint(point)
  await writeApi.close()
}

/**
 * @param {"dashboard" | "svg"} type
 * @param {string} key
 */
async function load(type, key) {
  const fluxQuery = flux`
    from(bucket:${INFLUX_BUCKET_CONFIG}) 
      |> range(start: 0) 
      |> filter(fn: (r) => r._measurement == ${MEASUREMENT_DASHBOARD_WEB})
      |> filter(fn: (r) => r.key == ${key} and r.type == ${type})
      |> filter(fn: (r) => r._field == "data")
      |> last()
      |> filter(fn: (r) => r._value != "")
  `

  const queryApi = influxdb.getQueryApi(INFLUX_ORG)
  const rows = await queryApi.collectRows(fluxQuery)
  const dashboard = rows && rows[0] && rows[0]._value

  return dashboard
}

/**
 * @param {"dashboard" | "svg"} type
 */
async function list(type) {
  const fluxQuery = flux`
    from(bucket:${INFLUX_BUCKET_CONFIG}) 
      |> range(start: 0) 
      |> filter(fn: (r) => r._measurement == ${MEASUREMENT_DASHBOARD_WEB})
      |> filter(fn: (r) => r.type == ${type})
      |> last()
      |> filter(fn: (r) => r._value != "")
      |> keep(columns: ["key"])
  `

  const queryApi = influxdb.getQueryApi(INFLUX_ORG)
  const rows = await queryApi.collectRows(fluxQuery)
  const list = rows.map((x) => x.key)

  return list
}

/**
 * @param {"dashboard" | "svg"} type
 * @param {string} key
 */
function remove(type, key) {
  return store(type, key, '')
}

async function initDemoDashboard() {
  try {
    const demoDashboards = await loadDemoDashoards()
    for (let index = 0; index < demoDashboards.length; index++) {
      const {type, key, data} = demoDashboards[index]
      if (!(await load(type, key))) await store(type, key, data)
    }
    console.info(`init demo dashboards successfull`)
  } catch (e) {
    console.error(`failed to init demo dashboards`)
  }
}

if (INITIALIZE_DEMO_DAHBOARD) setTimeout(initDemoDashboard, 2000)

//////////////////////
// Router endpoints //
//////////////////////
router.get('/keys', async (_req, res) => {
  const dashboards = await list('dashboard')
  res.json(dashboards)
})

router.get('/svgs', async (_req, res) => {
  const svgs = await list('svg')
  res.json(svgs)
})

router.get('/dashboard/:key', async (req, res) => {
  const key = req.params.key

  const dashboardText = await load('dashboard', key)
  res.send(dashboardText)
})

router.delete('/dashboard/:key', async (req, res) => {
  const key = req.params.key

  await remove('dashboard', key)
  res.send('')
})

router.get('/svg/:key', async (req, res) => {
  const key = req.params.key

  const svgText = await load('svg', key)
  res.send(svgText)
})

router.use(express.text({limit: '100mb'}))

// TODO: secure write (reject <script>, on... attributes on svg)
router.post('/upload/:name', async (req, res) => {
  const {name} = req.params
  if (
    name &&
    (name.toLowerCase().endsWith('.svg') ||
      name.toLowerCase().endsWith('.json'))
  ) {
    const extSep = name.lastIndexOf('.')
    const key = name.substring(0, extSep)
    const extension = name.substring(extSep + 1).toLowerCase()
    const data = req.body
    const type = extension === 'svg' ? 'svg' : 'dashboard'
    await store(type, key, data)
    res.status(204).send()
  } else {
    res.status(400)
    res.text('invalid filename or extension')
  }
})

module.exports = router
