
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

const ISLAND_BY_PROVINCE = {
  ACEH: 'Sumatera',
  'SUMATERA UTARA': 'Sumatera',
  'SUMATERA BARAT': 'Sumatera',
  RIAU: 'Sumatera',
  JAMBI: 'Sumatera',
  'SUMATERA SELATAN': 'Sumatera',
  BENGKULU: 'Sumatera',
  LAMPUNG: 'Sumatera',
  'KEPULAUAN BANGKA BELITUNG': 'Sumatera',
  'KEPULAUAN RIAU': 'Sumatera',
  'DKI JAKARTA': 'Jawa',
  'JAWA BARAT': 'Jawa',
  'JAWA TENGAH': 'Jawa',
  'DI YOGYAKARTA': 'Jawa',
  'JAWA TIMUR': 'Jawa',
  BANTEN: 'Jawa',
  BALI: 'Bali-Nusa Tenggara',
  'NUSA TENGGARA BARAT': 'Bali-Nusa Tenggara',
  'NUSA TENGGARA TIMUR': 'Bali-Nusa Tenggara',
  'KALIMANTAN BARAT': 'Kalimantan',
  'KALIMANTAN TENGAH': 'Kalimantan',
  'KALIMANTAN SELATAN': 'Kalimantan',
  'KALIMANTAN TIMUR': 'Kalimantan',
  'KALIMANTAN UTARA': 'Kalimantan',
  'SULAWESI UTARA': 'Sulawesi',
  'SULAWESI TENGAH': 'Sulawesi',
  'SULAWESI SELATAN': 'Sulawesi',
  'SULAWESI TENGGARA': 'Sulawesi',
  GORONTALO: 'Sulawesi',
  'SULAWESI BARAT': 'Sulawesi',
  MALUKU: 'Maluku',
  'MALUKU UTARA': 'Maluku',
  'PAPUA BARAT': 'Papua',
  PAPUA: 'Papua',
  'PAPUA SELATAN': 'Papua',
  'PAPUA TENGAH': 'Papua',
  'PAPUA PEGUNUNGAN': 'Papua',
  'PAPUA BARAT DAYA': 'Papua',
}

function esc(value) {
  return String(value ?? '—').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

function getCoordinates(station) {
  const lat = Number(
    station.geometry?.coordinates?.[1] ?? station.latitude_dd
  )
  const lon = Number(
    station.geometry?.coordinates?.[0] ?? station.longitude_dd
  )

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null
  }

  return [lat, lon]
}

function getStatus(station) {
  return station.properties?.status_operasional ??
    station.status_operasional ??
    'Unknown'
}

function getUnit(station) {
  return station.properties?.pm25_unit ??
    station.pm25_unit ??
    'ug/m3'
}

function getStationProps(station) {
  return station.properties ?? station
}

function getProvince(station) {
  return String(getStationProps(station).provinsi ?? '').trim().toUpperCase()
}

function getFeatureIsland(feature) {
  return String(feature?.properties?.pulau ?? '').trim() || 'Lainnya'
}

function getIsland(province) {
  return ISLAND_BY_PROVINCE[province.toUpperCase()] ?? 'Lainnya'
}

function interpolateColor(start, end, ratio) {
  const startRgb = start.match(/\w\w/g).map((part) => parseInt(part, 16))
  const endRgb = end.match(/\w\w/g).map((part) => parseInt(part, 16))
  const rgb = startRgb.map((channel, index) =>
    Math.round(channel + (endRgb[index] - channel) * ratio)
  )
  return `rgb(${rgb.join(', ')})`
}

function sensorFill(value, max) {
  if (!max) return '"#f3c59d",'
  return interpolateColor('"#f3c59d"', '"#A94E1D"', Math.min(value / max, 1))
}

