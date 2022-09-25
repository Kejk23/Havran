import {simplify} from '.'

export type DiagramEntryPoint = {
  value: number
  time: number
  key: string
}

const simplifyDiagramEntryPoint = (
  arr: DiagramEntryPoint[],
  epsilon: number
) => {
  const lines: Record<string, {xs: number[]; ys: number[]}> = {}

  for (let i = arr.length; i--; ) {
    const {key, time, value} = arr[i]
    if (!lines[key]) lines[key] = {xs: [], ys: []}
    lines[key].xs.push(time)
    lines[key].ys.push(value)
  }

  return Object.entries(lines).flatMap(([key, {xs, ys}]) => {
    const [xss, yss] = simplify(xs, ys, epsilon)
    const entryPoints: DiagramEntryPoint[] = new Array(xss.length)

    for (let i = xss.length; i--; ) {
      const time = xss[i]
      const value = yss[i]
      entryPoints[i] = {key, time, value}
    }

    return entryPoints
  })
}

export const simplifyDiagramEntryPointToMaxPoints = (
  arr: DiagramEntryPoint[],
  points = 1000,
  minimalPoints = 200
): DiagramEntryPoint[] => {
  if (arr.length < points) return arr

  const s = simplifyDiagramEntryPoint

  let low = {arr, epsiolon: 0}
  let high = {arr: s(arr, 1), epsiolon: 1}

  for (let i = 15; i--; ) {
    const halfDist = (high.epsiolon - low.epsiolon) / 2
    const center = halfDist + low.epsiolon

    const newArr = s(arr, center)

    // console.log(`${i.toString().padStart(2)} ${low.arr.length.toString().padStart(8)} ${newArr.length.toString().padStart(8)} ${high.arr.length.toString().padStart(8)}`)
    // console.log(`   ${low.epsiolon.toFixed(6).padStart(8)} ${center.toFixed(6).padStart(8)} ${high.epsiolon.toFixed(6).padStart(8)}`)

    // epsilon is low significant that it's no longer differs array size
    if (low.arr.length === newArr.length) break

    if (newArr.length < points) {
      high = {arr: newArr, epsiolon: center}
    } else {
      low = {arr: newArr, epsiolon: center}
    }

    // we are close enough to stop algorithm
    if (Math.floor(high.arr.length / 10) === Math.floor(points / 10)) break
  }

  // alternative way for straight lines
  // todo: test more
  if (high.arr.length < minimalPoints) {
    const step = arr.length / minimalPoints
    const newArr = [arr[0]]
    for (let i = 1; i < minimalPoints - 1; i++) {
      newArr.push(arr[Math.floor(i * step)])
    }
    newArr.push(arr[arr.length - 1])

    return newArr
  }

  return high.arr
}

export const applyRetention = (
  arr: DiagramEntryPoint[],
  retentionTimeMs: number
): void => {
  if (retentionTimeMs === Infinity || retentionTimeMs === 0) return
  if (retentionTimeMs < 0)
    throw new Error(`retention time has to be bigger than zero`)

  const now = Date.now()
  const cutTime = now - retentionTimeMs

  for (let i = arr.length; i--; ) {
    if (arr[i].time < cutTime) {
      // TODO: splice is slow, replace with faster removing
      arr.splice(i, 1)
    }
  }
}

export const getDiagramEntyPointLatestValues = (
  arr: DiagramEntryPoint[]
): DiagramEntryPoint[] => {
  if (!arr.length) return []
  const latests = new Map<string, DiagramEntryPoint>()
  for (let i = arr.length; i--; ) {
    const x = arr[i]
    const {key, time} = x
    const latest = latests.get(key)
    if (!latest || latest.time < time) latests.set(key, x)
  }
  return Array.from(latests.entries()).map((x) => x[1])
}
