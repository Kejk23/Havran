import React, {
  PropsWithChildren,
  ReactElement,
  useContext,
  useEffect,
  useRef,
} from 'react'
import {DataManagerContext} from '.'
import {asArray} from '..'
import {ManagedComponent, ManagedComponentProps} from '../ManagedComponent'

type ManagedComponentReactParams<T extends ManagedComponent<any>> = {
  keys: string[] | string
  component: new (element: HTMLElement) => T
  props?: ManagedComponentProps<T>
}

// TODO: solve error when fast clicking throug options Cannot read properties of undefined (reading 'parentNode')

export const ManagedComponentReact = <P extends ManagedComponent>({
  keys,
  component,
  props,
}: PropsWithChildren<ManagedComponentReactParams<P>>): ReactElement | null => {
  const elementRef = useRef<HTMLDivElement>(null)
  const element = (
    <div
      style={{
        width: '100%',
        height: '100%',
      }}
      ref={elementRef}
    />
  )

  const manager = useContext(DataManagerContext)

  const plotRef = useRef<P>()

  useEffect(() => {
    if (!elementRef.current) return
    plotRef.current = new component(elementRef.current)
  }, [component])

  useEffect(() => {
    if (!plotRef.current) return
    plotRef.current.manager = manager
  }, [manager])

  useEffect(() => {
    if (!plotRef.current) return
    plotRef.current.keys = asArray(keys)
  }, [keys])

  useEffect(() => {
    if (!plotRef.current || !props) return
    plotRef.current.setProperties(props)
  }, [props])

  useEffect(() => {
    plotRef.current?.render?.()
  }, [])

  useEffect(() => () => plotRef.current?.destroy?.(), [])

  return <>{element}</>
}
