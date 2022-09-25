import React, {useState, useEffect, FunctionComponent} from 'react'
import {InfluxDB, flux, Point} from '@influxdata/influxdb-client-browser'
import {Tooltip, Button, Progress, notification} from 'antd'
import {RouteComponentProps} from 'react-router-dom'
import PageContent, {Message} from './PageContent'
import {
  generateTemperature,
  generateHumidity,
  generatePressure,
  generateCO2,
  generateTVOC,
  generateGPXData,
} from '../util/generateValue'
import {InfoCircleFilled, PlayCircleOutlined} from '@ant-design/icons'
import Table, {ColumnsType} from 'antd/lib/table'
import {COLOR_LINK} from '../styles/colors'
import {Title} from '../util/Antd.utils'
import {GridDescription} from '../util/GridDescription'
import {IconDashboard, IconRefresh, IconWriteData} from '../styles/icons'
import RealTimeSettings from '../util/realtime/RealTimeSettings'
import {InputConfirm} from '../util/InputConfirm'

interface DeviceConfig {
  influx_url: string
  influx_org: string
  influx_token: string
  influx_bucket: string
  id: string
  device?: string
  default_lat?: number
  default_lon?: number
  write_endpoint?: string
  createdAt: string
  mqtt_topic?: string
  mqtt_url?: string
}
interface measurementSummaryRow {
  _field: string
  minValue: number
  maxValue: number
  maxTime: string
  count: string
  sensor: string
}
interface DeviceData {
  config: DeviceConfig
  measurements: measurementSummaryRow[]
}
type ProgressFn = (percent: number, current: number, total: number) => void
const VIRTUAL_DEVICE = 'virtual_device'

