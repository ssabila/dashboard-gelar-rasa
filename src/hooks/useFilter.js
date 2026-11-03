import { useState, useCallback } from 'react'

/**
 * Hook filter global yang dipakai di Overview dan bisa di-pass ke modul lain.
 *
 * Untuk state yang perlu di-share antar modul berbeda, angkat ke Context
 * atau Zustand. Tapi untuk MVP kompetisi ini, prop drilling satu level sudah
 * cukup karena setiap modul berdiri sendiri di route-nya masing-masing.
 *
 * Contoh penggunaan di page.jsx:
 *   const { filters, setDateRange, setStation, resetFilters } = useFilter()
 */

const DEFAULT_FILTERS = {
  dateStart: '2024-01-01',
  dateEnd:   '2026-10-14',
  stationId: null,   // null = semua stasiun
  regionGroup: null, // null = semua region
  pollutant:  'pm25',
}

export function useFilter(initialOverrides = {}) {
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    ...initialOverrides,
  })

  const setDateRange = useCallback((start, end) => {
    setFilters((prev) => ({ ...prev, dateStart: start, dateEnd: end }))
  }, [])

  const setStation = useCallback((stationId) => {
    setFilters((prev) => ({ ...prev, stationId }))
  }, [])

  const setRegion = useCallback((regionGroup) => {
    setFilters((prev) => ({ ...prev, regionGroup }))
  }, [])

  const setPollutant = useCallback((pollutant) => {
    setFilters((prev) => ({ ...prev, pollutant }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...initialOverrides })
  }, [initialOverrides])

  /**
   * Filter array data berdasarkan dateStart/dateEnd.
   * Asumsi setiap item punya field `date` atau `month` (format 'YYYY-MM').
   * @param {Array} data
   * @param {string} dateField  nama field tanggal di data
   */
  const filterByDate = useCallback(
    (data, dateField = 'date') => {
      if (!data) return []
      return data.filter((item) => {
        const d = item[dateField]
        if (!d) return true
        return d >= filters.dateStart && d <= filters.dateEnd
      })
    },
    [filters.dateStart, filters.dateEnd]
  )

  return {
    filters,
    setDateRange,
    setStation,
    setRegion,
    setPollutant,
    resetFilters,
    filterByDate,
  }
}
