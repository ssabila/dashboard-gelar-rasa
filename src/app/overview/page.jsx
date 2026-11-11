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
import { MetricCard } from '@/components/ui/MetricCard'
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

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function isMassConcentration(row) {
  return row && !String(row.satuan ?? row.unit ?? '').toLowerCase().includes('ppm')
}

function isInPeriod(value, start, end) {
  const date = String(value ?? '')
  return date >= start.slice(0, 7) && date <= end.slice(0, 7)
}

function stationId(station) {
  return String(station?.station_code ?? '').replace(/^AQMS-/, '')
}

/** Bentuk label korelasi dari nilai rho */
function korelasiLabel(rho) {
  if (rho == null) return '—'
  if (rho >= 0.5) return 'kuat'
  if (rho >= 0.3) return 'sedang'
  return 'lemah'
}

/* ─── Bagian 1: Kesimpulan Dinamis ─────────────────────────────────────── */

/**
 * Kartu headline di atas: satu kalimat kesimpulan dari data,
 * cakupan data, dan KPI nasional.
 * Ambang baku mutu: PP No. 22/2021 tahunan = 15 µg/m³.
 */
function OverviewHeader({ k, filters, avgCompleteness, validObs }) {
  const { who, naaqs } = POLLUTANTS.pm25
  // PP No. 22/2021 baku mutu TAHUNAN = 15 µg/m³
  const NAAQS_ANNUAL = 15

  const exceedAnnual = k.scoped.filter(
    (s) => Number.isFinite(s.avg_pm25) && s.avg_pm25 > NAAQS_ANNUAL
  ).length

  const avgDisplay = k.avg != null ? formatNumber(k.avg, 1) : '—'
  const whoRatio = k.avg != null ? formatNumber(k.avg / who, 1) : '—'

  return (
    <Card variant="dark">
      {/* Kesimpulan dinamis */}
      <p className="headline">
        {exceedAnnual > 0 ? (
          <>
            Dari {k.total} stasiun,{' '}
            <strong>{exceedAnnual} melampaui baku mutu tahunan PM2.5</strong> ({NAAQS_ANNUAL} µg/m³).{' '}
          </>
        ) : (
          <>Seluruh {k.total} stasiun berada di bawah baku mutu tahunan PM2.5 ({NAAQS_ANNUAL} µg/m³). </>
        )}
        Rata-rata nasional <strong>{avgDisplay} µg/m³</strong> pada periode {filters.dateStart.slice(0, 7).replace('-', '/')} – {filters.dateEnd.slice(0, 7).replace('-', '/')}.
      </p>
      {/* Cakupan data */}
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
            Rata-rata kelengkapan {formatNumber(avgCompleteness, 1)}%
          </span>
        )}
      </div>
    </Card>
  )
}

/* ─── KPI Grid ──────────────────────────────────────────────────────────── */

