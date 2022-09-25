import {useState, useCallback, useEffect, useRef} from 'react'
import {DashboardDefiniton, fetchSvgString, getLayoutDefinitonFields} from '.'

export type LoadingWrapper = <T>(fnc: () => Promise<T>) => Promise<T>

export const useLoading = (): {
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  callWithLoading: LoadingWrapper
} => {
  const [loading, setLoading] = useState(false)
  const callWithLoading = useCallback(
    async <T>(fnc: () => Promise<T>): Promise<T> => {
      try {
        setLoading(true)
        return await fnc()
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {loading, callWithLoading, setLoading}
}

export const useFields = (layout: DashboardDefiniton | undefined): string[] => {
  const fieldsLayout = getLayoutDefinitonFields(layout)
  const [fields, setFields] = useState<string[]>([])

  if (
    fieldsLayout.length !== fields.length ||
    fieldsLayout.some((f, i) => f !== fields[i])
  ) {
    setFields(fieldsLayout)
  }

  return fields
}

export const useSvgStrings = (requested: string[]): Record<string, string> => {
  const [svgStrings, setSvgStrings] = useState<Record<string, string>>({})
  const [prevReq, setPrevReq] = useState<string[]>([])

  useEffect(() => {
    const fetchSvgStrings = async () => {
      try {
        const results = await Promise.all(
          requested.map(async (key) => {
            const text = await fetchSvgString(key)
            return [key, text] as const
          })
        )

        setSvgStrings(Object.fromEntries(results))
      } catch (e) {
        console.error(e)
      }
    }

    if (JSON.stringify(prevReq) !== JSON.stringify(requested)) {
      setPrevReq(requested)
      fetchSvgStrings()
    }
  }, [requested, prevReq])

  return svgStrings
}

export const useRefresh = (): {
  refreshToken: number
  refresh: () => void
} => {
  const [refreshToken, setRefreshToken] = useState(0)
  const refresh = useRef(() => {
    setRefreshToken((r) => (r === Date.now() ? Date.now() + 1 : Date.now()))
  }).current
  return {refreshToken, refresh}
}
