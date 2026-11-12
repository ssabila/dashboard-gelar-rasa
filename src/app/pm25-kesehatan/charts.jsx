'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/EChart'
import { formatNumber } from '@/lib/formatters'
import { BALITA_COLOR, LANSIA_COLOR, SERIES, fmtCoef, fmtDate, fmtNum, fmtZ } from '@/lib/pm25kesehatan'

/* ─── Gaya dasar ECharts (selaras modul Korelasi & token dashboard) ─── */
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"
const TXT = { color: '#55706E', fontFamily: FONT, fontSize: 11 }
const NAVY = '#18314F'
const GRID_LINE = { lineStyle: { color: 'rgba(24,49,79,0.08)' } }
const AXIS_LINE = { lineStyle: { color: 'rgba(24,49,79,0.18)' } }
const POS = '#EA580C'
const NEG = '#384E77'
const tooltipBase = {
  backgroundColor: '#FFFFFF',
  borderColor: 'rgba(24,49,79,0.15)',
  borderWidth: 1,
  textStyle: { color: NAVY, fontFamily: FONT, fontSize: 12 },
  extraCssText: 'box-shadow:0 8px 24px rgba(24,49,79,0.12);border-radius:10px;',
}
const dot = (c) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:6px"></span>`
const zeroLine = { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: 'rgba(24,49,79,0.45)', type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] }
const dateTick = (v) => fmtDate(v).replace(/^\d+ /, '')

/* ═══ 1. Z-score tujuh seri ═════════════════════════════════════════════ */
/** z[id]: array sejajar dengan dates. Nilai null = tidak ada data (garis terputus, bukan nol). */
export function ZScoreLine({ dates, z, height = 440 }) {
  const option = useMemo(() => ({
    textStyle: TXT,
    grid: { left: 62, right: 18, top: 44, bottom: 50 },
    legend: { top: 4, left: 8, right: 8, textStyle: TXT, itemWidth: 18, itemHeight: 8, selectedMode: true },
    tooltip: {
      ...tooltipBase, trigger: 'axis', confine: true,
      formatter: (ps) => {
        if (!ps.length) return ''
        const i = ps[0].dataIndex
        const lines = SERIES.map((s) => {
          const zv = z[s.id]?.[i]
          const hidden = !ps.some((p) => p.seriesName === s.id)
          if (hidden) return ''
          return `<div>${dot(s.color)}${s.id}: <strong>${zv == null ? 'tidak ada data' : fmtZ(zv)}</strong></div>`
        }).join('')
        return `<strong>${fmtDate(dates[i])}</strong>${lines}`
      },
    },
    xAxis: { type: 'category', data: dates, boundaryGap: false, axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, formatter: dateTick, hideOverlap: true } },
    yAxis: { type: 'value', name: 'Z-Score', nameLocation: 'middle', nameRotate: 90, nameGap: 36, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: TXT, scale: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 6, borderColor: 'transparent', fillerColor: 'rgba(56,78,119,0.12)', textStyle: TXT }],
    series: SERIES.map((s, k) => ({
      name: s.id, type: 'line', data: z[s.id] ?? [], showSymbol: false, connectNulls: false, sampling: 'lttb', z: s.id === 'PM2.5' ? 5 : 2,
      lineStyle: { width: s.width ?? 1.4, color: s.color, type: 'solid', opacity: s.id === 'PM2.5' ? 1 : 0.85 }, itemStyle: { color: s.color },
      emphasis: { focus: 'series', lineStyle: { width: 2.8 } },
      ...(k === 0 ? { markLine: zeroLine } : {}),
    })),
  }), [dates, z])
  return <EChart option={option} height={height} />
}

