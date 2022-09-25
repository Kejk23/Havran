import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import {Button, Tooltip} from 'antd'
import React from 'react'

type TDynamicDashboardTitleProps = {
  dashboardKey: string
  isEditing: boolean
  setIsEditing: (v: boolean) => void
  onEditCancel: () => void
  onEditAccept: () => void
  onDeleteDashboard: () => void
  onOpenSettings: () => void
  onReloadDashboard: () => void
  // newName: string
  // setNewName: (v: string) => void
}

export const DynamicDashboardTitle: React.FC<TDynamicDashboardTitleProps> = (
  props
) => {
  const {
    dashboardKey,
    isEditing,
    setIsEditing,
    onDeleteDashboard,
    onEditAccept,
    onEditCancel,
    onOpenSettings,
    onReloadDashboard,
    // newName,
    // setNewName,
  } = props

  const editable = (
    <div style={{width: '100%'}}>
      {dashboardKey}{' '}
      {/*     
      <Input
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        style={{width: 'auto'}}
      />
*/}
      <Tooltip title={'Cancel editing'}>
        <Button
          size="small"
          type="text"
          icon={<CloseOutlined />}
          onClick={onEditCancel}
        ></Button>
      </Tooltip>
      <Tooltip title={'Save changes'} color="green">
        <Button
          size="small"
          type="text"
          style={{color: 'green'}}
          icon={<CheckOutlined />}
          onClick={onEditAccept}
        ></Button>
      </Tooltip>
      <Tooltip title={'Delete dashboard'} color="red">
        <Button
          size="small"
          type="text"
          icon={<DeleteOutlined />}
          onClick={onDeleteDashboard}
          danger
        ></Button>
      </Tooltip>
      <Tooltip title="Dashboard settings" color="#4040ad">
        <Button
          size="small"
          type="text"
          style={{color: '#4040ad'}}
          icon={<SettingOutlined />}
          onClick={onOpenSettings}
        ></Button>
      </Tooltip>
    </div>
  )

  const fixed = (
    <>
      {dashboardKey}{' '}
      <Tooltip title={'Edit dashboard'}>
        <Button
          size="small"
          type="text"
          icon={<EditOutlined />}
          onClick={() => setIsEditing(true)}
        ></Button>
      </Tooltip>
      <Tooltip title={'Reload dashboard'}>
        <Button
          size="small"
          type="text"
          icon={<ReloadOutlined />}
          onClick={onReloadDashboard}
        ></Button>
      </Tooltip>
    </>
  )

  return <>{isEditing ? editable : fixed}</>
}

DynamicDashboardTitle.displayName = 'DynamicDashboardTitle'
