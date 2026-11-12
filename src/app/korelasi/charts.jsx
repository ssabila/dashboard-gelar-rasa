'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/EChart'
import { formatNumber } from '@/lib/formatters'
import { FACTORS, GROUP_COLORS, POLLUTANT_ORDER, fmtConc, fmtRho, polLabel, polUnit } from '@/lib/korelasi'

/* ─── Gaya dasar ECharts (selaras token dashboard & kecukupan-stasiun) ─── */
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"
const TXT = { color: '#55706E', fontFamily: FONT, fontSize: 11 }
const NAVY = '#18314F'
const GRID_LINE = { lineStyle: { color: 'rgba(24,49,79,0.08)' } }
const AXIS_LINE = { lineStyle: { color: 'rgba(24,49,79,0.18)' } }
export const POS_COLOR = '#EA580C'   // korelasi positif
export const NEG_COLOR = '#384E77'   // korelasi negatif

const tooltipBase = {
  backgroundColor: '#FFFFFF',
  borderColor: 'rgba(24,49,79,0.15)',
  borderWidth: 1,
  textStyle: { color: NAVY, fontFamily: FONT, fontSize: 12 },
  extraCssText: 'box-shadow:0 8px 24px rgba(24,49,79,0.12);border-radius:10px;',
}
const muted = (t) => `<span style="color:#55706E">${t}</span>`

/** Diverging −1…+1: biru (negatif) – netral – oranye (positif). Skala sama di semua heatmap korelasi. */
const DIVERGING = ['#384E77', '#9FB3D1', '#F3F5F8', '#F8B77F', '#EA580C']
/** Heatmap Overview Numerik: biru = korelasi positif (searah), oranye = korelasi negatif (berlawanan arah). */
export const HEAT_POS = '#384E77'
export const HEAT_NEG = '#EA580C'
const TREND_LINE = '#1F2937'   // garis tren linier antar-stasiun (abu gelap)
const MEDIAN_LINE = '#5B2A86'   // garis median per kelas (ungu tua)
const DIVERGING_BLUE_POS = ['#EA580C', '#F8B77F', '#F3F5F8', '#9FB3D1', '#384E77']

/** Warna sel heatmap untuk nilai ρ (interpolasi linear antar-titik skala, sama dengan visualMap). */
export function heatColor(rho) {
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const stops = DIVERGING_BLUE_POS.map(hex)
  const pos = (Math.max(-1, Math.min(1, rho)) + 1) / 2 * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(pos)); const f = pos - i
  return `rgb(${stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * f)).join(',')})`
}