/* ═══ 2. CCF satu indikator ═════════════════════════════════════════════ */
export function CcfChart({ rows, height = 360 }) {
  const option = useMemo(() => {
    const lags = rows.map((r) => r.lag)
    return {
      textStyle: TXT,
      grid: { left: 70, right: 18, top: 20, bottom: 62 },
      tooltip: {
        ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true,
        formatter: (ps) => {
          const r = rows[ps[0].dataIndex]
          const status = r.di_luar_batas_bonferroni ? 'di luar CI 95% dan melampaui batas Bonferroni' : r.di_luar_ci95 ? 'di luar CI 95% (belum koreksi banyak lag)' : 'di dalam CI 95%'
          return `<strong>Lag ${r.lag} hari</strong>${r.lag === 0 ? ' <span style="color:#55706E">(hari yang sama)</span>' : ` <span style="color:#55706E">(PM2.5 mendahului ${r.lag} hari)</span>`}<br/>Koefisien CCF: <strong>${fmtCoef(r.koef_ccf)}</strong><br/>CI 95%: ${fmtCoef(r.ci95_bawah)} s.d. ${fmtCoef(r.ci95_atas)}<br/><span style="color:#55706E">Status: ${status}</span>`
        },
      },
      xAxis: { type: 'category', data: lags.map((l) => `${l}`), axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: TXT, name: 'Lag (hari) — PM2.5 mendahului indikator kesehatan', nameLocation: 'middle', nameGap: 34, nameTextStyle: TXT },
      yAxis: { type: 'value', name: 'Koefisien CCF', nameLocation: 'middle', nameRotate: 90, nameGap: 46, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: { ...TXT, formatter: (v) => String(v).replace('.', ',') }, scale: false },
      series: [
        {
          name: 'Koefisien CCF', type: 'bar', barMaxWidth: 26, z: 3,
          data: rows.map((r) => ({ value: r.koef_ccf, itemStyle: { color: r.koef_ccf >= 0 ? POS : NEG, opacity: r.di_luar_ci95 ? 1 : 0.45 } })),
          markLine: zeroLine,
        },
        { name: 'Batas atas CI 95%', type: 'line', data: rows.map((r) => r.ci95_atas), symbol: 'none', lineStyle: { color: '#55706E', width: 1.4, type: 'dashed' }, itemStyle: { color: '#55706E' }, z: 4 },
        { name: 'Batas bawah CI 95%', type: 'line', data: rows.map((r) => r.ci95_bawah), symbol: 'none', lineStyle: { color: '#55706E', width: 1.4, type: 'dashed' }, itemStyle: { color: '#55706E' }, z: 4 },
      ],
    }
  }, [rows])
  return <EChart option={option} height={height} />
}

/* ═══ 3. Kasus ISPA harian (balita vs lansia) ═══════════════════════════ */
export function IspaLine({ dates, balita, lansia, nBalita, nLansia, height = 380 }) {
  const option = useMemo(() => ({
    textStyle: TXT,
    grid: { left: 62, right: 18, top: 44, bottom: 50 },
    legend: { top: 4, left: 8, textStyle: TXT, itemWidth: 18, itemHeight: 8 },
    tooltip: {
      ...tooltipBase, trigger: 'axis', confine: true,
      formatter: (ps) => {
        if (!ps.length) return ''
        const i = ps[0].dataIndex
        const row = (name, color, v, n) => (ps.some((p) => p.seriesName === name) ? `<div>${dot(color)}${name}: <strong>${v == null ? 'tidak ada data' : `${fmtNum(v, 2)} kasus/RS`}</strong> <span style="color:#55706E">(${n == null ? 'NA' : n} RS valid)</span></div>` : '')
        return `<strong>${fmtDate(dates[i])}</strong>${row('ISPA balita', BALITA_COLOR, balita[i], nBalita[i])}${row('ISPA lansia', LANSIA_COLOR, lansia[i], nLansia[i])}`
      },
    },
    xAxis: { type: 'category', data: dates, boundaryGap: false, axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, formatter: dateTick, hideOverlap: true } },
    yAxis: { type: 'value', name: 'Rata-Rata Kasus per RS per Hari', nameLocation: 'middle', nameRotate: 90, nameGap: 36, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: TXT, min: 0 },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 6, borderColor: 'transparent', fillerColor: 'rgba(56,78,119,0.12)', textStyle: TXT }],
    series: [
      { name: 'ISPA balita', type: 'line', data: balita, showSymbol: false, connectNulls: false, sampling: 'lttb', lineStyle: { width: 1.8, color: BALITA_COLOR }, itemStyle: { color: BALITA_COLOR } },
      { name: 'ISPA lansia', type: 'line', data: lansia, showSymbol: false, connectNulls: false, sampling: 'lttb', lineStyle: { width: 1.8, color: LANSIA_COLOR }, itemStyle: { color: LANSIA_COLOR } },
    ],
  }), [dates, balita, lansia, nBalita, nLansia])
  return <EChart option={option} height={height} />
}

