import {DataManager, DataManagerOnChangeEvent} from '.'

export type ManagedComponentProps<T> = T extends ManagedComponent<infer R>
  ? R
  : never

export abstract class ManagedComponent<
  T extends Record<string, unknown> = any
> {
  private _element: HTMLElement
  public get element(): HTMLElement {
    return this._element
  }
  public set element(element: HTMLElement) {
    const changed = this._element !== element
    this._element = element
    if (changed) this.render()
  }
  public keys: string[] = []
  protected _manager!: DataManager

  public abstract setProperties(props: T): void

  private unregisterManager: () => void = () => undefined
  private registerManager() {
    this.manager = this._manager
  }
  public get manager(): DataManager {
    return this._manager
  }
  public set manager(manager: DataManager) {
    this.unregisterManager()
    const dataChangeBinded = this.onDataChanged.bind(this)
    this.unregisterManager = () =>
      this._manager?.removeOnChange?.(dataChangeBinded)
    this._manager = manager
    this._manager.addOnChange(dataChangeBinded)
  }

  protected abstract onDataChanged(e: DataManagerOnChangeEvent): void

  /** render component on current element, automaticaly called when element changes */
  public render(): void {
    this.destroy()
    this.registerManager()
    this.destroyed = false
    this._render()
  }
  /** Don't call destroy or _destroy in this method! destroy is already called before this method */
  protected abstract _render(): void

  private destroyed = true
  /** clean up after element */
  public destroy(): void {
    if (this.destroyed) return
    this.unregisterManager()
    this.unregisterManager = () => undefined
    this._destroy()
    this.destroyed = true
  }
  protected abstract _destroy(): void

  constructor(element: HTMLElement) {
    this._element = element
  }
}
