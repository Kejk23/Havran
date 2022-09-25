import React, { useState, useEffect, FunctionComponent } from 'react'
import {
    Switch,
    Route,
    Redirect,
    RouteComponentProps,
    withRouter,
    NavLink,
    matchPath,
    RouteProps,
} from 'react-router-dom'
import Markdown from './util/Markdown'
import './styles/App.less'
import { Layout, Menu } from 'antd'

import HomePage from './pages/HomePage'
import DevicesPage from './pages/DevicesPage'
import DevicePage from './pages/DevicePage'
import NotFoundPage from './pages/NotFoundPage'
import DashboardPage from './pages/DashboardPage'
import RealTimePage from './pages/RealTimePage'
import DynamicDashboardPage from './pages/DynamicDashboardPage'
import DroneImagesPage from './pages/DroneImagesPage'

import {
    IconDashboard,
    IconDeviceRegistration,
    IconDynamicDashboard,
    IconHome,
    IconRealtimeDashboard,
    IconVirtualDevice,
    IconDroneImages,
} from './styles/icons'

export const VIRTUAL_DEVICE = 'virtual_device'

const { Sider } = Layout
const PAGE_HELP: Array<{
    file: string
    matcher: string | RouteProps | string[]
}> = [
        {
            file: '/help/DevicesPage.md',
            matcher: {
                path: '/devices',
                exact: true,
            },
        },
        {
            file: '/help/VirtualDevicePage.md',
            matcher: '/devices/virtual_device',
        },
        {
            file: '/help/DevicePage.md',
            matcher: '/devices/:device',
        },
        {
            file: '/help/DashboardPage.md',
            matcher: '/dashboard/:device',
        },
        {
            file: '/help/RealtimePage.md',
            matcher: '/realtime/:device',
        },
        {
            file: '/help/DroneImagesPage.md',
            matcher: '/realtime/:device',
        },
    ]

const getPageHelp = (url: string) =>
    PAGE_HELP.filter(({ matcher }) => matchPath(url, matcher)).map(
        ({ file }) => file
    )[0]

const useHelpCollapsed = (): [boolean, (v: boolean) => void] => {
    const [helpCollapsed, setHelpCollapsed] = useState(
        localStorage?.getItem('helpCollapsed') === 'true'
    )
    const changeHelpCollapsed = (v: boolean) => {
        setHelpCollapsed(v)
        localStorage?.setItem('helpCollapsed', String(v))
    }
    return [helpCollapsed, changeHelpCollapsed]
}

const useFetchBoolean = (address: string) => {
    const [boolean, setBoolean] = useState<boolean | undefined>(undefined)

    useEffect(() => {
        const fetchBoolean = async () => {
            const response = await fetch(address)
            if (response.status >= 300) {
                const text = await response.text()
                throw new Error(`${response.status} ${text}`)
            }
            const data = await response.json()
            if (typeof data === 'boolean') setBoolean(data)
            else
                throw new Error(
                    `invalid data type received from ${address}. Expected boolean received ${typeof data}`
                )
        }

        fetchBoolean()
    }, [address])

    return boolean
}

