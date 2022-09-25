import React from 'react'
import {DataManager} from '..'

export const DataManagerContext = React.createContext<DataManager>(
  new DataManager()
)

export const DataManagerContextProvider = DataManagerContext.Provider

export default DataManagerContextProvider
