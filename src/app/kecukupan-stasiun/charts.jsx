'use client'

import { useMemo } from 'react'
import { EChart } from './EChart'
import { SITE_TYPE_LABELS } from '@/lib/constants'
import { GAP_COMPONENTS, PERAN_COLORS } from '@/lib/coverage'

/* ─── Gaya dasar ECharts (selaras token dashboard) ─────────────────────── */
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"
const TXT = { color: '#55706E', fontFamily: FONT, fontSize: 11 }
const NAVY = '#18314F'
const DUSK = '#384E77'
const TEAL = '#8BBEB2'
const ORANGE = '#FB923C'
const GRID_LINE = { lineStyle: { color: 'rgba(24,49,79,0.08)' } }
const AXIS_LINE = { lineStyle: { color: 'rgba(24,49,79,0.18)' } }

const tooltipBase = {
  backgroundColor: '#FFFFFF',
  borderColor: 'rgba(24,49,79,0.15)',
  borderWidth: 1,
  textStyle: { color: NAVY, fontFamily: FONT, fontSize: 12 },
  extraCssText: 'box-shadow:0 8px 24px rgba(24,49,79,0.12);border-radius:10px;',
}

const fmt = (v, d = 0) => (Number.isFinite(v) ? Number(v).toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d }) : '—')

// Tinggi kedua grafik baris pertama disamakan agar kartunya sejajar
const ROW_HEIGHT = 360

/* ═══ 1. Kepadatan stasiun per pulau ═════════════════════════════════════ */
export function PulauDensityChart({ rows, benchmark, selected, onSelect }) {
  const option = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.stasiun_per_100k_km2 - b.stasiun_per_100k_km2)
    return {
      textStyle: TXT,
      grid: { left: 8, right: 56, top: 24, bottom: 8, containLabel: true },
      tooltip: {
        ...tooltipBase,
        trigger: 'item',
        formatter: (p) => {
          const r = sorted[p.dataIndex]
          return `<strong>${r.pulau}</strong><br/>${r.n_stasiun} stasiun · ${fmt(r.luas_km2)} km²<br/>` +
            `${fmt(r.stasiun_per_100k_km2, 2)} stasiun per 100.000 km²<br/>` +
            `Kurang dari rata-rata nasional: ${r.gap_stasiun_vs_benchmark} stasiun`
        },
      },
      xAxis: { type: 'value', splitLine: GRID_LINE, axisLabel: TXT, name: 'stasiun per 100.000 km²', nameLocation: 'end', nameTextStyle: { ...TXT, align: 'right' } },
      yAxis: { type: 'category', data: sorted.map((r) => r.pulau), axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, color: NAVY } },
      series: [{
        type: 'bar',
        barMaxWidth: 22,
        data: sorted.map((r) => ({
          value: r.stasiun_per_100k_km2,
          itemStyle: {
            color: r.blank_spot ? ORANGE : DUSK,
            opacity: selected && selected !== r.pulau ? 0.3 : 1,
            borderRadius: [0, 6, 6, 0],
          },
        })),
        label: { show: true, position: 'right', formatter: (p) => `${sorted[p.dataIndex].n_stasiun} stasiun`, ...TXT },
        markLine: {
          symbol: 'none',
          lineStyle: { color: '#EF6B3B', type: 'dashed', width: 1.5 },
          label: { formatter: 'Rata-rata nasional', ...TXT, color: '#EF6B3B' },
          data: [{ xAxis: benchmark }],
        },
      }],
      _order: sorted.map((r) => r.pulau),
    }
  }, [rows, benchmark, selected])

  return (
    <EChart
      option={option}
      height={ROW_HEIGHT}
      onEvents={{ click: (p) => onSelect?.(option._order[p.dataIndex]) }}
    />
  )
}

