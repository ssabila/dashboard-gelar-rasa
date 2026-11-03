'use client'

import { useEffect, useRef } from 'react'
import { getIspuFromPm25 } from '@/lib/formatters'
import { formatPm25 } from '@/lib/formatters'

/**
 * StationMap — peta Leaflet 27 stasiun AQMS.
 * Menggunakan dynamic import karena Leaflet tidak SSR-compatible.
 *
 * Props:
 *   stations   array   — dari useStations(). Setiap item minimal punya:
 *                        { location_id, kota_kabupaten, latitude_dd, longitude_dd,
 *                          avg_pm25, status_operasional }
 *   height     string  — CSS height (default '420px')
 *   onSelect   fn      — (station) => void, dipanggil saat marker diklik (opsional)
 *
 * Penggunaan:
 *   import dynamic from 'next/dynamic'
 *   const StationMap = dynamic(() => import('@/map/StationMap')
 *     .then(m => m.StationMap), { ssr: false })
 */
export function StationMap({ stations = [], height = '420px', onSelect }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!mapRef.current) return

    let disposed = false

    // Dynamic import Leaflet supaya tidak crash di SSR
    import('leaflet').then((L) => {
      if (disposed) return

      // Fix default marker icon path (issue Leaflet + webpack)
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, {
        center: [-2.5, 118],
        zoom: 5,
        zoomControl: true,
      })

      // Leaflet handles the map; OpenStreetMap supplies the public tile images.
      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }
      ).addTo(map)

      // Render marker
      stations.forEach((station) => {
        const cat = getIspuFromPm25(station.avg_pm25)
        const color = cat?.color ?? '#4A6480'

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:14px; height:14px; border-radius:50%;
            background:${color};
            border: 2px solid rgba(255,255,255,0.35);
            box-shadow: 0 0 8px ${color}80;
            cursor:pointer;
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          popupAnchor: [0, -10],
        })

        const marker = L.marker(
          [station.latitude_dd, station.longitude_dd],
          { icon }
        ).addTo(map)

        // Popup
        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:160px;">
            <p style="font-weight:600; font-size:13px; margin:0 0 6px; color:#F0F4FF">
              ${station.kota_kabupaten}
            </p>
            <p style="font-size:11px; color:#8BBEB2; margin:0 0 4px">
              ${station.location_id}
            </p>
            <p style="font-size:12px; margin:0 0 4px; color:#F0F4FF">
              PM2.5 rata-rata: <strong>${formatPm25(station.avg_pm25)}</strong>
            </p>
            <span style="
              display:inline-block; font-size:11px; font-weight:500;
              padding:2px 8px; border-radius:4px;
              color:${color}; background:${color}20;
              border:1px solid ${color}40;
            ">${cat?.label ?? '—'}</span>
            <p style="font-size:10px; color:#8BBEB2; margin:6px 0 0">
              ${station.status_operasional ?? ''}
            </p>
          </div>
        `, { maxWidth: 240 })

        if (onSelect) {
          marker.on('click', () => onSelect(station))
        }
      })

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
      style={{ height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
      aria-label="Peta 27 stasiun AQMS Indonesia"
    />
  )
}
