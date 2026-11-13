import { useState, useEffect, useMemo } from 'react'

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
  const master = useFetch('/data/aqms/station_master.json')
  const pollutant = useFetch('/data/aqms/station_pollutant_summary.json')

  const data = useMemo(() => {
    if (!master.data || !pollutant.data) return null
    const pm25ByLocation = new Map(
      pollutant.data
        .filter((row) => row.pollutant === 'pm25_ug_m3')
        .map((row) => [row.location_id, row])
    )
    return master.data.map((station) => {
      const pm25 = pm25ByLocation.get(station.location_id)
      return {
        ...station,
        avg_pm25: pm25?.mean ?? null,
        median_pm25: pm25?.median ?? null,
        p90_pm25: pm25?.p90 ?? null,
        valid_pm25_records: pm25?.valid_records ?? 0,
        status_operasional: station.sensor_status,
      }
    })
  }, [master.data, pollutant.data])

  return {
    data,
    loading: master.loading || pollutant.loading,
    error: master.error || pollutant.error,
  }
}

/** Ringkasan lintas T3, T4, dan kecukupan jaringan untuk halaman Overview. */
export function useOverviewSummary() {
  return useFetch('/data/aqms/overview_summary.json')
}

export function useOverviewAnalytics() {
  const network = useFetch('/data/aqms/network_summary.json')
  const distribution = useFetch('/data/aqms/station_distribution.json')
  const readiness = useFetch('/data/aqms/operational_readiness.json')
  const nearest = useFetch('/data/aqms/nearest_station_distance.json')
  const regional = useFetch('/data/aqms/aqms_per_pulau.json')
  const annual = useFetch('/data/aqms/aqms_tahunan.json')
  const seasonal = useFetch('/data/aqms/aqms_musim.json')
  const workday = useFetch('/data/aqms/aqms_hari_kerja.json')
  const monthly = useFetch('/data/aqms/aqms_bulanan.json')
  const healthDaily = useFetch('/data/T4_data_gabungan_harian.json')
  const healthBridge = useFetch('/data/T4_bridge_stasiun_rs.json')
  const results = [network, distribution, readiness, nearest, regional, annual, seasonal, workday, monthly, healthDaily, healthBridge]
  return {
    network,
    distribution,
    readiness,
    nearest,
    regional,
    annual,
    seasonal,
    workday,
    monthly,
    healthDaily,
    healthBridge,
    loading: results.some((result) => result.loading),
    error: results.find((result) => result.error)?.error ?? null,
  }
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

/**
 * Observasi harian per stasiun (sumber yang sama dengan tab Kualitas Udara).
 * File: public/data/kualitas-udara/aqms_ispu_harian.json
 */
export function useIspuDaily() {
  return useFetch('/data/kualitas-udara/aqms_ispu_harian.json')
}