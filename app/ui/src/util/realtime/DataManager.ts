import {
  MinAndMax,
  pushBigArray,
  DiagramEntryPoint,
  simplifyDiagramEntryPointToMaxPoints,
} from '.'

const DAY_MILLIS = 24 * 60 * 60 * 1000

export const MASK_TIME = 'hh:mm:ss'
export const MASK_DATE = 'DD/MM/YY'
export const MASK_DATE_TIME = `${MASK_DATE} ${MASK_TIME} `

/**
 * [time, value]
 */
type TimeValue = [number, number]

type TimeValueLines = Record<string, TimeValue[]>

/**
 * [lat, lng, time]
 */
export type LatLonTime = [number, number, number]

export type DataManagerOnChangeEvent = {
  target: DataManager
  /** all keys with changed data (added/removed) */
  changedKeys: string[]
  /** all keys with changed data entry with highest time (added/removed) */
  lastValueChangedKeys: string[]
  retentionChanged: boolean
  timeWindowChanged: boolean
}
export type DataManagerDataChangedCallback = (
  e: DataManagerOnChangeEvent
) => void

const keysToString = (keys: string[]) =>
  [...keys]
    .sort()
    .map((x) => x.replaceAll(',', '\\,'))
    .join(', ')
// TODO: fix keys with \,
const stringToKeys = (string: string) => string.split(', ')

const mergeMinMax = (
  ...mms: (MinAndMax | undefined)[]
): MinAndMax | undefined => {
  if (!mms.some((x) => x)) return undefined
  let min = Infinity
  let max = -Infinity
  for (let i = mms.length; i--; ) {
    const mm = mms[i]
    if (!mm) continue
    min = Math.min(min, mm.min)
    max = Math.max(max, mm.max)
  }
  return {min, max}
}

const sortLine = (arr: TimeValue[]) => {
  arr.sort((a, b) => a[0] - b[0])
}

const containsSame = <T>(arr: T[], arr2: T[]) =>
  arr.some((x) => arr2.some((y) => x === y))

const timeValueLinesToDiagramEntryPoint = (
  lines: TimeValueLines,
  keys: string[] | undefined = undefined
) => {
  const nonNullKeys = keys ?? Object.keys(lines)

  const len = nonNullKeys
    .map((x) => lines[x]?.length ?? 0)
    .reduce((a, b) => a + b, 0)
  const arr: DiagramEntryPoint[] = new Array(len)

  let lastIndex = 0

  nonNullKeys.forEach((key) => {
    const line = lines[key]
    if (!line) return
    for (let i = line.length; i--; ) {
      const [time, value] = line[i]
      arr[lastIndex] = {key, time, value}
      lastIndex++
    }
  })

  arr.sort((a, b) => a.time - b.time)

  return arr
}

/**
 * Extracts latlon pairs and return them as LatLonTime for realtime-map
 */
const diagramEntryPointsToMapTimePoints = (
  data: DiagramEntryPoint[],
  latLonKeys: [string, string] = ['Lat', 'Lon']
): LatLonTime[] => {
  const [latKey, lonKey] = latLonKeys
  const lats = data.filter((x) => x.key === latKey)
  const lons = data.filter((x) => x.key === lonKey)
  const pointHashMap: Map<number, LatLonTime> = new Map()
  const points: LatLonTime[] = new Array(lats.length)

  for (let i = lats.length; i--; ) {
    const {time, value} = lats[i]
    const point: LatLonTime = [value, undefined as any, time]
    pointHashMap.set(time, point)
    points[i] = point
  }

  for (let i = lons.length; i--; ) {
    const {time, value} = lons[i]
    const entry = pointHashMap.get(time)
    if (entry) entry[1] = value
  }

  let length = points.length
  for (let i = length; i--; ) {
    if (points[i][1] === undefined) {
      length--
      points[i] = points[length]
    }
  }
  points.length = length
  points.sort((a, b) => a[2] - b[2])

  return points
}

const DiagramEntryPointsToTimeValueLines = (arr: DiagramEntryPoint[]) => {
  const len = arr.length
  const lines: TimeValueLines = {}
  for (let i = 0; i < len; i++) {
    const entry = arr[i]
    if (!lines[entry.key]) lines[entry.key] = []
    const line = lines[entry.key]
    line.push([entry.time, entry.value])
  }
  Object.values(lines).forEach(sortLine)
  return lines
}

const pushTimeValueLines = (self: TimeValueLines, second: TimeValueLines) => {
  Object.entries(second).forEach(([key, newLineData]) => {
    if (newLineData.length === 0) return

    const line = self[key]
    if (!line) {
      self[key] = []
      pushBigArray(self[key], newLineData)
    } else if (line.length === 0) {
      pushBigArray(self[key], newLineData)
    } else {
      const isOverlaping = line[line.length - 1][0] > newLineData[0][0]
      pushBigArray(self[key], newLineData)
      if (isOverlaping) {
        sortLine(line)
      }
    }
  })
}

/**
 * state management for realtime components
 * encapsulates logic for
 *  - retention time based on current time
 *  - simplification
 *  - merge lat/lon for map
 *  - interval redraw when no new data sent
 */
export class DataManager {
  private _data: TimeValueLines = {}
  private _dataLastUpdated: Record<string, number> = {}
  private _retentionTimeMs = Infinity
  private _retentionTimeMsLastUpdated = 0

  // remove after changed keys implemented
  private _allKeys: Record<string, true> = {}

  // todo: use this for no data at react state
  get availebleFields(): string[] {
    return Object.entries(this._data)
      .filter(([, x]) => x.length)
      .map((x) => x[0])
  }

