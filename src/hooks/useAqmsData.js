import { useState, useEffect } from 'react'

/**
 * Hook generik untuk fetch JSON dari /public/data/.
 * Hasilnya di-cache di module scope agar tidak re-fetch
 * saat komponen unmount-remount dalam sesi yang sama.
 */
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

/* ─── Public hooks — Dev 2 & Dev 3 pakai ini ────────────────────────── */

/**
 * Ringkasan nasional: total stasiun, rata-rata PM2.5 nasional, dsb.
 * File: public/data/aqms/summary.json
 */
export function useAqmsSummary() {
  return useFetch('/data/aqms/summary.json')
}

/**
 * Data per-stasiun: koordinat, rata-rata polutan, status operasional.
 * File: public/data/aqms/by_station.json
 * Dipakai: Overview (peta), Kecukupan Stasiun, tabel peringkat.
 */
export function useStations() {
  return useFetch('/data/aqms/by_station.json')
}

/**
 * Timeseries bulanan untuk satu stasiun.
 * File: public/data/aqms/timeseries/{stationCode}.json
 * @param {string|null} stationCode  misal 'JKT-01'. null = tidak fetch.
 */
export function useStationTimeseries(stationCode) {
  const path = stationCode
    ? `/data/aqms/timeseries/${stationCode}.json`
    : null

  const result = useFetch(path ?? '__skip__')

  // Kalau stationCode null, return state kosong
  if (!stationCode) return { data: null, loading: false, error: null }
  return result
}

/**
 * Pola diurnal rata-rata semua stasiun (per jam).
 * File: public/data/aqms/hourly_pattern.json
 */
export function useHourlyPattern() {
  return useFetch('/data/aqms/hourly_pattern.json')
}
