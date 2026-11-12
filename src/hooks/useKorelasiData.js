import { useState, useEffect } from 'react'

/**
 * Hook data modul Korelasi Polutan (Tujuan 3).
 * Berkas dihasilkan scripts/preprocess_t3_t4_web.py dari tabel preprocessing → public/data/korelasi/.
 * Pola cache sama dengan useAqmsData.js; path null = tidak fetch.
 */
const _cache = {}

function useFetch(path) {
  const [state, setState] = useState({ path: null, data: null, error: null })

  useEffect(() => {
    if (!path || _cache[path]) return
    let cancelled = false
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
        return res.json()
      })
      .then((json) => {
        _cache[path] = json
        if (!cancelled) setState({ path, data: json, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState({ path, data: null, error: err.message })
      })
    return () => { cancelled = true }
  }, [path])

  if (!path) return { data: null, loading: false, error: null }
  if (_cache[path]) return { data: _cache[path], loading: false, error: null }
  if (state.path === path && state.error) return { data: null, loading: false, error: state.error }
  return { data: null, loading: true, error: null }
}

/** Seluruh tabel kecil Tujuan 3 (overview, korelasi, karakteristik, arah angin, tipe lokasi). */
export function useT3Tables() {
  return useFetch('/data/korelasi/t3_tabel.json')
}

/** Data per jam satu stasiun untuk scatter (lazy). @param {string|null} station misal 'JKT-01' */
export function useStationScatter(station) {
  return useFetch(station ? `/data/korelasi/scatter/${station}.json` : null)
}

/** Nilai polutan per jam menurut arah angin untuk satu stasiun (lazy; dipakai halaman Arah Angin saat stasiun dipilih). */
export function useStationArah(station) {
  return useFetch(station ? `/data/korelasi/arah/${station}.json` : null)
}
