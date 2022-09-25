const DAY_MILLIS = 24 * 60 * 60 * 1000
const MONTH_MILLIS = 30 * 24 * 60 * 60 * 1000
const GPX_SPEED_MODIFIER = 400000

/**
 * Generates measurement values for a specific time.
 * @param {number} period period of the generated data (days)
 * @param {number} min minumum value
 * @param {number} max maximum value excluding 0-1 random
 * @param {number} time time for the generated value (millis)
 * @returns {number} generated value
 */
function generateValue(period, min = 0, max = 40, time) {
  const dif = max - min
  // generate main value
  const periodValue =
    (dif / 4) *
    Math.sin((((time / DAY_MILLIS) % period) / period) * 2 * Math.PI)
  // generate secondary value, which is lowest at noon
  const dayValue =
    (dif / 4) *
    Math.sin(((time % DAY_MILLIS) / DAY_MILLIS) * 2 * Math.PI - Math.PI / 2)
  return (
    Math.trunc((min + dif / 2 + periodValue + dayValue + Math.random()) * 10) /
    10
  )
}

const getGPXIndex = (len, time) => {
  // modifier has to be divisible by len so modif % len = 0 % len
  const fixedModif = Math.floor(GPX_SPEED_MODIFIER / len) * len
  // ((time % MONTH_MILLIS) / MONTH_MILLIS) transforms time into month cycle result is <0;1)
  const indexFull = (((time % MONTH_MILLIS) / MONTH_MILLIS) * fixedModif) % len
  const index = Math.floor(indexFull)
  const rest = indexFull - index
  return {index, rest}
}

const generateGPXData = (data, time) => {
  const len = data.length
  const {index, rest} = getGPXIndex(len, time)
  const nextIndex = (index + 1) % len

  const [e0lat, e0lon] = data[index]
  const [e1lat, e1lon] = data[nextIndex]

  const i = (a, b) => a * (1 - rest) + b * rest
  const interpolatedResult = [i(e0lat, e1lat), i(e0lon, e1lon)]

  return interpolatedResult
}

const generateTemperature = generateValue.bind(undefined, 30, 0, 40)
const generateHumidity = generateValue.bind(undefined, 90, 0, 99)
const generatePressure = generateValue.bind(undefined, 20, 970, 1050)
const generateCO2 = generateValue.bind(undefined, 1, 400, 3000)
const generateTVOC = generateValue.bind(undefined, 1, 250, 2000)

module.exports = {
  generateTemperature,
  generateHumidity,
  generatePressure,
  generateCO2,
  generateTVOC,
  generateGPXData,
}
