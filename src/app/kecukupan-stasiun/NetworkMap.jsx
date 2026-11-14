'use client'

import { useEffect, useRef, useState } from 'react'

const INDONESIA_CENTER = [-2.5, 118]
const INDONESIA_ZOOM = 5

const STATUS_COLORS = {
  Active: '#10B981',
  Intermittent: '#F59E0B',
  Defective: '#EF4444',
  Unknown: '#94A3B8',
}

const UNIT_COLORS = {
  'ug/m3': '#0284C7',
  ppm: '#EA580C',
}

// Leaflet dimuat sekali. Peta dibuat dan digambar di satu tempat, tidak di efek async terpisah.
let leafletPromise = null
function loadLeaflet() {
  if (!leafletPromise) {
    leafletPromise = import('leaflet').then((m) => m.default ?? m)
  }
  return leafletPromise
}

function getCoordinates(station) {
  const lat = Number(station.geometry?.coordinates?.[1] ?? station.latitude_dd)
  const lon = Number(station.geometry?.coordinates?.[0] ?? station.longitude_dd)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null
  }
  return [lat, lon]
}

function getStatus(station) {
  return station.status_operasional ?? station.properties?.status_operasional ?? 'Unknown'
}

function getUnit(station) {
  return station.pm25_unit ?? station.properties?.pm25_unit ?? 'ug/m3'
}

export function NetworkMap({ stations = [], height = '520px', onStationSelect }) {
  const containerRef = useRef(null)
  const ctxRef = useRef(null) // { L, map, markers, links }
  const [mapReady, setMapReady] = useState(false)
  const [colorMode, setColorMode] = useState('status')
  const [showAllLinks, setShowAllLinks] = useState(false)

  // 1. Buat peta sekali saat komponen dipasang, hapus saat dilepas
  useEffect(() => {
    let cancelled = false

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || ctxRef.current) return

      const map = L.map(containerRef.current, {
        center: INDONESIA_CENTER,
        zoom: INDONESIA_ZOOM,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      const links = L.layerGroup().addTo(map)
      const markers = L.layerGroup().addTo(map)

      ctxRef.current = { L, map, links, markers }
      setMapReady(true)
    }).catch((error) => console.error('Gagal memuat peta:', error))

    return () => {
      cancelled = true
      if (ctxRef.current) {
        ctxRef.current.map.remove()
        ctxRef.current = null
      }
      setMapReady(false)
    }
  }, [])

  // 2. Gambar ulang marker dan garis jarak. Semua operasi layer dilakukan sinkron di sini.
  useEffect(() => {
    const ctx = ctxRef.current
    if (!mapReady || !ctx) return
    const { L, links, markers } = ctx

    links.clearLayers()
    markers.clearLayers()

    const valid = stations
      .map((s) => ({ station: s, coords: getCoordinates(s) }))
      .filter((x) => x.coords)

    const coordById = new Map(valid.map((x) => [x.station.location_id, x.coords]))
    const coordByCode = new Map(valid.map((x) => [x.station.station_code, x.coords]))

    if (showAllLinks) {
      valid.forEach(({ station, coords }) => {
        const code = station.nearest_station_code
        const target = coordByCode.get(code) ?? coordById.get(code)
        if (!target) return
        L.polyline([coords, target], {
          color: '#64748B',
          weight: 1.3,
          dashArray: '4, 5',
          opacity: 0.5,
        }).addTo(links)
      })
    }

    valid.forEach(({ station, coords }) => {
      const status = getStatus(station)
      const color = colorMode === 'unit'
        ? UNIT_COLORS[getUnit(station)] ?? '#64748B'
        : STATUS_COLORS[status] ?? STATUS_COLORS.Unknown

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};
          border:2.5px solid white;box-shadow:0 0 0 1.5px rgba(24,49,79,.35);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })

      const marker = L.marker(coords, { icon }).addTo(markers)
      marker.on('click', () => onStationSelect?.(station))
    })
  }, [mapReady, stations, colorMode, showAllLinks, onStationSelect])

  const handleResetView = () => {
    ctxRef.current?.map.flyTo(INDONESIA_CENTER, INDONESIA_ZOOM, { duration: 1.2 })
  }

  const statusCounts = Object.keys(STATUS_COLORS)
    .map((status) => ({ status, count: stations.filter((s) => getStatus(s) === status).length }))
    .filter((item) => item.count > 0)

  const unitCounts = Object.keys(UNIT_COLORS)
    .map((unit) => ({ unit, count: stations.filter((s) => getUnit(s) === unit).length }))
    .filter((item) => item.count > 0)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <div ref={containerRef} style={{ height, width: '100%' }} />

      <div className="absolute left-3 top-3 z-[500] flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white/95 p-1 text-xs shadow-md">
          <button
            type="button"
            onClick={() => setColorMode('status')}
            className={`rounded-md px-2.5 py-1 ${colorMode === 'status' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Status Sensor
          </button>
          <button
            type="button"
            onClick={() => setColorMode('unit')}
            className={`rounded-md px-2.5 py-1 ${colorMode === 'unit' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Satuan PM2.5
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAllLinks((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-xs shadow-md ${showAllLinks ? 'border-sky-800 bg-sky-700 text-white' : 'border-slate-200 bg-white/95 text-slate-700'}`}
        >
          {showAllLinks ? 'Sembunyikan Garis' : 'Tampilkan Garis Jarak'}
        </button>

        <button
          type="button"
          onClick={handleResetView}
          className="rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-md"
        >
          Reset Peta
        </button>
      </div>

      <div className="absolute bottom-3 left-3 right-3 z-[500] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-md">
        <strong className="mr-3 inline-block text-slate-800">
          {colorMode === 'status' ? 'Status Sensor' : 'Satuan PM2.5'}
        </strong>
        <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {colorMode === 'status'
            ? statusCounts.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                  <span className="text-slate-600">{status} ({count})</span>
                </div>
              ))
            : unitCounts.map(({ unit, count }) => (
                <div key={unit} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: UNIT_COLORS[unit] }} />
                  <span className="text-slate-600">{unit === 'ug/m3' ? 'µg/m³' : unit} ({count})</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}