/* ═══ 1. Heatmap: 5 variabel numerik × 6 polutan ═════════════════════════ */
/** cells[factorKey][pol] = { rho, n, sub } ; onCell(factorKey, pol) */
export function CorrelationHeatmap({ rowKeys, cells, onCell, labels, height = 330 }) {
  const labelOf = (k) => labels?.[k] ?? FACTORS[k].label
  const option = useMemo(() => {
    const rowLabels = rowKeys.map(labelOf)
    const data = []
    rowKeys.forEach((k, y) => POLLUTANT_ORDER.forEach((p, x) => {
      const c = cells[k]?.[p]
      if (!c || c.rho == null) { data.push({ value: [x, y, '-'], label: { show: false } }); return }
      data.push({ value: [x, y, c.rho], label: { color: Math.abs(c.rho) > 0.55 ? '#FFFFFF' : NAVY } })
    }))
    return {
      textStyle: TXT,
      grid: { left: 150, right: 8, top: 34, bottom: 8 },
      tooltip: {
        ...tooltipBase,
        formatter: (p) => {
          if (p.componentType !== 'series') return ''
          const k = rowKeys[p.value[1]]; const pol = POLLUTANT_ORDER[p.value[0]]; const c = cells[k]?.[pol]
          if (!c || c.rho == null) return `<strong>${labelOf(k)} × ${polLabel(pol)}</strong><br/>Tidak ada koefisien valid`
          return `<strong>${labelOf(k)} × ${polLabel(pol)}</strong><br/>Spearman ρ = ${fmtRho(c.rho)}<br/>${muted(c.sub)}<br/>${muted('Klik untuk membuka detail')}`
        },
      },
      xAxis: { type: 'category', data: POLLUTANT_ORDER.map(polLabel), position: 'top', splitArea: { show: false }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...TXT, fontWeight: 700, color: NAVY, fontSize: 12 } },
      yAxis: { type: 'category', data: rowLabels, inverse: true, triggerEvent: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...TXT, color: NAVY, fontSize: 12, fontWeight: 600 } },
      // visualMap hanya pemetaan warna; legenda ditulis di luar grafik (lihat numerik.jsx)
      visualMap: { type: 'continuous', show: false, min: -1, max: 1, inRange: { color: DIVERGING_BLUE_POS }, dimension: 2 },
      series: [{
        type: 'heatmap', data,
        label: { show: true, formatter: (p) => (p.value[2] === '-' ? '' : fmtRho(p.value[2])), fontFamily: FONT, fontSize: 12, fontWeight: 700 },
        itemStyle: { borderColor: '#FFFFFF', borderWidth: 3, borderRadius: 4 },
        emphasis: { itemStyle: { borderColor: NAVY, borderWidth: 2 } },
      }],
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowKeys, cells, labels])

  const onEvents = useMemo(() => ({
    click: (p) => {
      if (p.componentType === 'yAxis') { const i = rowKeys.map(labelOf).indexOf(p.value); if (i >= 0) onCell?.(rowKeys[i], null) }
      else if (p.componentType === 'series') onCell?.(rowKeys[p.value[1]], POLLUTANT_ORDER[p.value[0]])
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rowKeys, onCell, labels])
  return <EChart option={option} height={height} onEvents={onEvents} />
}

/** Bar horizontal: variabel dengan |ρ| terbesar untuk satu polutan. items = [{ key, label, rho, sub }] (sudah terurut). */
export function TopFactorsBar({ items, pol, height = 260 }) {
  const option = useMemo(() => ({
    textStyle: TXT,
    grid: { left: 140, right: 16, top: 8, bottom: 36 },
    tooltip: { ...tooltipBase, trigger: 'item', formatter: (p) => { const r = items[p.dataIndex]; return `<strong>${r.label} × ${polLabel(pol)}</strong><br/>Spearman ρ = ${fmtRho(r.rho)}<br/>${muted(r.sub)}` } },
    xAxis: { type: 'value', min: -1, max: 1, interval: 0.5, name: 'Spearman ρ', nameLocation: 'middle', nameGap: 24, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: { ...TXT, formatter: (v) => String(v).replace('-', '−').replace('.', ',') } },
    yAxis: { type: 'category', data: items.map((r) => r.label), inverse: true, axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, color: NAVY, fontWeight: 600, fontSize: 12, width: 130, overflow: 'break' } },
    series: [{
      type: 'bar', barMaxWidth: 30,
      // Batang panjang: nilai di dalam batang (putih); batang pendek: nilai di luar, agar tidak menabrak label sumbu
      data: items.map((r) => { const long = Math.abs(r.rho) > 0.45; return { value: r.rho, itemStyle: { color: r.rho >= 0 ? HEAT_POS : HEAT_NEG, borderRadius: r.rho >= 0 ? [0, 6, 6, 0] : [6, 0, 0, 6] }, label: { show: true, position: long ? 'inside' : 'outside', color: long ? '#FFFFFF' : NAVY } } }),
      label: { show: true, formatter: (p) => fmtRho(p.value), fontFamily: FONT, fontSize: 12, fontWeight: 700 },
      markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: 'rgba(24,49,79,0.45)', type: 'dashed', width: 1 }, data: [{ xAxis: 0 }] },
    }],
  }), [items, pol])
  return <EChart option={option} height={height} />
}

