import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

interface LocationPickerProps {
  initialLatitude?: number
  initialLongitude?: number
  onLocationChange: (lat: number, lng: number) => void
}

const GULSHAN_LAT = 23.794
const GULSHAN_LNG = 90.412

function DraggableMarker({
  position,
  setPosition,
}: {
  position: L.LatLng
  setPosition: (pos: L.LatLng) => void
}) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  return (
    <Marker
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target
          const newPos = marker.getLatLng()
          setPosition(newPos)
        },
      }}
      position={position}
    />
  )
}

export function LocationPicker({
  initialLatitude,
  initialLongitude,
  onLocationChange,
}: LocationPickerProps) {
  const [position, setPosition] = useState<L.LatLng>(
    new L.LatLng(initialLatitude || GULSHAN_LAT, initialLongitude || GULSHAN_LNG)
  )

  useEffect(() => {
    onLocationChange(position.lat, position.lng)
  }, [position, onLocationChange])

  return (
    <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-line z-0 relative">
      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker position={position} setPosition={setPosition} />
      </MapContainer>
    </div>
  )
}
