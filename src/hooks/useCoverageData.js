import { useState, useEffect } from 'react'

/**
 * Hook data halaman Kecukupan Stasiun.
 * Semua file dihasilkan notebook preprocess_kecukupan_stasiun.ipynb
 * dan berada di public/data/aqms/. Pola cache sama dengan useAqmsData.js.
 */
const _cache = {}

function useFetch(path) {
  const [data, setData] = useState(_cache[path] ?? null)
  const [loading, setLoading] = useState(!_cache[path])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (_cache[path]) return

    let cancelled = false

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
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

    return () => { cancelled = true }
  }, [path])

  return { data, loading, error }
}

/** KPI nasional, daftar provinsi blank spot, radius utama, catatan metodologi. */
export function useCoverageSummary() {
  return useFetch('/data/aqms/coverage_summary.json')
}

/** Polygon kabupaten + properti metrik (untuk choropleth). */
export function useCoverageGeo() {
  return useFetch('/data/aqms/coverage_kabupaten.geojson')
}

/** Tabel kabupaten (properti sama + lat/lon, tanpa geometri). */
export function useCoverageKabupaten() {
  return useFetch('/data/aqms/coverage_kabupaten.json')
}

/** Agregat per pulau dan provinsi + benchmark. */
export function useCoverageRegion() {
  return useFetch('/data/aqms/coverage_region.json')
}

/** Kualitas per stasiun, heatmap kelengkapan, komposisi site type. */
export function useStationQuality() {
  return useFetch('/data/aqms/station_quality.json')
}

/** Matriks korelasi, pasangan jarak-korelasi, hasil fit radius. */
export function useStationCorrelation() {
  return useFetch('/data/aqms/station_correlation.json')
}

/** Lokasi prioritas (greedy) dan ranking gap score. */
export function useRecommendations() {
  return useFetch('/data/aqms/recommendations.json')
}

/** Kurva N stasiun tambahan vs % cakupan. */
export function useCoverageCurve() {
  return useFetch('/data/aqms/coverage_curve.json')
}
