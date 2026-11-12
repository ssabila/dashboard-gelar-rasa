'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Flame, Scale, TriangleAlert } from 'lucide-react'
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
export function StationRanking({ stations, limit = 6 }) {
  const { who, naaqs } = POLLUTANTS.pm25
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
    <Card>
      <CardHeader
        title="Stasiun dengan PM2.5 tertinggi"
        subtitle="Rata-rata seluruh periode data, dibanding pedoman WHO dan baku mutu NAAQS."
      />
      {top.length === 0 ? (
        <p className="empty">Belum ada data stasiun untuk filter ini.</p>
      ) : (
        <ol className="rank-list">
          {top.map((s, i) => {
            const cat = getIspuFromPm25(s.avg_pm25)
            return (
              <li key={s.location_id ?? i} className="rank-row">
                <span className="rank-no">{i + 1}</span>
                <span className="rank-name" title={s.kota_kabupaten}>{shortName(s)}</span>
                <span className="rank-val">{formatNumber(s.avg_pm25, 1)} <small>µg/m³</small></span>
                <span className="rank-track">
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
        <span><i className="rank-key rank-key--who" />WHO {who} µg/m³</span>
        <span><i className="rank-key rank-key--naaqs" />NAAQS {naaqs} µg/m³</span>
      </div>
    </Card>
  )
}

/* ─── Donut kategori ISPU ─────────────────────────────────────────────── */
export function IspuDonut({ stations }) {
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
          show: true, position: 'center',
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
    <Card className="ov-ispu-card">
      <CardHeader title="Sebaran kategori ISPU" subtitle="Jumlah stasiun per kategori, dari rata-rata PM2.5." />
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

/* ─── Temuan singkat (storytelling) ───────────────────────────────────── */
export function KeyInsights({ stations, avgPm25 }) {
  const { who, naaqs } = POLLUTANTS.pm25
  const items = useMemo(() => {
    const valid = stations.filter((s) => Number.isFinite(s.avg_pm25)).sort((a, b) => b.avg_pm25 - a.avg_pm25)
    if (valid.length < 2) return []
    const hi = valid[0]
    const lo = valid[valid.length - 1]
    const exceed = valid.filter((s) => s.avg_pm25 > naaqs).length
    const hiCat = getIspuFromPm25(hi.avg_pm25)

    return [
      {
        icon: TriangleAlert, color: '#FB923C', href: '/kualitas-udara', cta: 'Bandingkan antar stasiun',
        title: `${exceed} dari ${valid.length} stasiun melampaui baku mutu`,
        text: `Rata-rata PM2.5 ${formatNumber(avgPm25, 1)} µg/m³, sekitar ${formatNumber(avgPm25 / who, 1)}× pedoman WHO (${who} µg/m³). Ambang NAAQS yang dipakai: ${naaqs} µg/m³.`,
      },
      {
        icon: Flame, color: '#F87171', href: '/kualitas-udara', cta: 'Lihat pola waktu & musim',
        title: `${shortName(hi)} paling tercemar`,
        text: `Rata-rata ${formatNumber(hi.avg_pm25, 1)} µg/m³ (${hiCat?.label ?? '—'}), ${formatNumber(hi.avg_pm25 / naaqs, 1)}× baku mutu. Periksa apakah ada episode kabut asap pada musim kemarau.`,
      },
      {
        icon: Scale, color: '#384E77', href: '/korelasi', cta: 'Telusuri faktor penyebab',
        title: `Selisih antar stasiun ${formatNumber(hi.avg_pm25 / lo.avg_pm25, 1)}×`,
        text: `Terbersih ${shortName(lo)} (${formatNumber(lo.avg_pm25, 1)} µg/m³), terkotor ${shortName(hi)} (${formatNumber(hi.avg_pm25, 1)} µg/m³). Bandingkan dengan tipe lokasi dan cuaca di halaman Korelasi.`,
      },
    ]
  }, [stations, avgPm25, who, naaqs])

  if (!items.length) return null
  return (
    <div className="layout-3">
      {items.map(({ icon: Icon, color, href, cta, title, text }) => (
        <Card key={title} className="insight" style={{ '--ins': color }}>
          <span className="insight-icon" aria-hidden="true"><Icon size={18} /></span>
          <h4>{title}</h4>
          <p>{text}</p>
          <Link href={href} className="link-more">{cta} <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </Card>
      ))}
    </div>
  )
}