async function fetchDeviceConfig(deviceId: string): Promise<DeviceConfig> {
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

async function fetchDeviceData(config: DeviceConfig): Promise<DeviceData> {
  const {
    // influx_url: url, // use '/influx' proxy to avoid problem with InfluxDB v2 Beta (Docker)
    influx_token: token,
    influx_org: org,
    influx_bucket: bucket,
    id,
  } = config
  const influxDB = new InfluxDB({url: '/influx', token})
  const queryApi = influxDB.getQueryApi(org)

  const measurementsYieldName = 'measurements'
  const sensorsYieldName = 'sensors'

  const result = await queryApi.collectRows<any>(flux`
    deviceData = from(bucket: ${bucket})
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "environment")
      |> filter(fn: (r) => r.clientId == ${id})
      |> filter(fn: (r) => r._field != "s2_cell_id")

    measurements = deviceData
      |> keep(columns: ["_field", "_value", "_time"])
      |> group(columns: ["_field"])

      counts    = measurements |> count()                |> keep(columns: ["_field", "_value"]) |> rename(columns: {_value: "count"   })
      maxValues = measurements |> max  ()  |> toFloat()  |> keep(columns: ["_field", "_value"]) |> rename(columns: {_value: "maxValue"})
      minValues = measurements |> min  ()  |> toFloat()  |> keep(columns: ["_field", "_value"]) |> rename(columns: {_value: "minValue"})
      maxTimes  = measurements |> max  (column: "_time") |> keep(columns: ["_field", "_time" ]) |> rename(columns: {_time : "maxTime" })

      j = (tables=<-, t) => join(tables: {tables, t}, on:["_field"])

      counts
        |> j(t: maxValues)
        |> j(t: minValues)
        |> j(t: maxTimes)
        |> yield(name: ${measurementsYieldName})

      deviceData
        |> last()
        |> keep(columns: [
          "TemperatureSensor", "HumiditySensor", "PressureSensor", 
          "CO2Sensor", "TVOCSensor", "GPSSensor"
        ])
        |> yield(name: ${sensorsYieldName})
  `)

  const measurements: measurementSummaryRow[] = result.filter(
    (x) => x.result === measurementsYieldName
  )
  const sensors: {[key: string]: string} =
    result.find((x) => x.result === sensorsYieldName) ?? {}

  measurements.forEach((x) => {
    const {_field} = x
    const senosorTagName =
      (_field === 'Lat' || _field === 'Lon' ? 'GPS' : _field) + 'Sensor'
    x.sensor = sensors[senosorTagName] ?? ''
  })
  return {config, measurements}
}

async function fetchDeviceMissingDataTimeStamps(
  config: DeviceConfig
): Promise<number[]> {
  const {
    // influx_url: url, // use '/influx' proxy to avoid problem with InfluxDB v2 Beta (Docker)
    influx_token: token,
    influx_org: org,
    influx_bucket: bucket,
    id,
  } = config
  const influxDB = new InfluxDB({url: '/influx', token})
  const queryApi = influxDB.getQueryApi(org)

  const result = await queryApi.collectRows<any>(flux`
    from(bucket: ${bucket})
      // stop is set to give telegraf some time to flush points from mqtt 
      //   so we don't write one point two times
      |> range(start: -7d, stop: -1m)
      |> filter(fn: (r) => r["_measurement"] == "environment")
      |> filter(fn: (r) => r.clientId == ${id})
      |> filter(fn: (r) => r["_field"] == "Temperature")
      |> aggregateWindow(every: 1m, fn: count, createEmpty: true)
      |> filter(fn: (r) => r._value == 0)
      |> keep(columns: ["_time"])
      |> rename(columns: {_time: "_value"})
      |> toInt()
      // transform from ns to ms
      |> map(fn: (r)=> ({_value: r._value/1000000}))
    `)

  return result.map((x) => x._value).slice(1)
}

const fetchGPXData = async (): Promise<[number, number][]> =>
  await (await fetch('/api/gpxVirtual')).json()

const fetchSetDeviceType = async (deviceId: string, deviceType: string) => {
  const setTypeResponse = await fetch(
    `/api/devices/${deviceId}/type/${deviceType}`,
    {
      method: 'POST',
    }
  )
  if (setTypeResponse.status >= 300) {
    const text = await setTypeResponse.text()
    throw new Error(`${setTypeResponse.status} ${text}`)
  }
}

async function writeEmulatedData(
  state: DeviceData,
  onProgress: ProgressFn,
  missingDataTimeStamps?: number[]
): Promise<number> {
  const {
    // influx_url: url, // use '/influx' proxy to avoid problems with InfluxDB v2 Beta (Docker)
    influx_token: token,
    influx_org: org,
    influx_bucket: bucket,
    write_endpoint,
    id,
  } = state.config
  // calculate window to emulate writes
  const toTime = Math.trunc(Date.now() / 60_000) * 60_000
  let lastTime = state.measurements[0]?.maxTime
    ? Math.trunc(Date.parse(state.measurements[0].maxTime) / 60_000) * 60_000
    : 0
  if (lastTime < toTime - 7 * 24 * 60 * 60 * 1000) {
    lastTime = toTime - 7 * 24 * 60 * 60 * 1000
  }
  const getGPX = generateGPXData.bind(undefined, await fetchGPXData())
  const totalPoints =
    missingDataTimeStamps?.length || Math.trunc((toTime - lastTime) / 60_000)
  let pointsWritten = 0
  if (totalPoints > 0) {
    const batchSize = 2000
    const url =
      write_endpoint && write_endpoint !== '/mqtt' ? write_endpoint : '/influx'
    const influxDB = new InfluxDB({url, token})
    const writeApi = influxDB.getWriteApi(org, bucket, 'ns', {
      batchSize: batchSize + 1,
      defaultTags: {clientId: id},
    })
    try {
      // write random temperatures
      const point = new Point('environment') // reuse the same point to spare memory
      onProgress(0, 0, totalPoints)

      const writePoint = async (time: number) => {
        const gpx = getGPX(time)
        point
          .floatField('Temperature', generateTemperature(time))
          .floatField('Humidity', generateHumidity(time))
          .floatField('Pressure', generatePressure(time))
          .intField('CO2', generateCO2(time))
          .intField('TVOC', generateTVOC(time))
          .floatField('Lat', gpx[0] || state.config.default_lat || 50.0873254)
          .floatField('Lon', gpx[1] || state.config.default_lon || 14.4071543)
          .tag('TemperatureSensor', 'virtual_TemperatureSensor')
          .tag('HumiditySensor', 'virtual_HumiditySensor')
          .tag('PressureSensor', 'virtual_PressureSensor')
          .tag('CO2Sensor', 'virtual_CO2Sensor')
          .tag('TVOCSensor', 'virtual_TVOCSensor')
          .tag('GPSSensor', 'virtual_GPSSensor')
          .tag('Device', 'virtual')
          .timestamp(String(time) + '000000')
        writeApi.writePoint(point)

        pointsWritten++
        if (pointsWritten % batchSize === 0) {
          await writeApi.flush()
          onProgress(
            (pointsWritten / totalPoints) * 100,
            pointsWritten,
            totalPoints
          )
        }
      }

      if (missingDataTimeStamps?.length)
        for (const timestamp of missingDataTimeStamps)
          await writePoint(timestamp)
      else
        while (lastTime < toTime) {
          lastTime += 60_000 // emulate next minute
          await writePoint(lastTime)
        }
      await writeApi.flush()
    } finally {
      await writeApi.close()
    }
    onProgress(100, pointsWritten, totalPoints)
  }

  return pointsWritten
}

const measurementTableRowKey = (r: any) => r._field

interface PropsRoute {
  deviceId?: string
}

interface Props {
  helpCollapsed: boolean
  mqttEnabled: boolean | undefined
}

const DevicePage: FunctionComponent<
  RouteComponentProps<PropsRoute> & Props
> = ({match, location, helpCollapsed, mqttEnabled}) => {
  const deviceId = match.params.deviceId ?? VIRTUAL_DEVICE
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<Message | undefined>()
  const [deviceData, setDeviceData] = useState<DeviceData | undefined>()
  const [dataStamp, setDataStamp] = useState(0)
  const [progress, setProgress] = useState(-1)
  const writeAllowed =
    deviceId === VIRTUAL_DEVICE ||
    new URLSearchParams(location.search).get('write') === 'true'

  const isVirtualDevice = deviceId === VIRTUAL_DEVICE

  // fetch device configuration and data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const deviceConfig = await fetchDeviceConfig(deviceId)
        setDeviceData(await fetchDeviceData(deviceConfig))
      } catch (e) {
        console.error(e)
        setMessage({
          title: 'Cannot load device data',
          description: String(e),
          type: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dataStamp, deviceId])

  async function writeData() {
    const onProgress: ProgressFn = (percent /*, current, total */) => {
      // console.log(
      //   `writeData ${current}/${total} (${Math.trunc(percent * 100) / 100}%)`
      // );
      setProgress(percent)
    }
    try {
      if (!deviceData) return
      const missingDataTimeStamps = mqttEnabled
        ? await fetchDeviceMissingDataTimeStamps(deviceData.config)
        : undefined
      const count = await writeEmulatedData(
        deviceData,
        onProgress,
        missingDataTimeStamps
      )
      if (count) {
        notification.success({
          message: (
            <>
              <b>{count}</b> measurement point{count > 1 ? 's were' : ' was'}{' '}
              written to InfluxDB.
            </>
          ),
        })
        setDataStamp(dataStamp + 1) // reload device data
      } else {
        notification.info({
          message: `No new data were written to InfluxDB, the current measurement is already written.`,
        })
      }
    } catch (e) {
      console.error(e)
      setMessage({
        title: 'Cannot write data',
        description: String(e),
        type: 'error',
      })
    } finally {
      setProgress(-1)
    }
  }

  const writeButtonDisabled = progress !== -1 || loading
  const pageControls = (
    <>
      {writeAllowed ? (
        <Tooltip title="Write Missing Data for the last 7 days" placement="top">
          <Button
            type="primary"
            onClick={writeData}
            disabled={writeButtonDisabled}
            icon={<IconWriteData />}
          />
        </Tooltip>
      ) : undefined}
      <Tooltip title="Reload" placement="topRight">
        <Button
          disabled={loading}
          loading={loading}
          onClick={() => setDataStamp(dataStamp + 1)}
          icon={<IconRefresh />}
        />
      </Tooltip>
      <Tooltip title="Go to device realtime dashboard" placement="topRight">
        <Button
          type={mqttEnabled ? 'default' : 'ghost'}
          icon={<PlayCircleOutlined />}
          href={`/realtime/${deviceId}`}
        ></Button>
      </Tooltip>
      <Tooltip title="Go to device dashboard" placement="topRight">
        <Button
          icon={<IconDashboard />}
          href={`/dashboard/${deviceId}`}
        ></Button>
      </Tooltip>
    </>
  )

  const columnDefinitions: ColumnsType<measurementSummaryRow> = [
    {
      title: 'Field',
      dataIndex: '_field',
    },
    {
      title: 'min',
      dataIndex: 'minValue',
      render: (val: number) => +val.toFixed(2),
      align: 'right',
    },
    {
      title: 'max',
      dataIndex: 'maxValue',
      render: (val: number) => +val.toFixed(2),
      align: 'right',
    },
    {
      title: 'max time',
      dataIndex: 'maxTime',
    },
    {
      title: 'entry count',
      dataIndex: 'count',
      align: 'right',
    },
    {
      title: 'sensor',
      dataIndex: 'sensor',
    },
  ]

  return (
    <PageContent
      title={
        isVirtualDevice ? (
          <>
            {'Virtual Device'}
            <Tooltip title="This page writes temperature measurements for the last 7 days from an emulated device, the temperature is reported every minute.">
              <InfoCircleFilled style={{fontSize: '1em', marginLeft: 5}} />
            </Tooltip>
          </>
        ) : (
          `Device ${deviceId}`
        )
      }
      message={message}
      spin={loading}
      titleExtra={pageControls}
    >
      {deviceId === VIRTUAL_DEVICE ? (
        <>
          <div style={{visibility: progress >= 0 ? 'visible' : 'hidden'}}>
            <Progress
              percent={progress >= 0 ? Math.trunc(progress) : 0}
              strokeColor={COLOR_LINK}
            />
          </div>
        </>
      ) : undefined}
      <GridDescription
        title="Device Configuration"
        column={
          helpCollapsed ? {xxl: 3, xl: 2, md: 1, sm: 1} : {xxl: 2, md: 1, sm: 1}
        }
        descriptions={[
          {
            label: 'Device ID',
            value: deviceData?.config.id,
          },
          {
            label: 'Registration Time',
            value: deviceData?.config.createdAt,
          },
          {
            label: 'InfluxDB URL',
            value: deviceData?.config.influx_url,
          },
          {
            label: 'InfluxDB Organization',
            value: deviceData?.config.influx_org,
          },
          {
            label: 'InfluxDB Bucket',
            value: deviceData?.config.influx_bucket,
          },
          {
            label: 'InfluxDB Token',
            value: deviceData?.config.influx_token ? '***' : 'N/A',
          },
          ...(mqttEnabled
            ? [
                {
                  label: 'Mqtt URL',
                  value: deviceData?.config?.mqtt_url,
                },
                {
                  label: 'Mqtt topic',
                  value: deviceData?.config?.mqtt_topic,
                },
              ]
            : []),
          {
            label: 'Device type',
            value: (
              <InputConfirm
                value={deviceData?.config?.device}
                tooltip={'Device type is used for dynamic dashboard filtering'}
                onValueChange={async (newValue) => {
                  try {
                    await fetchSetDeviceType(deviceId, newValue)
                    setDataStamp(dataStamp + 1)
                  } catch (e) {
                    console.error(e)
                    setMessage({
                      title: 'Cannot load device data',
                      description: String(e),
                      type: 'error',
                    })
                  }
                }}
              />
            ),
          },
        ]}
      />
      <Title>Measurements</Title>
      <Table
        dataSource={deviceData?.measurements}
        columns={columnDefinitions}
        pagination={false}
        rowKey={measurementTableRowKey}
      />
      <div style={{height: 20}} />
      {isVirtualDevice && mqttEnabled ? (
        <RealTimeSettings onBeforeStart={writeData} />
      ) : undefined}
    </PageContent>
  )
}

export default DevicePage