/* ═══ 2. Scatter per jam + garis tren ═══════════════════════════════════ */
export function HourlyScatter({ xs, ys, xKey, pol, trend, logY, height = 400 }) {
  const TREND_NAME = `Median ${polLabel(pol)} per Kelas ${FACTORS[xKey].label.replace(/\b\p{L}/gu, (ch) => ch.toUpperCase())}`
  const option = useMemo(() => {
    const pts = []
    for (let i = 0; i < xs.length; i++) if (xs[i] != null && ys[i] != null && (!logY || ys[i] > 0)) pts.push([xs[i], ys[i]])
    const f = FACTORS[xKey]; const u = polUnit(pol)
    return {
      textStyle: TXT,
      grid: { left: 64, right: 20, top: 40, bottom: 52 },
      legend: { top: 4, right: 8, textStyle: TXT, itemWidth: 14, itemHeight: 8 },
      tooltip: {
        ...tooltipBase, trigger: 'item',
        formatter: (p) => (p.seriesType === 'line'
          ? `<strong>${TREND_NAME}</strong><br/>${f.label} ≈ ${formatNumber(p.value[0], 1)} ${f.unit}<br/>median ${polLabel(pol)} ${fmtConc(p.value[1], pol)} ${u}`
          : `${f.label}: <strong>${formatNumber(p.value[0], 1)} ${f.unit}</strong><br/>${polLabel(pol)}: <strong>${fmtConc(p.value[1], pol)} ${u}</strong>`),
      },
      xAxis: { type: 'value', scale: true, name: `${f.label} (${f.unit})`, nameLocation: 'middle', nameGap: 30, nameTextStyle: TXT, splitLine: GRID_LINE, axisLine: AXIS_LINE, axisLabel: TXT },
      yAxis: { type: logY ? 'log' : 'value', name: `${polLabel(pol)} (${u})${logY ? ' · skala log' : ''}`, nameTextStyle: { ...TXT, align: 'left' }, splitLine: GRID_LINE, axisLabel: TXT },
      dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none' }],
      series: [
        { name: 'Observasi pada Jam Tertentu', type: 'scatter', data: pts, large: true, largeThreshold: 2000, symbolSize: 4, itemStyle: { color: 'rgba(56,78,119,0.28)' }, z: 1 },
        trend?.length ? { name: TREND_NAME, type: 'line', data: trend, showSymbol: false, smooth: 0.2, lineStyle: { color: MEDIAN_LINE, width: 3 }, itemStyle: { color: MEDIAN_LINE }, z: 5 } : { name: TREND_NAME, type: 'line', data: [] },
      ],
    }
  }, [xs, ys, xKey, pol, trend, logY, TREND_NAME])
  return <EChart option={option} height={height} />
}

/* ═══ 3. Korelasi tiap stasiun (batang, 22 stasiun) ═════════════════════ */
export function StationRhoBar({ rows, selected, onSelect, height = 300 }) {
  const option = useMemo(() => {
    const data = [...rows].filter((r) => r.rho != null).sort((a, b) => b.rho - a.rho)
    return {
      textStyle: TXT,
      grid: { left: 52, right: 14, top: 22, bottom: 64 },
      tooltip: { ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => { const r = data[ps[0].dataIndex]; return `<strong>${r.stasiun}</strong><br/>ρ = ${fmtRho(r.rho)}<br/>${muted(`n = ${formatNumber(r.n)} jam`)}` } },
      xAxis: { type: 'category', data: data.map((r) => r.stasiun), axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, rotate: 55, interval: 0 } },
      yAxis: { type: 'value', min: -1, max: 1, interval: 0.5, name: 'Spearman ρ', nameTextStyle: { ...TXT, align: 'left' }, splitLine: GRID_LINE, axisLabel: { ...TXT, formatter: (v) => String(v).replace('-', '−').replace('.', ',') } },
      series: [{
        type: 'bar', barMaxWidth: 22,
        data: data.map((r) => ({
          value: r.rho,
          itemStyle: { color: r.rho >= 0 ? HEAT_POS : HEAT_NEG, opacity: !selected || r.stasiun === selected ? 1 : 0.38, borderColor: r.stasiun === selected ? NAVY : 'transparent', borderWidth: 2 },
        })),
        markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: 'rgba(24,49,79,0.45)', type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] },
      }],
    }
  }, [rows, selected])
  const sorted = useMemo(() => [...rows].filter((r) => r.rho != null).sort((a, b) => b.rho - a.rho), [rows])
  return <EChart option={option} height={height} onEvents={{ click: (p) => p.dataIndex != null && onSelect?.(sorted[p.dataIndex]?.stasiun) }} />
}

