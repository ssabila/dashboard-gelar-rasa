
'use client'

import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  GeoJSON,
  Pane,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const INDONESIA = {
  center: [-2.5, 118],
  zoom: 4,
}

const LEVELS = [
  { label: '≤ 100%', color: '#8FB7D2', min: -Infinity, max: 100 },
  { label: '101–200%', color: '#F4C66B', min: 100, max: 200 },
  { label: '201–500%', color: '#EB8A55', min: 200, max: 500 },
  { label: '> 500%', color: '#C94D4D', min: 500, max: Infinity },
]

function getLevel(value) {
  return LEVELS.find(
    (level) => value > level.min && value <= level.max
  ) ?? LEVELS[0]
}

function formatValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') {
    return 'Tidak tersedia'
  }

  const number = Number(value)

  if (!Number.isFinite(number)) return `${value}${suffix}`

  return `${number.toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  })}${suffix}`
}

function getDirection(degrees) {
  const value = Number(degrees)

  if (!Number.isFinite(value)) return 'Tidak tersedia'

  const directions = [
    'Utara',
    'Timur Laut',
    'Timur',
    'Tenggara',
    'Selatan',
    'Barat Daya',
    'Barat',
    'Barat Laut',
  ]

  const index = Math.round(
    (((value % 360) + 360) % 360) / 45
  ) % 8

  return `${directions[index]} (${Math.round(value)}°)`
}

function MapResize() {
  const map = useMap()

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250)

    return () => clearTimeout(timer)
  }, [map])

  return null
}

function MapFocus({ stations }) {
  const map = useMap()

  useEffect(() => {
    if (!stations.length) {
      map.flyTo(INDONESIA.center, INDONESIA.zoom, {
        duration: 0.7,
      })
      return
    }

    const bounds = L.latLngBounds(
      stations.map((station) => [
        station.latitude,
        station.longitude,
      ])
    )

    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [45, 45],
        maxZoom: 7,
        duration: 0.8,
      })
    }
  }, [map, stations])

  return null
}

function getIslandStyle() {
  return {
    fillColor: '#78A9D1',
    fillOpacity: 0.18,
    color: '#426B91',
    weight: 0.7,
    opacity: 0.45,
  }
}

export function HazeEpisodeMap({
  geo,
  stations = [],
  criticalRows = [],
  selectedStationId = null,
  onSelectStation,
}) {
  const stationSummary = useMemo(() => {
    const metadataById = new Map(
      stations.map((station) => [
        station.station_id ?? station.sensor_id,
        station,
      ])
    )

    const rowsByStation = new Map()

    criticalRows.forEach((row) => {
      const id = row?.station_id ?? row?.sensor_id

      if (!id) return

      if (!rowsByStation.has(id)) {
        rowsByStation.set(id, [])
      }

      rowsByStation.get(id).push(row)
    })

    return [...rowsByStation.entries()]
      .map(([id, rows]) => {
        const peak = [...rows].sort(
          (a, b) =>
            Number(b.increase_pct ?? -Infinity) -
            Number(a.increase_pct ?? -Infinity)
        )[0]

        const station = metadataById.get(id) ?? {}

        return {
          ...station,
          station_id: id,
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
          peak,
          peakIncrease: Number(peak?.increase_pct) || 0,
        }
      })
      .filter((station) =>
        Number.isFinite(station.latitude) &&
        Number.isFinite(station.longitude) &&
        station.latitude >= -90 &&
        station.latitude <= 90 &&
        station.longitude >= -180 &&
        station.longitude <= 180
      )
      .sort((a, b) => b.peakIncrease - a.peakIncrease)
  }, [stations, criticalRows])

  return (
    <div className="haze-map">
      <MapContainer
        center={INDONESIA.center}
        zoom={INDONESIA.zoom}
        scrollWheelZoom
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        <MapResize />
        <MapFocus stations={stationSummary} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geo && (
          <Pane
            name="hazeIslandPane"
            style={{ zIndex: 350 }}
          >
            <GeoJSON
              data={geo}
              style={getIslandStyle}
              interactive={false}
            />
          </Pane>
        )}

        <Pane
          name="hazeStationPane"
          style={{ zIndex: 650 }}
        >
          {stationSummary.map((station) => {
            const selected =
              selectedStationId === station.station_id

            const level = getLevel(station.peakIncrease)
            const peak = station.peak

            return (
              <CircleMarker
                key={station.station_id}
                pane="hazeStationPane"
                center={[
                  station.latitude,
                  station.longitude,
                ]}
                radius={selected ? 10 : 7}
                pathOptions={{
                  color: selected ? '#18314F' : '#FFFFFF',
                  weight: selected ? 3 : 1.5,
                  fillColor: level.color,
                  fillOpacity: 0.96,
                }}
                eventHandlers={{
                  click: () => onSelectStation?.(station),
                }}
              >
<Popup
  autoPan
  maxWidth={210}
  minWidth={170}
  className="haze-map-leaflet-popup"
>
  <div className="haze-map-popup">
    <strong>{station.station_id}</strong>

    <div className="haze-popup-name">
      {station.nama_sensor || 'Stasiun pemantauan'}
    </div>

    <div className="haze-popup-region">
      {peak?.city || station.kota_kabupaten || '--'}
      {', '}
      {peak?.province || station.provinsi || '--'}
    </div>
  </div>
</Popup>
              </CircleMarker>
            )
          })}
        </Pane>
      </MapContainer>

      <div className="haze-map-legend">
        <strong>Tingkat peningkatan konsentrasi</strong>

        {LEVELS.map((level) => (
          <span key={level.label}>
            <i style={{ background: level.color }} />
            {level.label}
          </span>
        ))}
      </div>
    </div>
  )
}
