import * as leaflet from 'leaflet'
import {AntPath, LatLng} from 'leaflet-ant-path'
import {ManagedComponent} from '../ManagedComponent'

const calculateAngleFromLatlon = (p1: LatLng, p2: LatLng) =>
  360 -
  ((Math.atan2(p2[0] - p1[0], p2[1] - p1[1]) * (180 / Math.PI) + 360) % 360)

const {PI, asin, sin, cos, sqrt, pow} = Math
const EARTH_RADIUS_KM = 6371
const latLonDist = (p1: LatLng, p2: LatLng) =>
  asin(
    sqrt(
      pow(sin(((p2[0] * PI) / 180 - (p1[0] * PI) / 180) / 2), 2) +
        cos(p1[0]) *
          cos(p2[0]) *
          pow(sin(((p2[1] * PI) / 180 - (p1[1] * PI) / 180) / 2), 2)
    )
  ) *
  EARTH_RADIUS_KM *
  2

// view will center on new point when new point is this far from last centered
const VIEW_CENTERING_THRESHOLD_DISTANCE_KM = 0.01
// view will center on point if this time passed from last centering
const VIEW_CENTERING_THRESHOLD_MS = 10000

export class ManagedMap extends ManagedComponent {
  private _map?: leaflet.Map
  private _marker?: leaflet.Marker
  private _path?: AntPath

  private _dragable = false
  public get dragable(): boolean {
    return this._dragable
  }
  public set dragable(dragable: boolean) {
    if (this._dragable === dragable) return
    this._dragable = dragable
    if (this._map) this._map.options.dragging = dragable
  }

  private _zoom = 13
  public get zoom(): number {
    return this._map?.getZoom() ?? this._zoom
  }
  // TODO: use this to set zoom in realtime based on live/past
  public set zoom(level: number) {
    this._zoom = level
    this._map?.setZoom(level)
  }

  private get latLonKeys(): [string, string] | undefined {
    return this.keys.length === 2 ? (this.keys as [string, string]) : undefined
  }

  public setProperties = (): void => undefined

  public update(): void {
    cancelAnimationFrame(this.rafHandle)
    this.rafHandle = requestAnimationFrame(this._update.bind(this))
  }

  private _lastPoint?: LatLng
  private _lastPointTime?: number
  private rafHandle = -1
  private _update() {
    if (!this._path || !this._map || !this._marker) return

    const _points = this.manager.getLatLonTime(this.latLonKeys)
    this._path.setLatLngs(_points as any)

    if (_points.length) {
      const last = _points[_points.length - 1] as any as LatLng
      const last2 = _points[_points.length - 2] as any as LatLng
      try {
        if (
          !this._lastPoint ||
          !this._lastPointTime ||
          latLonDist(this._lastPoint, last) >
            VIEW_CENTERING_THRESHOLD_DISTANCE_KM ||
          this._lastPointTime < Date.now() - VIEW_CENTERING_THRESHOLD_MS
        ) {
          this._map.setView(last, this._map.getZoom(), {
            animate: true,
            pan: {
              duration: 1,
            },
          } as any)
          this._lastPoint = last
          this._lastPointTime = Date.now()
        }
        this._marker.setLatLng(last)
        if (last2)
          this._marker.setRotationAngle?.(
            calculateAngleFromLatlon(last, last2) - 90
          )
      } catch (e: any) {
        // manipulating map properties can throw an error when map no longer exist
        console.warn(
          `error thrown by leaflet map: ${
            e?.message ?? e ?? 'unspecific error'
          }`
        )
      }
    } else {
      this._marker.setLatLng([0, 0])
      this._lastPoint = undefined
    }
  }

  protected _destroy(): void {
    this._map?.remove?.()
    this._map = undefined
  }

  _render(): void {
    const _points = this.manager.getLatLonTime(this.latLonKeys)

    const point: LatLng = _points?.length
      ? (_points[_points.length - 1] as any)
      : [51.4921374, -0.1928784]
    const map = leaflet
      .map(this.element, {scrollWheelZoom: false, dragging: this._dragable})
      .setView(point, this._zoom)

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      })
      .addTo(map)

    this._map = map
    this._marker = leaflet
      .marker([0, 0], {
        icon: new leaflet.Icon({
          iconUrl: '/car.png',
          shadowUrl: '',
          iconSize: [60 / 3, 179 / 3],
          iconAnchor: [60 / 6, 179 / 6],
        }),
      })
      .addTo(map)
    this._path = new AntPath([]).addTo(map)

    // fix for dynamic layouts
    setTimeout(() => window.dispatchEvent(new Event('resize')), 2000)

    this.update()
  }

  onDataChanged(/* e: DataManagerOnChangeEvent */): void {
    this.update()
  }
}
