'use client'

import dynamic from 'next/dynamic'
import { CalendarDays, RotateCcw } from 'lucide-react'
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

function OverviewFilters({ filters, onDateChange, onReset }) {
  const presets = [
    { label: 'Semua data', start: '2024-01-01', end: '2026-10-14' },
    { label: 'Tahun 2026', start: '2026-01-01', end: '2026-10-14' },
    { label: 'Tahun 2025', start: '2025-01-01', end: '2025-12-31' },
  ]

  const formatDate = (value) => {
    if (!value) return 'Pilih tanggal'
    return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="date-filter surface-raised rounded-card border">
      <button type="button" onClick={onReset} className="date-filter-reset">
        <RotateCcw size={14} aria-hidden="true" />
        Reset
      </button>
      <div className="date-filter-heading">
        <div className="date-filter-title">
          <span className="date-filter-icon" aria-hidden="true"><CalendarDays size={16} /></span>
          <div>
            <p>Periode analisis</p>
            <strong>{formatDate(filters.dateStart)} - {formatDate(filters.dateEnd)}</strong>
          </div>
        </div>
      </div>

      <div className="date-filter-body">
        <label className="date-field">
          <span>Mulai</span>
          <input
            type="date"
            value={filters.dateStart}
            max={filters.dateEnd}
            onChange={(event) => onDateChange(event.target.value, filters.dateEnd)}
          />
        </label>
        <span className="date-range-arrow" aria-hidden="true">to</span>
        <label className="date-field">
          <span>Selesai</span>
          <input
            type="date"
            value={filters.dateEnd}
            min={filters.dateStart}
            onChange={(event) => onDateChange(filters.dateStart, event.target.value)}
          />
        </label>
      </div>

      <div className="date-presets" aria-label="Preset periode">
        <span>Rentang cepat</span>
        <div className="date-preset-list">
          {presets.map((preset) => {
            const active = filters.dateStart === preset.start && filters.dateEnd === preset.end
            return (
              <button
                key={preset.label}
                type="button"
                className={`date-preset${active ? ' is-active' : ''}`}
                onClick={() => onDateChange(preset.start, preset.end)}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function OverviewIspuLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Legenda kategori ISPU">
      {ISPU_CATEGORIES.map((category) => (
        <span key={category.id} className="inline-flex items-center gap-2 text-xs text-secondary">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
          {category.label}
        </span>
      ))}
    </div>
  )
}

export default function OverviewPage() {
  const { data: stations, loading: stLoading, error: stError } = useStations()
  const { data: health } = useHealthSummary()
  const { filters, setDateRange, setStation, resetFilters } = useFilter()

  // Hitung KPI dari data stasiun
  const avgPm25 = stations
    ? stations.reduce((s, x) => s + (x.avg_pm25 ?? 0), 0) / stations.length
    : null

  const activeCount = stations?.filter((s) => s.status_operasional === 'Active').length ?? null
  const exceedNaaqs = stations?.filter((s) => (s.avg_pm25 ?? 0) > 25).length ?? null
  const ispuCat = avgPm25 != null ? getIspuFromPm25(avgPm25) : null

  return (
    <ModuleLayout
      title="Overview"
      description="Ringkasan kondisi kualitas udara nasional dan snapshot dampak kesehatan."
    >

      {/* Filter */}
      <OverviewFilters
        filters={filters}
        onDateChange={setDateRange}
        onReset={resetFilters}
      />

      {/* KPI Cards */}
      <Section title="Indikator Utama">
        {stLoading && <LoadingSpinner />}
        {stError && <ErrorState message={stError} />}
        {!stLoading && !stError && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricCard
              label="Rata-rata PM2.5 Nasional"
              value={avgPm25 != null ? formatNumber(avgPm25, 1) : '—'}
              unit="µg/m³"
              badge={ispuCat}
              accentColor="var(--color-accent)"
            />
            <MetricCard
              label="Stasiun Aktif"
              value={activeCount}
              unit={`dari ${stations?.length ?? 27}`}
              accentColor="var(--ispu-baik)"
            />
            <MetricCard
              label="Stasiun Melebihi NAAQS"
              value={exceedNaaqs}
              unit="stasiun"
              accent
              accentColor="var(--ispu-tidak-sehat)"
            />
            <MetricCard
              label="Total Rawat Inap Napas"
              value={health ? formatNumber(health.total_resp) : '—'}
              unit="kasus"
              accentColor="var(--ispu-sedang)"
            />
            <MetricCard
              label="Total Kematian"
              value={health ? formatNumber(health.total_death) : '—'}
              unit="jiwa"
              accentColor="var(--ispu-sangat-tidak-sehat)"
            />
            <MetricCard
              label="PM2.5 Tertinggi"
              value={health ? formatPm25(health.max_pm25_station?.avg_pm25) : '—'}
              subtext={health?.max_pm25_station?.kota_kabupaten}
              accentColor="var(--color-muted)"
            />
          </div>
        )}
      </Section>

      {/* Peta */}
      <Section title="Sebaran 27 Stasiun AQMS">
        <div
          className="rounded-card border overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <StationMap stations={stations ?? []} onSelect={setStation} />
        </div>
        <OverviewIspuLegend />
      </Section>

    </ModuleLayout>
  )
}
