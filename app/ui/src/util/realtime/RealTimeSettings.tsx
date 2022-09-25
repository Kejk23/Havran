import React from 'react'
import {FunctionComponent, useEffect, useState} from 'react'
import {Card, Col, Row, Form, Input, Button, Tooltip} from 'antd'
import ButtonGroup from 'antd/lib/button/button-group'

type MqttSettings = {
  running: boolean
  sendInterval: number
}

const labelCol = {xs: 14}
const wrapperCol = Object.fromEntries(
  Object.entries(labelCol).map(([k, v]) => [k, 24 - v])
)

interface Props {
  onBeforeStart?: (e: {shouldStart: boolean}) => void | Promise<void>
}

const RealTimeSettings: FunctionComponent<Props> = (props) => {
  const [settings, setSettings] = useState<MqttSettings>()
  const [sendInterval, setSendInterval] = useState('100')
  const sendIntervalValid =
    typeof +sendInterval === 'number' &&
    !Number.isNaN(+sendInterval) &&
    +sendInterval >= 30

  const refresh = async () => {
    const set = (await (await fetch('/mqtt/settings')).json()) as
      | MqttSettings
      | undefined
    setSettings(set)
    setSendInterval(set?.sendInterval?.toString() ?? '100')
  }

  useEffect(() => {
    refresh()
  }, [])

  const applyChanges = (settings: MqttSettings) => {
    setSettings(settings)
    settings.sendInterval = sendIntervalValid ? +sendInterval : 100
    if (!settings) return
    ;(async () => {
      await fetch('/mqtt/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      })
      await refresh()
    })()
  }

  const setRunning = (isRunning: boolean) => {
    if (settings) {
      if (isRunning) {
        const event = {shouldStart: true}

        Promise.all([props?.onBeforeStart?.(event)]).then(() => {
          if (event.shouldStart) applyChanges({...settings, running: isRunning})
        })
      } else {
        applyChanges({...settings, running: isRunning})
      }
    }
  }

  return (
    <>
      <Row>
        <Col sm={24} xl={12} xxl={8}>
          <Card
            title="Realtime settings"
            extra={
              <div style={{color: settings?.running ? 'green' : '#dec002'}}>
                generator {settings?.running ? 'running' : 'paused'}
              </div>
            }
          >
            <Form labelCol={labelCol} wrapperCol={wrapperCol}>
              <Tooltip
                title={
                  settings?.running ? 'Cannot be changed when running' : ''
                }
              >
                <Form.Item
                  label="Send interval [ms]"
                  validateStatus={!sendIntervalValid ? 'error' : 'success'}
                  help={!sendIntervalValid ? 'must be number >30' : ' '}
                >
                  <Input
                    value={sendInterval}
                    disabled={settings?.running}
                    defaultValue={100}
                    type="number"
                    onChange={(e) => {
                      setSendInterval(e.target.value)
                    }}
                  />
                </Form.Item>
              </Tooltip>
              <Col
                style={{
                  textAlign: 'right',
                  paddingTop: 24,
                }}
              >
                <ButtonGroup>
                  <Button
                    disabled={!settings?.running}
                    onClick={() => setRunning(false)}
                  >
                    Stop
                  </Button>
                  <Button
                    disabled={settings?.running}
                    onClick={() => setRunning(true)}
                    type="primary"
                  >
                    Start
                  </Button>
                </ButtonGroup>
              </Col>
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default RealTimeSettings
