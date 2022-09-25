const {BucketsAPI} = require('@influxdata/influxdb-client-apis')
const influxdb = require('./influxdb')
const {INFLUX_BUCKET} = require('../env')
const {getOrganization} = require('./organizations')
const bucketsAPI = new BucketsAPI(influxdb)

// a simple cache that contains buckets
const bucketsCache = {}

/**
 * Gets details for a bucket supplied by name.
 * @param {string} name bucket name, optional defaults to env.INFLUX_BUCKET
 * @return promise with an instance of bucket or an error
 * @see https://influxdata.github.io/influxdb-client-js/influxdb-client-apis.bucket.html
 */
async function getBucket(name) {
  if (!name) {
    name = INFLUX_BUCKET
  }
  if (bucketsCache[name]) {
    return {...bucketsCache[name]}
  }
  const {id: orgID} = await getOrganization()
  const buckets = await bucketsAPI.getBuckets({name, orgID})
  const retVal = buckets.buckets[0]
  if (retVal) {
    bucketsCache[name] = {...retVal}
  }
  return retVal
}

/**
 * Creates a bucket of the supplied by name.
 * @param {string} name bucket name, optional defaults to env.INFLUX_BUCKET
 * @return promise with an instance of bucket or an error
 * @see https://influxdata.github.io/influxdb-client-js/influxdb-client-apis.bucket.html
 */
async function createBucket(name) {
  if (!name) {
    name = INFLUX_BUCKET
  }
  const {id: orgID} = await getOrganization()
  return await bucketsAPI.postBuckets({
    body: {
      name,
      orgID,
      description: 'Created by IoT Center',
      retentionRules: [],
    },
  })
}

module.exports = {
  getBucket,
  createBucket,
}
