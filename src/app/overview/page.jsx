'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo } from 'react'
import { Activity, AlertTriangle, CalendarRange, Cpu, MapPin, Skull, Wind } from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { FilterBar } from '@/components/shared/FilterBar'
import { IspuLegend } from '@/components/shared/IspuLegend'
import { useStations } from '@/hooks/useAqmsData'
import { useHealthSummary } from '@/hooks/useHealthData'
import { useFilter } from '@/hooks/useFilter'
import { POLLUTANTS } from '@/lib/constants'
import { formatNumber, getIspuFromPm25 } from '@/lib/formatters'
import { IspuDonut, KeyInsights, StationRanking, shortName } from './panels'

// Leaflet tidak bisa SSR — dynamic import wajib
const StationMap = dynamic(
  () => import('@/map/StationMap').then((m) => m.StationMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

const EMPTY = []

export default function OverviewPage() {
  const { data: stations, loading, error } = useStations()
  const { data: health } = useHealthSummary()
  const { filters, setDateRange, setStation, setRegion, resetFilters } = useFilter()
  const { who, naaqs } = POLLUTANTS.pm25

  const all = stations ?? EMPTY
  const regions = useMemo(
    () => [...new Set(all.map((s) => s.region_group).filter(Boolean))].sort(),
    [all]
  )
  const scoped = useMemo(
    () => (filters.regionGroup ? all.filter((s) => s.region_group === filters.regionGroup) : all),
    [all, filters.regionGroup]
  )

  const k = useMemo(() => {
    const valid = scoped.filter((s) => Number.isFinite(s.avg_pm25))
    const avg = valid.length ? valid.reduce((s, x) => s + x.avg_pm25, 0) / valid.length : null
    const exceed = valid.filter((s) => s.avg_pm25 > naaqs).length
    const top = valid.reduce((m, s) => (!m || s.avg_pm25 > m.avg_pm25 ? s : m), null)
    return {
      n: scoped.length,
      avg,
      active: scoped.filter((s) => s.status_operasional === 'Active').length,
      exceed,
      exceedPct: valid.length ? (exceed / valid.length) * 100 : 0,
      top,
    }
  }, [scoped, naaqs])

  const handleSelect = useCallback((s) => setStation(s.location_id), [setStation])

  return (
    <ModuleLayout
      eyebrow="Gambaran besar"
      actions={<span className="coverage-chip"><CalendarRange size={13} aria-hidden="true" />Data Jan 2024 – Okt 2026</span>}
      title="Overview"
      description="Di mana dan seberapa buruk kondisi udara Indonesia? Ringkasan jaringan stasiun AQMS dan snapshot dampak kesehatannya."
    >
      <FilterBar
        filters={filters}
        onDateChange={setDateRange}
        onReset={resetFilters}
        regions={regions}
        onRegionChange={setRegion}
      />

      {error && <ErrorState message={error} />}
      {loading && <Card><LoadingSpinner /></Card>}

      {!loading && !error && (
        <>
          {/* ── Baris 1: KPI kecil ── */}
          <div className="kpi-grid">
            <MetricCard
              variant="hero"
              label="Rata-rata PM2.5 nasional"
              value={k.avg != null ? formatNumber(k.avg, 1) : '—'}
              unit="µg/m³"
              badge={k.avg != null ? getIspuFromPm25(k.avg) : null}
              subtext={k.avg != null ? `${formatNumber(k.avg / who, 1)}× pedoman WHO` : null}
              icon={<Wind size={18} />}
            />
            <MetricCard
              label="Stasiun aktif"
              value={k.active}
              unit={`dari ${k.n}`}
              subtext={k.n - k.active > 0 ? `${k.n - k.active} tidak aktif` : 'Semua beroperasi'}
              accentColor="var(--ispu-baik)"
              icon={<Cpu size={18} />}
            />
            <MetricCard
              label="Melebihi baku mutu NAAQS"
              value={k.exceed}
              unit="stasiun"
              subtext={`${formatNumber(k.exceedPct, 0)}% dari jaringan · > ${naaqs} µg/m³`}
              accentColor="var(--ispu-tidak-sehat)"
              icon={<AlertTriangle size={18} />}
            />
            <MetricCard
              label="Rawat inap pernapasan"
              value={health ? formatNumber(health.total_resp) : '—'}
              unit="kasus"
              subtext="Seluruh RS rujukan"
              accentColor="#B58900"
              icon={<Activity size={18} />}
            />
            <MetricCard
              label="Total kematian"
              value={health ? formatNumber(health.total_death) : '—'}
              unit="jiwa"
              subtext="Seluruh RS rujukan"
              accentColor="var(--ispu-sangat-tidak)"
              icon={<Skull size={18} />}
            />
            <MetricCard
              label="PM2.5 stasiun tertinggi"
              value={k.top ? formatNumber(k.top.avg_pm25, 1) : '—'}
              unit="µg/m³"
              subtext={k.top ? shortName(k.top) : null}
              accentColor="var(--ispu-berbahaya)"
              icon={<MapPin size={18} />}
            />
          </div>

          {/* ── Baris 2: peta + panel samping ── */}
          <div className="layout-main">
            <Card>
              <CardHeader
                title={`Sebaran ${k.n} stasiun AQMS`}
                subtitle="Warna titik = kategori ISPU dari rata-rata PM2.5. Klik titik untuk detail stasiun."
                action={<span className="count-pill">{filters.regionGroup ?? 'Seluruh Indonesia'}</span>}
              />
              <div className="map-frame">
                <StationMap stations={scoped} onSelect={handleSelect} height="500px" />
              </div>
              <div className="map-foot">
                <IspuLegend note="ISPU PM2.5 · Permen LHK No. 14/2020" />
              </div>
            </Card>

            <div className="layout-side">
              <StationRanking stations={scoped} />
              <IspuDonut stations={scoped} />
            </div>
          </div>

          {/* ── Baris 3: temuan singkat ── */}
          <Section title="Temuan singkat" description="Cuplikan dari data yang sedang ditampilkan. Buka halaman terkait untuk analisis lengkap.">
            <KeyInsights stations={scoped} avgPm25={k.avg} />
          </Section>
        </>
      )}
    </ModuleLayout>
  )
}
