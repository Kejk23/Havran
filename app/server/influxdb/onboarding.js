const {InfluxDB, HttpError} = require('@influxdata/influxdb-client')
const {SetupAPI} = require('@influxdata/influxdb-client-apis')
const {
  INFLUX_URL,
  INFLUX_TOKEN,
  INFLUX_ORG,
  ONBOARDING_USERNAME,
  ONBOARDING_PASSWORD,
  INFLUX_BUCKET,
  INFLUX_BUCKET_AUTH,
} = require('../env')
const {getBucket, createBucket} = require('./buckets')

async function onboardInfluxDB() {
  const url = INFLUX_URL
  const setupApi = new SetupAPI(new InfluxDB({url}))
  try {
    const {allowed} = await setupApi.getSetup()
    if (allowed) {
      await setupApi.postSetup({
        body: {
          org: INFLUX_ORG,
          bucket: INFLUX_BUCKET,
          username: ONBOARDING_USERNAME,
          password: ONBOARDING_PASSWORD,
          token: INFLUX_TOKEN,
        },
      })
      console.log(`InfluxDB has been onboarded.`)
    }
    const initializeBucket = async (bucket) => {
      let bucketNotFound = false
      try {
        await getBucket(bucket)
        console.log(`Bucket '${bucket}' exists.`)
      } catch (e) {
        if (e instanceof HttpError && e.statusCode === 401) {
          console.error(
            `Unauthorized to determine whether a bucket '${bucket}' exists.`
          )
        } else if (e instanceof HttpError && e.statusCode === 404) {
          // bucket not found
          bucketNotFound = true
        } else {
          console.error(
            `Unable to check whether a bucket '${bucket}' exists.`,
            e
          )
        }
      }
      if (bucketNotFound) {
        await createBucket(bucket)
        console.log(`Bucket ${bucket} created.`)
      }
    }
    await initializeBucket(INFLUX_BUCKET)
    if (INFLUX_BUCKET_AUTH === INFLUX_BUCKET) {
      console.warn(
        'WARN: INFLUX_BUCKET is the same as INFLUX_BUCKET_AUTH. Each device can now'
      )
      console.warn(
        '      read authentication tokens of other devices. Setup different '
      )
      console.warn(
        '      INFLUX_BUCKET and INFLUX_BUCKET_AUTH environment variables.'
      )
    } else {
      await initializeBucket(INFLUX_BUCKET_AUTH)
    }
  } catch (error) {
    console.error(
      `Unable to determine whether InfluxDB at ${INFLUX_URL} is onboarded.`,
      error
    )
  }
}

module.exports = onboardInfluxDB
