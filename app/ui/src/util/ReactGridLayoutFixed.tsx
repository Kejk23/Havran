import React, {useEffect} from 'react'
import ReactGridLayout, {WidthProvider} from 'react-grid-layout'

import 'react-grid-layout/css/styles.css'

const GridWithProvider = WidthProvider(ReactGridLayout)

/* quickfix for grid initial render issue of react-grid-layout */
const useGridFix = () => {
  useEffect(() => {
    setTimeout(() => window.dispatchEvent(new Event('resize')))
  }, [])
}

const ReactGridLayoutFixed: React.FC<
  ReactGridLayout.ReactGridLayoutProps & ReactGridLayout.WidthProviderProps
> = (props) => {
  useGridFix()

  return (
    <div style={{position: 'relative'}}>
      <GridWithProvider {...props} />
    </div>
  )
}

export default ReactGridLayoutFixed
