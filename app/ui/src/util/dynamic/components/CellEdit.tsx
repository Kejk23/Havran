import React, {FunctionComponent, useEffect, useState, useCallback} from 'react'
import {Button, Collapse, Row, Select, Tabs} from 'antd'
import {Col, Form, Input} from 'antd'

import Modal from 'antd/lib/modal/Modal'
import {
  DashboardCell,
  CELL_TYPES,
  DashboardCellType,
  DashboardCellPlotType,
  PLOT_TYPES,
  DashboardCellPlotGauge,
} from '..'
import {createCopyOf} from '../util'
import CollapsePanel from 'antd/lib/collapse/CollapsePanel'
import {ExampleFluxQuery} from './ExampleFluxQuery'
import {asArray} from '../../realtime'
import Markdown from '../../Markdown'

const labelCol = {xs: 8}
const wrapperCol = Object.fromEntries(
  Object.entries(labelCol).map(([k, v]) => [k, 24 - v])
)

const getDefaultLayout = () => ({x: 0, y: 10000 - 1, w: 24, h: 3})

const getcellDefaults = (
  type?: DashboardCellType,
  plotType?: DashboardCellPlotType
): DashboardCell => {
  const layout = getDefaultLayout()

  if (type === 'geo') {
    return {
      type: 'geo',
      latField: 'Lat',
      lonField: 'Lon',
      layout,
      Live: {},
      Past: {},
    }
  } else if (type === 'svg')
    return {
      type: 'svg',
      field: [],
      file: '',
      layout,
    }
  else if (type === 'md') {
    return {
      type: 'md',
      layout,
      md: '',
    }
  } else {
    if (plotType === 'gauge') {
      return {
        type: 'plot',
        plotType: 'gauge',
        field: '',
        decimalPlaces: 2,
        label: '',
        range: {min: 0, max: 100},
        unit: '%',
        layout,
      }
    } else
      return {
        type: 'plot',
        plotType: 'line',
        field: [],
        label: 'label',
        layout,
      }
  }
}

type CellEditProps = {
  visible: boolean
  editedCell?: DashboardCell
  onCellEditCancel?: () => void
  onCellEditDone?: (l: DashboardCell) => void
  onCellDelete?: () => void
  availableFields?: string[] | undefined
  clientId: string
}

const fetchSvgKeys = async () =>
  (await (await fetch(`/api/dynamic/svgs`)).json()) as string[]