/* ═══ 4. Scatter 22 stasiun (karakteristik vs median polutan) ═══════════ */
export function StationScatter({ points, xKey, pol, line, xLabel, height = 420 }) {
  const option = useMemo(() => {
    const f = FACTORS[xKey]; const u = polUnit(pol); const xl = xLabel ?? f.label
    const groups = [...new Set(points.map((p) => p.tipe))]
    return {
      textStyle: TXT,
      grid: { left: 64, right: 20, top: 76, bottom: 52 },
      legend: { top: 4, left: 8, right: 8, textStyle: TXT, itemWidth: 10, itemHeight: 10 },
      tooltip: {
        ...tooltipBase, trigger: 'item',
        formatter: (p) => (p.seriesType === 'line' ? '<strong>Tren Linier</strong>' : `<strong>${p.data.stasiun}</strong><br/>${muted(p.data.tipe)}<br/>${xl}: <strong>${formatNumber(p.data.value[0], 0)} ${f.unit}</strong><br/>Median ${polLabel(pol)}: <strong>${fmtConc(p.data.value[1], pol)} ${u}</strong>`),
      },
      xAxis: { type: 'value', scale: true, name: `${xl} (${f.unit})`, nameLocation: 'middle', nameGap: 30, nameTextStyle: TXT, splitLine: GRID_LINE, axisLine: AXIS_LINE, axisLabel: TXT },
      yAxis: { type: 'value', name: `Median ${polLabel(pol)} (${u})`, nameTextStyle: { ...TXT, align: 'left' }, splitLine: GRID_LINE, axisLabel: TXT },
      series: [
        ...groups.map((g) => ({
          name: g, type: 'scatter', symbolSize: 13,
          itemStyle: { color: GROUP_COLORS[g] ?? NEG_COLOR, borderColor: '#fff', borderWidth: 1.5 },
          label: { show: true, formatter: (p) => p.data.stasiun, position: 'top', fontFamily: FONT, fontSize: 9, color: '#55706E' },
          labelLayout: { hideOverlap: true },
          data: points.filter((p) => p.tipe === g).map((p) => ({ value: [p.x, p.y], stasiun: p.stasiun, tipe: p.tipe })),
        })),
        { name: 'Tren Linier', type: 'line', data: line ?? [], showSymbol: false, silent: true, lineStyle: { color: TREND_LINE, width: 2, type: 'dashed' }, itemStyle: { color: TREND_LINE } },
      ],
    }
  }, [points, xKey, pol, line, xLabel])
  return <EChart option={option} height={height} />
}

/* ═══ 5. Boxplot (kotak dari Q1–Q3) + titik individual ══════════════════ */
/**
 * items: [{ name, color, box: {min,q1,med,q3,max}|null, points: [{label,v}], n, nLabel }]
 * Kategori tanpa box (jumlah observasi terlalu sedikit) hanya menampilkan titik dan penanda median.
 */
export function BoxplotChart({ items, pol, logY, height = 400, xName, showMedian = false }) {
  const option = useMemo(() => {
    const u = polUnit(pol)
    const names = items.map((i) => i.name)
    const jitter = (i, k, m) => (((k * 37 + i * 17) % 11) / 10 - 0.5) * 0.32 * (m > 1 ? 1 : 0)
    const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }
    const NAN5 = [NaN, NaN, NaN, NaN, NaN]
    const boxData = items.map((it) => (it.box
      ? { value: [it.box.min, it.box.q1, it.box.med, it.box.q3, it.box.max], stat: it.box, itemStyle: { color: tint(it.color, 0.18), borderColor: it.color, borderWidth: 2 }, n: it.n, nLabel: it.nLabel, name: it.name }
      : { value: NAN5, name: it.name }))
    const pts = []
    items.forEach((it, i) => it.points.forEach((p, k) => { if (p.v != null && (!logY || p.v > 0)) pts.push({ value: [i + jitter(i, k, it.points.length), p.v], label: p.label, name: it.name, color: it.color }) }))
    const medians = items.filter((it) => (showMedian && it.box) || (!it.box && it.points.length)).map((it) => {
      if (showMedian && it.box) return { value: [items.indexOf(it), it.box.med], name: it.name, nLabel: it.nLabel }
      const vs = it.points.map((p) => p.v).sort((a, b) => a - b); const m = vs.length % 2 ? vs[(vs.length - 1) / 2] : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2
      return { value: [items.indexOf(it), m], name: it.name, nLabel: it.nLabel }
    })
    return {
      textStyle: TXT,
      grid: { left: 64, right: 20, top: 28, bottom: 64 },
      tooltip: {
        ...tooltipBase, trigger: 'item',
        formatter: (p) => {
          if (p.seriesName === 'Boxplot') {
            const { min: mn, q1, med: md, q3, max: mx } = p.data.stat
            return `<strong>${p.data.name}</strong><br/>${muted(p.data.nLabel)}<br/>Median: <strong>${fmtConc(md, pol)} ${u}</strong><br/>Q1–Q3: ${fmtConc(q1, pol)} – ${fmtConc(q3, pol)}<br/>Kumis: ${fmtConc(mn, pol)} – ${fmtConc(mx, pol)}`
          }
          if (p.seriesName === 'Median (n kecil)') return `<strong>${p.data.name}</strong><br/>${muted(p.data.nLabel)}<br/>Median: <strong>${fmtConc(p.value[1], pol)} ${u}</strong>`
          return `<strong>${p.data.label}</strong><br/>${muted(p.data.name)}<br/>${fmtConc(p.value[1], pol)} ${u}`
        },
      },
      xAxis: { type: 'category', data: names, name: xName, nameLocation: 'middle', nameGap: 44, nameTextStyle: TXT, axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, interval: 0, color: NAVY, fontWeight: 600, formatter: (v) => v.replace('Latar bersih/regional', 'Latar bersih/\nregional') } },
      yAxis: { type: logY ? 'log' : 'value', name: `${polLabel(pol)} (${u})${logY ? ' · skala log' : ''}`, nameTextStyle: { ...TXT, align: 'left' }, splitLine: GRID_LINE, axisLabel: TXT, scale: false },
      series: [
        { name: 'Boxplot', type: 'boxplot', data: boxData, z: 2, boxWidth: [16, 64], emphasis: { disabled: true } },
        { name: 'Titik individual', type: 'scatter', data: pts, symbolSize: 8, z: 4, itemStyle: { color: (p) => p.data.color, borderColor: '#fff', borderWidth: 1, opacity: 0.9 } },
        { name: 'Median (n kecil)', type: 'scatter', data: medians, symbol: 'diamond', symbolSize: 16, z: 5, itemStyle: { color: NAVY, borderColor: '#fff', borderWidth: 1.5 } },
      ],
    }
  }, [items, pol, logY, xName, showMedian])
  return <EChart option={option} height={height} />
}