/* ═══ 2. Treemap provinsi: luas × % terjangkau ═══════════════════════════ */
export function ProvinceTreemap({ rows, radius }) {
  const option = useMemo(() => {
    const groups = {}
    rows.forEach((r) => {
      const cov = r[`cov_pct_${radius}`] ?? 0
      ;(groups[r.pulau] ??= []).push({
        name: r.provinsi,
        value: [Math.round(r.luas_km2), cov, r.n_stasiun],
        // Latar terang → teks navy, latar gelap → teks putih (sebelumnya selalu putih)
        label: { color: cov >= 70 ? '#FFFFFF' : NAVY },
      })
    })
    return {
      textStyle: TXT,
      tooltip: {
        ...tooltipBase,
        formatter: (p) => {
          const v = p.value
          if (!Array.isArray(v)) return `<strong>${p.name}</strong>`
          return `<strong>${p.name}</strong><br/>${fmt(v[0])} km² · ${v[2]} stasiun<br/>Terjangkau (radius ${radius} km): ${fmt(v[1], 1)}%`
        },
      },
      visualMap: {
        type: 'continuous', min: 0, max: 100, dimension: 1, show: true, orient: 'horizontal',
        left: 'center', bottom: 0, itemWidth: 12, itemHeight: 120, text: ['100%', '0%'], textStyle: TXT,
        inRange: { color: ['#F1F5F9', '#8BBEB2', '#18314F'] },
      },
      series: [{
        type: 'treemap',
        top: 0, bottom: 36, left: 0, right: 0,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        visualDimension: 1,
        label: { show: true, formatter: '{b}', fontFamily: FONT, fontSize: 11, fontWeight: 600, color: NAVY, overflow: 'truncate' },
        upperLabel: { show: true, height: 20, color: NAVY, fontFamily: FONT, fontWeight: 700, fontSize: 11 },
        itemStyle: { borderColor: '#FFFFFF', borderWidth: 2, gapWidth: 2 },
        levels: [
          { itemStyle: { borderColor: '#FFFFFF', borderWidth: 4, gapWidth: 4 } },
          { itemStyle: { borderColor: '#FFFFFF', borderWidth: 1, gapWidth: 1 } },
        ],
        data: Object.entries(groups).map(([name, children]) => ({
          name,
          value: [children.reduce((s, c) => s + c.value[0], 0), 0, 0],
          children,
        })),
      }],
    }
  }, [rows, radius])

  return <EChart option={option} height={ROW_HEIGHT} />
}

/* ═══ 3. Heatmap kelengkapan data stasiun × bulan ════════════════════════ */
export function CompletenessHeatmap({ heat, stations }) {
  const option = useMemo(() => {
    const rowIdx = heat.stations.map((k, i) => ({ k, i }))
    const keep = new Set(stations.map((s) => s.kode))
    const comp = Object.fromEntries(stations.map((s) => [s.kode, s.completeness_pct ?? 0]))
    const ordered = rowIdx.filter((r) => keep.has(r.k)).sort((a, b) => comp[a.k] - comp[b.k])
    const data = []
    ordered.forEach((r, yi) => {
      heat.values[r.i].forEach((v, xi) => data.push([xi, yi, v == null ? 0 : v]))
    })
    return {
      textStyle: TXT,
      grid: { left: 54, right: 16, top: 8, bottom: 62 },
      tooltip: {
        ...tooltipBase,
        formatter: (p) => `<strong>${ordered[p.value[1]].k}</strong> · ${heat.months[p.value[0]]}<br/>Data lengkap: ${fmt(p.value[2], 1)}%`,
      },
      xAxis: { type: 'category', data: heat.months, axisLabel: { ...TXT, interval: 2, rotate: 45 }, axisLine: AXIS_LINE, axisTick: { show: false }, splitArea: { show: false } },
      yAxis: { type: 'category', data: ordered.map((r) => r.k), axisLabel: { ...TXT, fontSize: 10 }, axisLine: AXIS_LINE, axisTick: { show: false } },
      visualMap: {
        min: 0, max: 100, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 140,
        text: ['100%', '0%'], textStyle: TXT, inRange: { color: ['#F87171', '#FACC15', '#4ADE80'] },
      },
      series: [{ type: 'heatmap', data, itemStyle: { borderColor: '#FFFFFF', borderWidth: 1 }, emphasis: { itemStyle: { borderColor: NAVY, borderWidth: 1.5 } } }],
    }
  }, [heat, stations])

  return <EChart option={option} height={Math.max(300, stations.length * 17 + 100)} />
}

