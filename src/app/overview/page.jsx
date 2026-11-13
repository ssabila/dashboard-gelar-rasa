'use client'

import dynamic from 'next/dynamic'
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
  Wind,
} from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { FilterBar } from '@/components/shared/FilterBar'
import { IspuLegend } from '@/components/shared/IspuLegend'
import { useOverviewAnalytics, useOverviewSummary, useStations } from '@/hooks/useAqmsData'
import { useFilter } from '@/hooks/useFilter'
import { POLLUTANTS } from '@/lib/constants'
import { formatNumber, getIspuFromPm25 } from '@/lib/formatters'
import { IspuDonut, StationRanking, shortName } from './panels'

const StationMap = dynamic(
  () => import('@/map/StationMap').then((m) => m.StationMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

const EMPTY = []
const NAAQS_ANNUAL = 15 // PP No. 22/2021 tahunan

const SUB_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'metodologi', label: 'Metodologi & keterbatasan' },
]

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

/* ─── Subtab pill ──────────────────────────────────────────────────────── */
function SubTabs({ value, onChange }) {
  return (
    <div className="ov-subtabs" role="tablist" aria-label="Bagian overview">
      {SUB_TABS.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`ov-subtab${active ? ' is-active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Bagian 1: Header gelap ───────────────────────────────────────────── */
function OverviewHeader({ k, filters, avgCompleteness, validObs }) {
  const exceedAnnual = k.scoped.filter(
    (s) => Number.isFinite(s.avg_pm25) && s.avg_pm25 > NAAQS_ANNUAL
  ).length
  const avgDisplay = k.avg != null ? formatNumber(k.avg, 1) : '—'

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

/* ─── Kartu KPI kecil ──────────────────────────────────────────────────── */
function KpiCard({ label, icon: Icon, value, unit, note, href, color }) {
  const body = (
    <>
      <div className="kpi-top">
        <p className="kpi-label">{label}</p>
        {Icon && (
          <span
            className="kpi-icon"
            style={color ? { color, background: `color-mix(in srgb, ${color} 16%, #fff)` } : undefined}
            aria-hidden="true"
          >
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="kpi-value-row">
        <span className="kpi-value">{value ?? '—'}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      <div className="kpi-foot">
        <span>{note ?? ''}</span>
      </div>
    </>
  )

  if (href) {
    return (
      <a href={href} className="card kpi ov-kpi-cell ov-kpi-link" style={{ '--gw': color }}>
        {body}
      </a>
    )
  }
  return <div className="card kpi ov-kpi-cell">{body}</div>
}

/* ─── KPI: baris 1 (kondisi umum) dan baris 2 (angka tiap modul) ───────── */
function KpiSection({ k, health, avgCompleteness, topStation, rho, maxDist }) {
  const { who } = POLLUTANTS.pm25
  const valid = k.scoped.filter((s) => Number.isFinite(s.avg_pm25))
  const exceedAnnual = valid.filter((s) => s.avg_pm25 > NAAQS_ANNUAL).length
  const cat = k.avg != null ? getIspuFromPm25(k.avg) : null

  return (
    <div className="ov-kpi-block">
      <div className="ov-kpi-row">
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
              <span
                className="badge"
                style={{
                  fontSize: '0.7rem',
                  color: `color-mix(in srgb, ${cat.color} 55%, #18314F)`,
                  background: cat.bg,
                  border: `1px solid ${cat.color}40`,
                }}
              >
                {cat.label}
              </span>
            )}
            {k.avg != null && <span>{formatNumber(k.avg / who, 1)}× pedoman WHO ({who} µg/m³)</span>}
          </div>
        </div>

        <KpiCard
          label="Di atas baku mutu tahunan"
          icon={AlertTriangle}
          color={exceedAnnual > 0 ? 'var(--ispu-tidak-sehat)' : 'var(--ispu-baik)'}
          value={exceedAnnual}
          unit="stasiun"
          note={`dari ${valid.length} · baku mutu ${NAAQS_ANNUAL} µg/m³/tahun`}
        />
        <KpiCard
          label="Stasiun AQMS"
          icon={Network}
          value={k.total}
          unit="stasiun"
          note={`${k.active} sensor aktif`}
        />
        <KpiCard
          label="Kelengkapan data"
          icon={CheckCircle2}
          value={avgCompleteness != null ? `${formatNumber(avgCompleteness, 1)}%` : '—'}
          note="Rata-rata seluruh stasiun"
        />
      </div>

      <div className="ov-kpi-modules">
        <KpiCard
          label="Kualitas udara"
          icon={Wind}
          color="#FB923C"
          href="/kualitas-udara"
          value={topStation ? formatNumber(topStation.avg_pm25, 1) : '—'}
          unit="µg/m³"
          note={topStation ? `Tertinggi: ${shortName(topStation)}` : 'Stasiun PM2.5 tertinggi'}
        />
        <KpiCard
          label="Faktor PM2.5"
          icon={GitCompareArrows}
          color="#384E77"
          href="/korelasi"
          value={rho != null ? `r ${formatNumber(rho, 2)}` : '—'}
          note="Lalu lintas terhadap PM2.5"
        />
        <KpiCard
          label="PM2.5 & kesehatan"
          icon={HeartPulse}
          color="#EF4444"
          href="/pm25-kesehatan"
          value={health ? formatNumber(health.total_resp) : '—'}
          unit="kasus napas"
          note="Rawat inap seluruh RS rujukan"
        />
        <KpiCard
          label="Kecukupan stasiun"
          icon={MapPin}
          color="#60A5FA"
          href="/kecukupan-stasiun"
          value={maxDist != null ? formatNumber(maxDist, 0) : '—'}
          unit="km"
          note="Jarak antarstasiun terjauh"
        />
      </div>
    </div>
  )
}

