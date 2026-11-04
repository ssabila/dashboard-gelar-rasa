'use client'

import dynamic from 'next/dynamic'
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CalendarDays,
  Cpu,
  Heart,
  MapPin,
  RefreshCw,
  RotateCcw,
  Skull,
  Wind,
} from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { MetricCard } from '@/components/ui/MetricCard'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { useStations } from '@/hooks/useAqmsData'
import { useHealthSummary } from '@/hooks/useHealthData'
import { useFilter } from '@/hooks/useFilter'
import { ISPU_CATEGORIES } from '@/lib/constants'
import { formatPm25, formatNumber, getIspuFromPm25 } from '@/lib/formatters'

// Leaflet tidak bisa SSR — dynamic import wajib
const StationMap = dynamic(
  () => import('@/map/StationMap').then((m) => m.StationMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

/* ══════════════════════════════════════════
   Filter component
══════════════════════════════════════════ */
function OverviewFilters({ filters, onDateChange, onReset }) {
  const presets = [
    { label: 'Semua data', start: '2024-01-01', end: '2026-10-14' },
    { label: 'Tahun 2026', start: '2026-01-01', end: '2026-10-14' },
    { label: 'Tahun 2025', start: '2025-01-01', end: '2025-12-31' },
    { label: 'Tahun 2024', start: '2024-01-01', end: '2024-12-31' },
  ]

  const fmtDate = (v) =>
    !v ? 'Pilih tanggal'
    : new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
      })

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-[0.875rem] border px-4 py-3"
      style={{
        background: '#FFFFFF',
        borderColor: 'rgba(24,49,79,0.1)',
        boxShadow: '0 1px 4px rgba(24,49,79,0.06)',
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center rounded-[0.5rem] h-9 w-9 flex-shrink-0"
        style={{ background: 'rgba(56,78,119,0.08)', color: 'var(--color-elevated)' }}
      >
        <CalendarDays size={17} />
      </div>

      {/* Period label */}
      <div className="mr-2">
        <p style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Periode analisis
        </p>
        <strong style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {fmtDate(filters.dateStart)} — {fmtDate(filters.dateEnd)}
        </strong>
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-2 flex-1 min-w-[14rem]">
        <label className="date-field">
          <span>Mulai</span>
          <input
            type="date"
            value={filters.dateStart}
            max={filters.dateEnd}
            onChange={(e) => onDateChange(e.target.value, filters.dateEnd)}
          />
        </label>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem', paddingBottom: '0.4rem', alignSelf: 'flex-end' }}>—</span>
        <label className="date-field">
          <span>Selesai</span>
          <input
            type="date"
            value={filters.dateEnd}
            min={filters.dateStart}
            onChange={(e) => onDateChange(filters.dateStart, e.target.value)}
          />
        </label>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map((p) => {
          const active = filters.dateStart === p.start && filters.dateEnd === p.end
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onDateChange(p.start, p.end)}
              style={{
                fontSize: '0.7rem',
                fontWeight: 500,
                padding: '0.3rem 0.7rem',
                borderRadius: '999px',
                border: `1px solid ${active ? 'var(--color-elevated)' : 'rgba(24,49,79,0.14)'}`,
                background: active ? 'rgba(56,78,119,0.1)' : 'transparent',
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                fontFamily: 'var(--font-body)',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 ml-auto"
        style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--radius-btn)',
          border: '1px solid rgba(24,49,79,0.16)',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        <RotateCcw size={12} />
        Reset
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════
   ISPU Legend
══════════════════════════════════════════ */
function IspuLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
      {ISPU_CATEGORIES.map((cat) => (
        <span
          key={cat.id}
          className="inline-flex items-center gap-1.5"
          style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}
        >
          <span
            style={{
              width: '0.6rem',
              height: '0.6rem',
              borderRadius: '50%',
              background: cat.color,
              display: 'inline-block',
              flexShrink: 0,
              boxShadow: `0 0 5px ${cat.color}60`,
            }}
          />
          {cat.label}
        </span>
      ))}
      <span
        style={{
          fontSize: '0.7rem',
          color: 'var(--color-text-disabled)',
          marginLeft: 'auto',
          fontStyle: 'italic',
        }}
      >
        Kategori berdasarkan ISPU PM2.5 (Permen LHK No. 14/2020)
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════
   Main Page
══════════════════════════════════════════ */
export default function OverviewPage() {
  const { data: stations, loading: stLoading, error: stError } = useStations()
  const { data: health } = useHealthSummary()
  const { filters, setDateRange, setStation, resetFilters } = useFilter()

  // Hitung KPI
  const avgPm25 =
    stations && stations.length
      ? stations.reduce((s, x) => s + (x.avg_pm25 ?? 0), 0) / stations.length
      : null

  const activeCount = stations?.filter((s) => s.status_operasional === 'Active').length ?? null
  const exceedNaaqs = stations?.filter((s) => (s.avg_pm25 ?? 0) > 25).length ?? null
  const ispuCat = avgPm25 != null ? getIspuFromPm25(avgPm25) : null

  // Tanggal hari ini sebagai label
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <ModuleLayout
      title=""
      description=""
    >
      {/* ── Welcome header ── */}
      <div className="flex items-start justify-between gap-4 -mt-2">
        <div>
          <h1
            style={{
              fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Selamat datang kembali 👋
          </h1>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              margin: '0.3rem 0 0',
              maxWidth: 'none',
            }}
          >
            {today} · Memantau kualitas udara dari 27 stasiun AQMS di seluruh Indonesia
          </p>
        </div>

        {/* Refresh hint */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0 mt-1"
          style={{ fontSize: '0.72rem', color: 'var(--color-text-disabled)', fontWeight: 500 }}
        >
          <RefreshCw size={12} />
          <span>Jan 2024 — Okt 2026</span>
        </div>
      </div>

      {/* ── Filter ── */}
      <OverviewFilters
        filters={filters}
        onDateChange={setDateRange}
        onReset={resetFilters}
      />

      {/* ── KPI Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Indikator Utama
          </h2>
          <span
            style={{ fontSize: '0.72rem', color: 'var(--color-text-disabled)', fontWeight: 500 }}
          >
            Periode terpilih
          </span>
        </div>

        {stLoading && <LoadingSpinner />}
        {stError && <ErrorState message={stError} />}
        {!stLoading && !stError && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricCard
              label="Rata-rata PM2.5 Nasional"
              value={avgPm25 != null ? formatNumber(avgPm25, 1) : '—'}
              unit="µg/m³"
              badge={ispuCat}
              accentColor="var(--color-elevated)"
              icon={<Wind size={16} />}
            />
            <MetricCard
              label="Stasiun Aktif"
              value={activeCount}
              unit={`dari ${stations?.length ?? 27}`}
              accentColor="var(--ispu-baik)"
              icon={<Cpu size={16} />}
            />
            <MetricCard
              label="Stasiun Melebihi NAAQS"
              value={exceedNaaqs}
              unit="stasiun"
              accentColor="var(--ispu-tidak-sehat)"
              icon={<AlertTriangle size={16} />}
            />
            <MetricCard
              label="Total Rawat Inap Napas"
              value={health ? formatNumber(health.total_resp) : '—'}
              unit="kasus"
              accentColor="var(--ispu-sedang)"
              icon={<Activity size={16} />}
            />
            <MetricCard
              label="Total Kematian"
              value={health ? formatNumber(health.total_death) : '—'}
              unit="jiwa"
              accentColor="var(--ispu-sangat-tidak)"
              icon={<Skull size={16} />}
            />
            <MetricCard
              label="PM2.5 Tertinggi"
              value={health ? formatPm25(health.max_pm25_station?.avg_pm25) : '—'}
              subtext={health?.max_pm25_station?.kota_kabupaten}
              accentColor="var(--ispu-berbahaya)"
              icon={<MapPin size={16} />}
            />
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2
              style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Sebaran 27 Stasiun AQMS
            </h2>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                margin: '0.15rem 0 0',
                maxWidth: 'none',
              }}
            >
              Klik marker untuk melihat detail stasiun
            </p>
          </div>
        </div>

        <div className="map-panel">
          <StationMap
            stations={stations ?? []}
            onSelect={setStation}
            height="460px"
          />
        </div>

        <div
          className="mt-3 px-1 pb-1"
        >
          <IspuLegend />
        </div>
      </div>

    </ModuleLayout>
  )
}