/* ═══ 4. Total kasus tercatat (2 batang) ════════════════════════════════ */
export function TotalsBar({ items, height = 300 }) {
  const option = useMemo(() => ({
    textStyle: TXT,
    grid: { left: 84, right: 18, top: 28, bottom: 36 },
    tooltip: { ...tooltipBase, trigger: 'item', formatter: (p) => `<strong>${p.name}</strong><br/>Total kasus: <strong>${formatNumber(p.value)}</strong><br/><span style="color:#55706E">${formatNumber(items[p.dataIndex].hari)} hari valid · ${items[p.dataIndex].nRs} RS</span>` },
    xAxis: { type: 'category', data: items.map((i) => i.name), axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, color: NAVY, fontWeight: 700, fontSize: 12 } },
    yAxis: { type: 'value', name: 'Jumlah Kasus', nameLocation: 'middle', nameRotate: 90, nameGap: 58, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: { ...TXT, formatter: (v) => formatNumber(v) }, min: 0 },
    series: [{
      type: 'bar', barMaxWidth: 90,
      data: items.map((i) => ({ value: i.total, itemStyle: { color: i.color, borderRadius: [6, 6, 0, 0] } })),
      label: { show: true, position: 'top', formatter: (p) => formatNumber(p.value), fontFamily: FONT, fontWeight: 700, color: NAVY },
    }],
  }), [items])
  return <EChart option={option} height={height} />
}

/* ═══ 2b. Heatmap CCF: 6 indikator × lag 0–14 ═══════════════════════════ */
const HEAT_COLORS = ['#384E77', '#9FB3D1', '#F3F5F8', '#F8B77F', '#EA580C'] // negatif (biru) → positif (oranye)
/** matrix: [{ id, rows: [{lag, koef_ccf, di_luar_ci95, ci95_atas}] }]; onSelect(id) saat sel diklik. */
export function CcfHeatmap({ matrix, onSelect, height = 360 }) {
  const option = useMemo(() => {
    const lags = matrix[0]?.rows.map((r) => r.lag) ?? []
    const peak = Math.max(0.1, ...matrix.flatMap((m) => m.rows.map((r) => Math.abs(r.koef_ccf))))
    const lim = Math.ceil(peak * 10) / 10
    const data = []
    matrix.forEach((m, yi) => m.rows.forEach((r, xi) => data.push({
      value: [xi, yi, r.koef_ccf],
      itemStyle: r.di_luar_ci95 ? { borderColor: NAVY, borderWidth: 2, borderRadius: 4 } : { borderColor: '#FFFFFF', borderWidth: 3, borderRadius: 4, opacity: 0.55 },
      label: { fontWeight: r.di_luar_ci95 ? 800 : 500 },
    })))
    return {
      textStyle: TXT,
      grid: { left: 118, right: 16, top: 34, bottom: 74 },
      tooltip: {
        ...tooltipBase, confine: true,
        formatter: (p) => {
          const m = matrix[p.value[1]]; const r = m.rows[p.value[0]]
          return `<strong>${m.id}</strong> · lag ${r.lag} hari${r.lag === 0 ? ' <span style="color:#55706E">(hari yang sama)</span>' : ''}<br/>Koefisien CCF: <strong>${fmtCoef(r.koef_ccf)}</strong><br/><span style="color:#55706E">${r.di_luar_ci95 ? 'Di luar CI 95%' : 'Di dalam CI 95%'}</span>`
        },
      },
      xAxis: { type: 'category', data: lags.map((l) => `${l}`), position: 'top', splitArea: { show: false }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...TXT, fontWeight: 700, color: NAVY } },
      yAxis: { type: 'category', data: matrix.map((m) => m.id), inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...TXT, color: NAVY, fontSize: 12, fontWeight: 600 } },
      visualMap: { type: 'continuous', min: -lim, max: lim, dimension: 2, inRange: { color: HEAT_COLORS }, orient: 'horizontal', left: 'center', bottom: 6, itemWidth: 12, itemHeight: 220, text: [`+${lim.toFixed(1).replace('.', ',')}`, `−${lim.toFixed(1).replace('.', ',')}`], textStyle: TXT, calculable: false },
      series: [{
        type: 'heatmap', data,
        label: { show: true, formatter: (p) => fmtCoef(p.value[2]), fontFamily: FONT, fontSize: 10, color: NAVY },
        emphasis: { itemStyle: { borderColor: NAVY, borderWidth: 2 } },
      }],
    }
  }, [matrix])
  const onEvents = useMemo(() => ({ click: (p) => { const m = matrix[p?.value?.[1]]; if (m) onSelect?.(m.id) } }), [matrix, onSelect])
  return <EChart option={option} height={height} onEvents={onEvents} />
}