/* ─── Peta + panel samping ─────────────────────────────────────────────── */
function MapSection({ scoped, onSelect }) {
  return (
    <Section
      title="Lokasi dan kondisi rata-rata PM2.5"
      description="Warna titik mencerminkan kategori ISPU dari rata-rata PM2.5 seluruh periode. Klik titik untuk detail stasiun."
    >
      <div className="ov-map-layout">
        <Card className="ov-map-card">
          <div className="map-frame">
            <StationMap stations={scoped} onSelect={onSelect} height="400px" />
          </div>
          <div className="map-foot">
            <IspuLegend note="ISPU PM2.5 · Permen LHK No. 14/2020" />
          </div>
        </Card>

        <div className="ov-map-side">
          <IspuDonut stations={scoped} />
        </div>
        <StationRanking stations={scoped} className="ov-rank-full" />
      </div>
    </Section>
  )
}

/* ─── Bagian 4: Temuan + Navigasi ──────────────────────────────────────── */
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

/* ─── Tab Metodologi & keterbatasan (berlaku untuk seluruh halaman) ───── */
function MethodologyPanel() {
  const groups = [
    {
      title: 'Data dan pengolahan',
      items: [
        'Dataset bersifat sintetis dan disediakan panitia Gelar Rasa 2026. Tidak ada data eksternal yang digunakan.',
        'Hanya observasi dengan qc_flag = VALID yang digunakan.',
        'Nilai kosong dipertahankan sebagai null dan tidak diubah menjadi nol.',
        'PM2.5 dalam ppm dan µg/m³ tidak dicampur dan tidak dikonversi.',
      ],
    },
    {
      title: 'Baku mutu dan acuan',
      items: [
        'Baku mutu nasional: PP No. 22/2021, PM2.5 tahunan 15 µg/m³.',
        'Pedoman WHO AQG 2021, PM2.5 tahunan 5 µg/m³, sebagai pembanding kesehatan.',
        'Kategori ISPU mengacu pada Permen LHK No. 14/2020.',
      ],
    },
    {
      title: 'Batasan interpretasi',
      items: [
        'Korelasi menunjukkan keterkaitan, bukan hubungan sebab-akibat.',
        'Data kesehatan belum dipisah per stasiun dan tidak mewakili seluruh populasi.',
        'Jarak antarstasiun menggambarkan kedekatan lokasi pemantauan, bukan bukti area yang tidak terpantau.',
        'Hasil di setiap halaman mencerminkan stasiun yang tersedia, bukan kondisi seluruh wilayah Indonesia.',
      ],
    },
  ]

  return (
    <div className="ov-method-grid">
      {groups.map((g) => (
        <Card key={g.title} variant="tint" className="ov-method-card">
          <h4>{g.title}</h4>
          <ul>
            {g.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

/* ═══ PAGE ══════════════════════════════════════════════════════════════════ */
export default function OverviewPage() {
  const { data: stations, loading: stationLoading, error: stationError } = useStations()
  const { data: summary } = useOverviewSummary()
  const analytics = useOverviewAnalytics()
  const { filters, setDateRange, setStation, setRegion, resetFilters } = useFilter()
  const [subTab, setSubTab] = useState('overview')

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

  const topStation = useMemo(() => {
    const valid = scoped.filter((s) => Number.isFinite(s.avg_pm25))
    return [...valid].sort((a, b) => b.avg_pm25 - a.avg_pm25)[0] ?? null
  }, [scoped])

  const avgCompleteness = useMemo(() => {
    const codes = new Set(scoped.map((s) => s.station_code))
    const values = (analytics.readiness.data?.stations ?? [])
      .filter((r) => codes.has(r.station_code))
      .map((r) => Number(r.completeness_pct))
      .filter(Number.isFinite)
    return values.length ? values.reduce((t, v) => t + v, 0) / values.length : null
  }, [analytics.readiness.data, scoped])

  const health = useMemo(() => summary?.health ?? null, [summary])
  const rho = summary?.factors?.traffic?.rho ?? null
  const maxDist = analytics.nearest.data?.overall?.max_km ?? null

  const handleSelect = useCallback((s) => setStation(s.location_id), [setStation])

  return (
    <ModuleLayout
      eyebrow="Gambaran besar"
      title="Overview"
      description="Di mana dan seberapa buruk kondisi udara Indonesia? Ringkasan jaringan 27 stasiun AQMS dan dampak kesehatan."
    >
      <SubTabs value={subTab} onChange={setSubTab} />

      {subTab === 'overview' && (
        <>
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
              <KpiSection
                k={k}
                health={health}
                avgCompleteness={avgCompleteness}
                topStation={topStation}
                rho={rho}
                maxDist={maxDist}
              />
              <MapSection scoped={scoped} onSelect={handleSelect} />
              <FindingsSection scoped={scoped} avgPm25={k.avg} summary={summary} analytics={analytics} />
            </>
          )}
        </>
      )}

      {subTab === 'metodologi' && <MethodologyPanel />}
    </ModuleLayout>
  )
}