/** Legenda boxplot (HTML) — menjelaskan kotak, garis, kumis, dan titik. */
export function BoxLegend({ pointLabel = 'titik = satu stasiun (median stasiun)', medianDiamond = false }) {
  return (
    <div className="legend" style={{ marginTop: '0.6rem' }}>
      <span className="legend-item"><span className="legend-dot" style={{ background: 'rgba(56,78,119,0.25)', border: '1.5px solid #384E77', borderRadius: 2 }} />kotak = Q1–Q3</span>
      <span className="legend-item"><strong>garis di dalam kotak</strong> = median</span>
      <span className="legend-item"><strong>kumis</strong> = rentang tanpa pencilan (1,5 × IQR)</span>
      {pointLabel && <span className="legend-item"><span className="legend-dot" style={{ background: '#384E77' }} />{pointLabel}</span>}
      {medianDiamond && <span className="legend-item"><span className="legend-dot" style={{ background: '#18314F', transform: 'rotate(45deg)', borderRadius: 1 }} />berlian = median</span>}
    </div>
  )
}

/* ═══ 6. Korelasi menurut polutan (6 batang) ═════════════════════════════ */
export function RhoByPollutantBar({ items, selected, onSelect, height = 230 }) {
  const option = useMemo(() => ({
    textStyle: TXT,
    grid: { left: 52, right: 14, top: 18, bottom: 34 },
    tooltip: { ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => { const r = items[ps[0].dataIndex]; return `<strong>${polLabel(r.pol)}</strong><br/>ρ = ${fmtRho(r.rho)}${r.note ? `<br/>${muted(r.note)}` : ''}` } },
    xAxis: { type: 'category', data: items.map((r) => polLabel(r.pol)), axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, color: NAVY, fontWeight: 600 } },
    yAxis: { type: 'value', min: -1, max: 1, interval: 0.5, name: 'Spearman ρ', nameTextStyle: { ...TXT, align: 'left' }, splitLine: GRID_LINE, axisLabel: { ...TXT, formatter: (v) => String(v).replace('-', '−').replace('.', ',') } },
    series: [{
      type: 'bar', barMaxWidth: 34,
      data: items.map((r) => ({ value: r.rho, itemStyle: { color: r.rho >= 0 ? HEAT_POS : HEAT_NEG, opacity: !selected || r.pol === selected ? 1 : 0.38, borderColor: r.pol === selected ? NAVY : 'transparent', borderWidth: 2 } })),
      markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: 'rgba(24,49,79,0.45)', type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] },
    }],
  }), [items, selected])
  return <EChart option={option} height={height} onEvents={{ click: (p) => p.dataIndex != null && onSelect?.(items[p.dataIndex]?.pol) }} />
}

