'use client'

import { useEffect, useRef } from 'react'
import { getIspuFromPm25, formatPm25 } from '@/lib/formatters'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/**
 * StationMap — peta Leaflet stasiun AQMS (client-only; import via next/dynamic { ssr: false }).
 * Props: stations (array), height (CSS), onSelect (station) => void
 * Berikan `stations` yang identitasnya stabil (useMemo) agar peta tidak dibuat ulang.
 */
export function StationMap({ stations = [], height = '300px', onSelect }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return
    let disposed = false

    import('leaflet').then((mod) => {
      if (disposed || !mapRef.current) return
      const L = mod.default ?? mod

      const map = L.map(mapRef.current, {
        center: [-2.5, 118],
        zoom: 5,
        minZoom: 4,
        zoomControl: true,
      })

      // Scroll halaman tidak "tersangkut" di peta: wheel-zoom aktif setelah peta diklik
      map.scrollWheelZoom.disable()
      map.on('focus', () => map.scrollWheelZoom.enable())
      map.on('blur', () => map.scrollWheelZoom.disable())

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map)

      const points = []
      stations.forEach((station) => {
        if (!Number.isFinite(station.latitude_dd) || !Number.isFinite(station.longitude_dd)) return
        const cat = getIspuFromPm25(station.avg_pm25)
        const color = cat?.color ?? '#94A3B8'

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};
            border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(24,49,79,.28),0 3px 8px ${color}99;cursor:pointer"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          popupAnchor: [0, -10],
        })

        const marker = L.marker([station.latitude_dd, station.longitude_dd], { icon }).addTo(map)
        points.push([station.latitude_dd, station.longitude_dd])

        marker.bindPopup(
          `<div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:170px">
            <div style="font-weight:700;font-size:13px;color:#18314F">${esc(station.kota_kabupaten)}</div>
            <div style="font-size:11px;color:#55706E;margin:2px 0 8px">${esc(station.location_id)}${station.region_group ? ' · ' + esc(station.region_group) : ''}</div>
            <div style="font-size:12px;color:#18314F">PM2.5 rata-rata <strong>${esc(formatPm25(station.avg_pm25))}</strong></div>
            <span style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;
              color:#18314F;background:${color}33;border:1px solid ${color}">${esc(cat?.label ?? '—')}</span>
            <div style="font-size:10.5px;color:#7C9693;margin-top:8px">${esc(station.status_operasional ?? '')}</div>
          </div>`,
          { maxWidth: 260 }
        )

        if (onSelect) marker.on('click', () => onSelect(station))
      })

      // Padding lebih longgar dan maxZoom lebih kecil agar Indonesia tidak terlalu besar di kotak pendek
      if (points.length > 1) {
        map.fitBounds(points, { padding: [24, 24], maxZoom: 5 })
      }

      // Leaflet perlu menghitung ulang ukuran setelah layout CSS selesai
      setTimeout(() => map.invalidateSize(), 0)

      instanceRef.current = map
    })

    return () => {
      disposed = true
      instanceRef.current?.remove()
      instanceRef.current = null
    }
  }, [onSelect, stations])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      aria-label="Peta stasiun AQMS Indonesia"
    />
  )
}