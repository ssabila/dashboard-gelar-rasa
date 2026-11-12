'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo } from 'react'
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

/* ─── Bagian 2: KPI — satu baris dengan hierarki lebar kolom ───────────── */
/*
 * Referensi desain (gambar hijau):
 *   1 card HERO besar (PM2.5) di kiri → lebar ~2.2×
 *   4 card pendukung di kanan, berjajar dalam 1 baris
 * Semua satu baris, tidak ada baris kedua yang kelihatan "kosong".
 */
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

        {/* Baku mutu — satu-satunya yang punya aksen warna berbeda */}
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

/* ─── Bagian 3: Peta + Panel Samping ───────────────────────────────────── */
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

/* ─── Bagian 5: Catatan Metodologi ─────────────────────────────────────── */
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
          <MapSection scoped={scoped} onSelect={handleSelect} />
          <FindingsSection scoped={scoped} avgPm25={k.avg} summary={summary} analytics={analytics} />
          <MethodologyNote />
        </>
      )}
    </ModuleLayout>
  )
}