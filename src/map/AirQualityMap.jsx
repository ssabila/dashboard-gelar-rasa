'use client'

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  GeoJSON,
  Pane,
  useMap,
} from 'react-leaflet'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const ISPU_COLORS = {
  Baik: '#4ADE80',
  Sedang: '#FACC15',
  'Tidak Sehat': '#FB923C',
  'Sangat Tidak Sehat': '#F87171',
  Berbahaya: '#C026D3',
}

const INDONESIA = {
  center: [-2.5, 118],
  zoom: 4,
}

function getRecordDate(row) {
  return (
    row?.tanggal ??
    row?.tanggal_pengukuran ??
    row?.measurement_date ??
    row?.date ??
    row?.timestamp_end ??
    row?.timestamp_start ??
    row?.datetime ??
    row?.timestamp ??
    ''
  )
}

function normalizeDate(value) {
  if (!value) return ''

  const parsed = new Date(value)

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime()
  }

  return String(value)
}

function formatValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') {
    return 'Tidak tersedia'
  }

  if (typeof value === 'number') {
    return `${value.toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })}${suffix}`
  }

  return `${value}${suffix}`
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
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((station) => [
          Number(station.latitude),
          Number(station.longitude),
        ])
      )

      if (bounds.isValid()) {
        map.flyToBounds(bounds, {
          padding: [35, 35],
          maxZoom: 8,
          duration: 0.8,
        })
        return
      }
    }

    map.flyTo(INDONESIA.center, INDONESIA.zoom, {
      duration: 0.8,
    })
  }, [map, stations])

  return null
}

function getIslandStyle() {
  return {
    fillColor: '#78A9D1',
    fillOpacity: 0.35,
    color: '#426B91',
    weight: 0.8,
    opacity: 0.8,
  }
}

function DetailRow({ label, value }) {
  return (
    <p style={{ margin: '5px 0', lineHeight: 1.45 }}>
      <span style={{ color: '#64748B' }}>{label}: </span>
      <strong style={{ color: '#18314F', fontWeight: 600 }}>
        {value ?? 'Tidak tersedia'}
      </strong>
    </p>
  )
}

export function AirQualityMap({
  geo,
  stations = [],
  dailyRows = [],
  parameter = 'pm25',
  selectedStationId = null,
  onSelectStation,
}) {
  // Ambil satu catatan pengukuran paling baru untuk setiap stasiun.
  // dailyRows mengikuti filter periode/wilayah yang dikirim dari halaman utama.
  const latestByStation = useMemo(() => {
    const result = new Map()

    dailyRows.forEach((row) => {
      const stationId = row?.station_id ?? row?.sensor_id

      if (!stationId) return

      const currentDate = normalizeDate(getRecordDate(row))
      const previous = result.get(stationId)
      const previousDate = previous
        ? normalizeDate(getRecordDate(previous))
        : ''

      if (
        !previous ||
        String(currentDate) > String(previousDate)
      ) {
        result.set(stationId, row)
      }
    })

    return result
  }, [dailyRows])

  const validStations = useMemo(() => {
    return stations.filter((station) => {
      const latitude = Number(station.latitude)
      const longitude = Number(station.longitude)

      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      )
    })
  }, [stations])

  return (
    <div
      style={{
        height: 520,
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={INDONESIA.center}
        zoom={INDONESIA.zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <MapResize />

        <MapFocus stations={validStations} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geo && (
          <Pane name="islandPane" style={{ zIndex: 350 }}>
            <GeoJSON
              data={geo}
              style={getIslandStyle}
              interactive={false}
            />
          </Pane>
        )}

        <Pane name="stationPane" style={{ zIndex: 650 }}>
          {validStations.map((station) => {
            const stationId = station.station_id ?? station.sensor_id
            const latest = latestByStation.get(stationId)
            const category = latest?.kategori_ispu
            const selected = selectedStationId === stationId
            const hasMeasurement = Boolean(latest)

            const color = hasMeasurement
              ? ISPU_COLORS[category] ?? '#94A3B8'
              : '#94A3B8'

            const parameterValue = latest?.[parameter]
            const recordDate = latest ? getRecordDate(latest) : ''

            return (
              <CircleMarker
                key={stationId}
                pane="stationPane"
                center={[
                  Number(station.latitude),
                  Number(station.longitude),
                ]}
                radius={selected ? 10 : 7}
                pathOptions={{
                  color: selected ? '#203B60' : '#FFFFFF',
                  weight: selected ? 3 : 1.5,
                  fillColor: color,
                  fillOpacity: 0.95,
                }}
                eventHandlers={{
                  click: () => onSelectStation?.(station),
                }}
              >
              </CircleMarker>
            )
          })}
        </Pane>
      </MapContainer>
    </div>
  )
}