/* ═══ 4. Komposisi tipe lokasi ═══════════════════════════════════════════ */
export function SiteTypeChart({ mix }) {
  const option = useMemo(() => {
    const sorted = [...mix].sort((a, b) => a.n - b.n)
    return {
      textStyle: TXT,
      grid: { left: 8, right: 32, top: 8, bottom: 8, containLabel: true },
      tooltip: { ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', minInterval: 1, splitLine: GRID_LINE, axisLabel: TXT },
      yAxis: {
        type: 'category',
        data: sorted.map((m) => SITE_TYPE_LABELS[m.site_type] ?? m.site_type),
        axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, color: NAVY },
      },
      series: [{ type: 'bar', data: sorted.map((m) => m.n), barMaxWidth: 16, itemStyle: { color: DUSK, borderRadius: [0, 5, 5, 0] }, label: { show: true, position: 'right', ...TXT } }],
    }
  }, [mix])

  return <EChart option={option} height={Math.max(240, mix.length * 26 + 40)} />
}

/* ═══ 5. Peran stasiun: kritis vs redundan ═══════════════════════════════ */
export function RoleScatter({ stations }) {
  const option = useMemo(() => {
    const series = ['Kritis', 'Sedang', 'Redundan'].map((peran) => ({
      name: peran,
      type: 'scatter',
      symbolSize: 13,
      itemStyle: { color: PERAN_COLORS[peran], borderColor: '#FFFFFF', borderWidth: 1.5 },
      emphasis: { label: { show: true, formatter: (p) => p.value[2], fontFamily: FONT, fontSize: 11, color: NAVY } },
      data: stations
        .filter((s) => s.peran === peran && Number.isFinite(s.unique_coverage_km2) && Number.isFinite(s.loo_rmse_daily))
        .map((s) => [s.unique_coverage_km2, s.loo_rmse_daily, s.kode, s.kota_kabupaten]),
    }))
    return {
      textStyle: TXT,
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: TXT, icon: 'circle', itemWidth: 8 },
      tooltip: {
        ...tooltipBase,
        formatter: (p) => `<strong>${p.value[2]}</strong> · ${p.value[3]}<br/>Wilayah yang hanya dijangkau stasiun ini: ${fmt(p.value[0])} km²<br/>Error bila dihapus (RMSE): ${fmt(p.value[1], 2)} µg/m³`,
      },
      xAxis: { type: 'value', name: 'Wilayah yang hanya dijangkau stasiun ini (km²)', nameLocation: 'middle', nameGap: 28, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: TXT },
      yAxis: { type: 'value', name: 'Error bila stasiun dihapus (RMSE)', nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: TXT },
      series,
    }
  }, [stations])

  return <EChart option={option} height={320} />
}

/* ═══ 6. Peluruhan kemiripan vs jarak ════════════════════════════════════ */
function binCenter(label) {
  const m = /\(([\d.]+),\s*([\d.]+)\]/.exec(label)
  if (!m) return null
  const lo = parseFloat(m[1])
  const hi = parseFloat(m[2])
  return lo === 0 ? hi / 2 : Math.sqrt(lo * hi)
}

