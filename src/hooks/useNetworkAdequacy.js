'use client'

import { useState, useEffect } from 'react'

/**
 * Cache in-memory sederhana untuk mencegah request berulang
 */
const _cache = {}

function useFetch(path) {
  const [data, setData] = useState(_cache[path] ?? null)
  const [loading, setLoading] = useState(!_cache[path])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (_cache[path]) {
      setData(_cache[path])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal memuat ${path}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) {
          _cache[path] = json
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

/** 1. Ringkasan KPI nasional, median jarak, kelengkapan observasi */
export function useNetworkSummary() {
  return useFetch('/data/aqms/network_summary.json')
}

/** 2. Titik stasiun format GeoJSON untuk Leaflet */
export function useStationsGeo() {
  return useFetch('/data/aqms/stations.geojson')
}

/** 3. Distribusi stasiun per wilayah, provinsi, dan tipe lokasi */
export function useStationDistribution() {
  return useFetch('/data/aqms/station_distribution.json')
}

/** 4. Kesiapan operasional sensor dan breakdown QC flag */
export function useOperationalReadiness() {
  return useFetch('/data/aqms/operational_readiness.json')
}

/** 5. Matriks dan statistik jarak Haversine tetangga terdekat */
export function useNearestDistance() {
  return useFetch('/data/aqms/nearest_station_distance.json')
}

/** 6. Ringkasan audit satuan PM2.5 (ug/m3 vs ppm) dan alasan ilmiah */
export function usePm25UnitSummary() {
  return useFetch('/data/aqms/pm25_unit_summary.json')
}

/** 7. Timeseries harian, bulanan, dan diurnal stasiun ug/m3 */
export function usePm25UgM3() {
  return useFetch('/data/aqms/pm25_timeseries_ug_m3.json')
}

/** 8. Timeseries harian, bulanan, dan diurnal stasiun ppm (terpisah) */
export function usePm25Ppm() {
  return useFetch('/data/aqms/pm25_timeseries_ppm.json')
}

/** 9. Prioritas evaluasi jaringan (skor distribusi vs operasional) */
export function useNetworkPriority() {
  return useFetch('/data/aqms/network_priority.json')
}

/** 10. FAQ dan catatan metodologi */
export function useMethodologyMetadata() {
  return useFetch('/data/aqms/methodology_metadata.json')
}

