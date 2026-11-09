'use client'

import { useEffect, useRef, useState } from 'react'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const INDONESIA_CENTER = [-2.5, 118]
const INDONESIA_ZOOM = 5

const STATUS_COLORS = {
  Active: '#10B981',        // Emerald green
  Intermittent: '#F59E0B',  // Amber/yellow
  Defective: '#EF4444',     // Crimson red
}

const UNIT_COLORS = {
  'ug/m3': '#0284C7',       // Sky blue
  'ppm': '#EA580C',         // Vivid orange
}

export function NetworkMap({
  stations = [],
  selectedStation = null,
  onSelectStation,
  colorMode = 'status', // 'status' | 'unit'
  onChangeColorMode,
  showAllLinks = false,
  onToggleLinks,
  height = '520px',
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const linksLayerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  // Inisialisasi peta Leaflet sekali
  useEffect(() => {
    if (!mapRef.current) return
    let disposed = false

    import('leaflet').then((L) => {
      if (disposed || !mapRef.current) return

      // Cek apakah map sudah terinisialisasi
      if (mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: INDONESIA_CENTER,
        zoom: INDONESIA_ZOOM,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
      })

      // Tile OpenStreetMap resmi
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }).addTo(map)

      // Zoom control di pojok kanan bawah agar tidak menabrak overlay filter
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Layer groups
      const linksLayer = L.layerGroup().addTo(map)
      const markersLayer = L.layerGroup().addTo(map)

      mapInstanceRef.current = map
      linksLayerRef.current = linksLayer
      markersLayerRef.current = markersLayer

      setMapReady(true)
    })

    return () => {
      disposed = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Render / Update Marker & Garis Jarak ketika stasiun, colorMode, atau selectedStation berubah
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current
      const markersLayer = markersLayerRef.current
      const linksLayer = linksLayerRef.current
      if (!map || !markersLayer || !linksLayer) return

      markersLayer.clearLayers()
      linksLayer.clearLayers()

      // Buat lookup koordinat berdasarkan station_code dan location_id
      const coordByStation = {}
      stations.forEach((st) => {
        const lat = st.geometry?.coordinates ? st.geometry.coordinates[1] : st.latitude_dd
        const lon = st.geometry?.coordinates ? st.geometry.coordinates[0] : st.longitude_dd
        const props = st.properties || st
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          coordByStation[props.station_code] = [lat, lon]
          coordByStation[props.location_id] = [lat, lon]
        }
      })

      // 1. Gambar Garis Jarak Terdekat
      stations.forEach((st) => {
        const props = st.properties || st
        const lat = st.geometry?.coordinates ? st.geometry.coordinates[1] : st.latitude_dd
        const lon = st.geometry?.coordinates ? st.geometry.coordinates[0] : st.longitude_dd
        const nearestCode = props.nearest_station_code || props.nearest_station_id
        const isSelected = selectedStation && (selectedStation.location_id === props.location_id || selectedStation.station_code === props.station_code)

        if ((showAllLinks || isSelected) && coordByStation[nearestCode]) {
          const targetCoord = coordByStation[nearestCode]
          const lineColor = isSelected ? '#EF4444' : '#64748B'
          const lineWeight = isSelected ? 3 : 1.5
          const lineDash = isSelected ? '6, 6' : '3, 4'
          const lineOpacity = isSelected ? 0.9 : 0.45

          const line = L.polyline([[lat, lon], targetCoord], {
            color: lineColor,
            weight: lineWeight,
            dashArray: lineDash,
            opacity: lineOpacity,
          }).addTo(linksLayer)

          // Tooltip jarak di tengah garis
          const midLat = (lat + targetCoord[0]) / 2
          const midLon = (lon + targetCoord[1]) / 2
          const distLabel = props.nearest_distance_km ? `${props.nearest_distance_km.toLocaleString('id-ID')} km` : ''

          if (isSelected && distLabel) {
            L.tooltip({
              permanent: true,
              direction: 'center',
              className: 'network-map-distance-badge',
            })
              .setContent(`<span>${esc(props.station_code)} &rarr; ${esc(nearestCode)}: <strong>${distLabel}</strong></span>`)
              .setLatLng([midLat, midLon])
              .addTo(linksLayer)
          }
        }
      })

      // 2. Gambar Marker Stasiun
      stations.forEach((st) => {
        const props = st.properties || st
        const lat = st.geometry?.coordinates ? st.geometry.coordinates[1] : st.latitude_dd
        const lon = st.geometry?.coordinates ? st.geometry.coordinates[0] : st.longitude_dd
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

        // Tentukan warna marker
        let markerColor = '#10B981'
        if (colorMode === 'unit') {
          markerColor = props.pm25_unit === 'ppm' ? UNIT_COLORS['ppm'] : UNIT_COLORS['ug/m3']
        } else {
          markerColor = STATUS_COLORS[props.status_operasional] || '#64748B'
        }

        const isSelected = selectedStation && (selectedStation.location_id === props.location_id || selectedStation.station_code === props.station_code)
        const isDefective = props.status_operasional === 'Defective'

        // Custom HTML Marker dengan ring glow jika terpilih
        const size = isSelected ? 24 : isDefective ? 18 : 16
        const pulseHtml = isSelected
          ? `<span class="network-map-pulse" style="border-color:${markerColor}"></span>`
          : ''

        const iconHtml = `
          <div class="network-map-marker-container">
            ${pulseHtml}
            <div style="
              width:${size}px;
              height:${size}px;
              border-radius:50%;
              background:${markerColor};
              border: 2.5px solid #ffffff;
              box-shadow: 0 0 0 1.5px rgba(24,49,79,0.35), 0 3px 8px rgba(0,0,0,0.3);
              cursor:pointer;
              display:flex;
              align-items:center;
              justify-content:center;
              transition: transform 0.2s ease;
            ">
              ${isDefective ? '<span style="color:#fff;font-size:10px;font-weight:bold">!</span>' : ''}
            </div>
          </div>
        `

        const icon = L.divIcon({
          className: '',
          html: iconHtml,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -(size / 2 + 6)],
        })

        const marker = L.marker([lat, lon], { icon }).addTo(markersLayer)

        // Konten Popup Informatif & Estetis
        const statusBadgeBg =
          props.status_operasional === 'Active'
            ? 'background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0'
            : props.status_operasional === 'Intermittent'
            ? 'background:#FFFBEB;color:#92400E;border:1px solid #FDE68A'
            : 'background:#FEF2F2;color:#991B1B;border:1px solid #FECACA'

        const unitBadgeBg =
          props.pm25_unit === 'ppm'
            ? 'background:#FFF7ED;color:#C2410C;border:1px solid #FFEDD5'
            : 'background:#F0F9FF;color:#0369A1;border:1px solid #E0F2FE'

        const recBadgeBg =
          props.recommendation_status === 'Perlu ditinjau'
            ? 'background:#FEF2F2;color:#991B1B;border:1px solid #FECACA'
            : 'background:#F0FDF4;color:#166534;border:1px solid #DCFCE7'

        const popupContent = `
          <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:240px;padding:4px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:11px;font-weight:700;color:#0284C7;letter-spacing:0.5px">${esc(props.station_code)}</span>
              <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;${recBadgeBg}">
                ${esc(props.recommendation_status || 'Pantau')}
              </span>
            </div>
            <div style="font-size:13.5px;font-weight:700;color:#18314F;line-height:1.3;margin-bottom:2px">
              ${esc(props.kota_kabupaten || props.provinsi)}
            </div>
            <div style="font-size:11px;color:#64748B;margin-bottom:8px">
              ${esc(props.provinsi)} &middot; ${esc(props.site_type || '—')}
            </div>

            <div style="display:flex;gap:6px;margin-bottom:10px">
              <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;${statusBadgeBg}">
                ${esc(props.status_operasional)}
              </span>
              <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;${unitBadgeBg}">
                Unit: ${esc(props.pm25_unit || 'ug/m3')}
              </span>
            </div>

            <div style="border-top:1px solid #E2E8F0;padding-top:8px;font-size:11px;color:#334155;display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <div>
                <span style="color:#64748B">Kelengkapan:</span><br/>
                <strong style="color:${props.completeness_pct < 75 ? '#DC2626' : '#10B981'}">
                  ${props.completeness_pct != null ? `${props.completeness_pct}%` : '—'}
                </strong>
              </div>
              <div>
                <span style="color:#64748B">Tetangga Terdekat:</span><br/>
                <strong>${props.nearest_distance_km ? `${props.nearest_distance_km} km` : '—'}</strong>
              </div>
            </div>

            ${
              props.primary_trigger
                ? `<div style="margin-top:8px;padding:6px;border-radius:6px;background:#F8FAFC;border:1px dashed #CBD5E1;font-size:10px;color:#475569">
                    <strong>Pemicu Evaluasi:</strong> ${esc(props.primary_trigger)}
                   </div>`
                : ''
            }
          </div>
        `

        marker.bindPopup(popupContent, { maxWidth: 300, minWidth: 230 })

        marker.on('click', () => {
          if (onSelectStation) {
            onSelectStation(props)
          }
        })

        // Buka popup jika stasiun terpilih
        if (isSelected) {
          marker.openPopup()
        }
      })
    })
  }, [stations, selectedStation, colorMode, showAllLinks, mapReady, onSelectStation])

  // Reset View Handler
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(INDONESIA_CENTER, INDONESIA_ZOOM, { duration: 1.2 })
    }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
      {/* Kontainer Peta Leaflet */}
      <div ref={mapRef} style={{ height, width: '100%' }} />

      {/* Kontrol dan Tombol Overlay di Peta */}
      <div className="absolute top-3 left-3 z-[500] flex flex-wrap gap-2">
        {/* Toggle Mode Pewarnaan Marker */}
        <div className="inline-flex rounded-lg bg-white/95 backdrop-blur-sm p-1 shadow-md border border-slate-200/80 text-xs font-medium">
          <button
            type="button"
            onClick={() => onChangeColorMode?.('status')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              colorMode === 'status'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-640 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Status Sensor
          </button>
          <button
            type="button"
            onClick={() => onChangeColorMode?.('unit')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              colorMode === 'unit'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Satuan PM2.5
          </button>
        </div>

        {/* Toggle Garis Jarak Terdekat */}
        <button
          type="button"
          onClick={() => onToggleLinks?.(!showAllLinks)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-md border backdrop-blur-sm transition-all ${
            showAllLinks
              ? 'bg-sky-700 text-white border-sky-800'
              : 'bg-white/95 text-slate-700 border-slate-200/80 hover:bg-slate-100'
          }`}
        >
          {showAllLinks ? 'Sembunyikan Garis Jarak' : 'Tampilkan Semua Garis Jarak'}
        </button>

        {/* Tombol Reset Tampilan Indonesia */}
        <button
          type="button"
          onClick={handleResetView}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/95 text-slate-700 shadow-md border border-slate-200/80 hover:bg-slate-100 backdrop-blur-sm"
          title="Kembali ke tampilan peta Indonesia"
        >
          Reset Peta
        </button>
      </div>

      {/* Legenda Peta di Pojok Kiri Bawah */}
      <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-slate-200/80 text-xs">
        <div className="font-semibold text-slate-800 mb-1.5">
          {colorMode === 'status' ? 'Status Sensor Operasional' : 'Kelompok Satuan PM2.5'}
        </div>
        {colorMode === 'status' ? (
          <div className="flex flex-col gap-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs" />
              <span>Active (23 Stasiun)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-xs" />
              <span>Intermittent (3 Stasiun)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-white shadow-xs" />
              <span>Defective (1 Stasiun - JMB-02)</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-600 border border-white shadow-xs" />
              <span>&mu;g/m&sup3; (24 Stasiun Konsentrasi Massa)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-600 border border-white shadow-xs" />
              <span>ppm (3 Stasiun Logger Asli)</span>
            </div>
          </div>
        )}
      </div>

      {/* CSS internal untuk efek pulse marker terpilih & badge tooltip */}
      <style jsx global>{`
        .network-map-marker-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .network-map-pulse {
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid #0284c7;
          animation: map-pulse-anim 1.8s infinite ease-out;
          pointer-events: none;
        }
        @keyframes map-pulse-anim {
          0% {
            transform: scale(0.6);
            opacity: 1;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .network-map-distance-badge {
          background: #1e293b !important;
          color: #f8fafc !important;
          border: 1px solid #334155 !important;
          border-radius: 9999px !important;
          padding: 2px 10px !important;
          font-size: 11px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        .network-map-distance-badge::before {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