export function NetworkMap({
  stations = [],
  geo = null,
  height = '520px',
  onStationSelect,
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const boundaryLayerRef = useRef(null)
  const linksLayerRef = useRef(null)

  const [mapReady, setMapReady] = useState(false)
  const [colorMode, setColorMode] = useState('status')
  const [showAllLinks, setShowAllLinks] = useState(false)

  // 1. Inisialisasi peta Leaflet
  useEffect(() => {
    if (!mapRef.current) return

    let cancelled = false

    async function initializeMap() {
      const L = await import('leaflet')

      if (cancelled || !mapRef.current || mapInstanceRef.current) {
        return
      }

      const map = L.map(mapRef.current, {
        center: INDONESIA_CENTER,
        zoom: INDONESIA_ZOOM,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
      })

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      ).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      const boundaries = L.layerGroup().addTo(map)
      const markers = L.layerGroup().addTo(map)
      const links = L.layerGroup().addTo(map)

      mapInstanceRef.current = map
      boundaryLayerRef.current = boundaries
      markersLayerRef.current = markers
      linksLayerRef.current = links

      setMapReady(true)
    }

    initializeMap().catch((error) => {
      console.error('Gagal menginisialisasi peta:', error)
    })

    return () => {
      cancelled = true

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      boundaryLayerRef.current = null
      markersLayerRef.current = null
      linksLayerRef.current = null
      setMapReady(false)
    }
  }, [])

  // 2. Warnai polygon berdasarkan agregasi provinsi dari metadata stasiun.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !geo?.features) {
      return
    }

    let cancelled = false

    async function drawBoundaries() {
      const L = await import('leaflet')

      if (cancelled || !boundaryLayerRef.current) return

      boundaryLayerRef.current.clearLayers()

      const islandSensorCounts = new Map()
      stations.forEach((station) => {
        const island = getIsland(getProvince(station))
        const props = getStationProps(station)
        const value = Number(props.sensor_count ?? 0)
        islandSensorCounts.set(island, (islandSensorCounts.get(island) ?? 0) + value)
      })
      const max = Math.max(...islandSensorCounts.values(), 0)

      const layer = L.geoJSON(geo, {
        style: (feature) => {
          const island = getFeatureIsland(feature)
          const value = islandSensorCounts.get(island) ?? 0
          return {
            color: '#FFFFFF',
            weight: 0.35,
            opacity: 0.8,
            fillColor: sensorFill(value, max),
            fillOpacity: 0.92,
          }
        },
        onEachFeature: (feature, polygon) => {
          const island = getFeatureIsland(feature)
          const value = islandSensorCounts.get(island) ?? 0
          polygon.bindTooltip(
            `<strong>${esc(island)}</strong><br/>` +
            `Sensor: ${value}`,
            { sticky: true }
          )
        },
      })

      layer.addTo(boundaryLayerRef.current)
    }

    drawBoundaries().catch((error) => {
      console.error('Gagal menggambar batas administratif:', error)
    })

    return () => {
      cancelled = true
    }
  }, [geo, mapReady, stations])

  // 3. Gambar marker dan garis jarak antarlokasi.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return

    let cancelled = false

    async function drawStations() {
      const L = await import('leaflet')

      if (cancelled) return

      const markersLayer = markersLayerRef.current
      const linksLayer = linksLayerRef.current

      if (!markersLayer || !linksLayer) return

      markersLayer.clearLayers()
      linksLayer.clearLayers()

      const coordinateByCode = new Map()
      const coordinateById = new Map()

      stations.forEach((station) => {
        const props = getStationProps(station)
        const coords = getCoordinates(station)

        if (!coords) return

        if (props.station_code) {
          coordinateByCode.set(props.station_code, coords)
        }

        if (props.location_id) {
          coordinateById.set(props.location_id, coords)
        }
      })

      // Garis menuju stasiun terdekat
      stations.forEach((station) => {
        const props = getStationProps(station)
        const coords = getCoordinates(station)

        if (!coords) return

        const nearestCode =
          props.nearest_station_code ??
          props.nearest_station_id

        const target =
          coordinateByCode.get(nearestCode) ??
          coordinateById.get(nearestCode)

        if (!target) return

        if (showAllLinks) {
          L.polyline([coords, target], {
            color: '#64748B',
            weight: 1.3,
            dashArray: '4, 5',
            opacity: 0.5,
          }).addTo(linksLayer)
        }
      })

      // Marker lokasi stasiun
      stations.forEach((station) => {
        const props = getStationProps(station)
        const coords = getCoordinates(station)

        if (!coords) return

        const status = getStatus(props)
        const unit = getUnit(props)

        const markerColor =
          colorMode === 'unit'
            ? UNIT_COLORS[unit] ?? '#64748B'
            : STATUS_COLORS[status] ?? STATUS_COLORS.Unknown

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width:16px;
              height:16px;
              border-radius:50%;
              background:${markerColor};
              border:2.5px solid white;
              box-shadow:0 0 0 1.5px rgba(24,49,79,.35);
            "></div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        const marker = L.marker(coords, { icon })
          .addTo(markersLayer)
        marker.on('click', () => onStationSelect?.(station))
      })
    }

    drawStations().catch((error) => {
      console.error('Gagal menampilkan stasiun:', error)
    })

    return () => {
      cancelled = true
    }
  }, [stations, colorMode, onStationSelect, showAllLinks, mapReady])

  const handleResetView = () => {
    mapInstanceRef.current?.flyTo(
      INDONESIA_CENTER,
      INDONESIA_ZOOM,
      { duration: 1.2 }
    )
  }

  const statusCounts = Object.keys(STATUS_COLORS).map((status) => ({
    status,
    count: stations.filter(
      (station) => getStatus(getStationProps(station)) === status
    ).length,
  })).filter((item) => item.count > 0)

  const unitCounts = Object.keys(UNIT_COLORS).map((unit) => ({
    unit,
    count: stations.filter(
      (station) => getUnit(getStationProps(station)) === unit
    ).length,
  })).filter((item) => item.count > 0)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
      />

      {/* Kontrol peta */}
      <div className="absolute left-3 top-3 z-[500] flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white/95 p-1 text-xs shadow-md">
          <button
            type="button"
            onClick={() => setColorMode('status')}
            className={`rounded-md px-2.5 py-1 ${
              colorMode === 'status'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Status Sensor
          </button>

          <button
            type="button"
            onClick={() => setColorMode('unit')}
            className={`rounded-md px-2.5 py-1 ${
              colorMode === 'unit'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Satuan PM2.5
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAllLinks((value) => !value)}
          className={`rounded-lg border px-3 py-1.5 text-xs shadow-md ${
            showAllLinks
              ? 'border-sky-800 bg-sky-700 text-white'
              : 'border-slate-200 bg-white/95 text-slate-700'
          }`}
        >
          {showAllLinks
            ? 'Sembunyikan Garis'
            : 'Tampilkan Garis Jarak'}
        </button>

        <button
          type="button"
          onClick={handleResetView}
          className="rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-md"
        >
          Reset Peta
        </button>
      </div>

      {/* Legenda marker */}
      <div className="absolute bottom-3 left-3 right-3 z-[500] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-md">
        <strong className="mr-3 inline-block text-slate-800">
          {colorMode === 'status' ? 'Status Sensor' : 'Satuan PM2.5'}
        </strong>

        <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {colorMode === 'status'
            ? statusCounts.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: STATUS_COLORS[status] }}
                  />
                  <span className="text-slate-600">
                    {status} ({count})
                  </span>
                </div>
              ))
            : unitCounts.map(({ unit, count }) => (
                <div key={unit} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: UNIT_COLORS[unit] }}
                  />
                  <span className="text-slate-600">
                    {unit === 'ug/m3' ? 'µg/m³' : unit} ({count})
                  </span>
                </div>
              ))}
        </div>

        <div className="mt-1 flex items-center gap-2 border-t border-slate-200 pt-1 text-[10px] text-slate-500">
          <span>Lebih sedikit</span>
          <span style={{ flex: 1, height: 6, minWidth: 80, borderRadius: 999, background: 'linear-gradient(90deg, #f3c59d 0%, #A94E1D 100%)' }} />
          <span>Lebih banyak sensor</span>
        </div>
      </div>
    </div>
  )
}