function KpiGrid({ k, medianDistance, avgCompleteness, health }) {
  const NAAQS_ANNUAL = 15
  const { who } = POLLUTANTS.pm25
  const exceedAnnual = k.scoped.filter(
    (s) => Number.isFinite(s.avg_pm25) && s.avg_pm25 > NAAQS_ANNUAL
  ).length

  return (
    <div className="kpi-grid">
      <MetricCard
        variant="hero"
        label="Stasiun AQMS"
        value={k.total}
        unit="stasiun"
        subtext={`${k.active} sensor aktif`}
        icon={<Network size={18} />}
      />
      <MetricCard
        label="Rata-rata PM2.5"
        value={k.avg != null ? formatNumber(k.avg, 1) : '—'}
        unit="µg/m³"
        badge={k.avg != null ? getIspuFromPm25(k.avg) : null}
        subtext={k.avg != null ? `${formatNumber(k.avg / who, 1)}× pedoman WHO (${who} µg/m³)` : null}
        accentColor="var(--ispu-tidak-sehat)"
        icon={<Wind size={18} />}
      />
      <MetricCard
        label={`Di atas baku mutu tahunan`}
        value={exceedAnnual}
        unit={`dari ${k.scoped.filter((s) => Number.isFinite(s.avg_pm25)).length} stasiun`}
        subtext="PP No. 22/2021 · 15 µg/m³/tahun"
        accentColor={exceedAnnual > 0 ? 'var(--ispu-tidak-sehat)' : 'var(--ispu-baik)'}
        icon={<AlertTriangle size={18} />}
      />
      <MetricCard
        label="Median jarak antarstasiun"
        value={formatNumber(medianDistance, 1)}
        unit="km"
        subtext="jarak Haversine terdekat"
        accentColor="var(--color-elevated)"
        icon={<Ruler size={18} />}
      />
      <MetricCard
        label="Rawat inap pernapasan"
        value={health ? formatNumber(health.total_resp) : '—'}
        unit="kasus"
        subtext="semua RS, belum difilter wilayah"
        accentColor="var(--ispu-sedang)"
        icon={<Activity size={18} />}
      />
      <MetricCard
        label="Kematian tercatat"
        value={health ? formatNumber(health.total_death) : '—'}
        unit="jiwa"
        subtext="data sintetis, periode penuh"
        accentColor="var(--color-muted)"
        icon={<Activity size={18} />}
      />
    </div>
  )
}

/* ─── Bagian 2: Peta dan Peringkat ─────────────────────────────────────── */

function MapSection({ scoped, onSelect }) {
  return (
    <Section
      title={`Lokasi 27 stasiun dan kondisi rata-rata PM2.5`}
      description="Warna titik mencerminkan kategori ISPU dari rata-rata PM2.5 seluruh periode. Klik titik untuk melihat detail stasiun."
    >
      <div className="layout-main">
        <Card>
          <CardHeader
            title="Peta pemantauan"
            subtitle="Sebaran spasial stasiun AQMS. Klik titik untuk melihat PM2.5 rata-rata dan status operasional."
          />
          <div className="map-frame">
            <StationMap stations={scoped} onSelect={onSelect} height="460px" />
          </div>
          <div className="map-foot">
            <IspuLegend note="ISPU PM2.5 · Permen LHK No. 14/2020 · rata-rata seluruh periode" />
          </div>
        </Card>
        <div className="layout-side">
          <StationRanking stations={scoped} />
          <IspuDonut stations={scoped} />
        </div>
      </div>
    </Section>
  )
}

/* ─── Bagian 3: Kartu Temuan + Navigasi ─────────────────────────────────── */

const NAV_LINKS = [
  {
    question: 'Kapan udara paling buruk?',
    href: '/kualitas-udara',
    icon: Wind,
    color: '#8BBEB2',
  },
  {
    question: 'Apa yang memengaruhi PM2.5?',
    href: '/korelasi',
    icon: GitCompareArrows,
    color: '#384E77',
  },
  {
    question: 'Bagaimana dampaknya bagi balita dan lansia?',
    href: '/pm25-kesehatan',
    icon: HeartPulse,
    color: '#FB923C',
  },
  {
    question: 'Cukupkah 27 stasiun?',
    href: '/kecukupan-stasiun',
    icon: MapPin,
    color: '#FACC15',
  },
  {
    question: 'Apa rekomendasinya?',
    href: '/insight',
    icon: Lightbulb,
    color: '#E6F9AF',
  },
]

