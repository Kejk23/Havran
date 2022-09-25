import React, {useEffect, useState} from 'react'
import {
  flux,
  fluxExpression,
  fluxDuration,
} from '@influxdata/influxdb-client-browser'
import {fetchDeviceConfig} from '../../../pages/DynamicDashboardPage'
import {Button, Col, Tooltip} from 'antd'
import {CopyOutlined} from '@ant-design/icons'

type TExampleFluxQueryProps = {
  clientId: string
  start: string
  fields: string[]
}

export const ExampleFluxQuery: React.FC<TExampleFluxQueryProps> = (props) => {
  const {clientId, fields, start} = props

  const [bucket, setBucket] = useState('<your-bucket>')

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        const config = await fetchDeviceConfig(clientId)
        await new Promise((r) => setTimeout(r, 10000))
        setBucket(config.influx_bucket)
      } catch (e) {
        // TODO: escalation
        console.error(e)
      }
    }

    asyncEffect()
  }, [clientId])

  const fieldsFilterString = fields
    .map((field) => `r["_field"] == "${field}"`)
    .join(' or ')
  const fieldsFilter =
    fields.length > 0
      ? flux`\n  |> filter(fn: (r) => ${fluxExpression(fieldsFilterString)})`
      : ''

  const fluxQuery = flux`\
from(bucket: ${bucket})
  |> range(start: ${fluxDuration(start)})
  |> filter(fn: (r) => r._measurement == "environment")
  |> filter(fn: (r) => r.clientId == ${clientId})\
${fluxExpression(fieldsFilter)}\
`.toString()

  const [copiedMsg, setCopiedMsg] = useState<string>()

  useEffect(() => {
    if (copiedMsg) {
      setTimeout(() => {
        setCopiedMsg(undefined)
      }, 2000)
    }
  }, [copiedMsg])

  return (
    <>
      <Col style={{position: 'relative'}}>
        <Tooltip title={copiedMsg} visible={!!copiedMsg}>
          <Button
            icon={<CopyOutlined />}
            style={{position: 'absolute', right: 0, top: 0}}
            size="small"
            type="dashed"
            onClick={() => {
              navigator.clipboard.writeText(fluxQuery)
              setCopiedMsg('Query copied into your clipboard')
            }}
          />
        </Tooltip>
        <code style={{whiteSpace: 'pre-wrap'}}>{fluxQuery}</code>
      </Col>
    </>
  )
}

ExampleFluxQuery.displayName = 'ExampleFluxQuery'
