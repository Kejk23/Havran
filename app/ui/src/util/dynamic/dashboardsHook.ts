import {useEffect, useState, useCallback} from 'react'
import {DeviceInfo} from '../../pages/DevicesPage'
import {DashboardDefiniton, isDashboarCellSvg} from './types'
import {
  fetchDashboard,
  fetchDashboardKeys as fetchKeys,
  useFields,
  useRefresh,
  useSvgStrings,
} from '.'
import {DASHBOARD_SELECT_CREATE_NEW_OPTION} from './components'
import {LoadingWrapper} from './customHooks'
import {deleteDashboard, uploadDashboard as upload} from './api'

type TuseDashboardsProps = {
  dashboardKey: string
  callWithLoading: LoadingWrapper
}

export const useDashboards = (props: TuseDashboardsProps) => {
  const {callWithLoading, dashboardKey: key} = props

  // Dashboard selection
  const {refreshToken, refresh} = useRefresh()
  const {refreshToken: keysRefreshToken, refresh: refreshKeys} = useRefresh()
  const [keys, setKeys] = useState<string[]>([])
  const [definitions, setDefinitions] = useState<
    Record<string, DashboardDefiniton>
  >({})
  const definitionOriginal: DashboardDefiniton | undefined =
    definitions[key || '']
  const [definition, setDefinition] = useState<DashboardDefiniton | undefined>(
    definitionOriginal
  )

  const setDefinitionOriginal = useCallback(
    (key: string, value: DashboardDefiniton | undefined) =>
      setDefinitions((c) =>
        !!value
          ? {...c, [key]: value}
          : Object.fromEntries(Object.entries(c).filter((x) => x[0] !== key))
      ),
    []
  )

  const fields = useFields(definition)
  const svgKeys =
    definition?.cells.filter(isDashboarCellSvg).map((x) => x.file) || []
  const svgStrings = useSvgStrings(svgKeys)

  const deviceFilter = (device: DeviceInfo): boolean => {
    const deviceTypes = definition?.supportedDevices?.deviceTypes
    const devices = definition?.supportedDevices?.devices
    return (
      (!devices && !deviceTypes) ||
      devices?.some((id) => device.deviceId === id) ||
      deviceTypes?.some((type) => device.device === type) ||
      false
    )
  }

  useEffect(() => {
    setDefinition(definitionOriginal)
  }, [definitionOriginal])

  useEffect(() => {
    setDefinitionOriginal(key, undefined)
  }, [key, refreshToken, setDefinitionOriginal])

  useEffect(() => {
    callWithLoading(async () => setKeys(await fetchKeys()))
  }, [callWithLoading, keysRefreshToken])

  useEffect(() => {
    callWithLoading(async () => {
      if (!key || key === DASHBOARD_SELECT_CREATE_NEW_OPTION || definition)
        return
      const config = await fetchDashboard(key)
      setDefinitionOriginal(key, config)
    })
  }, [key, definition, setDefinitionOriginal, callWithLoading])

  // #region High level API

  const cancelEdit = useCallback(() => {
    setDefinition(definitionOriginal)
  }, [definitionOriginal])
  const save = useCallback(async () => {
    if (!definition) return
    await upload(key, definition)
    setDefinitionOriginal(key, definition)
  }, [definition, key, setDefinitionOriginal])
  const deleteCurrent = useCallback(async () => {
    await deleteDashboard(key)
  }, [key])

  // #endregion High level API

  return {
    dashboardKeys: keys,
    refreshKeys,
    dashboardDefinition: definition,
    setDashboardDefinition: setDefinition,
    refreshDashboard: refresh,
    svgStrings,
    fields,
    deviceFilter,
    cancelDashboardEdit: cancelEdit,
    saveDashboard: save,
    deleteDashboard: deleteCurrent,
  }
}
