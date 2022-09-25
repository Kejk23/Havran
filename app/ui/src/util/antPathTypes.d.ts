declare module 'leaflet-ant-path' {
  export type LatLng = [number, number]
  class AntPath {
    addLatLng(latlng: LatLng): void
    getLatLngs(): LatLng[]
    setLatLngs(latlngs: LatLng[]): void
    addTo(map: import('leaflet').Map): AntPath
    constructor(latlngs: LatLng[])
  }
}
