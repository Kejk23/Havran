import React, {
  FunctionComponent,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import {RouteComponentProps} from 'react-router-dom'
import {Button, Row, Select, Tooltip} from 'antd'
import PageContent, {Message} from './PageContent'
import {IconRefresh, IconSettings, COLOR_LINK, COLOR_PRIMARY} from '../styles'
import ReactGridLayoutFixed from '../util/ReactGridLayoutFixed'

import {
  flux,
  fluxDuration,
  fluxExpression,
  InfluxDB,
} from '@influxdata/influxdb-client-browser'
import {GaugeOptions, LineOptions, Datum} from '@antv/g2plot'
import {Table as GiraffeTable} from '@influxdata/giraffe'
import {VIRTUAL_DEVICE} from '../App'
import {DeviceInfo} from './DevicesPage'
import {
  DataManagerDataChangedCallback,
  DiagramEntryPoint,
} from '../util/realtime'
import {queryTable} from '../util/queryTable'
import {
  asArray,
  DataManager,
  ManagedG2Plot,
  ManagedMap,
  ManagedSvg,
  MinAndMax,
} from '../util/realtime'
import {DataManagerContextProvider, useWebSocket} from '../util/realtime/react'
import {PlusOutlined, SettingOutlined} from '@ant-design/icons'
import {ManagedComponentReact} from '../util/realtime/react/ManagedComponentReact'
import {
  DashboardCellPlotGauge,
  DashboardCellPlotLine,
  DashboardCellPlot,
  DashboardCellLayout,
  DashboardCell,
  DashboardDefinitionLayout,
} from '../util/dynamic/types'
import {createCopyOf, useLoading, useRefresh} from '../util/dynamic'
import {
  CreateNewDashboardPage,
  DASHBOARD_SELECT_CREATE_NEW_OPTION,
  DynamicDashboardTitle,
  CellEdit,
} from '../util/dynamic/components'
import {DashboardSettings} from '../util/dynamic/components/DashboardSettings'
import {useDashboards} from '../util/dynamic/dashboardsHook'
import Markdown from '../util/Markdown'

const NO_CLIENT = '<no-client>'
const SELECT_CLIENT = '<select-client>'

// TODO: file upload JSON definition of dashboardu with JSON schema for validation
// TODO: svg upload with escape for script for secure usage
// TODO: time component that shows current server time
// TODO: add comments to json schema
// TODO: if no device availeble and filters applied, show in device select filters can be changed
// TODO: dashboard doesn't exist page instead of redirect

/*
 ********************************************
 * This page is adaptation of DashboardPage *
 ********************************************
 */

const fetchDevices = async () => {
  const response = await fetch('/api/devices')
  if (response.status >= 300) {
    const text = await response.text()
    throw new Error(`${response.status} ${text}`)
  }
  return (await response.json()) as DeviceInfo[]
}

interface DeviceConfig {
  influx_url: string
  influx_org: string
  influx_token: string
  influx_bucket: string
  id: string
}

export const fetchDeviceConfig = async (
  clientId: string
): Promise<DeviceConfig> => {
  const response = await fetch(
    `/api/env/${clientId}?register=${clientId === VIRTUAL_DEVICE}`
  )
  if (response.status >= 300) {
    const text = await response.text()
    throw new Error(`${response.status} ${text}`)
  }
  const deviceConfig: DeviceConfig = await response.json()
  if (!deviceConfig.influx_token) {
    throw new Error(`Device '${clientId}' is not authorized!`)
  }
  return deviceConfig
}

const fetchDeviceFields = async (
  config: DeviceConfig,
  timeStart = '-30d'
): Promise<string[]> => {
  const {
    // influx_url: url, // use '/influx' proxy to avoid problem with InfluxDB v2 Beta (Docker)
    influx_token: token,
    influx_org: org,
    influx_bucket: bucket,
    id,
  } = config
  const queryApi = new InfluxDB({url: '/influx', token}).getQueryApi(org)
  const result = await queryTable(
    queryApi,
    flux`
    import "influxdata/influxdb/schema"
    schema.fieldKeys(
      bucket: ${bucket},
      predicate: (r) => r["_measurement"] == "environment" and r["clientId"] == ${id},
      start: ${fluxDuration(timeStart)}
    )
    `
  )
  return result?.getColumn('_value', 'string') ?? []
}

const fetchDeviceMeasurements = async (
  config: DeviceConfig,
  timeStart = '-30d',
  fields: string[]
): Promise<GiraffeTable> => {
  const {
    // influx_url: url, // use '/influx' proxy to avoid problem with InfluxDB v2 Beta (Docker)
    influx_token: token,
    influx_org: org,
    influx_bucket: bucket,
    id,
  } = config
  const queryApi = new InfluxDB({url: '/influx', token}).getQueryApi(org)
  const fieldsFilterString = fields
    .map((field) => `r["_field"] == "${field}"`)
    .join(' or ')
  const fieldsFilter =
    fields.length > 0
      ? flux`|> filter(fn: (r) => ${fluxExpression(fieldsFilterString)})`
      : ''

  const query = flux`
    from(bucket: ${bucket})
      |> range(start: ${fluxDuration(timeStart)})
      |> filter(fn: (r) => r._measurement == "environment")
      |> filter(fn: (r) => r.clientId == ${id})
      ${fluxExpression(fieldsFilter)}
    `
  const result = await queryTable(queryApi, query)
  return result
}

// fetchDeviceDataFieldLast replaced by taking data from fetchDeviceMeasurements

// we have replaced giraffe with non-react library to handle faster rerendering

/** gauges style based on mesurement definitions */
const gaugesPlotOptionsFor = ({
  decimalPlaces,
  range: {max, min},
  unit,
  layout: {h},
}: DashboardCellPlotGauge): Omit<GaugeOptions, 'percent'> & MinAndMax => ({
  min,
  max,
  range: {
    ticks: [0, 1],
    color: `l(0) 0:${COLOR_PRIMARY} 1:${COLOR_LINK}`,
    width: 15,
  },
  indicator: {
    pointer: {
      style: {stroke: 'gray'},
    },
    pin: {
      style: {stroke: 'gray'},
    },
  },
  axis: {
    position: 'bottom',
    label: {
      formatter: (v: string) => (+v * (max - min) + min).toFixed(0),
      offset: -30,
      style: {
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'Rubik',
        fill: '#55575E',
        shadowColor: 'white',
      },
    },
    tickLine: {
      // length: 10,
      style: {
        lineWidth: 3,
      },
    },
    subTickLine: {
      count: 9,
      // length: 10,
      style: {
        lineWidth: 1,
      },
    },
  },
  statistic: {
    content: {
      formatter: (x: Datum | undefined) =>
        x
          ? `${(+x.percent * (max - min) + min).toFixed(
              decimalPlaces ?? 0
            )}${unit}`
          : '',
      style: {},
      offsetY: 30,
    },
  },
  height: 80 * h - 28,
  padding: [0, 0, 10, 0],
  renderer: 'svg',
})

/** line plots style based on mesurement definitions */
const linePlotOptionsFor = ({
  layout: {h},
}: DashboardCellPlotLine): Omit<LineOptions, 'data'> => ({
  height: 80 * h - 28,
  legend: false,
  lineStyle: {
    color: COLOR_PRIMARY,
    lineWidth: 4,
  },
})

const plotOptionsFor = (
  opts: DashboardCellPlot & {layout: DashboardCellLayout}
) => {
  if (opts.plotType === 'gauge') return gaugesPlotOptionsFor(opts)
  if (opts.plotType === 'line') return linePlotOptionsFor(opts)
  throw new Error(
    `Invalid plot cell type! ${JSON.stringify((opts as any)?.plotType)}`
  )
}

// #region Realtime

/** Data returned from websocket in line-protocol-like shape */
type RealtimePoint = {
  measurement: string
  tagPairs: string[]
  fields: Record<string, number | boolean | string>
  timestamp: string
}
type RealtimeSubscription = {
  /** influxdb measurement value */
  measurement: string
  /** tag format 'tagName=tagValue'. Point is sent to client when matches all tags. */
  tags: string[]
}

const host =
  process.env.NODE_ENV === `development`
    ? window.location.hostname +
      ':' +
      (process.env.REACT_APP_SERVER_PORT || 5000)
    : window.location.host
const wsAddress = `ws://${host}/mqtt`

/** length of unix time with milliseconds precision */
const MILLIS_TIME_LENGTH = 13
/** Transform timestamps to millis for point. (Points can have different precission) */
const pointTimeToMillis = (p: RealtimePoint): RealtimePoint => ({
  ...p,
  timestamp: p.timestamp
    .substr(0, MILLIS_TIME_LENGTH)
    .padEnd(MILLIS_TIME_LENGTH, '0'),
})

/**
 * subscribes for data to servers broker.js via websocket
 * when any subscription present
 */
const useRealtimeData = (
  subscriptions: RealtimeSubscription[],
  onReceivePoints: (pts: RealtimePoint[]) => void
) => {
  const wsInit = useCallback<(ws: WebSocket) => void>(
    (ws) => {
      ws.onopen = () => ws.send('subscribe:' + JSON.stringify(subscriptions))
      ws.onmessage = (response) =>
        onReceivePoints(
          (JSON.parse(response.data) as RealtimePoint[]).map(pointTimeToMillis)
        )
    },
    [subscriptions, onReceivePoints]
  )
  useWebSocket(wsInit, wsAddress, !!subscriptions.length)
}

// transformations for both InfluxDB and Realtime sources so we can use them same way independently of the source

/** transformation for realtime data returned by websocket */
const realtimePointToDiagrameEntryPoint = (points: RealtimePoint[]) => {
  const newData: DiagramEntryPoint[] = []

  for (const p of points) {
    const fields = p.fields
    const time = Math.floor(+p.timestamp)

    for (const key in fields) {
      const value = fields[key] as number
      newData.push({key, time, value})
    }
  }

  return newData
}

/** transformation for field based giraffe table */
const giraffeTableToDiagramEntryPoints = (
  table: GiraffeTable | undefined
): DiagramEntryPoint[] => {
  if (!table) return []
  const length = table.length
  const timeCol =
    table.getColumn('_time', 'number') ||
    table.getColumn('_start', 'number') ||
    table.getColumn('_stop', 'number')
  const fieldCol = table.getColumn('_field', 'string')
  const valueCol = table.getColumn('_value', 'number')
  if (!timeCol || !fieldCol || !valueCol) return []

  const data: DiagramEntryPoint[] = Array(length)

  for (let i = length; i--; ) {
    data[i] = {key: fieldCol[i], time: timeCol[i], value: valueCol[i]}
  }

  let newLength = data.length
  for (let i = data.length; i--; ) {
    if (data[i].value == null || data[i].time == null) {
      newLength--
      data[i] = data[newLength]
    }
  }
  data.length = newLength

  data.sort((a, b) => a.time - b.time)

  return data
}

// #endregion Realtime

/**
 * definitions for time select. (Live options)
 * realtime options contains retention to be used in plots
 */
const timeOptionsRealtime: {
  label: string
  value: string
  realtimeRetention: number
}[] = [
  {label: 'Live 10s', value: '-10s', realtimeRetention: 10_000},
  {label: 'Live 30s', value: '-30s', realtimeRetention: 30_000},
  {label: 'Live 1m', value: '-1m', realtimeRetention: 60_000},
]

/**
 * definitions for time select. (Past options)
 */
const timeOptions: {label: string; value: string}[] = [
  {label: 'Past 5m', value: '-5m'},
  {label: 'Past 15m', value: '-15m'},
  {label: 'Past 1h', value: '-1h'},
  {label: 'Past 6h', value: '-6h'},
  {label: 'Past 1d', value: '-1d'},
  {label: 'Past 3d', value: '-3d'},
  {label: 'Past 7d', value: '-7d'},
  {label: 'Past 30d', value: '-30d'},
]

const getIsRealtime = (timeStart: string) =>
  timeOptionsRealtime.some((x) => x.value === timeStart)

interface PropsRoute {
  clientId?: string
  dashboard?: string
}

interface Props {
  helpCollapsed: boolean
  mqttEnabled: boolean | undefined
}

/** Selects source based on timeStart, normalize and feed data into DataManager */
const useSource = (
  clientId: string | undefined,
  timeStart: string,
  fields: string[],
  dataStamp: number,
  setMessage: (msg: Message | undefined) => void
) => {
  const [state, setState] = useState({
    loading: false,
    manager: new DataManager(),
    availableFields: [] as string[],
  })

  const addAvailableFields = (fields: string[]) => {
    setState((s) =>
      fields.some((x) => !s.availableFields.some((y) => x === y))
        ? {
            ...s,
            availableFields: s.availableFields
              .concat(
                fields.filter((x) => !s.availableFields.some((y) => x === y))
              )
              .sort(),
          }
        : s
    )
  }

  useEffect(() => {
    const manager = state.manager
    const updateAvailableFields: DataManagerDataChangedCallback = (e) => {
      addAvailableFields(e.changedKeys)
    }
    manager.addOnChange(updateAvailableFields)

    return () => manager.removeOnChange(updateAvailableFields)
  }, [state.manager])

  const isRealtime = getIsRealtime(timeStart)

  // #region realtime

  const [subscriptions, setSubscriptions] = useState<RealtimeSubscription[]>([])
  // updaters are functions that updates plots outside of react state

  /** plot is showed with fixed time range if set */
  const retentionTimeMs = isRealtime
    ? timeOptionsRealtime[
        timeOptionsRealtime.findIndex((x) => x.value === timeStart)
      ].realtimeRetention
    : Infinity

  useEffect(() => {
    state.manager.retentionTimeMs = retentionTimeMs
  }, [retentionTimeMs, state.manager])

  useEffect(() => {
    setSubscriptions(
      clientId && isRealtime
        ? [{measurement: 'environment', tags: [`clientId=${clientId}`]}]
        : []
    )
  }, [clientId, isRealtime])

  const updateData = useCallback(
    (points: DiagramEntryPoint[] | undefined) => {
      if (points?.length) state.manager.updateData(points)
    },
    [state.manager]
  )

  /** Clear data and resets received data fields state */
  const clearData = useRef(() => {
    state.manager.updateData(undefined)
  }).current

  useRealtimeData(
    subscriptions,
    useRef((points: RealtimePoint[]) => {
      updateData(realtimePointToDiagrameEntryPoint(points))
    }).current
  )

  useEffect(() => {
    if (isRealtime) clearData()
  }, [isRealtime, clearData])
  useEffect(clearData, [clientId, clearData])

  // #endregion realtime

  // fetch device configuration and data
  useEffect(() => {
    const fetchData = async () => {
      clearData()
      if (!clientId) return
      setState((s) => (!s.loading ? {...s, loading: true} : s))
      try {
        const config = await fetchDeviceConfig(clientId)
        const table = await fetchDeviceMeasurements(config, timeStart, fields)
        const dataPoints = giraffeTableToDiagramEntryPoints(table)
        updateData(dataPoints)
        const availableFields = await fetchDeviceFields(config, timeStart)
        addAvailableFields(availableFields)
      } catch (e) {
        setMessage({
          title: 'Cannot fetch data',
          description: String(e),
          type: 'error',
        })
      } finally {
        setState((s) => (s.loading ? {...s, loading: false} : s))
      }
    }

    // fetch data only if not in realtime mode
    if (!isRealtime) fetchData()
    else
      setState((s) =>
        s.availableFields.length ? {...s, availableFields: []} : s
      )
  }, [
    clientId,
    timeStart,
    isRealtime,
    dataStamp,
    fields,
    clearData,
    updateData,
    setMessage,
  ])

  return state
}

export const DashboardCellComponent: FunctionComponent<{
  cell: DashboardCell
  svgStrings: Record<string, string>
}> = ({cell, svgStrings}) => {
  return (
    <div style={{height: '100%', width: '100%', backgroundColor: 'white'}}>
      <div
        style={{
          height: 28,
          paddingLeft: 10,
          paddingTop: 5,
          // borderBottomColor:"gray", borderBottomWidth:"1px", borderBottomStyle:"solid"
        }}
      >
        {'label' in cell ? cell.label : ''}
      </div>
      <div
        style={{
          height: 'calc(100% - 28px)',
          width: '100%',
          padding: '0px 20px 20px 20px',
        }}
      >
        {cell.type === 'plot' ? (
          <ManagedComponentReact
            component={ManagedG2Plot}
            keys={asArray(cell.field)}
            props={{ctor: cell.plotType, options: plotOptionsFor(cell)}}
          />
        ) : undefined}
        {cell.type === 'geo' ? (
          <ManagedComponentReact
            component={ManagedMap}
            keys={[cell.latField, cell.lonField]}
            props={{}}
          />
        ) : undefined}
        {cell.type === 'svg' ? (
          <ManagedComponentReact
            component={ManagedSvg}
            keys={asArray(cell.field)}
            // TODO: add renderer option into definition file
            props={{svgString: svgStrings[cell.file], renderer: 'svg'}}
          />
        ) : undefined}
        {cell.type === 'md' ? <Markdown source={cell.md} /> : undefined}
      </div>
    </div>
  )
}

type DashboardLayoutProps = {
  cells: DashboardDefinitionLayout
  svgStrings?: Record<string, string>
  onCellsChanged?: (l: DashboardDefinitionLayout) => void
  onCellEdit?: (i: number) => void
  isEditing: boolean
}

/**
 * render dashboard cells for layout, data passed by context
 */
const DashboardGrid: React.FC<DashboardLayoutProps> = ({
  cells,
  svgStrings = {},
  onCellsChanged = () => undefined,
  onCellEdit = () => undefined,
  isEditing,
}) => {
  return (
    <ReactGridLayoutFixed
      cols={12}
      rowHeight={80}
      onLayoutChange={(e) => {
        let changed = false
        const cellsCpy = createCopyOf(cells).map((cell, i) => ({
          ...cell,
          layout: (() => {
            const {x, y, w, h} = e[i]
            const newLayout = {x, y, w, h}
            if (
              cell.layout.x !== x ||
              cell.layout.y !== y ||
              cell.layout.w !== w ||
              cell.layout.h !== h
            ) {
              changed = true
            }

            return newLayout
          })(),
        }))
        // TODO: remove this after comparator done
        if (changed) onCellsChanged(cellsCpy)
        else onCellsChanged(cells)
      }}
      isDraggable={isEditing}
      isResizable={isEditing}
    >
      {cells.map((cell, i) => (
        <div
          key={JSON.stringify({cell, i})}
          data-grid={cell.layout}
          style={{position: 'relative'}}
        >
          {isEditing ? (
            <Button
              size="small"
              icon={<SettingOutlined />}
              style={{position: 'absolute', right: 10, top: 10}}
              onClick={() => {
                onCellEdit(i)
              }}
            />
          ) : undefined}
          <DashboardCellComponent {...{cell, svgStrings}} />
        </div>
      ))}

      <div
        key={cells.length}
        data-grid={{
          x: 0,
          y: 10000,
          w: 24,
          h: 3,
          isDraggable: false,
          isResizable: false,
        }}
        style={{...(isEditing ? {} : {display: 'none'})}}
      >
        <Button
          icon={<PlusOutlined />}
          type="dashed"
          style={{width: '100%', height: '100%', borderWidth: '3px'}}
          onClick={() => {
            onCellEdit(cells.length)
          }}
        ></Button>
      </div>
    </ReactGridLayoutFixed>
  )
}

const urlDynamic = (props: {dashboardKey?: string; clientId?: string}) =>
  `/dynamic${
    props.dashboardKey
      ? '/' + props.dashboardKey + (props.clientId ? '/' + props.clientId : '')
      : ''
  }`

const DynamicDashboardPage: FunctionComponent<
  RouteComponentProps<PropsRoute> & Props
> = ({match, history, mqttEnabled}) => {
  const clientId = match.params.clientId ?? NO_CLIENT
  const dashboardKey =
    match.params.dashboard ?? DASHBOARD_SELECT_CREATE_NEW_OPTION

  const isClientDefined = match.params.clientId !== undefined
  const hasClient = clientId !== NO_CLIENT

  const setClientId = useCallback(
    (clientId: string | undefined) =>
      history.push(urlDynamic({dashboardKey, clientId})),
    [dashboardKey, history]
  )
  const setDashboardKey = useCallback(
    (dashboardKey: string, preserveHistory = true) =>
      history[preserveHistory ? 'push' : 'replace'](
        urlDynamic({dashboardKey, clientId: match.params.clientId})
      ),
    [history, match.params.clientId]
  )

  const {loading, callWithLoading} = useLoading()
  const {refreshToken: dataRefreshToken, refresh: refreshData} = useRefresh()
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<Message | undefined>()
  const [clients, setDevices] = useState<DeviceInfo[] | undefined>(undefined)
  const [timeStart, setTimeStart] = useState(timeOptionsRealtime[0].value)
  const [editedCellIndex, setEditedCellIndex] = useState<number | undefined>()
  const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] = useState(false)

  const isRealtime = getIsRealtime(timeStart)

  const {
    dashboardKeys,
    refreshKeys,
    dashboardDefinition,
    setDashboardDefinition,
    refreshDashboard,
    svgStrings,
    fields,
    deviceFilter,

    cancelDashboardEdit,
    saveDashboard,
    deleteDashboard,
  } = useDashboards({
    callWithLoading,
    dashboardKey,
  })

  const availebleClients = useMemo(
    () => clients?.filter(deviceFilter) ?? [],
    [clients, deviceFilter]
  )

  const selectClientValue =
    isClientDefined && !hasClient && !isEditing && availebleClients.length
      ? SELECT_CLIENT
      : clientId

  const cells: DashboardDefinitionLayout = useMemo(
    () =>
      dashboardDefinition && hasClient
        ? dashboardDefinition?.cells
        : dashboardDefinition?.noDeviceCells ?? [],
    [dashboardDefinition, hasClient]
  )
  const setCells = useCallback(
    (cells: DashboardDefinitionLayout) => {
      if (!dashboardDefinition) return
      const dashboardDefinitionCpy = createCopyOf(dashboardDefinition)
      dashboardDefinitionCpy[hasClient ? 'cells' : 'noDeviceCells'] = cells
      setDashboardDefinition(dashboardDefinitionCpy)
    },
    [dashboardDefinition, hasClient, setDashboardDefinition]
  )

  const isCellEditorVisible = editedCellIndex !== undefined
  const editedCell = isCellEditorVisible ? cells[editedCellIndex] : undefined
  const onCellEditCancel = useCallback(() => {
    setEditedCellIndex(undefined)
  }, [])
  const onCellEditDone = useCallback(
    (cell: DashboardCell) => {
      if (editedCellIndex === undefined) return
      const cellsCpy = createCopyOf(cells)
      cellsCpy[editedCellIndex] = cell
      setCells(cellsCpy)
      setEditedCellIndex(undefined)
    },
    [cells, editedCellIndex, setCells]
  )
  const onCellDelete = useCallback(() => {
    if (editedCellIndex === undefined) return
    const cellsCpy = createCopyOf(cells)
    cellsCpy.splice(editedCellIndex, 1)
    setCells(cellsCpy)
    setEditedCellIndex(undefined)
  }, [cells, editedCellIndex, setCells])

  // select first dashboard if none selected
  useEffect(() => {
    if (!dashboardKeys || !dashboardKeys.length) return
    if (
      // no param set
      (match.params.dashboard === undefined &&
        dashboardKeys[0] !== undefined) ||
      // selected key doesn't exist
      !dashboardKeys
        .concat(DASHBOARD_SELECT_CREATE_NEW_OPTION)
        .some((x) => x === dashboardKey)
    ) {
      setDashboardKey(dashboardKeys[0], false)
    }
  }, [match.params.dashboard, dashboardKeys, dashboardKey, setDashboardKey])

  // select first filtered device if device not selected
  //   or not relevant for this dashboard
  useEffect(() => {
    if (loading) return
    if (
      (!isEditing && !isClientDefined && availebleClients.length) ||
      (hasClient && !availebleClients.some((x) => x.deviceId === clientId))
    )
      // TODO: message when changed?
      setClientId(availebleClients[0]?.deviceId)
  }, [
    availebleClients,
    clientId,
    hasClient,
    isClientDefined,
    isEditing,
    loading,
    setClientId,
  ])

  const {
    loading: loadingSource,
    manager,
    availableFields,
  } = useSource(
    hasClient ? clientId : undefined,
    timeStart,
    fields,
    dataRefreshToken,
    setMessage
  )

  useEffect(() => setIsEditing(false), [dashboardKey])

  // Default time selected to Past when mqtt not configured
  useEffect(() => {
    if (mqttEnabled === false) setTimeStart(timeOptions[0].value)
  }, [mqttEnabled])

  useEffect(() => {
    callWithLoading(async () => {
      try {
        const devices = await fetchDevices()
        setDevices(devices)
      } catch (e) {
        setMessage({
          title: 'Cannot fetch data',
          description: String(e),
          type: 'error',
        })
      }
    })
  }, [callWithLoading])

  const onEditCancel = useCallback(() => {
    cancelDashboardEdit()
    setIsEditing(false)
  }, [cancelDashboardEdit])

  const save = useCallback(() => {
    callWithLoading(async () => {
      await saveDashboard()
      setIsEditing(false)
    })
  }, [callWithLoading, saveDashboard])

  const onDeleteDashboard = useCallback(() => {
    callWithLoading(async () => {
      await deleteDashboard()
      refreshKeys()
    })
  }, [callWithLoading, deleteDashboard, refreshKeys])

  const pageControls = (
    <>
      <Row>
        <Tooltip title={'Choose dashboard'} placement="left">
          <Select
            value={dashboardKey}
            onChange={(key) => setDashboardKey(key)}
            style={{minWidth: 100}}
            loading={loadingSource || mqttEnabled === undefined}
            disabled={loadingSource || isEditing}
          >
            {dashboardKeys.map((key) => (
              <Select.Option key={key} value={key}>
                {key}
              </Select.Option>
            ))}
            <Select.Option
              key={DASHBOARD_SELECT_CREATE_NEW_OPTION}
              value={DASHBOARD_SELECT_CREATE_NEW_OPTION}
              style={{background: '#00d019', color: 'black'}}
            >
              {DASHBOARD_SELECT_CREATE_NEW_OPTION}
            </Select.Option>
          </Select>
        </Tooltip>

        <Tooltip title="Choose device" placement="top">
          <Select
            showSearch
            value={selectClientValue}
            placeholder={'select device to show'}
            showArrow={true}
            filterOption={true}
            // goes to dynamic page (instead of dashboard)
            onChange={(key) => setClientId(key)}
            style={{minWidth: 200, width: 350, marginLeft: 10}}
            loading={!clients}
            disabled={!clients}
          >
            {availebleClients.map(({deviceId}) => (
              <Select.Option key={deviceId} value={deviceId}>
                {deviceId}
              </Select.Option>
            ))}
            {isEditing ? (
              <Select.Option key={NO_CLIENT} value={NO_CLIENT}>
                {NO_CLIENT}
              </Select.Option>
            ) : undefined}
          </Select>
        </Tooltip>

        <Tooltip
          title={
            mqttEnabled === false
              ? 'MQTT not configured on server! \n Live values disabled'
              : ''
          }
          mouseLeaveDelay={0}
          mouseEnterDelay={0.5}
          placement="left"
        >
          <Tooltip title={'Choose time'} placement="top">
            <Select
              value={timeStart}
              onChange={setTimeStart}
              style={{minWidth: 100, marginLeft: 10}}
              loading={loadingSource || mqttEnabled === undefined}
              disabled={loadingSource}
            >
              {timeOptionsRealtime.map(({label, value}) => (
                <Select.Option
                  disabled={mqttEnabled === false}
                  key={value}
                  value={value}
                >
                  {label}
                </Select.Option>
              ))}
              {timeOptions.map(({label, value}) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Tooltip>
        </Tooltip>

        <Tooltip title="Reload Device Data">
          <Button
            // disable refresh when in realtime mode
            disabled={loadingSource || isRealtime || !hasClient}
            loading={loadingSource}
            onClick={refreshData}
            style={{marginLeft: 10}}
            icon={<IconRefresh />}
          />
        </Tooltip>

        <Tooltip title="Go to device settings" placement="topRight">
          <Button
            disabled={!hasClient}
            type="primary"
            icon={<IconSettings />}
            style={{marginLeft: 10}}
            href={`/devices/${clientId}`}
          ></Button>
        </Tooltip>
      </Row>
    </>
  )

  const unusedFields =
    dashboardKey === DASHBOARD_SELECT_CREATE_NEW_OPTION
      ? ''
      : availableFields.filter((x) => !fields.some((y) => y === x)).join(', ')

  const onEditDashboardKey = useCallback(() => {
    refreshKeys()
  }, [refreshKeys])

  return (
    <PageContent
      title={
        <DynamicDashboardTitle
          dashboardKey={dashboardKey ?? ''}
          {...{isEditing, setIsEditing}}
          onEditAccept={save}
          onEditCancel={onEditCancel}
          onDeleteDashboard={onDeleteDashboard}
          onOpenSettings={() => setIsDashboardSettingsOpen(true)}
          onReloadDashboard={refreshDashboard}
          // newTitle={newTitle}
          // setNewTitle={setNewTitle}
        />
      }
      titleExtra={pageControls}
      message={message}
      spin={loading || loadingSource}
      forceShowScroll={true}
    >
      <div
        style={{
          position: 'absolute',
          zIndex: 2,
          right: 0,
          top: -12,
          color: 'gray',
        }}
      >
        {isEditing && unusedFields?.length
          ? `unused fields: ${unusedFields}`
          : ''}
      </div>
      <DataManagerContextProvider value={manager}>
        <DashboardSettings
          {...{dashboardDefinition}}
          isOpen={isDashboardSettingsOpen}
          onDone={(l) => {
            setDashboardDefinition(l)
            setIsDashboardSettingsOpen(false)
          }}
          onCancel={() => {
            setIsDashboardSettingsOpen(false)
          }}
        />
        <CellEdit
          {...{
            editedCell,
            availableFields,
            clientId,
            hasClient,
            onCellEditCancel,
            onCellEditDone,
            onCellDelete,
          }}
          visible={isCellEditorVisible}
        />
        {dashboardDefinition ? (
          <DashboardGrid
            {...{svgStrings}}
            cells={cells}
            onCellsChanged={setCells}
            onCellEdit={setEditedCellIndex}
            isEditing={isEditing}
          />
        ) : undefined}
      </DataManagerContextProvider>

      {dashboardKey === DASHBOARD_SELECT_CREATE_NEW_OPTION ? (
        <CreateNewDashboardPage
          onEdit={onEditDashboardKey}
          {...{clientId: clientId}}
        />
      ) : undefined}
    </PageContent>
  )
}

export default DynamicDashboardPage
