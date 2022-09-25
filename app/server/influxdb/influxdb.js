const {InfluxDB} = require('@influxdata/influxdb-client')
const {INFLUX_URL, INFLUX_TOKEN} = require('../env')

const influxdb = new InfluxDB({url: INFLUX_URL, token: INFLUX_TOKEN})

module.exports = influxdb