  private readonly _onChangeCallbacks: DataManagerDataChangedCallback[] = []

  public addOnChange(fnc: DataManagerDataChangedCallback): void {
    this._onChangeCallbacks.push(fnc)
  }

  public removeOnChange(fnc: DataManagerDataChangedCallback): void {
    const i = this._onChangeCallbacks.findIndex((x) => x === fnc)
    if (i !== -1) {
      this._onChangeCallbacks.splice(i, 1)
    }
  }

  private _callOnChange() {
    this._onChangeCallbacks.forEach((callback) =>
      // todo: optimize by checking what realy changed
      callback({
        changedKeys: Object.keys(this._allKeys),
        lastValueChangedKeys: Object.keys(this._allKeys),
        retentionChanged: true,
        target: this,
        timeWindowChanged: true,
      })
    )
  }

  get retentionTimeMs(): number {
    return this._retentionTimeMs
  }

  set retentionTimeMs(ms: number) {
    this._retentionTimeMs = ms
    this.applyRetentionOnData()
  }

  get retentionUsed(): boolean {
    return this._retentionTimeMs !== Infinity && this._retentionTimeMs > 0
  }

  /** returns range where max=now, min=max-retentionTime */
  get liveTimeWindow(): MinAndMax | undefined {
    if (this.retentionUsed)
      return {max: Date.now(), min: Date.now() - this.retentionTimeMs}
    return undefined
  }

  public timeWindowRasterSize = 100
  /** similar to liveTimeWindow but rasterized */
  get timeWindow(): MinAndMax | undefined {
    const window = this.liveTimeWindow
    if (window) {
      const {min, max} = window
      const r = this.timeWindowRasterSize
      const minr = Math.floor(min / r) * r
      const maxr = Math.ceil(max / r) * r
      return {min: minr, max: maxr}
    }
    return undefined
  }

  applyRetentionOnData(): void {
    const window = this.timeWindow
    if (!window) return
    const cutTime = window.min

    const changedKeys = Object.entries(this._data)
      .filter((entry) => {
        const entriesArr = entry[1]
        const len = entriesArr.length
        let toRemove = -1
        while (++toRemove < len && entriesArr[toRemove][0] < cutTime);
        entriesArr.splice(0, toRemove)
        return toRemove > 0
      })
      .map((x) => x[0])
    this._clearSimplifiedCacheForKeys(changedKeys)
  }

  updateData(newData: DiagramEntryPoint[] | undefined): void {
    if (newData === undefined) this._data = {}
    else {
      const newLines = DiagramEntryPointsToTimeValueLines(newData)
      pushTimeValueLines(this._data, newLines)
      this._clearSimplifiedCacheForKeys(Object.keys(newLines))
      Object.keys(newLines).forEach((x) => (this._allKeys[x] = true))
    }

    this.applyRetentionOnData()
    this._callOnChange()
  }

  private _simplifiedDataCache: Record<string, DiagramEntryPoint[]> = {}
  private _clearSimplifiedCacheForKeys(keys: string[]) {
    const k = this._simplifiedDataCache
    Object.keys(k)
      .filter((x) => containsSame(stringToKeys(x), keys))
      .forEach((x) => {
        delete k[x]
      })
  }

  calculateSimplifyedData(keys: string[]): DiagramEntryPoint[] {
    const key = keysToString(keys)

    if (this._simplifiedDataCache[key]) return this._simplifiedDataCache[key]

    if (!keys.length) {
      return []
    } else if (keys.length > 1) {
      this._simplifiedDataCache[key] = ([] as DiagramEntryPoint[])
        .concat(...keys.map((x) => this.calculateSimplifyedData([x])))
        .sort((a, b) => a.time - b.time)
    } else {
      const data = this._data[key]
      this._simplifiedDataCache[key] = data
        ? simplifyDiagramEntryPointToMaxPoints(
            data.map(([time, value]) => ({time, value, key}))
          )
        : []
    }

    return this._simplifiedDataCache[key]
  }

  getDataTimeMinMax(keys: string[] | string): MinAndMax | undefined {
    if (Array.isArray(keys)) {
      return mergeMinMax(...keys.map((x) => this.getDataTimeMinMax(x)))
    }
    const line = this._data[keys]
    const len = line?.length
    return len ? {min: line[0][0], max: line[len - 1][0]} : undefined
  }

  getLatestDataPoint(keys: string[] | string): DiagramEntryPoint | undefined {
    if (Array.isArray(keys)) {
      const points = keys.map((x) => this.getLatestDataPoint(x))
      const maxTime = Math.max(
        -1,
        ...(points.map((x) => x?.time).filter((x) => x) as number[])
      )
      return points.find((p) => p?.time === maxTime)
    }
    const line = this._data[keys]
    const lastPoint = line?.[line?.length - 1]
    return lastPoint
      ? {key: keys, time: lastPoint[0], value: lastPoint[1]}
      : undefined
  }

  getMask(keys: string[] | string): string {
    const minMax = this.getDataTimeMinMax(keys)
    if (!minMax) return ''
    const {max, min} = minMax
    if (min + 3 * DAY_MILLIS < max) return MASK_DATE
    else if (min + DAY_MILLIS < max) return MASK_DATE_TIME
    else return MASK_TIME
  }

  // TODO: caching
  getLatLonTime(latLonKey: [string, string] = ['Lat', 'Lon']): LatLonTime[] {
    const depData = timeValueLinesToDiagramEntryPoint(this._data, latLonKey)
    return diagramEntryPointsToMapTimePoints(depData, latLonKey)
  }
}