const App: FunctionComponent<RouteComponentProps> = (props) => {
    const [helpCollapsed, setHelpCollapsed] = useHelpCollapsed()
    const [helpText, setHelpText] = useState('')
    const mqttEnabled = useFetchBoolean('/mqtt/enabled')

    const help = getPageHelp(props.location.pathname)

    useEffect(() => {
        setHelpText('')
        if (help) {
            // load markdown from file
            ; (async () => {
                try {
                    const response = await fetch(help)
                    const txt = await response.text()
                    setHelpText((txt ?? '').startsWith('<!') ? 'HELP NOT FOUND' : txt)
                } catch (e) {
                    console.error(e)
                }
            })()
        }
    }, [help])

    return (
        <div className="App">
            <Layout style={{ minHeight: '100vh' }}>
                <Sider>
                    <Menu
                        theme="dark"
                        selectedKeys={[
                            props.location.pathname,
                            ...(matchPath(props.location.pathname, '/dashboard/:device')
                                ? ['/dashboard/:device']
                                : []),
                            ...(matchPath(props.location.pathname, '/realtime/:device')
                                ? ['/realtime/:device']
                                : []),
                            ...(matchPath(props.location.pathname, '/dynamic/:device')
                                ? ['/dynamic/:device']
                                : []),
                        ]}
                        mode="inline"
                    >
                        <Menu.Item key="/home" icon={<IconHome />}>
                            <NavLink to="/home">Home</NavLink>
                        </Menu.Item>
                        <Menu.Item key="/devices" icon={<IconDeviceRegistration />}>
                            <NavLink to="/devices">Device Registrations</NavLink>
                        </Menu.Item>
                        <Menu.Item
                            key="/devices/virtual_device"
                            icon={<IconVirtualDevice />}
                        >
                            <NavLink to="/devices/virtual_device">Virtual Device</NavLink>
                        </Menu.Item>
                        <Menu.Item key="/dashboard/:device" icon={<IconDashboard />}>
                            <NavLink to="/dashboard">Dashboard</NavLink>
                        </Menu.Item>
                        <Menu.Item
                            style={mqttEnabled === true ? {} : { color: 'gray' }}
                            key="/realtime/:device"
                            icon={<IconRealtimeDashboard />}
                        >
                            <NavLink
                                style={mqttEnabled === true ? {} : { color: 'gray' }}
                                to="/realtime"
                            >
                                Realtime
                            </NavLink>
                        </Menu.Item>
                        <Menu.Item key="/dynamic/:device" icon={<IconDynamicDashboard />}>
                            <NavLink to="/dynamic">Dynamic</NavLink>
                        </Menu.Item>
                        <Menu.Item key="/drone_images" icon={<IconDroneImages />}>
                            <NavLink to="/drone_images">Drone Images</NavLink>
                        </Menu.Item>
                    </Menu>
                </Sider>
                <Switch>
                    <Redirect exact from="/" to="/home" />
                    <Route exact path="/home" component={HomePage} />
                    <Route
                        exact
                        path="/devices"
                        render={(props) => (
                            <DevicesPage {...props} helpCollapsed={helpCollapsed} />
                        )}
                    />
                    <Route
                        exact
                        path="/devices/:deviceId"
                        render={(props) => (
                            <DevicePage {...props} {...{ helpCollapsed, mqttEnabled }} />
                        )}
                    />
                    <Redirect
                        exact
                        from="/dashboard"
                        to={`/dashboard/${VIRTUAL_DEVICE}`}
                    />
                    <Route
                        exact
                        path="/dashboard/:deviceId"
                        render={(props) => (
                            <DashboardPage {...props} helpCollapsed={helpCollapsed} />
                        )}
                    />
                    <Redirect exact from="/realtime" to={`/realtime/${VIRTUAL_DEVICE}`} />
                    <Route
                        exact
                        path="/realtime/:deviceId"
                        render={(props) => (
                            <RealTimePage {...props} {...{ helpCollapsed, mqttEnabled }} />
                        )}
                    />
                    <Redirect exact from="/dynamic" to={`/dynamic/demo`} />
                    <Route
                        exact
                        path="/dynamic/:dashboard/:clientId?"
                        render={(props) => (
                            <DynamicDashboardPage
                                {...props}
                                {...{ helpCollapsed, mqttEnabled }}
                            />
                        )}
                    />
                    <Redirect exact from="/" to="/drone_images" />
                    <Route exact path="/drone_images" component={DroneImagesPage} />
                    <Route path="*" component={NotFoundPage} />
                </Switch>
                {helpText ? (
                    <Sider
                        reverseArrow
                        collapsible
                        collapsed={helpCollapsed}
                        onCollapse={() => setHelpCollapsed(!helpCollapsed)}
                        collapsedWidth={30}
                        theme="light"
                        width={'20vw'}
                        breakpoint="sm"
                    >
                        <div style={{ paddingLeft: 10, paddingRight: 10 }}>
                            <Markdown source={helpText && !helpCollapsed ? helpText : ''} />
                        </div>
                    </Sider>
                ) : undefined}
            </Layout>
        </div>
    )
}

export default withRouter(App)