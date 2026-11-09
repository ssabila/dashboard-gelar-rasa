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

/** Kandidat prioritas per stasiun dengan skor D/P/R dan peringkat stabilitas. */
export function useMonitoringGapCandidates() {
  return useJson('monitoring_gap_candidates')
}

/** Korelasi harian antarstasiun, fit peluruhan, dan radius (bila teridentifikasi). */
export function useStationCorrelation() {
  return useJson('station_correlation')
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

/** Agregasi stasiun menurut region, provinsi, tipe lokasi, dan karakteristik. */
export function useStationRepresentation() {
  return useJson('station_representation')
}
/** Dua peringkat prioritas terpisah: distribusi dan operasional. */
export function useStationPriority() {
  return useJson('station_priority')
}

/** Polygon administrasi kabupaten/kota untuk layer peta jaringan. */
export function useCoverageKabupatenGeoJSON() {
  return useJson('/data/aqms/coverage_kabupaten.geojson')
}