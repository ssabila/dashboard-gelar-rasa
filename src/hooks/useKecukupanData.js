// src/hooks/useKecukupanData.js
'use client'

import { useState, useEffect } from 'react'

/**
 * Hook data halaman Kecukupan Stasiun.
 * Semua file berasal dari notebook 03 dan berada di public/data/aqms/.
 * Pola cache sama dengan hook lain di proyek.
 */
const _cache = {}

function useJson(name) {
  const path = name.startsWith('/') ? name : `/data/aqms/${name}.json`
  const [data, setData] = useState(_cache[path] ?? null)
  const [loading, setLoading] = useState(!_cache[path])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (_cache[path]) return

    let cancelled = false

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: gagal memuat ${path}`)
        return res.json()
      })
      .then((json) => {
        _cache[path] = json
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [path])

  return { data, loading, error }
}

/** Ringkasan KPI jaringan, skenario bobot, dan batasan metodologi. */
export function useMonitoringNetworkSummary() {
  return useJson('monitoring_network_summary')
}

/** Metadata stasiun lengkap (satu baris per location_id). */
export function useStationMaster() {
  return useJson('station_master')
}

/** Kelengkapan per stasiun dan polutan, dihitung per jam unik. */
export function useStationCompleteness() {
  return useJson('station_completeness')
}

/** Ringkasan statistik polutan per stasiun. */
export function useStationPollutantSummary() {
  return useJson('station_pollutant_summary')
}

/** Jarak tetangga terdekat per stasiun (Haversine). */
export function useStationNearestNeighbor() {
  return useJson('station_nearest_neighbor')
}

/** Dua peringkat prioritas terpisah: distribusi dan operasional. */
export function useStationPriority() {
  return useJson('station_priority')
}

/** Polygon administrasi kabupaten/kota untuk layer peta jaringan. */
export function useCoverageKabupatenGeoJSON() {
  return useJson('/data/geo/indonesia_pulau.geojson')
}