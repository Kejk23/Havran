import React from 'react'
import Icon from '@ant-design/icons'

import DashboardSvg from './icons/dashboard.svg?component'
import DeleteSvg from './icons/delete.svg?component'
import SettingsSvg from './icons/settings.svg?component'
import DeviceRegistrationSvg from './icons/deviceRegistration.svg?component'
import HomeSvg from './icons/home.svg?component'
import DroneImagesSvg from './icons/drone.svg?component'
import VirtualDeviceSvg from './icons/virtualDevice.svg?component'
import RefreshSvg from './icons/refresh.svg?component'
import WriteDataSvg from './icons/writeData.svg?component'

export const IconDashboard: React.FC = () => <Icon component={DashboardSvg} />
export const IconDelete: React.FC = () => <Icon component={DeleteSvg} />
export const IconSettings: React.FC = () => <Icon component={SettingsSvg} />
export const IconDeviceRegistration: React.FC = () => (
    <Icon component={DeviceRegistrationSvg} />
)
export const IconHome: React.FC = () => <Icon component={HomeSvg} />
export const IconDroneImages: React.FC = () => <Icon component={DroneImagesSvg} />
export const IconVirtualDevice: React.FC = () => (
    <Icon component={VirtualDeviceSvg} />
)
export const IconRefresh: React.FC = () => <Icon component={RefreshSvg} />
export const IconWriteData: React.FC = () => <Icon component={WriteDataSvg} />

export {
    LineChartOutlined as IconDynamicDashboard,
    PlayCircleOutlined as IconRealtimeDashboard,
} from '@ant-design/icons'
