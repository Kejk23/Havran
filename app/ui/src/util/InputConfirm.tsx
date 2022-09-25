import {CheckOutlined, CloseOutlined, EditOutlined} from '@ant-design/icons'
import {Button, Col, Input, Row, Tooltip} from 'antd'
import React, {useEffect, useState} from 'react'

type TInputConfirmProps = {
  value?: string
  tooltip?: string
  onValueChange?: (newValue: string) => Promise<void> | void
}

export const InputConfirm: React.FC<TInputConfirmProps> = (props) => {
  const {value, onValueChange, tooltip} = props
  const [newValue, setNewValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setNewValue(value ?? '')
  }, [value])

  return (
    <Row>
      <Col flex="auto">
        {!isEditing ? (
          value ?? ''
        ) : (
          <Tooltip title={tooltip ?? ''}>
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              style={{width: '100%'}}
            />
          </Tooltip>
        )}
      </Col>
      <Col>
        {!isEditing ? (
          <Tooltip title={'Edit'} key="edit">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
            ></Button>
          </Tooltip>
        ) : (
          <>
            <Tooltip title={loading ? '' : 'Cancel'} color="red" key="cancel">
              <Button
                size="small"
                type="text"
                disabled={loading}
                icon={<CloseOutlined />}
                onClick={() => {
                  setIsEditing(false)
                }}
                danger
              ></Button>
            </Tooltip>
            <Tooltip title={loading ? '' : 'Save'} color="green">
              <Button
                size="small"
                type="text"
                disabled={loading}
                loading={loading}
                style={{color: 'green'}}
                icon={<CheckOutlined />}
                onClick={async () => {
                  try {
                    setLoading(true)
                    await (onValueChange ?? (() => undefined))(newValue)
                  } finally {
                    setIsEditing(false)
                    setLoading(false)
                  }
                }}
              ></Button>
            </Tooltip>
          </>
        )}
      </Col>
    </Row>
  )
}

InputConfirm.displayName = 'InputConfirm'
