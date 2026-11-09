'use client'

import { useEffect, useRef, useState } from 'react'
import { kabColor, formatKabValue, PERAN_COLORS } from '@/lib/coverage'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const INDONESIA = { center: [-2.5, 118], zoom: 5 }
const NAVY = '#18314F'

/**
 * CoverageMap — peta Leaflet untuk halaman Kecukupan Stasiun (client-only).
 * Import dengan next/dynamic + { ssr: false }.
 *
 * Layer: choropleth kabupaten, lingkaran radius, stasiun, garis redundansi,
 * kandidat lokasi baru, dan garis jarak ke stasiun terdekat.
 *
 * Props:
 *   geo            FeatureCollection coverage_kabupaten.geojson
 *   stations       daftar stasiun yang sudah diperkaya metrik jaringan
 *   redundantPairs pasangan stasiun redundan (opsional)
 *   kabById        Map(kab_id → baris tabel kabupaten, memuat lat/lon)
 *   metric, ctx    metrik warna & konteks skala (lib/coverage)
 *   pulau          string | null — pulau terpilih (lainnya diredupkan)
 *   selected       { type: 'kab'|'station', id, fly? } | null
 *   onSelect       (sel) => void
 *   showCircles / showStations / showLinks   boolean
 *   radius         km, radius lingkaran stasiun
 *   candidates     [{ kab_id, prioritas, lat, lon }]
 *   candidateRadius km
 */