export function DecayChart({ corr }) {
  const option = useMemo(() => {
    const pairs = corr.pairs.filter((p) => Number.isFinite(p.corr))
    const maxD = Math.max(...pairs.map((p) => p.dist_km), 100)
    const med = corr.binned
      .map((b) => ({ x: binCenter(b.bin), ...b }))
      .filter((b) => b.x != null && Number.isFinite(b.median))
    const fit = corr.fit
    const fitData = []
    if (fit?.a != null && fit?.L_km) {
      for (let i = 0; i <= 60; i++) {
        const x = 5 * Math.pow(maxD / 5, i / 60)
        fitData.push([x, fit.a * Math.exp(-x / fit.L_km)])
      }
    }
    return {
      textStyle: TXT,
      grid: { left: 8, right: 24, top: 44, bottom: 12, containLabel: true },
      legend: { top: 0, textStyle: TXT, icon: 'roundRect' },
      tooltip: { ...tooltipBase, trigger: 'item' },
      xAxis: { type: 'log', min: 5, name: 'Jarak antar stasiun (km, skala log)', nameLocation: 'middle', nameGap: 28, nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: TXT },
      yAxis: { type: 'value', name: 'Kemiripan PM2.5 harian (korelasi)', nameTextStyle: TXT, max: 1, splitLine: GRID_LINE, axisLabel: TXT },
      series: [
        {
          name: 'Pasangan stasiun', type: 'scatter', symbolSize: 6,
          itemStyle: { color: TEAL, opacity: 0.45 },
          data: pairs.map((p) => [p.dist_km, p.corr, p.a, p.b]),
          tooltip: { formatter: (p) => `${p.value[2]} ↔ ${p.value[3]}<br/>${fmt(p.value[0])} km · r = ${fmt(p.value[1], 2)}` },
        },
        {
          name: 'Median per rentang jarak', type: 'line', symbol: 'circle', symbolSize: 8, lineStyle: { width: 2.5, color: DUSK }, itemStyle: { color: DUSK },
          data: med.map((b) => [b.x, b.median, b.q25, b.q75, b.n]),
          tooltip: { formatter: (p) => `Median r = ${fmt(p.value[1], 2)}<br/>Q1–Q3: ${fmt(p.value[2], 2)} – ${fmt(p.value[3], 2)}<br/>${p.value[4]} pasangan` },
          markLine: {
            symbol: 'none', silent: true,
            data: [
              { xAxis: corr.radius_used_km, lineStyle: { color: '#16A34A', type: 'dashed' }, label: { formatter: `Jangkauan ${corr.radius_used_km} km`, ...TXT, color: '#16A34A' } },
              { yAxis: corr.params?.corr_threshold ?? 0.5, lineStyle: { color: '#94A3B8', type: 'dotted' }, label: { formatter: 'Ambang', ...TXT } },
            ],
          },
        },
        ...(fitData.length
          ? [{ name: 'Kurva peluruhan', type: 'line', showSymbol: false, smooth: true, lineStyle: { width: 2, type: 'dashed', color: '#EF6B3B' }, itemStyle: { color: '#EF6B3B' }, data: fitData, silent: true }]
          : []),
      ],
    }
  }, [corr])

  return <EChart option={option} height={340} />
}

/* ═══ 7. Heatmap kemiripan antar stasiun ═════════════════════════════════ */
export function CorrelationHeatmap({ corr }) {
  const option = useMemo(() => {
    const order = corr.dendrogram_order
    const labels = order.map((i) => corr.stations[i])
    const data = []
    let lo = 1
    order.forEach((ri, y) => order.forEach((ci, x) => {
      const v = corr.matrix[ri][ci]
      if (v != null) { data.push([x, y, v]); if (ri !== ci && v < lo) lo = v }
    }))
    return {
      textStyle: TXT,
      grid: { left: 58, right: 12, top: 8, bottom: 74 },
      tooltip: { ...tooltipBase, formatter: (p) => `${labels[p.value[1]]} ↔ ${labels[p.value[0]]}<br/>r = ${fmt(p.value[2], 2)}` },
      xAxis: { type: 'category', data: labels, axisLabel: { ...TXT, fontSize: 9, rotate: 90, interval: 0 }, axisTick: { show: false }, axisLine: AXIS_LINE },
      yAxis: { type: 'category', data: labels, axisLabel: { ...TXT, fontSize: 9, interval: 0 }, axisTick: { show: false }, axisLine: AXIS_LINE },
      visualMap: {
        min: Math.max(-1, Math.floor(lo * 10) / 10), max: 1, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 140,
        text: ['Mirip', 'Berbeda'], textStyle: TXT, inRange: { color: ['#F1F5F9', '#8BBEB2', '#18314F'] },
      },
      series: [{ type: 'heatmap', data, itemStyle: { borderColor: '#FFFFFF', borderWidth: 0.5 } }],
    }
  }, [corr])

  return <EChart option={option} height={440} />
}