function FindingsSection({ scoped, avgPm25, summary, analytics }) {
  const { who, naaqs } = POLLUTANTS.pm25
  const NAAQS_ANNUAL = 15

  const valid = scoped.filter((s) => Number.isFinite(s.avg_pm25))
  const exceed = valid.filter((s) => s.avg_pm25 > NAAQS_ANNUAL).length
  const sorted = [...valid].sort((a, b) => b.avg_pm25 - a.avg_pm25)
  const top = sorted[0]
  const bot = sorted[sorted.length - 1]

  const trafficRho = summary?.factors?.traffic?.rho
  const lagPct = summary?.health?.lag_balita?.[3]?.percent
  const maxDistKm = analytics.nearest.data?.overall?.max_km

  const findings = [
    {
      icon: Wind,
      color: '#FB923C',
      href: '/kualitas-udara',
      cta: 'Lihat pola waktu & wilayah',
      title: top
        ? `${shortName(top)} mencatat PM2.5 tertinggi (${formatNumber(top.avg_pm25, 1)} µg/m³)`
        : 'Data stasiun belum tersedia',
      text: avgPm25 != null
        ? `Rata-rata nasional ${formatNumber(avgPm25, 1)} µg/m³ — ${formatNumber(avgPm25 / who, 1)}× di atas pedoman WHO (${who} µg/m³). Ambang baku mutu tahunan nasional: ${NAAQS_ANNUAL} µg/m³ (PP No. 22/2021).`
        : '—',
    },
    {
      icon: GitCompareArrows,
      color: '#384E77',
      href: '/korelasi',
      cta: 'Telusuri faktor penyebab',
      title: trafficRho != null
        ? `Intensitas lalu lintas berkorelasi ${korelasiLabel(trafficRho)} dengan PM2.5`
        : 'Pelajari faktor yang memengaruhi polutan',
      text: trafficRho != null
        ? `Korelasi antara intensitas kendaraan dan PM2.5: r = ${formatNumber(trafficRho, 2)}. Faktor meteorologi dan tipe lokasi juga dianalisis di halaman Korelasi Polutan.`
        : 'Hubungan polutan dengan suhu, kelembapan, angin, dan lalu lintas dianalisis di halaman Korelasi Polutan.',
    },
    {
      icon: MapPin,
      color: '#60A5FA',
      href: '/kecukupan-stasiun',
      cta: 'Lihat kecukupan jaringan',
      title: maxDistKm != null
        ? `Jarak antarlokasi terjauh ${formatNumber(maxDistKm, 0)} km — ada wilayah yang belum terpantau`
        : 'Periksa kecukupan jaringan 27 stasiun',
      text: `Dari ${valid.length} stasiun, ${exceed} melampaui baku mutu tahunan ${NAAQS_ANNUAL} µg/m³. ${bot ? `Stasiun terbersih: ${shortName(bot)} (${formatNumber(bot.avg_pm25, 1)} µg/m³).` : ''}`,
    },
  ]

  return (
    <Section
      title="Temuan utama"
      description="Tiga sinyal paling penting dari data, masing-masing menaut ke analisis lebih dalam."
    >
      {/* Kartu temuan */}
      <div className="layout-3">
        {findings.map(({ icon: Icon, color, href, cta, title, text }) => (
          <Card key={title} className="insight" style={{ '--ins': color }}>
            <span className="insight-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <h4>{title}</h4>
            <p>{text}</p>
            <a href={href} className="link-more">
              {cta} <ArrowRight size={14} aria-hidden="true" />
            </a>
          </Card>
        ))}
      </div>

      {/* Kartu navigasi per pertanyaan */}
      <div className="overview-nav-grid">
        {NAV_LINKS.map(({ question, href, icon: Icon, color }) => (
          <a key={href} href={href} className="overview-nav-card">
            <span className="overview-nav-icon" style={{ '--nav-c': color }} aria-hidden="true">
              <Icon size={15} />
            </span>
            <span>{question}</span>
            <ArrowRight size={14} className="overview-nav-arrow" aria-hidden="true" />
          </a>
        ))}
      </div>
    </Section>
  )
}

/* ─── Bagian 4: Catatan Metodologi ─────────────────────────────────────── */

