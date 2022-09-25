import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {RouteComponentProps} from 'react-router-dom'
import PageContent, {Message} from './PageContent'
import {
  Button,
  Card,
  Select,
  Tooltip,
  Row,
  Col,
  Collapse,
  Empty,
  Divider,
} from 'antd'
import {Line, Gauge, GaugeOptions, LineOptions} from '@antv/g2plot'
import {InfoCircleFilled} from '@ant-design/icons'
import CollapsePanel from 'antd/lib/collapse/CollapsePanel'
import {IconRefresh, IconSettings, COLOR_LINK, COLOR_PRIMARY} from '../styles'
import {Table as GiraffeTable} from '@influxdata/giraffe'
import {flux, fluxDuration, InfluxDB} from '@influxdata/influxdb-client-browser'
import {queryTable} from '../util/queryTable'
import {
  DiagramEntryPoint,
  DataManager,
  ManagedG2Plot,
  ManagedMap,
} from '../util/realtime'
import {
  DataManagerContextProvider,
  useWebSocket,
  ManagedComponentReact,
} from '../util/realtime/react'
import {DeviceInfo} from './DevicesPage'
import {VIRTUAL_DEVICE} from '../App'

/*
 ********************************************
 * This page is adaptation of DashboardPage *
 ********************************************
 */

interface DeviceConfig {
  influx_url: string
  influx_org: string
  influx_token: string
  influx_bucket: string
  id: string
}

interface DeviceData {
  config: DeviceConfig
  measurementsTable?: GiraffeTable
}

const fetchDeviceConfig = async (deviceId: string): Promise<DeviceConfig> => {
  const response = await fetch(
    `/api/env/${deviceId}?register=${deviceId === VIRTUAL_DEVICE}`
  )
  if (response.status >= 300) {
    const text = await response.text()
    throw new Error(`${response.status} ${text}`)
  }
  const deviceConfig: DeviceConfig = await response.json()
  if (!deviceConfig.influx_token) {
    throw new Error(`Device '${deviceId}' is not authorized!`)
  }
  return deviceConfig
}

