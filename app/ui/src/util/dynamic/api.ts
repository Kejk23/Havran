import {DashboardDefiniton} from '.'

const URL = '/api/dynamic'

export const fetchDashboardKeys = (): Promise<string[]> =>
  fetch(`${URL}/keys`).then((x) => x.json())

export const fetchDashboard = (
  dashboardKey: string
): Promise<DashboardDefiniton> =>
  fetch(`${URL}/dashboard/${dashboardKey}`).then((x) => x.json())

export const fetchSvgString = (svgKey: string): Promise<string> =>
  fetch(`${URL}/svg/${svgKey}`).then((x) => x.text())

export const uploadDashboard = (
  key: string,
  dashboard: string | DashboardDefiniton
): Promise<Response> =>
  fetch(`${URL}/upload/${key}.json`, {
    body:
      typeof dashboard === 'string'
        ? dashboard
        : JSON.stringify(dashboard, undefined, 2),
    method: 'POST',
  })

export const deleteDashboard = (dashboardKey: string): Promise<Response> =>
  fetch(`${URL}/dashboard/${dashboardKey}`, {method: 'DELETE'})