export const CellEdit: FunctionComponent<CellEditProps> = ({
  visible,
  editedCell,
  onCellEditCancel: onCancel,
  onCellEditDone: onDone,
  onCellDelete,
  availableFields = [],
  clientId,
}) => {
  const [cell, setCell] = useState<DashboardCell | undefined>(getcellDefaults())
  const [svgKeys, setSvgKeys] = useState<string[]>([])

  const fields = asArray((cell as any)?.field, true)

  useEffect(() => {
    setCell(editedCell ? createCopyOf(editedCell) : getcellDefaults())
  }, [editedCell, visible])

  useEffect(() => {
    if (cell && cell.type === 'svg') fetchSvgKeys().then(setSvgKeys)
  }, [cell])

  const onOk = useCallback(() => {
    if (!cell) return
    onDone?.(cell)
  }, [onDone, cell])

  const onDelete = useCallback(() => {
    onCellDelete?.()
  }, [onCellDelete])

  const setCellProp = (prop: string, value: any) => {
    setCell((c) => c && {...c, [prop]: value})
  }

  const callbackForCellProp = (prop: string) => (value: any) => {
    setCellProp(prop, value)
  }

  const callbackHtmlEvent =
    (prop: string, isNumber = false) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!isNumber) setCellProp(prop, e.target.value)
      else {
        const number = +e.target.value
        setCellProp(prop, Number.isNaN(number) ? 0 : number)
      }
    }

  const fieldsSelect = (
    <Select
      mode="tags"
      value={(cell as any)?.field}
      options={availableFields.map((value) => ({value}))}
      onChange={callbackForCellProp('field')}
    ></Select>
  )

  const modalButtons = (
    <>
      <Button
        onClick={onDelete}
        danger
        style={{display: 'inline-block', float: 'left'}}
      >
        Delete
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
        title="Edit cell"
        visible={visible}
        onCancel={onCancel}
        footer={modalButtons}
      >
        <Form {...{labelCol, wrapperCol}}>
          <Form.Item label="type">
            <Select
              size="small"
              value={cell?.type || 'plot'}
              onChange={(v) => {
                setCell(getcellDefaults(v))
              }}
              style={{minWidth: 100}}
            >
              {CELL_TYPES.map((key) => (
                <Select.Option key={key} value={key}>
                  {key}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {cell?.type === 'plot' ? (
            <>
              <Form.Item label="plot type">
                <Select
                  value={cell.plotType}
                  onChange={(v) => {
                    setCell(getcellDefaults(cell.type, v))
                  }}
                  options={PLOT_TYPES.map((value) => ({value}))}
                ></Select>
              </Form.Item>
              <Form.Item label="label">
                <Input
                  value={cell.label}
                  onChange={callbackHtmlEvent('label')}
                ></Input>
              </Form.Item>
            </>
          ) : undefined}

          {cell?.type === 'plot' && cell?.plotType === 'gauge' ? (
            <>
              <Form.Item label="field">
                <Select
                  showSearch
                  value={cell.field}
                  options={availableFields.map((value) => ({value}))}
                  onChange={callbackForCellProp('field')}
                />
              </Form.Item>
              <Form.Item label="range">
                <Row style={{width: '100%'}}>
                  <Col xs={12}>
                    <Input
                      value={cell.range.min || 0}
                      onChange={(v) =>
                        setCell(
                          ((c: DashboardCellPlotGauge) =>
                            c &&
                            ({
                              ...c,
                              range: {...c.range, min: +v.target.value},
                            } as any)) as any
                        )
                      }
                    ></Input>
                  </Col>
                  <Col xs={12}>
                    <Input
                      value={cell.range.max || 0}
                      onChange={(v) =>
                        setCell(
                          ((c: DashboardCellPlotGauge) =>
                            c &&
                            ({
                              ...c,
                              range: {...c.range, max: +v.target.value},
                            } as any)) as any
                        )
                      }
                    ></Input>
                  </Col>
                </Row>
              </Form.Item>
              <Form.Item label="decimal places">
                <Input
                  type={'number'}
                  value={cell.decimalPlaces}
                  onChange={callbackHtmlEvent('decimalPlaces', true)}
                ></Input>
              </Form.Item>
              <Form.Item label="unit">
                <Input
                  value={cell.unit}
                  onChange={callbackHtmlEvent('unit')}
                ></Input>
              </Form.Item>
            </>
          ) : undefined}

          {cell?.type === 'plot' && cell?.plotType === 'line' ? (
            <>
              <Form.Item label="fields">{fieldsSelect}</Form.Item>
            </>
          ) : undefined}

          {cell?.type === 'geo' ? (
            <>
              <Form.Item label="lat field">
                <Select
                  showSearch
                  value={cell.latField}
                  options={availableFields.map((value) => ({value}))}
                  onChange={callbackForCellProp('latField')}
                />
              </Form.Item>
              <Form.Item label="lon field">
                <Select
                  showSearch
                  value={cell.lonField}
                  options={availableFields.map((value) => ({value}))}
                  onChange={callbackForCellProp('lonField')}
                />
              </Form.Item>
            </>
          ) : undefined}

          {cell?.type === 'svg' ? (
            <>
              <Form.Item label="fields">{fieldsSelect}</Form.Item>
              <Form.Item label="file">
                <Select
                  showSearch
                  value={cell.file}
                  options={svgKeys.map((value) => ({value}))}
                  onChange={callbackForCellProp('file')}
                />
              </Form.Item>
            </>
          ) : undefined}

          {cell?.type === 'md' ? (
            <>
              <Tabs defaultActiveKey="edit">
                <Tabs.TabPane tab="edit" key="edit">
                  <Input.TextArea
                    style={{minHeight: '18em'}}
                    value={cell.md ?? ''}
                    onChange={callbackHtmlEvent('md')}
                  ></Input.TextArea>
                </Tabs.TabPane>
                <Tabs.TabPane tab="preview" key="preview">
                  <Markdown source={cell.md ?? ''} />
                </Tabs.TabPane>
              </Tabs>
            </>
          ) : undefined}
        </Form>
        <div />
        {cell?.type !== 'md' ? (
          <Collapse>
            <CollapsePanel key={0} header={`flux query for this cell:`}>
              <ExampleFluxQuery {...{clientId, fields}} start={'-1w'} />
            </CollapsePanel>
          </Collapse>
        ) : undefined}
      </Modal>
    </>
  )
}
