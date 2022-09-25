const {OrgsAPI} = require('@influxdata/influxdb-client-apis')
const influxdb = require('./influxdb')
const orgsApi = new OrgsAPI(influxdb)
const {INFLUX_ORG} = require('../env')

// a simple cache that contains organizations
const orgCache = {}

/**
 * Gets details for an organization supplied by name.
 * @param {string} name organization name, optional defaults to env.INFLUX_ORG
 * @return promise with an instance of organization or an error
 * @see https://influxdata.github.io/influxdb-client-js/influxdb-client-apis.organization.html
 */
async function getOrganization(name) {
  if (!name) {
    name = INFLUX_ORG
  }
  const cached = orgCache[name]
  if (cached) {
    // do a deep copy
    return JSON.parse(JSON.stringify(cached))
  }
  const apiResponse = await orgsApi.getOrgs({org: name})
  if (!apiResponse.orgs || apiResponse.orgs.length === 0) {
    throw new Error(`No organization named ${name} found!`)
  }
  const retVal = apiResponse.orgs[0]
  orgCache[name] = retVal
  return apiResponse.orgs[0]
}

module.exports = {getOrganization}
