const DAY_MILLIS = 24 * 60 * 60 * 1000
const MONTH_MILLIS = 30 * 24 * 60 * 60 * 1000
const GPX_SPEED_MODIFIER = 400000

/**
 * Generates measurement values for a specific time.
 * @param period period of the generated data (days)
 * @param min minumum value
 * @param max maximum value excluding 0-1 random
 * @param time time for the generated value (millis)
 * @returns generated value
 */
function generateValue(
  period: number,
  min = 0,
  max = 40,
  time: number
): number {
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

const getGPXIndex = (len: number, time: number) => {
  // modifier has to be divisible by len so modif % len = 0 % len
  const fixedModif = Math.floor(GPX_SPEED_MODIFIER / len) * len
  // ((time % MONTH_MILLIS) / MONTH_MILLIS) transforms time into month cycle result is <0;1)
  const indexFull = (((time % MONTH_MILLIS) / MONTH_MILLIS) * fixedModif) % len
  const index = Math.floor(indexFull)
  const rest = indexFull - index
  return {index, rest}
}

export const generateGPXData = (
  data: [number, number][],
  time: number
): [number, number] => {
  const len = data.length
  const {index, rest} = getGPXIndex(len, time)
  const nextIndex = (index + 1) % len

  const [e0lat, e0lon] = data[index]
  const [e1lat, e1lon] = data[nextIndex]

  const i = (a: number, b: number) => a * (1 - rest) + b * rest
  const interpolatedResult: [number, number] = [
    i(e0lat, e1lat),
    i(e0lon, e1lon),
  ]

  return interpolatedResult
}

export const generateTemperature = generateValue.bind(undefined, 30, 0, 40)
export const generateHumidity = generateValue.bind(undefined, 90, 0, 99)
export const generatePressure = generateValue.bind(undefined, 20, 970, 1050)
export const generateCO2 = generateValue.bind(undefined, 1, 400, 3000)
export const generateTVOC = generateValue.bind(undefined, 1, 250, 2000)
