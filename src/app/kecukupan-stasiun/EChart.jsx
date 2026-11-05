'use client'

import { useEffect, useRef } from 'react'

/**
 * Wrapper tipis Apache ECharts (client-only, import dinamis).
 * Bungkus `option` dengan useMemo di pemanggil agar tidak di-render ulang tiap saat.
 *
 * Props:
 *   option    objek option ECharts
 *   height    tinggi px (default 320)
 *   onEvents  { click?: (params) => void }
 */
export function EChart({ option, height = 320, onEvents }) {
  const elRef = useRef(null)
  const chartRef = useRef(null)
  const optRef = useRef(option)
  const evRef = useRef(onEvents)
  optRef.current = option
  evRef.current = onEvents

  useEffect(() => {
    let disposed = false
    let ro
    let chart

    import('echarts').then((echarts) => {
      if (disposed || !elRef.current) return
      chart = echarts.init(elRef.current)
      chartRef.current = chart
      chart.setOption(optRef.current, true)
      chart.on('click', (p) => evRef.current?.click?.(p))
      ro = new ResizeObserver(() => chart.resize())
      ro.observe(elRef.current)
    })

    return () => {
      disposed = true
      ro?.disconnect()
      chart?.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={elRef} style={{ height, width: '100%' }} role="img" />
}
