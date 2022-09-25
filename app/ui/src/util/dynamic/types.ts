/*
  This file has corresponding schema file, update this schema file too. (app\server\dynamic\schema.json)
*/

export type DashboardCellLayout = {
  /** position from left 0-11 */
  x: number
  /** position from top */
  y: number
  /** width - x coord */
  w: number
  /** height - y coord */
  h: number
}

export type DashboardCellType = 'svg' | 'plot' | 'geo' | 'md'

export type DashboardCellSvg = {
  type: 'svg'
  layout: DashboardCellLayout
  field: string | string[]
  file: string
}

// TODO: add to schema
export type DashboardCellGeoOpts = {
  zoom?: number
  dragable?: boolean
}

export type DashboardCellGeo = {
  type: 'geo'
  layout: DashboardCellLayout
  latField: string
  lonField: string
  Live: DashboardCellGeoOpts
  Past: DashboardCellGeoOpts
}

export type DashboardCellPlotType = 'gauge' | 'line'

export type DashboardCellPlotGauge = {
  type: 'plot'
  layout: DashboardCellLayout
  plotType: 'gauge'
  field: string
  label: string
  range: {
    min: number
    max: number
  }
  unit: string
  decimalPlaces: number
}

export type DashboardCellPlotLine = {
  layout: DashboardCellLayout
  type: 'plot'
  plotType: 'line'
  field: string | string[]
  label: string
}

export type DashboardCellMd = {
  layout: DashboardCellLayout
  type: 'md'
  md: string
}

export type DashboardCellPlot = DashboardCellPlotGauge | DashboardCellPlotLine

export type DashboardCell =
  | DashboardCellSvg
  | DashboardCellPlot
  | DashboardCellGeo
  | DashboardCellMd

export type DashboardSupportedDevices = {
  /** Device field/tag. e.g. mobile, virtual, WS-ESP8266  */
  deviceTypes?: string[]
  /** clientId field/tag. e.g. WS-abc123blah, virtual_device */
  devices?: string[]
}

export type DashboardDefinitionLayout = DashboardCell[]

// TODO: height/width and other props of react grid
export type DashboardDefiniton = {
  cells: DashboardDefinitionLayout
  noDeviceCells?: DashboardDefinitionLayout
  supportedDevices?: DashboardSupportedDevices
}

export const CELL_TYPES: readonly DashboardCellType[] = [
  'plot',
  'geo',
  'svg',
  'md',
]
export const PLOT_TYPES: readonly DashboardCellPlotType[] = ['line', 'gauge']

export const isDashboarCellSvg = (c: DashboardCell): c is DashboardCellSvg => {
  return c.type === 'svg'
}
