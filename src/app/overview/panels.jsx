'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Flame,
  GitCompareArrows,
  HeartPulse,
  MapPin,
  Scale,
  TriangleAlert,
  Wind,
} from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EChart } from '@/components/charts/EChart'
import { ISPU_CATEGORIES, POLLUTANTS } from '@/lib/constants'
import { formatNumber, getIspuFromPm25 } from '@/lib/formatters'

const NAVY = '#18314F'
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

/** 'Kota Administrasi Jakarta Pusat' → 'Jakarta Pusat' */
export const shortName = (s) =>
  (s?.kota_kabupaten ?? s?.location_id ?? '—').replace(/^(Kota Administrasi|Kabupaten|Kota)\s+/i, '')

/* ─── Peringkat stasiun ───────────────────────────────────────────────── */
export function StationRanking({ stations, limit = 6, className = '' }) {
  // Rata-rata periode dibandingkan dengan ambang TAHUNAN (PRD bagian 10)
  const { whoAnnual: who, naaqsAnnual: naaqs } = POLLUTANTS.pm25

  const top = useMemo(
    () =>
      stations
        .filter((s) => Number.isFinite(s.avg_pm25))
        .sort((a, b) => b.avg_pm25 - a.avg_pm25)
        .slice(0, limit),
    [stations, limit]
  )

  const scaleMax = Math.max(top[0]?.avg_pm25 ?? 0, naaqs) * 1.12
  const pos = (v) => `${Math.min(100, (v / scaleMax) * 100)}%`

  return (
    <Card className={className}>
      <CardHeader
        title="Stasiun dengan PM2.5 tertinggi"
        subtitle="Rata-rata seluruh periode data, dibandingkan dengan ambang tahunan WHO dan PP 22/2021."
      />
      {top.length === 0 ? (
        <p className="empty">Belum ada data stasiun untuk filter ini.</p>
      ) : (
        <ol className="rank-list rank-list--wide">
          {top.map((s, i) => {
            const cat = getIspuFromPm25(s.avg_pm25)
            return (
              <li
                key={s.location_id ?? i}
                className="rank-row"
                aria-label={`${shortName(s)}: ${formatNumber(s.avg_pm25, 1)} µg/m³`}
              >
                <span className="rank-no" aria-hidden="true">{i + 1}</span>
                <span className="rank-name" title={s.kota_kabupaten}>{shortName(s)}</span>
                <span className="rank-val">
                  {formatNumber(s.avg_pm25, 1)} <small>µg/m³</small>
                </span>
                <span className="rank-track" aria-hidden="true">
                  <span className="rank-fill" style={{ width: pos(s.avg_pm25), background: cat?.color }} />
                  <span className="rank-mark rank-mark--who" style={{ left: pos(who) }} />
                  <span className="rank-mark rank-mark--naaqs" style={{ left: pos(naaqs) }} />
                </span>
              </li>
            )
          })}
        </ol>
      )}
      <div className="rank-legend">
        <span><i className="rank-key rank-key--who" />WHO {who} µg/m³ (tahunan)</span>
        <span><i className="rank-key rank-key--naaqs" />PP 22/2021 {naaqs} µg/m³ (tahunan)</span>
      </div>
    </Card>
  )
}

/* ─── Donut kategori ISPU ─────────────────────────────────────────────── */
export function IspuDonut({ stations, className = '' }) {
  const counts = useMemo(
    () =>
      ISPU_CATEGORIES.map((c) => ({
        ...c,
        count: stations.filter((s) => getIspuFromPm25(s.avg_pm25)?.id === c.id).length,
      })),
    [stations]
  )
  const total = counts.reduce((s, c) => s + c.count, 0)

  const option = useMemo(
    () => ({
      textStyle: { fontFamily: FONT },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fff',
        borderColor: 'rgba(24,49,79,0.15)',
        textStyle: { color: NAVY, fontFamily: FONT, fontSize: 12 },
        formatter: (p) => `<strong>${p.name}</strong><br/>${p.value} stasiun (${p.percent}%)`,
      },
      series: [{
        type: 'pie',
        radius: ['60%', '86%'],
        center: ['50%', '50%'],
        itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
        label: {
          show: true,
          position: 'center',
          formatter: `{a|${total}}\n{b|stasiun}`,
          rich: {
            a: { fontSize: 36, fontWeight: 800, color: NAVY, fontFamily: FONT, lineHeight: 40 },
            b: { fontSize: 12, color: '#55706E', fontFamily: FONT },
          },
        },
        emphasis: { scale: true, scaleSize: 4, label: { show: true } },
        labelLine: { show: false },
        data: counts
          .filter((c) => c.count > 0)
          .map((c) => ({ name: c.label, value: c.count, itemStyle: { color: c.color } })),
      }],
    }),
    [counts, total]
  )

  return (
    <Card className={`ov-ispu-card ${className}`.trim()}>
      <CardHeader
        title="Sebaran kategori ISPU"
        subtitle="Jumlah stasiun per kategori ISPU, dihitung dari rata-rata PM2.5 seluruh periode."
      />
      <div className="ov-ispu-donut">
        <EChart option={option} height={240} />
      </div>
      <ul className="ispu-legend-row">
        {counts.map((c) => (
          <li key={c.id} className={c.count === 0 ? 'is-zero' : ''}>
            <span className="ispu-legend-label">
              <i className="legend-dot" style={{ background: c.color }} />
              {c.label}
            </span>
            <strong>{c.count}</strong>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ─── Gateway modul: KPI dengan angka penting per halaman ─────────────── */
const GATEWAY_MODULES = [
  { label: 'Kualitas udara', href: '/kualitas-udara', icon: Wind, color: '#FB923C' },
  { label: 'Faktor PM2.5', href: '/korelasi', icon: GitCompareArrows, color: '#384E77' },
  { label: 'PM2.5 & kesehatan', href: '/pm25-kesehatan', icon: HeartPulse, color: '#EF4444' },
  { label: 'Kecukupan stasiun', href: '/kecukupan-stasiun', icon: MapPin, color: '#60A5FA' },
]

export function ModuleGateway({ insights = {} }) {
  return (
    <div className="gateway-grid">
      {GATEWAY_MODULES.map((m) => {
        const Icon = m.icon
        const insight = insights[m.href]
        return (
          <Link
            key={m.href}
            href={m.href}
            className="card kpi gateway-card"
            style={{ '--gw': m.color }}
            aria-label={`${m.label}: ${insight ? insight.value : 'data belum tersedia'}`}
          >
            <div className="kpi-top">
              <p className="kpi-label">{m.label}</p>
              <span className="kpi-icon" aria-hidden="true">
                <Icon size={16} />
              </span>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value">{insight?.value ?? '—'}</span>
              {insight?.unit && <span className="kpi-unit">{insight.unit}</span>}
            </div>
            <div className="kpi-foot">
              <span>{insight?.note ?? ''}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}