import { useState, useEffect } from 'react'

const _cache = {}

function useFetch(path) {
  const [data, setData] = useState(_cache[path] ?? null)
  const [loading, setLoading] = useState(!_cache[path])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (_cache[path]) {
      return
    }

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

/**
 * Ringkasan nasional health outcomes (total rawat inap, kematian, dsb).
 * File: public/data/health/summary.json
 */
export function useHealthSummary() {
  const result = useFetch('/data/aqms/overview_summary.json')
  return {
    ...result,
    data: result.data?.health ?? null,
  }
}

/**
 * Data per-rumah sakit per-bulan.
 * File: public/data/health/by_hospital.json
 * Dipakai: PM2.5 × Kesehatan, Insight.
 */
export function useHospitalData() {
  return useFetch('/data/health/by_hospital.json')
}
