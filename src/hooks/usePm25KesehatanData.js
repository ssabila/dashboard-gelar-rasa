import { useState, useEffect } from 'react'

/**
 * Hook data modul PM2.5 & Kesehatan (Tujuan 4).
 * Berkas t4.json dihasilkan scripts/preprocess_t3_t4_web.py dari tabel preprocessing
 * (data_zscore_harian, hasil_ccf, ringkasan_ccf, data_ispa_harian, ringkasan_ispa_periode).
 * Pola cache sama dengan useAqmsData.js.
 */
const PATH = '/data/pm25-kesehatan/t4.json'
let _cache = null

export function useT4Data() {
  const [state, setState] = useState({ data: _cache, error: null })

  useEffect(() => {
    if (_cache) return
    let cancelled = false
    fetch(PATH)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${PATH}`)
        return res.json()
      })
      .then((json) => {
        _cache = json
        if (!cancelled) setState({ data: json, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, error: err.message })
      })
    return () => { cancelled = true }
  }, [])

  return { data: state.data, loading: !state.data && !state.error, error: state.error }
}
