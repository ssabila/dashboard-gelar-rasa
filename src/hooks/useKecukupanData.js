// src/hooks/useKecukupanData.js
'use client'

import { useState, useEffect } from 'react'

/**
 * Hook data halaman Kecukupan Stasiun.
 * Semua file dihasilkan notebook 03_preprocessing_kecukupan_jaringan_dashboard.ipynb
 * dan berada di public/data/aqms/. Pola cache sama dengan hook lain di proyek.
 */
const _cache = {}

function useJson(name) {
  const path = `/data/aqms/${name}.json`
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

/** Ringkasan jaringan: jumlah stasiun dan sensor, status sensor, jarak, kelengkapan, radius eksplorasi. */
export function useMonitoringNetworkSummary() {
  return useJson('monitoring_network_summary')
}

/** Metadata stasiun lengkap (satu baris per location_id). */
export function useStationMaster() {
  return useJson('station_master')
}

/** Kelengkapan per stasiun dan per polutan. */
export function useStationCompleteness() {
  return useJson('station_completeness')
}

/** Jarak dan tetangga terdekat per stasiun (Haversine). */
export function useStationNearestNeighbor() {
  return useJson('station_nearest_neighbor')
}

/** Pasangan korelasi antarstasiun, fit radius, dan sensitivitas. */
export function useStationCorrelation() {
  return useJson('station_correlation')
}