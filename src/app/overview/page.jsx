'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Database,
  GitCompareArrows,
  HeartPulse,
  Lightbulb,
  MapPin,
  Network,
  Ruler,
  Timer,
  Wind,
} from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { FilterBar } from '@/components/shared/FilterBar'
import { IspuLegend } from '@/components/shared/IspuLegend'
import { useOverviewAnalytics, useOverviewSummary, useStations } from '@/hooks/useAqmsData'
import { useT4Data } from '@/hooks/usePm25KesehatanData'
import { useT3Tables } from '@/hooks/useKorelasiData'
import { useMonitoringNetworkSummary, useStationCompleteness, useStationNearestNeighbor } from '@/hooks/useKecukupanData'
import { useFilter } from '@/hooks/useFilter'
import { ISPU_CATEGORIES, POLLUTANTS } from '@/lib/constants'
import { formatNumber, getIspuFromPm25 } from '@/lib/formatters'
import { IspuDonut, StationRanking, shortName } from './panels'

const StationMap = dynamic(
  () => import('@/map/StationMap').then((m) => m.StationMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

const EMPTY = []
const NAAQS_ANNUAL = 15 // PP No. 22/2021 tahunan
const WHO_ANNUAL = 5   // WHO AQG 2021

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function isMassConcentration(row) {
  return row && !String(row.satuan ?? row.unit ?? '').toLowerCase().includes('ppm')
}
function isInPeriod(value, start, end) {
  const d = String(value ?? '')
  return d >= start.slice(0, 7) && d <= end.slice(0, 7)
}
function stationId(s) {
  return String(s?.station_code ?? '').replace(/^AQMS-/, '')
}
function korelasiLabel(rho) {
  if (rho == null) return '—'
  return rho >= 0.5 ? 'kuat' : rho >= 0.3 ? 'sedang' : 'lemah'
}

/* ─── Bagian 1: Header gelap dengan meter PM2.5 ─────────────────────── */
function OverviewHeader({ k, filters, avgCompleteness, validObs }) {
  const exceedAnnual = k.scoped.filter(
    (s) => Number.isFinite(s.avg_pm25) && s.avg_pm25 > NAAQS_ANNUAL
  ).length
  const avgDisplay = k.avg != null ? formatNumber(k.avg, 1) : '—'
  const whoPct = k.avg != null ? Math.min(100, (k.avg / WHO_ANNUAL) * 100) : 0
  const naaqsPct = k.avg != null ? Math.min(100, (k.avg / NAAQS_ANNUAL) * 100) : 0

  return (
    <Card variant="dark">
      <p className="headline">
        {exceedAnnual > 0 ? (
          <>
            Dari {k.total} stasiun,{' '}
            <strong>{exceedAnnual} melampaui baku mutu tahunan PM2.5</strong>{' '}
            ({NAAQS_ANNUAL} µg/m³).{' '}
          </>
        ) : (
          <>Seluruh {k.total} stasiun berada di bawah baku mutu tahunan ({NAAQS_ANNUAL} µg/m³). </>
        )}
        Rata-rata nasional <strong>{avgDisplay} µg/m³</strong> pada periode{' '}
        {filters.dateStart.slice(0, 7).replace('-', '/')} –{' '}
        {filters.dateEnd.slice(0, 7).replace('-', '/')}.
      </p>

      {/* PM2.5 Meter visual */}
      {k.avg != null && (
        <div style={{ marginTop: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(240,244,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PM2.5 Nasional vs Standar
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-accent)' }}>{avgDisplay} µg/m³</span>
          </div>
          {/* WHO Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ width: '5rem', fontSize: '0.68rem', color: 'rgba(240,244,255,0.5)', fontWeight: 600, flexShrink: 0 }}>WHO ({WHO_ANNUAL})</span>
            <div style={{ flex: 1, height: '0.45rem', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(whoPct, 100)}%`, background: '#E6F9AF', borderRadius: 'inherit', opacity: 0.9 }} />
            </div>
            <span style={{ width: '3rem', fontSize: '0.68rem', fontWeight: 700, color: '#E6F9AF', textAlign: 'right' }}>{formatNumber(k.avg / WHO_ANNUAL, 1)}×</span>
          </div>
          {/* NAAQS Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ width: '5rem', fontSize: '0.68rem', color: 'rgba(240,244,255,0.5)', fontWeight: 600, flexShrink: 0 }}>PP 22/2021 ({NAAQS_ANNUAL})</span>
            <div style={{ flex: 1, height: '0.45rem', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(naaqsPct, 100)}%`, background: '#8BBEB2', borderRadius: 'inherit', opacity: 0.9 }} />
            </div>
            <span style={{ width: '3rem', fontSize: '0.68rem', fontWeight: 700, color: '#8BBEB2', textAlign: 'right' }}>{formatNumber(k.avg / NAAQS_ANNUAL, 1)}×</span>
          </div>
        </div>
      )}

      <div className="overview-data-row">
        <span className="overview-data-chip">
          <CalendarRange size={12} aria-hidden="true" />
          Jan 2024 – Okt 2026
        </span>
        {validObs != null && (
          <span className="overview-data-chip">
            <Database size={12} aria-hidden="true" />
            {formatNumber(validObs)} observasi valid
          </span>
        )}
        {avgCompleteness != null && (
          <span className="overview-data-chip">
            <CheckCircle2 size={12} aria-hidden="true" />
            Kelengkapan rata-rata {formatNumber(avgCompleteness, 1)}%
          </span>
        )}
      </div>
    </Card>
  )
}

/* ─── Bagian 2: KPI Row ────────────────────────────────────────────────── */
function KpiSection({ k, medianDistance, health }) {
  const { who } = POLLUTANTS.pm25
  const valid = k.scoped.filter((s) => Number.isFinite(s.avg_pm25))
  const exceedAnnual = valid.filter((s) => s.avg_pm25 > NAAQS_ANNUAL).length
  const cat = k.avg != null ? getIspuFromPm25(k.avg) : null

  return (
    <div className="ov-kpi-row">

      {/* ── Hero: PM2.5 nasional ── */}
      <div className="card kpi kpi--hero ov-kpi-hero">
        <div className="kpi-top">
          <p className="kpi-label">Rata-rata PM2.5 nasional</p>
          <span className="kpi-icon" aria-hidden="true"><Wind size={18} /></span>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value ov-kpi-hero-num">
            {k.avg != null ? formatNumber(k.avg, 1) : '—'}
          </span>
          <span className="kpi-unit">µg/m³</span>
        </div>
        <div className="kpi-foot">
          {cat && (
            <span className="badge" style={{
              fontSize: '0.7rem',
              color: `color-mix(in srgb, ${cat.color} 55%, #18314F)`,
              background: cat.bg,
              border: `1px solid ${cat.color}40`,
            }}>{cat.label}</span>
          )}
          {k.avg != null && (
            <span>{formatNumber(k.avg / who, 1)}× pedoman WHO ({who} µg/m³)</span>
          )}
        </div>
      </div>

      {/* ── 4 card pendukung ── */}
      <div className="ov-kpi-siblings">

        <div
          className="card kpi ov-kpi-cell"
          style={{ '--ov-alert': exceedAnnual > 0 ? 'var(--ispu-tidak-sehat)' : 'var(--ispu-baik)' }}
        >
          <div className="kpi-top">
            <p className="kpi-label">Di atas baku mutu tahunan</p>
            <span className="kpi-icon" style={{ background: `color-mix(in srgb, var(--ov-alert) 16%, #fff)`, color: 'var(--color-text-primary)' }} aria-hidden="true">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{exceedAnnual}</span>
            <span className="kpi-unit">stasiun</span>
          </div>
          <div className="kpi-foot">
            <span>dari {valid.length} · {NAAQS_ANNUAL} µg/m³/tahun</span>
          </div>
        </div>

        <div className="card kpi ov-kpi-cell">
          <div className="kpi-top">
            <p className="kpi-label">Stasiun AQMS</p>
            <span className="kpi-icon" aria-hidden="true"><Network size={16} /></span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{k.total}</span>
            <span className="kpi-unit">stasiun</span>
          </div>
          <div className="kpi-foot">
            <span>{k.active} sensor aktif</span>
          </div>
        </div>

        <div className="card kpi ov-kpi-cell">
          <div className="kpi-top">
            <p className="kpi-label">Rawat inap pernapasan</p>
            <span className="kpi-icon" style={{ background: 'rgba(251,146,60,0.14)', color: 'var(--color-text-primary)' }} aria-hidden="true">
              <Activity size={16} />
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{health ? formatNumber(health.total_resp) : '—'}</span>
            <span className="kpi-unit">kasus</span>
          </div>
          <div className="kpi-foot">
            <span>semua RS, periode penuh</span>
          </div>
        </div>

        <div className="card kpi ov-kpi-cell">
          <div className="kpi-top">
            <p className="kpi-label">Median jarak antarstasiun</p>
            <span className="kpi-icon" aria-hidden="true"><Ruler size={16} /></span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(medianDistance, 0)}</span>
            <span className="kpi-unit">km</span>
          </div>
          <div className="kpi-foot">
            <span>Haversine terdekat</span>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── Bagian 3: 4-Panel Summary Cards ──────────────────────────────────── */
const MODULE_TABS = ['kualitas', 'korelasi', 'kesehatan', 'jaringan']

function ModuleSummaryCards({ k, t3, t4, networkSummary, completeness, nearest, analytics }) {
  const [activeModule, setActiveModule] = useState('kualitas')

  /* Kualitas Udara stats */
  const valid = k.scoped.filter((s) => Number.isFinite(s.avg_pm25))
  const topStation = [...valid].sort((a, b) => b.avg_pm25 - a.avg_pm25)[0]
  const exceedAnnual = valid.filter((s) => s.avg_pm25 > NAAQS_ANNUAL).length

  /* Korelasi stats */
  const korelasiRows = t3?.korelasi_spearman ?? []
  const top3Korelasi = [...korelasiRows]
    .filter((r) => r.faktor && r.rho != null)
    .sort((a, b) => Math.abs(Number(b.rho)) - Math.abs(Number(a.rho)))
    .slice(0, 3)

  /* Kesehatan / T4 stats */
  const ccf = t4?.ringkasan_ccf ?? []
  const ispaRingkasan = t4?.ringkasan_ispa_periode ?? {}
  const bestLag = ccf.length > 0
    ? ccf.reduce((best, r) => (!best || Math.abs(Number(r.max_ccf ?? 0)) > Math.abs(Number(best.max_ccf ?? 0)) ? r : best), null)
    : null
  const lagValue = bestLag?.lag_at_max_ccf ?? bestLag?.lag ?? null

  /* Jaringan stats */
  const networkKpi = networkSummary?.kpi ?? {}
  const coverageScore = networkKpi.coverage_score ?? networkKpi.completeness_avg ?? null
  const lowestStation = (completeness?.stations ?? [])
    .filter((s) => s.completeness_pct != null)
    .sort((a, b) => Number(a.completeness_pct) - Number(b.completeness_pct))[0]
  const maxDistKm = analytics.nearest.data?.overall?.max_km

  const cards = [
    {
      id: 'kualitas',
      label: 'Kualitas Udara',
      badge: 'Tujuan 1 & 2',
      badgeColor: '#8BBEB2',
      href: '/kualitas-udara',
      icon: Wind,
      iconColor: '#8BBEB2',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#18314F', letterSpacing: '-0.03em' }}>
              {exceedAnnual}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#55706E' }}>stasiun melampaui {NAAQS_ANNUAL} µg/m³</span>
          </div>
          {topStation && (
            <div style={{ padding: '0.55rem 0.75rem', borderRadius: '0.6rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <span style={{ fontSize: '0.72rem', color: '#C2410C', fontWeight: 700 }}>
                Tertinggi: {shortName(topStation)} — {formatNumber(topStation.avg_pm25, 1)} µg/m³
              </span>
            </div>
          )}
          <p style={{ fontSize: '0.74rem', color: '#55706E', lineHeight: 1.5 }}>
            Rata-rata nasional <strong style={{ color: '#18314F' }}>{k.avg != null ? formatNumber(k.avg, 1) : '—'} µg/m³</strong> — {k.avg != null ? formatNumber(k.avg / 5, 1) : '—'}× di atas pedoman WHO.
          </p>
        </div>
      ),
    },
    {
      id: 'korelasi',
      label: 'Korelasi Faktor',
      badge: 'Tujuan 3',
      badgeColor: '#384E77',
      href: '/korelasi',
      icon: GitCompareArrows,
      iconColor: '#384E77',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#55706E', fontWeight: 600, marginBottom: '0.2rem' }}>Top 3 faktor terkorelasi dengan PM2.5:</p>
          {top3Korelasi.length > 0 ? top3Korelasi.map((r, i) => {
            const rho = Number(r.rho ?? 0)
            const pct = Math.min(100, Math.abs(rho) * 100)
            const color = rho > 0 ? '#384E77' : '#8BBEB2'
            return (
              <div key={r.faktor ?? i} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#18314F' }}>{r.faktor_label ?? r.faktor ?? '—'}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{rho > 0 ? '+' : ''}{formatNumber(rho, 2)}</span>
                </div>
                <div style={{ height: '0.35rem', borderRadius: '999px', background: 'rgba(24,49,79,0.07)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 'inherit' }} />
                </div>
              </div>
            )
          }) : (
            <p style={{ fontSize: '0.74rem', color: '#7C9693' }}>Data korelasi sedang dimuat...</p>
          )}
        </div>
      ),
    },
    {
      id: 'kesehatan',
      label: 'PM2.5 & Kesehatan',
      badge: 'Tujuan 4',
      badgeColor: '#FB923C',
      href: '/pm25-kesehatan',
      icon: HeartPulse,
      iconColor: '#FB923C',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.55rem 0.75rem', borderRadius: '0.6rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.18)' }}>
            <Timer size={14} style={{ color: '#FB923C', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <p style={{ fontSize: '0.74rem', fontWeight: 700, color: '#C2410C' }}>
                Efek jeda {lagValue != null ? `${lagValue} hari` : '2–5 hari'}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#55706E', marginTop: '0.15rem' }}>PM2.5 → kasus ISPA & pernapasan</p>
            </div>
          </div>
          {ispaRingkasan.total_balita != null && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '0.6rem', background: 'rgba(24,49,79,0.04)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18314F' }}>{formatNumber(ispaRingkasan.total_balita)}</div>
                <div style={{ fontSize: '0.68rem', color: '#55706E' }}>kasus balita</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '0.6rem', background: 'rgba(24,49,79,0.04)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18314F' }}>{formatNumber(ispaRingkasan.total_lansia)}</div>
                <div style={{ fontSize: '0.68rem', color: '#55706E' }}>kasus lansia</div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'jaringan',
      label: 'Kecukupan Jaringan',
      badge: 'Tujuan 5',
      badgeColor: '#FACC15',
      href: '/kecukupan-stasiun',
      icon: MapPin,
      iconColor: '#FACC15',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {coverageScore != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '0.5rem', borderRadius: '999px', background: 'rgba(24,49,79,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Number(coverageScore))}%`, height: '100%', background: 'linear-gradient(90deg, #FACC15, #22C55E)', borderRadius: 'inherit' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#18314F', minWidth: '3rem' }}>{formatNumber(coverageScore, 1)}%</span>
            </div>
          )}
          {lowestStation && (
            <div style={{ padding: '0.5rem 0.7rem', borderRadius: '0.6rem', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.25)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78350F' }}>
                Terendah: {lowestStation.station_id ?? lowestStation.location_id ?? '—'} · {formatNumber(lowestStation.completeness_pct, 1)}%
              </p>
            </div>
          )}
          {maxDistKm != null && (
            <p style={{ fontSize: '0.74rem', color: '#55706E', lineHeight: 1.5 }}>
              Jarak maks antarstasiun: <strong style={{ color: '#18314F' }}>{formatNumber(maxDistKm, 0)} km</strong>
            </p>
          )}
        </div>
      ),
    },
  ]

  return (
    <Section
      title="Sinkronisasi lintas tujuan analisis"
      description="Ringkasan temuan dari keempat modul analisis. Klik kartu untuk detail lengkap."
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '1rem',
      }}
        className="ov-module-grid"
      >
        {cards.map(({ id, label, badge, badgeColor, href, icon: Icon, iconColor, content }) => (
          <Link key={id} href={href} style={{ textDecoration: 'none' }}>
            <div style={{
              height: '100%',
              padding: '1.1rem',
              borderRadius: '1rem',
              border: '1px solid var(--color-border)',
              background: '#fff',
              boxShadow: 'var(--shadow-card)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              position: 'relative',
              overflow: 'hidden',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(24,49,79,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
            >
              {/* Accent bar top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: iconColor, borderRadius: '1rem 1rem 0 0' }} />
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <span style={{
                    display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '999px',
                    background: `color-mix(in srgb, ${badgeColor} 15%, #fff)`,
                    border: `1px solid ${badgeColor}40`,
                    color: badgeColor === '#FACC15' ? '#78350F' : badgeColor,
                    fontSize: '0.66rem', fontWeight: 700, marginBottom: '0.4rem',
                  }}>{badge}</span>
                  <p style={{ fontSize: '0.84rem', fontWeight: 700, color: '#18314F', margin: 0 }}>{label}</p>
                </div>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '0.6rem', display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${iconColor} 15%, #fff)`, color: iconColor, flexShrink: 0 }}>
                  <Icon size={15} />
                </div>
              </div>
              {/* Content */}
              <div style={{ flex: 1 }}>
                {content}
              </div>
              {/* CTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', fontWeight: 700, color: iconColor === '#FACC15' ? '#78350F' : iconColor }}>
                <span>Lihat detail</span>
                <ArrowRight size={13} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  )
}

/* ─── Bagian 4: Peta + Panel Samping ───────────────────────────────────── */
function MapSection({ scoped, onSelect }) {
  return (
    <Section
      title="Lokasi dan kondisi rata-rata PM2.5"
      description="Warna titik mencerminkan kategori ISPU dari rata-rata PM2.5 seluruh periode. Klik titik untuk detail stasiun."
    >
      <div className="ov-map-layout">
        {/* Peta — kolom kiri */}
        <Card className="ov-map-card">
          <div className="map-frame">
            <StationMap stations={scoped} onSelect={onSelect} height="400px" />
          </div>
          <div className="map-foot" style={{ marginTop: '0.75rem' }}>
            <IspuLegend note="ISPU PM2.5 · Permen LHK No. 14/2020" />
          </div>
        </Card>

          <IspuDonut stations={scoped} />
        </div>
         <StationRanking stations={scoped} />
    </Section>
  )
}

/* ─── Bagian 5: Temuan + Navigasi ──────────────────────────────────────── */
const NAV_LINKS = [
  { question: 'Kapan udara paling buruk?',                 href: '/kualitas-udara',    icon: Wind,            color: '#8BBEB2' },
  { question: 'Apa yang memengaruhi PM2.5?',               href: '/korelasi',          icon: GitCompareArrows, color: '#384E77' },
  { question: 'Bagaimana dampaknya bagi balita & lansia?', href: '/pm25-kesehatan',    icon: HeartPulse,      color: '#FB923C' },
  { question: 'Cukupkah 27 stasiun?',                      href: '/kecukupan-stasiun', icon: MapPin,          color: '#FACC15' },
  { question: 'Apa rekomendasinya?',                       href: '/insight',           icon: Lightbulb,       color: '#E6F9AF' },
]

function FindingsSection({ scoped, avgPm25, summary, analytics }) {
  const { who } = POLLUTANTS.pm25
  const valid = scoped.filter((s) => Number.isFinite(s.avg_pm25))
  const exceed = valid.filter((s) => s.avg_pm25 > NAAQS_ANNUAL).length
  const sorted = [...valid].sort((a, b) => b.avg_pm25 - a.avg_pm25)
  const top = sorted[0]
  const bot = sorted[sorted.length - 1]
  const trafficRho = summary?.factors?.traffic?.rho
  const maxDistKm = analytics.nearest.data?.overall?.max_km

  const findings = [
    {
      icon: Wind, color: '#FB923C', href: '/kualitas-udara', cta: 'Lihat pola waktu & wilayah',
      title: top
        ? `${shortName(top)} mencatat PM2.5 tertinggi (${formatNumber(top.avg_pm25, 1)} µg/m³)`
        : 'Pelajari kondisi kualitas udara per wilayah',
      text: avgPm25 != null
        ? `Rata-rata nasional ${formatNumber(avgPm25, 1)} µg/m³ — ${formatNumber(avgPm25 / who, 1)}× di atas pedoman WHO (${who} µg/m³). Ambang baku mutu tahunan: ${NAAQS_ANNUAL} µg/m³ (PP No. 22/2021).`
        : '—',
    },
    {
      icon: GitCompareArrows, color: '#384E77', href: '/korelasi', cta: 'Telusuri faktor penyebab',
      title: trafficRho != null
        ? `Intensitas lalu lintas berkorelasi ${korelasiLabel(trafficRho)} dengan PM2.5`
        : 'Pelajari faktor yang memengaruhi polutan',
      text: trafficRho != null
        ? `Korelasi kendaraan–PM2.5: r = ${formatNumber(trafficRho, 2)}. Faktor meteorologi dan tipe lokasi juga dianalisis di halaman Korelasi Polutan.`
        : 'Hubungan polutan dengan suhu, kelembapan, angin, dan lalu lintas ada di halaman Korelasi.',
    },
    {
      icon: MapPin, color: '#60A5FA', href: '/kecukupan-stasiun', cta: 'Lihat kecukupan jaringan',
      title: maxDistKm != null
        ? `Jarak antarlokasi terjauh ${formatNumber(maxDistKm, 0)} km — ada wilayah belum terpantau`
        : 'Periksa kecukupan jaringan 27 stasiun',
      text: `Dari ${valid.length} stasiun, ${exceed} melampaui baku mutu tahunan ${NAAQS_ANNUAL} µg/m³.${bot ? ` Stasiun terbersih: ${shortName(bot)} (${formatNumber(bot.avg_pm25, 1)} µg/m³).` : ''}`,
    },
  ]

  return (
    <Section
      title="Temuan utama"
      description="Tiga sinyal paling penting, masing-masing menaut ke analisis lebih dalam."
    >
      <div className="layout-3">
        {findings.map(({ icon: Icon, color, href, cta, title, text }) => (
          <Card key={title} className="insight" style={{ '--ins': color }}>
            <span className="insight-icon" aria-hidden="true"><Icon size={18} /></span>
            <h4>{title}</h4>
            <p>{text}</p>
            <a href={href} className="link-more">
              {cta} <ArrowRight size={14} aria-hidden="true" />
            </a>
          </Card>
        ))}
      </div>

      <div className="overview-nav-grid">
        {NAV_LINKS.map(({ question, href, icon: Icon, color }, i) => (
          <a
            key={href}
            href={href}
            className="overview-nav-card"
            style={{ '--nav-c': color }}
          >
            <span className="overview-nav-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="overview-nav-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={2} />
            </span>
            <span className="overview-nav-text">{question}</span>
            <ArrowRight size={16} className="overview-nav-arrow" aria-hidden="true" />
          </a>
        ))}
      </div>
    </Section>
  )
}

/* ─── Bagian 6: Catatan Metodologi ─────────────────────────────────────── */
function MethodologyNote() {
  return (
    <Card variant="tint" className="overview-method">
      <h4>Catatan metodologi</h4>
      <ul>
        <li>Overview adalah ringkasan. Detail tersedia di setiap halaman analisis.</li>
        <li>Baku mutu: <strong>PP No. 22/2021</strong> (tahunan 15 µg/m³) dan <strong>WHO AQG 2021</strong> (tahunan 5 µg/m³).</li>
        <li>Hanya observasi dengan <code>qc_flag = VALID</code> yang digunakan.</li>
        <li>PM2.5 dalam ppm dan µg/m³ tidak dicampur dan tidak dikonversi.</li>
        <li>Data kesehatan bersifat sintetis dan belum dipisah per stasiun.</li>
      </ul>
    </Card>
  )
}

/* ═══ PAGE ══════════════════════════════════════════════════════════════════ */
export default function OverviewPage() {
  const { data: stations, loading: stationLoading, error: stationError } = useStations()
  const { data: summary } = useOverviewSummary()
  const analytics = useOverviewAnalytics()
  const { data: t4 } = useT4Data()
  const { data: t3 } = useT3Tables()
  const { data: networkSummary } = useMonitoringNetworkSummary()
  const { data: completenessData } = useStationCompleteness()
  const { filters, setDateRange, setStation, setRegion, resetFilters } = useFilter()

  const all = stations ?? EMPTY

  const regions = useMemo(
    () => [...new Set(all.map((s) => s.region_group).filter(Boolean))].sort(),
    [all]
  )

  const scoped = useMemo(() => {
    const stationRows = analytics.monthly.data ?? []
    const rowsByStation = new Map()
    stationRows
      .filter((row) =>
        isMassConcentration(row) &&
        isInPeriod(row.periode_bulan, filters.dateStart, filters.dateEnd)
      )
      .forEach((row) => {
        const rows = rowsByStation.get(row.station_id) ?? []
        rows.push(row)
        rowsByStation.set(row.station_id, rows)
      })

    return (filters.regionGroup
      ? all.filter((s) => s.region_group === filters.regionGroup)
      : all
    ).map((station) => {
      const rows = rowsByStation.get(stationId(station)) ?? []
      const avg = rows.length
        ? rows.reduce((t, r) => t + (Number(r.pm25) || 0), 0) / rows.length
        : station.avg_pm25 ?? null
      return { ...station, avg_pm25: avg }
    })
  }, [all, analytics.monthly.data, filters.dateEnd, filters.dateStart, filters.regionGroup])

  const k = useMemo(() => {
    const valid = scoped.filter((s) => Number.isFinite(s.avg_pm25))
    const avg = valid.length
      ? valid.reduce((t, s) => t + s.avg_pm25, 0) / valid.length
      : null
    return { total: scoped.length, active: scoped.filter((s) => s.status_operasional === 'Active').length, avg, scoped }
  }, [scoped])

  const medianDistance = useMemo(() => {
    const codes = new Set(scoped.map((s) => s.station_code))
    const values = (analytics.nearest.data?.stations ?? [])
      .filter((r) => codes.has(r.station_code))
      .map((r) => Number(r.nearest_distance_km))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
    if (!values.length) return null
    const mid = Math.floor(values.length / 2)
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2
  }, [analytics.nearest.data, scoped])

  const avgCompleteness = useMemo(() => {
    const codes = new Set(scoped.map((s) => s.station_code))
    const values = (analytics.readiness.data?.stations ?? [])
      .filter((r) => codes.has(r.station_code))
      .map((r) => Number(r.completeness_pct))
      .filter(Number.isFinite)
    return values.length ? values.reduce((t, v) => t + v, 0) / values.length : null
  }, [analytics.readiness.data, scoped])

  const health = useMemo(() => summary?.health ?? null, [summary])
  const handleSelect = useCallback((s) => setStation(s.location_id), [setStation])

  return (
    <ModuleLayout
      eyebrow="Gambaran besar"
      title="Overview"
      description="Di mana dan seberapa buruk kondisi udara Indonesia? Ringkasan jaringan 27 stasiun AQMS dan dampak kesehatan."
    >
      <style>{`
        @media (max-width: 1100px) { .ov-module-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
        @media (max-width: 640px)  { .ov-module-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <FilterBar
        filters={filters}
        onDateChange={setDateRange}
        onReset={resetFilters}
        regions={regions}
        onRegionChange={setRegion}
      />

      {stationError && <ErrorState message={stationError} />}
      {stationLoading && <Card><LoadingSpinner /></Card>}

      {!stationLoading && !stationError && (
        <>
          <OverviewHeader
            k={k}
            filters={filters}
            avgCompleteness={avgCompleteness}
            validObs={summary?.total_valid_records ?? null}
          />
          <KpiSection k={k} medianDistance={medianDistance} health={health} />
          <ModuleSummaryCards
            k={k}
            t3={t3}
            t4={t4}
            networkSummary={networkSummary}
            completeness={completenessData}
            nearest={analytics.nearest.data}
            analytics={analytics}
          />
          <MapSection scoped={scoped} onSelect={handleSelect} />
          <FindingsSection scoped={scoped} avgPm25={k.avg} summary={summary} analytics={analytics} />
          <MethodologyNote />
        </>
      )}
    </ModuleLayout>
  )
}
