import {Button, Col, Form, Modal, Row, Select} from 'antd'
import React, {useCallback, useEffect, useState} from 'react'
import {DeviceInfo} from '../../../pages/DevicesPage'
import {DashboardDefiniton, DashboardSupportedDevices} from '../types'
import {createCopyOf, unique} from '../util'

// TODO: Add "mqtt support" checkbox

const labelCol = {xs: 8}
const wrapperCol = Object.fromEntries(
  Object.entries(labelCol).map(([k, v]) => [k, 24 - v])
)

// Api

const fetchDevices = async () => {
  const response = await fetch('/api/devices')
  if (response.status >= 300) {
    const text = await response.text()
    throw new Error(`${response.status} ${text}`)
  }
  return (await response.json()) as DeviceInfo[]
}

// Hooks

const useDevices = (): {
  availebleDevices: string[]
  availebleTypes: string[]
} => {
  const [arr, setArr] = useState<DeviceInfo[]>([])

  useEffect(() => {
    fetchDevices().then((x) => {
      setArr(x)
    })
  }, [])

  const availebleDevices: string[] = arr?.map((x) => x.deviceId)
  const availebleTypes: string[] = unique(arr.map((x) => x.device))

  return {availebleDevices, availebleTypes}
}

type TDashboardSettingsProps = {
  dashboardDefinition?: DashboardDefiniton
  isOpen?: boolean
  onCancel?: () => void
  onDone?: (l: DashboardDefiniton) => void
}

export const DashboardSettings: React.FC<TDashboardSettingsProps> = (props) => {
  const {isOpen, dashboardDefinition, onCancel, onDone} = props

  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const {availebleDevices, availebleTypes} = useDevices()

  const onOk = useCallback(() => {
    if (!dashboardDefinition) return
    const dashboardCpy = createCopyOf(dashboardDefinition)
    const dashboardDevices: DashboardSupportedDevices | undefined =
      !selectedDevices.length && !selectedTypes.length
        ? undefined
        : {
            ...(selectedDevices.length
              ? {devices: selectedDevices}
              : undefined),
            ...(selectedTypes.length
              ? {deviceTypes: selectedTypes}
              : undefined),
          }

    dashboardCpy.supportedDevices = dashboardDevices
    onDone?.(dashboardCpy)
  }, [dashboardDefinition, selectedDevices, selectedTypes, onDone])

  useEffect(() => {
    if (isOpen) {
      setSelectedDevices(dashboardDefinition?.supportedDevices?.devices || [])
      setSelectedTypes(dashboardDefinition?.supportedDevices?.deviceTypes || [])
    }
  }, [isOpen, dashboardDefinition])

  const modalButtons = (
    <>
      <Button
        href={
          'data:text/json;charset=utf-8,' +
          encodeURIComponent(JSON.stringify(dashboardDefinition))
        }
        style={{float: 'left'}}
        type="dashed"
        download={'dashboard.json'}
      >
        Export
      </Button>

      <Button onClick={onCancel}>Cancel</Button>
      <Button onClick={onOk} type="primary">
        Ok
      </Button>
      <div style={{clear: 'both'}}></div>
    </>
  )

  return (
    <>
      <Modal
        title=" Dashboard settings"
        visible={isOpen}
        onCancel={onCancel}
        footer={modalButtons}
      >
        <Row>
          <Col {...labelCol}></Col>
          <Col {...wrapperCol}>Availeble devices for dashboard</Col>
        </Row>

        <Row>
          <Col {...labelCol}></Col>
          <Col {...wrapperCol} style={{color: 'darkgray', textAlign: 'center'}}>
            Device select will contain devices of
            <i>listed type</i> <b>OR</b> <i>listed devices</i>. If <b>No</b>{' '}
            device nor type selected,
            <b>ALL</b> devices will be availeble.
          </Col>
        </Row>

        <Form {...{labelCol, wrapperCol}}>
          <Form.Item label={'Device types'}>
            <Select
              mode="tags"
              value={selectedTypes}
              options={availebleTypes?.map((value) => ({value}))}
              onChange={(value) => {
                setSelectedTypes(value)
              }}
            ></Select>
          </Form.Item>
          <Form.Item label={'Devices'}>
            <Select
              mode="tags"
              value={selectedDevices}
              options={availebleDevices?.map((value) => ({value}))}
              onChange={(value) => {
                setSelectedDevices(value)
              }}
            ></Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

DashboardSettings.displayName = 'DashboardSettings'