export function CoverageMap({
  geo,
  stations = [],
  redundantPairs = [],
  kabById,
  metric,
  ctx,
  pulau,
  selected,
  onSelect,
  showCircles = true,
  showStations = true,
  showLinks = false,
  radius,
  candidates = [],
  candidateRadius,
  height = '620px',
}) {
  const elRef = useRef(null)
  const rt = useRef({})
  const geoLayerRef = useRef(null)
  const [ready, setReady] = useState(false)

  // Nilai terbaru untuk handler Leaflet (hindari closure basi)
  const live = useRef({})
  live.current = { metric, ctx, pulau, selected, kabById, onSelect }

  /* ── Inisialisasi peta (sekali) ── */
  useEffect(() => {
    let disposed = false
    let map

    import('leaflet').then((mod) => {
      if (disposed || !elRef.current) return
      const L = mod.default ?? mod

      map = L.map(elRef.current, {
        center: INDONESIA.center,
        zoom: INDONESIA.zoom,
        minZoom: 4,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      ;[['pane-circles', 410], ['pane-links', 420], ['pane-stations', 430], ['pane-dist', 440]].forEach(
        ([name, z]) => { map.createPane(name).style.zIndex = z }
      )

      rt.current = {
        L,
        map,
        circles: L.layerGroup().addTo(map),
        links: L.layerGroup().addTo(map),
        stations: L.layerGroup().addTo(map),
        cands: L.layerGroup().addTo(map),
        dist: L.layerGroup().addTo(map),
      }
      setReady(true)
    })

    return () => {
      disposed = true
      geoLayerRef.current = null
      map?.remove()
      rt.current = {}
      setReady(false)
    }
  }, [])

  /* ── Gaya polygon ── */
  const featureStyle = (f) => {
    const { metric: m, ctx: c, pulau: pl, selected: sel } = live.current
    const p = f.properties
    const dim = pl && p.pulau !== pl
    const isSel = sel?.type === 'kab' && sel.id === p.kab_id
    return {
      fillColor: kabColor(p, m, c),
      fillOpacity: dim ? 0.07 : 0.78,
      color: isSel ? NAVY : p.has_station ? NAVY : '#FFFFFF',
      weight: isSel ? 2.8 : p.has_station ? 1.1 : 0.35,
      opacity: dim ? 0.25 : 1,
    }
  }

  /* ── Buat layer polygon ── */
  useEffect(() => {
    if (!ready || !geo) return
    const { L, map } = rt.current
    if (!L || !map || typeof L.geoJSON !== 'function') return
    geoLayerRef.current?.remove()

    const layer = L.geoJSON(geo, {
      style: featureStyle,
      onEachFeature: (feature, lyr) => {
        lyr.bindTooltip(
          () => {
            const { metric: m, ctx: c } = live.current
            const p = feature.properties
            return `<strong>${esc(p.kabupaten)}</strong><br/>${esc(p.provinsi)}<br/>${esc(formatKabValue(p, m, c))}`
          },
          { sticky: true, direction: 'top', opacity: 0.95 }
        )
        lyr.on({
          mouseover: (e) => e.target.setStyle({ weight: 2.2, color: NAVY }),
          mouseout: (e) => e.target.setStyle(featureStyle(feature)),
          click: () => live.current.onSelect?.({ type: 'kab', id: feature.properties.kab_id }),
        })
      },
    }).addTo(map)

    geoLayerRef.current = layer
    layer.bringToBack()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, geo])

  /* ── Restyle saat metrik, radius, bobot, filter, atau seleksi berubah ── */
  useEffect(() => {
    if (!ready || !geoLayerRef.current) return
    geoLayerRef.current.eachLayer((l) => l.setStyle(featureStyle(l.feature)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, geo, metric, ctx, pulau, selected])

  /* ── Zoom ke pulau terpilih ── */
  useEffect(() => {
    if (!ready || !geoLayerRef.current) return
    if (typeof rt.current.L?.featureGroup !== 'function') return
    const { L, map } = rt.current
    if (!L || !map) return
    if (!pulau) {
      map.flyTo(INDONESIA.center, INDONESIA.zoom, { duration: 0.8 })
      return
    }
    const layers = []
    geoLayerRef.current.eachLayer((l) => { if (l.feature.properties.pulau === pulau) layers.push(l) })
    if (layers.length) {
      map.flyToBounds(L.featureGroup(layers).getBounds(), { padding: [24, 24], maxZoom: 8, duration: 0.8 })
    }
  }, [ready, geo, pulau])

  /* ── Lingkaran radius stasiun ── */
  useEffect(() => {
    if (!ready) return
    const { L, circles } = rt.current
    if (!L || !circles) return
    circles.clearLayers()
    if (!showCircles || !radius) return
    stations.forEach((s) => {
      L.circle([s.latitude_dd, s.longitude_dd], {
        pane: 'pane-circles',
        radius: radius * 1000,
        color: '#384E77',
        weight: 1,
        opacity: 0.55,
        fillColor: '#384E77',
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(circles)
    })
  }, [ready, showCircles, radius, stations])

  /* ── Garis redundansi ── */
  useEffect(() => {
    if (!ready) return
    const { L, links } = rt.current
    if (!L || !links) return
    links.clearLayers()
    if (!showLinks) return
    const byKode = new Map(stations.map((s) => [s.kode, s]))
    redundantPairs.forEach((p) => {
      const a = byKode.get(p.a)
      const b = byKode.get(p.b)
      if (!a || !b) return
      L.polyline(
        [[a.latitude_dd, a.longitude_dd], [b.latitude_dd, b.longitude_dd]],
        { pane: 'pane-links', color: '#C026D3', weight: 1.5 + Math.max(0, p.corr - 0.8) * 18, opacity: 0.75 }
      )
        .bindTooltip(`${esc(p.a)} ↔ ${esc(p.b)}<br/>r = ${p.corr} · ${Math.round(p.dist_km)} km`, { sticky: true })
        .addTo(links)
    })
  }, [ready, showLinks, redundantPairs, stations])

  /* ── Marker stasiun ── */
  useEffect(() => {
    if (!ready) return
    const { L, stations: layer } = rt.current
    if (!L || !layer) return
    layer.clearLayers()
    if (!showStations) return
    stations.forEach((s) => {
      L.circleMarker([s.latitude_dd, s.longitude_dd], {
        pane: 'pane-stations',
        radius: 5 + ((s.completeness_pct ?? 0) / 100) * 4,
        color: PERAN_COLORS[s.peran] ?? '#94A3B8',
        weight: 3,
        fillColor: NAVY,
        fillOpacity: 1,
      })
        .bindTooltip(
          `<strong>${esc(s.kode)}</strong> · ${esc(s.kota_kabupaten)}<br/>${esc(s.peran)} · data ${Math.round(s.completeness_pct ?? 0)}% lengkap`,
          { direction: 'top' }
        )
        .on('click', () => live.current.onSelect?.({ type: 'station', id: s.kode }))
        .addTo(layer)
    })
  }, [ready, showStations, stations])

  /* ── Kandidat lokasi baru ── */
  useEffect(() => {
    if (!ready) return
    const { L, cands } = rt.current
    if (!L || !cands) return
    cands.clearLayers()
    candidates.forEach((c) => {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lon)) return
      if (candidateRadius) {
        L.circle([c.lat, c.lon], {
          pane: 'pane-dist',
          radius: candidateRadius * 1000,
          color: '#EF4444',
          weight: 1.5,
          dashArray: '6 6',
          fillColor: '#EF4444',
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(cands)
      }
      L.marker([c.lat, c.lon], {
        icon: L.divIcon({
          className: '',
          html: `<div class="cov-pin">${c.prioritas}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      })
        .bindTooltip(`Prioritas ${c.prioritas}`, { direction: 'top' })
        .on('click', () => live.current.onSelect?.({ type: 'kab', id: c.kab_id }))
        .addTo(cands)
    })
  }, [ready, candidates, candidateRadius])

  /* ── Seleksi: garis jarak ke stasiun terdekat / cincin stasiun ── */
  useEffect(() => {
    if (!ready) return
    const { L, map, dist } = rt.current
    if (!L || !map || !dist) return
    dist.clearLayers()
    if (!selected) return

    if (selected.type === 'kab') {
      const row = kabById?.get(selected.id)
      if (!row || !Number.isFinite(row.lat)) return
      const st = stations.find((s) => s.kode === row.stasiun_terdekat)
      L.circleMarker([row.lat, row.lon], {
        pane: 'pane-dist', radius: 6, color: '#FFFFFF', weight: 2, fillColor: '#E11D48', fillOpacity: 1,
      }).addTo(dist)
      if (st) {
        L.polyline([[row.lat, row.lon], [st.latitude_dd, st.longitude_dd]], {
          pane: 'pane-dist', color: NAVY, weight: 2, dashArray: '6 6',
        })
          .bindTooltip(`${Math.round(row.jarak_km)} km`, { permanent: true, direction: 'center', className: 'cov-dist-label' })
          .addTo(dist)
      }
      if (selected.fly) map.flyTo([row.lat, row.lon], Math.max(map.getZoom(), 6), { duration: 0.8 })
      else map.panTo([row.lat, row.lon])
    } else {
      const st = stations.find((s) => s.kode === selected.id)
      if (!st) return
      L.circleMarker([st.latitude_dd, st.longitude_dd], {
        pane: 'pane-dist', radius: 14, color: '#E11D48', weight: 3, fill: false, className: 'cov-pulse', interactive: false,
      }).addTo(dist)
      map.panTo([st.latitude_dd, st.longitude_dd])
    }
  }, [ready, selected, kabById, stations])

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        .cov-pin{width:28px;height:28px;border-radius:50%;background:#E6F9AF;border:2px solid ${NAVY};color:${NAVY};
          font:800 12px 'Plus Jakarta Sans',sans-serif;display:grid;place-items:center;box-shadow:0 2px 8px rgba(24,49,79,.35)}
        .cov-dist-label{background:${NAVY};border:0;color:#fff;font:600 11px 'Plus Jakarta Sans',sans-serif;padding:2px 7px;box-shadow:none}
        .cov-dist-label::before{display:none}
        @keyframes covPulse{0%{stroke-width:2;stroke-opacity:.95}100%{stroke-width:16;stroke-opacity:0}}
        .cov-pulse{animation:covPulse 1.6s ease-out infinite}
        @media (prefers-reduced-motion: reduce){.cov-pulse{animation:none}}
      `}</style>
      <div
        ref={elRef}
        style={{ height, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
        aria-label="Peta kecukupan stasiun pemantau kualitas udara Indonesia"
      />
      {!geo && (
        <div
          className="muted-text"
          style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(244,247,251,0.7)', fontSize: '0.8rem', zIndex: 1000,
          }}
        >
          Memuat batas kabupaten...
        </div>
      )}
    </div>
  )
}