/* ═══ 8. Kurva tambahan stasiun vs luas terjangkau ═══════════════════════ */
export function CoverageCurveChart({ curve, nAdd }) {
  const option = useMemo(() => {
    const x = curve.map((c) => c.n_added)
    return {
      textStyle: TXT,
      grid: { left: 8, right: 8, top: 44, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: TXT, icon: 'roundRect' },
      tooltip: {
        ...tooltipBase, trigger: 'axis',
        formatter: (ps) => {
          const c = curve[ps[0].dataIndex]
          return `<strong>${c.n_added === 0 ? 'Kondisi sekarang' : `+${c.n_added} stasiun`}</strong><br/>Terjangkau: ${fmt(c.cov_pct, 1)}%` +
            (c.n_added > 0 ? `<br/>Tambahan: +${fmt(c.marginal_pct, 2)} poin<br/>Lokasi: ${c.kabupaten} (${c.provinsi})` : '')
        },
      },
      xAxis: { type: 'category', data: x, name: 'Stasiun tambahan', nameLocation: 'middle', nameGap: 28, nameTextStyle: TXT, axisLabel: TXT, axisLine: AXIS_LINE, axisTick: { show: false } },
      yAxis: [
        { type: 'value', name: '% luas terjangkau', nameTextStyle: TXT, splitLine: GRID_LINE, axisLabel: TXT, scale: true },
        { type: 'value', name: 'Tambahan (poin)', nameTextStyle: TXT, splitLine: { show: false }, axisLabel: TXT },
      ],
      series: [
        {
          name: 'Tambahan per stasiun', type: 'bar', yAxisIndex: 1, barMaxWidth: 20,
          data: curve.map((c, i) => ({ value: i === 0 ? 0 : c.marginal_pct, itemStyle: { color: TEAL, opacity: i <= nAdd ? 1 : 0.3, borderRadius: [4, 4, 0, 0] } })),
        },
        {
          name: 'Total terjangkau', type: 'line', symbol: 'circle', symbolSize: 7, lineStyle: { width: 2.5, color: DUSK }, itemStyle: { color: DUSK },
          data: curve.map((c) => c.cov_pct),
          markPoint: {
            symbol: 'pin', symbolSize: 52, itemStyle: { color: '#E6F9AF', borderColor: NAVY, borderWidth: 1.5 },
            label: { color: NAVY, fontFamily: FONT, fontWeight: 700, fontSize: 10, formatter: (p) => `${fmt(p.value, 1)}%` },
            data: [{ coord: [nAdd, curve[nAdd]?.cov_pct ?? curve[0].cov_pct], value: curve[nAdd]?.cov_pct ?? curve[0].cov_pct }],
          },
        },
      ],
    }
  }, [curve, nAdd])

  return <EChart option={option} height={320} />
}

/* ═══ 9. Sumbangan komponen skor kebutuhan (stacked) ═════════════════════ */
export function GapContributionChart({ rows, weights }) {
  const option = useMemo(() => {
    const sum = GAP_COMPONENTS.reduce((s, c) => s + (weights[c.key] ?? 0), 0) || 1
    const list = [...rows].reverse()
    return {
      textStyle: TXT,
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: TXT, icon: 'roundRect', itemWidth: 10 },
      tooltip: { ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => fmt(v, 3) },
      xAxis: { type: 'value', splitLine: GRID_LINE, axisLabel: TXT, max: 1 },
      yAxis: { type: 'category', data: list.map((r) => r.kabupaten), axisLine: AXIS_LINE, axisTick: { show: false }, axisLabel: { ...TXT, color: NAVY, width: 120, overflow: 'truncate' } },
      series: GAP_COMPONENTS.map((c) => ({
        name: c.label, type: 'bar', stack: 'gap', barMaxWidth: 18,
        itemStyle: { color: c.color },
        data: list.map((r) => ((weights[c.key] ?? 0) / sum) * (r[c.norm] ?? 0)),
      })),
    }
  }, [rows, weights])

  return <EChart option={option} height={Math.max(260, rows.length * 28 + 70)} />
}