const fetchDeviceMeasurements = async (
  config: DeviceConfig,
  timeStart = '-30d'
): Promise<GiraffeTable> => {
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
  import "influxdata/influxdb/v1"    
  from(bucket: ${bucket})
    |> range(start: ${fluxDuration(timeStart)})
    |> filter(fn: (r) => r._measurement == "environment")
    |> filter(fn: (r) => r["_field"] == "Temperature" or r["_field"] == "TVOC" or r["_field"] == "Pressure" or r["_field"] == "Humidity" or r["_field"] == "CO2" or r["_field"] == "Lat" or r["_field"] == "Lon")
    |> filter(fn: (r) => r.clientId == ${id})
    |> v1.fieldsAsCols()`
  )
  return result
}

// fetchDeviceDataFieldLast replaced by taking data from fetchDeviceMeasurements

// we have replaced giraffe with non-react library to handle faster rerendering

type MeasurementDefinition = {
  min: number
  max: number
  unit: string
  decimalPlaces?: number
}

const measurementsDefinitions: Record<string, MeasurementDefinition> = {
  Temperature: {
    min: -10,
    max: 50,
    unit: '°C',
    decimalPlaces: 1,
  },
  Humidity: {
    min: 0,
    max: 100,
    unit: '%',
  },
  Pressure: {
    min: 800,
    max: 1100,
    unit: 'hPa',
  },
  CO2: {
    min: 300,
    max: 3500,
    unit: 'ppm',
  },
  TVOC: {
    min: 200,
    max: 2200,
    unit: '',
  },
}
const fields = Object.keys(measurementsDefinitions)
const fieldsLatLon = ['Lat', 'Lon']
const fieldsAll = fields.concat(...fieldsLatLon)

/** gauges style based on mesurement definitions */
const gaugesPlotOptions: Record<
  string,
  Omit<GaugeOptions, 'percent'>
> = Object.fromEntries(
  Object.entries(measurementsDefinitions).map(
    ([measurement, {max, min, unit, decimalPlaces}]) => [
      measurement,
      {
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
            formatter: (v) => (+v * (max - min) + min).toFixed(0),
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
            formatter: (x) =>
              x
                ? `${(+x.percent * (max - min) + min).toFixed(
                    decimalPlaces ?? 0
                  )}${unit}`
                : '',
            style: {},
            offsetY: 30,
          },
        },
        height: 150,
        padding: [0, 0, 10, 0],
        // renderer: "svg"
      },
    ]
  )
)

/** line plots style based on mesurement definitions */
const linePlotOptions: Record<
  string,
  Omit<LineOptions, 'data'>
> = Object.fromEntries(
  Object.keys(measurementsDefinitions).map((measurement) => [
    measurement,
    {
      height: 200,
      legend: false,
      lineStyle: {
        color: COLOR_PRIMARY,
        lineWidth: 4,
      },
    },
  ])
)

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

const HOST =
  process.env.NODE_ENV === `development`
    ? window.location.hostname +
      ':' +
      (process.env.REACT_APP_SERVER_PORT || '5000')
    : window.location.host
const WS_URL = `ws://${HOST}/mqtt`

/** length of unix time with milliseconds precision */
const MILLIS_TIME_LENGTH = 13
/** Transform timestamps to millis for point. (Points can have different precission) */
const pointTimeToMillis = (p: RealtimePoint): RealtimePoint => ({
  ...p,
  timestamp: p.timestamp
    .substring(0, MILLIS_TIME_LENGTH)
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
  useWebSocket(wsInit, WS_URL, !!subscriptions.length)
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

/** transformation for pivoted giraffe table */
const giraffeTableToDiagramEntryPoints = (
  table: GiraffeTable | undefined,
  tags: string[]
): DiagramEntryPoint[] => {
  if (!table) return []
  const length = table.length
  const timeCol =
    table.getColumn('_time', 'number') ||
    table.getColumn('_start', 'number') ||
    table.getColumn('_stop', 'number')
  if (!timeCol) return []

  const data: DiagramEntryPoint[] = Array(length * tags.length)

  for (let j = tags.length; j--; ) {
    const key = tags[j]
    const valueCol = table.getColumn(key, 'number') as number[]
    for (let i = length; i--; ) {
      const value = valueCol?.[i]
      const time = timeCol?.[i]
      data[i + j * length] = {key, time, value}
    }
  }

  {
    let length = data.length
    for (let i = data.length; i--; ) {
      if (data[i].value == null || data[i].time == null) {
        length--
        data[i] = data[length]
      }
    }
    data.length = length
    data.sort((a, b) => a.time - b.time)
  }

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
  deviceId?: string
}

interface Props {
  helpCollapsed: boolean
  mqttEnabled: boolean | undefined
}

const RealTimePage: FunctionComponent<
  RouteComponentProps<PropsRoute> & Props
> = ({match, history, helpCollapsed, mqttEnabled}) => {
  const deviceId = match.params.deviceId ?? VIRTUAL_DEVICE
  // loading is defaultly false because we don't load data when page load.
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<Message | undefined>()
  const [deviceData, setDeviceData] = useState<DeviceData | undefined>()
  const [dataStamp, setDataStamp] = useState(0)
  const [devices, setDevices] = useState<DeviceInfo[] | undefined>(undefined)
  const [timeStart, setTimeStart] = useState(timeOptionsRealtime[0].value)

  const manager = useRef(new DataManager()).current

  // resetXDomain removed, doesn't make sense to zoom plot in realtime

  const isVirtualDevice = deviceId === VIRTUAL_DEVICE
  const measurementsTable = deviceData?.measurementsTable

  // unlike before, data don't have to be in react state.

  // #region realtime

  const isRealtime = getIsRealtime(timeStart)

  // Default time selected to Past when mqtt not configured
  useEffect(() => {
    if (mqttEnabled === false) {
      setTimeStart(timeOptions[0].value)
    }
  }, [mqttEnabled])

  const [subscriptions, setSubscriptions] = useState<RealtimeSubscription[]>([])

  /** plot is showed with fixed time range if set */
  const retentionTimeMs = isRealtime
    ? timeOptionsRealtime[
        timeOptionsRealtime.findIndex((x) => x.value === timeStart)
      ].realtimeRetention
    : Infinity

  useEffect(() => {
    manager.retentionTimeMs = retentionTimeMs
  }, [retentionTimeMs, manager])

  useEffect(() => {
    setSubscriptions(
      isRealtime
        ? [{measurement: 'environment', tags: [`clientId=${deviceId}`]}]
        : []
    )
  }, [deviceId, isRealtime])

  /** Push data to manager */
  const updateData = useRef((points: DiagramEntryPoint[] | undefined) => {
    if (points?.length) manager.updateData(points)
  }).current

  /** Clear data in manager */
  const clearData = useRef(() => {
    manager.updateData(undefined)
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
  useEffect(clearData, [deviceId, clearData])

  // On measurementsTable is changed, we render it in plots
  useEffect(() => {
    updateData(giraffeTableToDiagramEntryPoints(measurementsTable, fieldsAll))
  }, [measurementsTable, updateData, clearData])

  // #endregion realtime

  // fetch device configuration and data
  useEffect(() => {
    // we don't use fetchDeviceLastValues
    //   Gauge plots will handle last walue selection for us

    const fetchData = async () => {
      setLoading(true)
      clearData()
      try {
        const config = await fetchDeviceConfig(deviceId)
        const deviceData: DeviceData = {config}
        const [table] = await Promise.all([
          fetchDeviceMeasurements(config, timeStart),
        ])
        deviceData.measurementsTable = table
        setDeviceData(deviceData)
      } catch (e) {
        console.error(e)
        setMessage({
          title: 'Cannot load device data',
          description: String(e),
          type: 'error',
        })
      }
      setLoading(false)
    }

    // fetch data only if not in realtime mode
    if (!isRealtime) fetchData()
  }, [dataStamp, deviceId, timeStart, isRealtime, clearData])

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/devices')
        if (response.status >= 300) {
          const text = await response.text()
          throw new Error(`${response.status} ${text}`)
        }
        const data = await response.json()
        setDevices(data)
      } catch (e) {
        setMessage({
          title: 'Cannot fetch data',
          description: String(e),
          type: 'error',
        })
      }
    }

    fetchDevices()
  }, [])

  /*
    Rendering plots with minilibrary written in util/realtime/
    This time, data isn't pass by state but by calling callback (got by onUpdaterChange) 
    which allows us to update plot more frequently with better performance.
    All plots has to be rendered whole time because we need to have updater function from it. (so we use display 'none' instead of conditional rendering)
  */
  const renderGauge = (column: string) => (
    <ManagedComponentReact
      component={ManagedG2Plot}
      keys={column}
      props={{ctor: Gauge, options: gaugesPlotOptions[column]}}
    />
  )

  // gaugeLastTimeMessage not implemented

  const gauges = (
    <Row gutter={[22, 22]}>
      {fields.map((column, i) => {
        return (
          <Col
            sm={helpCollapsed ? 24 : 24}
            md={helpCollapsed ? 12 : 24}
            xl={helpCollapsed ? 6 : 12}
            key={i}
          >
            <Card title={column}>{renderGauge(column)}</Card>
          </Col>
        )
      })}
    </Row>
  )

  const plotDivider = (
    <Divider style={{color: 'rgba(0, 0, 0, .2)'}} orientation="right"></Divider>
  )

  const geo = (
    <div
      style={{
        height: '500px',
        minWidth: '200px',
      }}
    >
      <ManagedComponentReact
        component={ManagedMap}
        keys={['Lat', 'Lon']}
        props={{}}
      />
    </div>
  )

  const renderPlot = (column: string) => (
    <ManagedComponentReact
      component={ManagedG2Plot}
      keys={column}
      props={{ctor: Line, options: linePlotOptions[column]}}
    />
  )

  const plots = (() => {
    return (
      <>
        <Row gutter={[0, 24]}>
          {fields.map((field, i) => (
            <Col xs={24} key={i}>
              <Collapse defaultActiveKey={[i]}>
                <CollapsePanel key={i} header={field}>
                  {renderPlot(field)}
                </CollapsePanel>
              </Collapse>
            </Col>
          ))}
        </Row>
      </>
    )
  })()

  const pageControls = (
    <>
      <Tooltip title="Choose device" placement="left">
        <Select
          showSearch
          value={deviceId}
          placeholder={'select device to show'}
          showArrow={true}
          filterOption={true}
          // goes to realtime page (instead of dashboard)
          onChange={(key) => history.push(`/realtime/${key}`)}
          style={{minWidth: 200, width: 350, marginRight: 10}}
          loading={!devices}
          disabled={!devices}
        >
          {devices &&
            devices.map(({deviceId}) => (
              <Select.Option key={deviceId} value={deviceId}>
                {deviceId}
              </Select.Option>
            ))}
        </Select>
      </Tooltip>

      <Tooltip
        title={
          (mqttEnabled === false ? 'MQTT not configured on server! ' : '') +
          'Choose time'
        }
        placement="left"
      >
        <Select
          value={timeStart}
          onChange={setTimeStart}
          style={{minWidth: 100}}
          loading={loading || mqttEnabled === undefined}
          disabled={loading}
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

      <Tooltip title="Reload Device Data">
        <Button
          // disable refresh when in realtime mode
          disabled={loading || isRealtime}
          loading={loading}
          onClick={() => setDataStamp(dataStamp + 1)}
          style={{marginLeft: 10}}
          icon={<IconRefresh />}
        />
      </Tooltip>

      <Tooltip title="Go to device settings" placement="topRight">
        <Button
          type="primary"
          icon={<IconSettings />}
          style={{marginLeft: 10}}
          href={`/devices/${deviceId}`}
        ></Button>
      </Tooltip>
    </>
  )

  return (
    <PageContent
      title={
        <>
          Realtime Dashboard
          {isVirtualDevice ? (
            <Tooltip title="This page is based on Dashboard page, it has two modes: past and live. Past data are received from influxdb and live data are sent directly from device by mqtt">
              <InfoCircleFilled style={{fontSize: '1em', marginLeft: 5}} />
            </Tooltip>
          ) : undefined}
        </>
      }
      titleExtra={pageControls}
      message={message}
      spin={loading}
      forceShowScroll={true}
    >
      <DataManagerContextProvider value={manager}>
        {true ? (
          <>
            {gauges}
            {plotDivider}
            {geo}
            {plots}
          </>
        ) : (
          <Card>
            <Empty />
          </Card>
        )}
      </DataManagerContextProvider>
    </PageContent>
  )
}

export default RealTimePage