function MethodologyNote() {
  return (
    <Card variant="tint" className="overview-method">
      <h4>Catatan metodologi</h4>
      <ul>
        <li>Overview adalah ringkasan. Detail tersedia di setiap halaman analisis.</li>
        <li>Baku mutu yang dipakai: <strong>PP No. 22/2021</strong> (rata-rata tahunan 15 µg/m³) dan pedoman <strong>WHO AQG 2021</strong> (rata-rata tahunan 5 µg/m³).</li>
        <li>Hanya observasi dengan <code>qc_flag = VALID</code> yang digunakan.</li>
        <li>PM2.5 dalam ppm dan µg/m³ tidak dicampur dan tidak dikonversi satu sama lain.</li>
        <li>Data kesehatan bersifat sintetis dan belum dipisah per stasiun; angkanya berlaku untuk seluruh jaringan.</li>
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
  const { naaqs } = POLLUTANTS.pm25
  const NAAQS_ANNUAL = 15

  const all = stations ?? EMPTY

  const regions = useMemo(
    () => [...new Set(all.map((s) => s.region_group).filter(Boolean))].sort(),
    [all]
  )

  /* Stasiun + avg_pm25 dalam periode & wilayah terpilih */
  const scoped = useMemo(() => {
    const stationRows = analytics.monthly.data ?? []
    const rowsByStation = new Map()
    stationRows
      .filter(
        (row) =>
          isMassConcentration(row) &&
          isInPeriod(row.periode_bulan, filters.dateStart, filters.dateEnd)
      )
      .forEach((row) => {
        const rows = rowsByStation.get(row.station_id) ?? []
        rows.push(row)
        rowsByStation.set(row.station_id, rows)
      })

    return (
      filters.regionGroup
        ? all.filter((s) => s.region_group === filters.regionGroup)
        : all
    ).map((station) => {
      const rows = rowsByStation.get(stationId(station)) ?? []
      const avg = rows.length
        ? rows.reduce((t, r) => t + (Number(r.pm25) || 0), 0) / rows.length
        : station.avg_pm25 ?? null // fallback ke nilai master
      return { ...station, avg_pm25: avg }
    })
  }, [all, analytics.monthly.data, filters.dateEnd, filters.dateStart, filters.regionGroup])

  /* KPI turunan */
  const k = useMemo(() => {
    const valid = scoped.filter((s) => Number.isFinite(s.avg_pm25))
    const avg = valid.length
      ? valid.reduce((t, s) => t + s.avg_pm25, 0) / valid.length
      : null
    return {
      total: scoped.length,
      active: scoped.filter((s) => s.status_operasional === 'Active').length,
      avg,
      scoped,
    }
  }, [scoped])

  /* Median jarak antarstasiun */
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

  /* Rata-rata kelengkapan */
  const avgCompleteness = useMemo(() => {
    const codes = new Set(scoped.map((s) => s.station_code))
    const values = (analytics.readiness.data?.stations ?? [])
      .filter((r) => codes.has(r.station_code))
      .map((r) => Number(r.completeness_pct))
      .filter(Number.isFinite)
    return values.length
      ? values.reduce((t, v) => t + v, 0) / values.length
      : null
  }, [analytics.readiness.data, scoped])

  /* Health summary dari overview_summary */
  const health = useMemo(() => {
    const s = summary
    if (!s) return null
    return s.health ?? null
  }, [summary])

  const handleSelect = useCallback((s) => setStation(s.location_id), [setStation])

  return (
    <ModuleLayout
      eyebrow="Gambaran besar"
      title="Overview"
      description="Di mana dan seberapa buruk kondisi udara Indonesia? Ringkasan jaringan 27 stasiun AQMS dan dampak kesehatan."
    >
      {/* Filter */}
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
          {/* Bagian 1: Kesimpulan + KPI */}
          <OverviewHeader
            k={k}
            filters={filters}
            avgCompleteness={avgCompleteness}
            validObs={summary?.total_valid_records ?? null}
          />
          <KpiGrid
            k={k}
            medianDistance={medianDistance}
            avgCompleteness={avgCompleteness}
            health={health}
          />

          {/* Bagian 2: Peta + Peringkat */}
          <MapSection scoped={scoped} onSelect={handleSelect} />

          {/* Bagian 3: Temuan + Navigasi */}
          <FindingsSection
            scoped={scoped}
            avgPm25={k.avg}
            summary={summary}
            analytics={analytics}
          />

          {/* Bagian 4: Metodologi */}
          <MethodologyNote />
        </>
      )}
    </ModuleLayout>
  )
}