/* ═══ 7. Jumlah observasi (batang kecil) ═════════════════════════════════ */
export function CountBar({ items, unit = 'jam', height = 220, xName }) {
  const option = useMemo(() => ({
    textStyle: TXT,
    grid: { left: 76, right: 14, top: 16, bottom: xName ? 70 : 36 },
    tooltip: { ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => `<strong>${items[ps[0].dataIndex].name}</strong><br/>${formatNumber(items[ps[0].dataIndex].n)} ${unit}` },
    xAxis: { type: 'category', data: items.map((i) => i.name), name: xName, nameLocation: 'middle', nameGap: 56, nameTextStyle: TXT, axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, interval: 0, rotate: items.length > 6 ? 30 : 0 } },
    yAxis: { type: 'value', name: `Jumlah ${unit.charAt(0).toUpperCase()}${unit.slice(1)}`, nameLocation: 'middle', nameRotate: 90, nameGap: 54, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: { ...TXT, formatter: (v) => (v >= 1000 ? `${v / 1000}k` : v) } },
    series: [{ type: 'bar', barMaxWidth: 30, data: items.map((i) => ({ value: i.n, itemStyle: { color: i.color ?? NEG_COLOR } })) }],
  }), [items, unit, xName])
  return <EChart option={option} height={height} />
}

/* ═══ 8. Sebaran titik per kategori + median (berlian) ═══════════════════ */
export const MEDIAN_DIAMOND = '#F59E0B'

/**
 * items: [{ name, color, med, points: [{label, v}] }  atau  { ..., values: number[] } (ribuan observasi → titik kecil transparan) ]
 * Tanpa judul sumbu; median ditandai berlian cerah.
 */
export function CategoryDotChart({ items, pol, height = 400, xName }) {
  const option = useMemo(() => {
    const u = polUnit(pol)
    const jit = (i, k, spread) => ((((k * 2654435761 + i * 40503) >>> 0) % 1000) / 1000 - 0.5) * spread
    const dots = []
    let dense = false
    items.forEach((it, i) => {
      if (it.values) {
        dense = true
        it.values.forEach((v, k) => dots.push({ value: [i + jit(i, k, 0.62), v], name: it.name, color: it.color }))
      } else {
        it.points.forEach((p, k) => { if (p.v != null) dots.push({ value: [i + jit(i, k, it.points.length > 1 ? 0.3 : 0), p.v], label: p.label, name: it.name, color: it.color }) })
      }
    })
    const meds = items.map((it, i) => (it.med != null ? { value: [i, it.med], name: it.name, nLabel: it.nLabel } : null)).filter(Boolean)
    return {
      textStyle: TXT,
      grid: { left: 70, right: 20, top: 20, bottom: 62 },
      tooltip: {
        ...tooltipBase, trigger: 'item',
        formatter: (p) => {
          if (p.seriesName === 'Median') return `<strong>${p.data.name}</strong><br/>${p.data.nLabel ? `${muted(p.data.nLabel)}<br/>` : ''}Median: <strong>${fmtConc(p.value[1], pol)} ${u}</strong>`
          return `<strong>${p.data.label ?? p.data.name}</strong><br/>${p.data.label ? `${muted(p.data.name)}<br/>` : ''}${fmtConc(p.value[1], pol)} ${u}`
        },
      },
      xAxis: { type: 'category', data: items.map((it) => it.name), name: xName, nameLocation: 'middle', nameGap: 42, nameTextStyle: TXT, axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, interval: 0, color: NAVY, fontWeight: 600, formatter: (v) => v.replace('Latar bersih/regional', 'Latar bersih/\nregional') } },
      yAxis: { type: 'value', name: `Konsentrasi Polutan (${u})`, nameLocation: 'middle', nameRotate: 90, nameGap: 46, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: TXT, scale: false },
      series: [
        { name: 'Titik', type: 'scatter', data: dots, symbolSize: dense ? 4 : 9, large: dense, largeThreshold: 3000, z: 3, itemStyle: { color: dense ? (items[0]?.color ?? '#384E77') : (p) => p.data.color, borderColor: '#fff', borderWidth: dense ? 0 : 1, opacity: dense ? 0.22 : 0.9 } },
        { name: 'Median', type: 'scatter', data: meds, symbol: 'diamond', symbolSize: 18, z: 6, itemStyle: { color: MEDIAN_DIAMOND, borderColor: '#fff', borderWidth: 1.5 } },
      ],
    }
  }, [items, pol, xName])
  return <EChart option={option} height={height} />
}

/** Legenda: berlian cerah = median. */
export function MedianLegend() {
  return (
    <div className="legend" style={{ marginTop: '0.6rem', justifyContent: 'center' }}>
      <span className="legend-item"><span className="legend-dot" style={{ background: MEDIAN_DIAMOND, transform: 'rotate(45deg)', borderRadius: 1 }} />Median</span>
    </div>
  )
}
