'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Database,
  Gauge,
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
import { IspuDonut, KeyInsights, StationRanking, shortName } from './panels'

const StationMap = dynamic(
  () => import('@/map/StationMap').then((m) => m.StationMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

const EMPTY = []

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

function BarList({ rows, labelKey, valueKey, digits = 1, color = 'var(--color-elevated)', suffix = '' }) {
  const valid = rows.filter((row) => Number.isFinite(Number(row[valueKey])))
  const max = Math.max(...valid.map((row) => Number(row[valueKey])), 1)

  if (!valid.length) return <p className="empty">Belum ada data untuk ditampilkan.</p>
  return (
    <div className="overview-bar-list">
      {valid.map((row) => (
        <div className="overview-bar-row" key={String(row[labelKey])}>
          <span className="overview-bar-label" title={row[labelKey]}>{row[labelKey]}</span>
          <span className="overview-bar-track">
            <span className="overview-bar-fill" style={{ width: `${Math.max(2, (Number(row[valueKey]) / max) * 100)}%`, background: color }} />
          </span>
          <strong className="overview-bar-value">{formatNumber(row[valueKey], digits)}{suffix}</strong>
        </div>
      ))}
    </div>
  )
}

function AirQualityOverview({ analytics, filters, stationIds }) {
  const [tab, setTab] = useState('regional')
  const periodRows = useMemo(
    () => (analytics.monthly.data ?? []).filter((row) =>
      isMassConcentration(row)
      && isInPeriod(row.periode_bulan, filters.dateStart, filters.dateEnd)
      && stationIds.has(row.station_id)
    ),
    [analytics.monthly.data, filters.dateEnd, filters.dateStart, stationIds]
  )
  const regional = useMemo(() => {
    const grouped = new Map()
    periodRows.forEach((row) => {
      const current = grouped.get(row.pulau) ?? { pulau: row.pulau, total: 0, count: 0 }
      current.total += Number(row.pm25) || 0
      current.count += 1
      grouped.set(row.pulau, current)
    })
    return [...grouped.values()]
      .map((row) => ({ ...row, pm25: row.count ? row.total / row.count : null }))
      .sort((a, b) => b.pm25 - a.pm25)
  }, [periodRows])

  const annual = useMemo(() => {
    const grouped = new Map()
    periodRows.forEach((row) => {
      const tahun = Number(String(row.periode_bulan).slice(0, 4))
      const current = grouped.get(tahun) ?? { tahun, total: 0, count: 0 }
      current.total += Number(row.pm25) || 0
      current.count += 1
      grouped.set(tahun, current)
    })
    return [...grouped.values()]
      .map((row) => ({ ...row, pm25: row.count ? row.total / row.count : null }))
      .sort((a, b) => a.tahun - b.tahun)
  }, [periodRows])

  const seasonal = (analytics.seasonal.data ?? []).filter(isMassConcentration)
  const workday = (analytics.workday.data ?? []).filter(isMassConcentration)
  const tabs = [
    ['regional', 'Regional'],
    ['annual', 'Tren tahunan'],
    ['seasonal', 'Musiman'],
    ['workday', 'Hari kerja'],
  ]

  return (
    <Section
      title="Gambaran kualitas udara"
      description="Pola kualitas udara berdasarkan wilayah, waktu, dan musim. Detail tren harian dan ISPU tersedia di tab Kualitas Udara."
    >
      <Card className="overview-tabs-card">
        <div className="overview-tabs" role="tablist" aria-label="Ringkasan kualitas udara">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'is-active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'regional' && (
          <div className="overview-tab-grid">
            <div>
              <h4 className="overview-mini-title">Rata-rata PM2.5 per pulau (µg/m³)</h4>
              <BarList rows={regional} labelKey="pulau" valueKey="pm25" color="var(--ispu-tidak-sehat)" />
              <p className="overview-note">Dihitung ulang dari bulan yang dipilih; jumlah stasiun dan satuan observasi dapat berbeda antarwilayah.</p>
            </div>
            <div>
              <h4 className="overview-mini-title">Parameter yang terpantau</h4>
              <div className="overview-chip-list">
                {['PM2.5', 'PM10', 'SO₂', 'CO', 'O₃', 'NO₂', 'Suhu', 'Kelembapan', 'Angin'].map((item) => (
                  <span key={item} className="overview-data-chip">{item}</span>
                ))}
              </div>
              <p className="overview-note">PM2.5 dalam µg/m³ dan ppm diproses terpisah tanpa konversi.</p>
            </div>
          </div>
        )}
        {tab === 'annual' && (
          <div className="overview-tab-grid">
            <div>
              <h4 className="overview-mini-title">Rata-rata PM2.5 per tahun (µg/m³)</h4>
              <BarList rows={annual} labelKey="tahun" valueKey="pm25" color="var(--color-elevated)" />
            </div>
            <div className="overview-callout">
              <Gauge size={20} />
              <div>
                <strong>Gunakan tren sebagai konteks</strong>
                <p>Perubahan tahunan membantu membaca arah umum, bukan menggantikan analisis episode pencemaran.</p>
              </div>
            </div>
          </div>
        )}
        {tab === 'seasonal' && (
          <div>
            <h4 className="overview-mini-title">Rata-rata PM2.5 per musim (µg/m³)</h4>
            <BarList rows={seasonal} labelKey="musim" valueKey="pm25" color="var(--ispu-sedang)" />
            <p className="overview-note">Definisi musim mengikuti preprocessing data.</p>
          </div>
        )}
        {tab === 'workday' && (
          <div>
            <h4 className="overview-mini-title">Rata-rata PM2.5 berdasarkan tipe hari (µg/m³)</h4>
            <BarList rows={workday} labelKey="tipe_hari" valueKey="pm25" color="var(--color-muted)" />
            <p className="overview-note">Perbedaan antar tipe hari tidak langsung menyimpulkan hubungan kausal.</p>
          </div>
        )}
      </Card>
    </Section>
  )
}

function NetworkOverview({ analytics, stations }) {
  const activeCount = stations.filter((station) => station.status_operasional === 'Active').length
  const distribution = useMemo(() => {
    const counts = new Map()
    stations.forEach((station) => {
      const key = station.region_group ?? 'Tidak diketahui'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return [...counts].map(([category, count]) => ({ category, count }))
  }, [stations])
  const readiness = analytics.readiness.data?.stations ?? []
  const stationCodes = useMemo(() => new Set(stations.map((station) => station.station_code)), [stations])
  const nearest = useMemo(
    () => (analytics.nearest.data?.stations ?? []).filter((row) => stationCodes.has(row.station_code)),
    [analytics.nearest.data, stationCodes]
  )
  const furthest = nearest.slice().sort((a, b) => b.nearest_distance_km - a.nearest_distance_km)[0]
  const medianDistance = useMemo(() => {
    const values = nearest.map((row) => Number(row.nearest_distance_km)).filter(Number.isFinite).sort((a, b) => a - b)
    if (!values.length) return null
    const middle = Math.floor(values.length / 2)
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
  }, [nearest])
  const completeness = readiness
    .filter((row) => stationCodes.has(row.station_code))
    .map((row) => ({ ...row, completeness: Number(row.completeness_pct ?? row.completeness_mean_pct) }))
    .filter((row) => Number.isFinite(row.completeness))
    .sort((a, b) => a.completeness - b.completeness)
    .slice(0, 5)
  const regionRows = distribution
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const furthestRows = nearest
    .slice()
    .sort((a, b) => b.nearest_distance_km - a.nearest_distance_km)
    .slice(0, 5)

  return (
    <Section
      title="Informasi jaringan stasiun"
      description="Distribusi, kelengkapan data, jarak antarlokasi, dan indikasi kesenjangan pemantauan."
    >
      <div className="overview-network-grid">
        <Card>
          <CardHeader title="Distribusi stasiun per wilayah" subtitle="Jumlah lokasi unik berdasarkan region dalam dataset." />
          <BarList rows={regionRows} labelKey="category" valueKey="count" digits={0} color="var(--color-elevated)" suffix="" />
          <p className="overview-note">Subset {stations.length} stasiun sesuai wilayah yang dipilih.</p>
        </Card>
        <Card>
          <CardHeader title="Kelengkapan observasi terendah" subtitle="Rasio data valid terhadap ekspektasi nominal." />
          <div className="overview-completeness-list">
            {completeness.map((row) => (
              <div className="overview-completeness-row" key={row.station_code ?? row.location_id}>
                <span>{(row.station_code ?? row.location_id).replace('AQMS-', '')}</span>
                <span className="overview-completeness-track">
                  <span style={{ width: `${Math.min(100, Math.max(0, row.completeness))}%` }} />
                </span>
                <strong>{formatNumber(row.completeness, 1)}%</strong>
              </div>
            ))}
          </div>
          <p className="overview-note">Stasiun dengan kelengkapan rendah perlu dibaca bersama status operasionalnya.</p>
        </Card>
        <Card>
          <CardHeader title="Jarak ke stasiun terdekat" subtitle="Lima keterpisahan lokasi terbesar (km)." />
          <BarList rows={furthestRows} labelKey="station_code" valueKey="nearest_distance_km" color="var(--ispu-tidak-sehat)" digits={0} />
          {furthest && <p className="overview-note">Terjauh: {furthest.station_code} ({formatNumber(furthest.nearest_distance_km, 0)} km).</p>}
        </Card>
        <Card>
          <CardHeader title="Sinyal kesiapan jaringan" subtitle="Ringkasan operasional yang perlu dipantau." />
          <div className="overview-network-callouts">
            <div><CheckCircle2 size={17} /><span><strong>{activeCount}</strong> sensor aktif</span></div>
            <div><AlertTriangle size={17} /><span><strong>{stations.length - activeCount}</strong> sensor tidak aktif</span></div>
            <div><Ruler size={17} /><span>Median jarak terdekat <strong>{formatNumber(medianDistance, 1)} km</strong></span></div>
          </div>
          <p className="overview-note">Buka Kecukupan Stasiun untuk rekomendasi dan metodologi lengkap.</p>
        </Card>
      </div>
    </Section>
  )
}

export default function OverviewPage() {
  const { data: stations, loading: stationLoading, error: stationError } = useStations()
  const { data: summary } = useOverviewSummary()
  const analytics = useOverviewAnalytics()
  const { filters, setDateRange, setStation, setRegion, resetFilters } = useFilter()
  const { who, naaqs } = POLLUTANTS.pm25

  const all = stations ?? EMPTY
  const regions = useMemo(
    () => [...new Set(all.map((station) => station.region_group).filter(Boolean))].sort(),
    [all]
  )
  const scoped = useMemo(
    () => {
      const stationRows = analytics.monthly.data ?? []
      const rowsByStation = new Map()
      stationRows
        .filter((row) => isMassConcentration(row) && isInPeriod(row.periode_bulan, filters.dateStart, filters.dateEnd))
        .forEach((row) => {
          const rows = rowsByStation.get(row.station_id) ?? []
          rows.push(row)
          rowsByStation.set(row.station_id, rows)
        })

      return (filters.regionGroup ? all.filter((station) => station.region_group === filters.regionGroup) : all)
        .map((station) => {
          const rows = rowsByStation.get(stationId(station)) ?? []
          const avg = rows.length
            ? rows.reduce((total, row) => total + (Number(row.pm25) || 0), 0) / rows.length
            : null
          return { ...station, avg_pm25: avg }
        })
    },
    [all, analytics.monthly.data, filters.dateEnd, filters.dateStart, filters.regionGroup]
  )
  const k = useMemo(() => {
    const valid = scoped.filter((station) => Number.isFinite(station.avg_pm25))
    const avg = valid.length ? valid.reduce((total, station) => total + station.avg_pm25, 0) / valid.length : null
    const top = valid.reduce((current, station) => (!current || station.avg_pm25 > current.avg_pm25 ? station : current), null)
    return {
      total: scoped.length,
      active: scoped.filter((station) => station.status_operasional === 'Active').length,
      avg,
      exceed: valid.filter((station) => station.avg_pm25 > naaqs).length,
      top,
    }
  }, [naaqs, scoped])
  const healthRows = useMemo(() => {
    const bridge = new Map(
      (analytics.healthBridge.data ?? [])
        .filter((row) => !filters.regionGroup || all.find((station) => station.station_code === row.station_code)?.region_group === filters.regionGroup)
        .map((row) => [row.hospital_id, row])
    )
    return (analytics.healthDaily.data ?? []).filter((row) =>
      row.date >= filters.dateStart
      && row.date <= filters.dateEnd
      && bridge.has(row.hospital_id)
    )
  }, [all, analytics.healthBridge.data, analytics.healthDaily.data, filters.dateEnd, filters.dateStart, filters.regionGroup])
  const filteredHealth = useMemo(
    () => ({
      total_resp: healthRows.reduce((total, row) => total + (Number(row.resp) || 0), 0),
      total_death: healthRows.reduce((total, row) => total + (Number(row.death) || 0), 0),
    }),
    [healthRows]
  )
  const filteredMedianDistance = useMemo(() => {
    const codes = new Set(scoped.map((station) => station.station_code))
    const values = (analytics.nearest.data?.stations ?? [])
      .filter((row) => codes.has(row.station_code))
      .map((row) => Number(row.nearest_distance_km))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
    if (!values.length) return null
    const middle = Math.floor(values.length / 2)
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
  }, [analytics.nearest.data, scoped])
  const filteredCompleteness = useMemo(() => {
    const codes = new Set(scoped.map((station) => station.station_code))
    const values = (analytics.readiness.data?.stations ?? [])
      .filter((row) => codes.has(row.station_code))
      .map((row) => Number(row.completeness_pct))
      .filter(Number.isFinite)
    return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null
  }, [analytics.readiness.data, scoped])
  const handleSelect = useCallback((station) => setStation(station.location_id), [setStation])

  return (
    <ModuleLayout
      eyebrow="Gambaran besar"
      actions={<span className="coverage-chip"><CalendarRange size={13} aria-hidden="true" />Data Jan 2024 – Okt 2026</span>}
      title="Overview"
      description="Di mana dan seberapa buruk kondisi udara Indonesia? Ringkasan jaringan 27 stasiun AQMS dan snapshot dampak kesehatan."
    >
      <FilterBar filters={filters} onDateChange={setDateRange} onReset={resetFilters} regions={regions} onRegionChange={setRegion} />

      {stationError && <ErrorState message={stationError} />}
      {stationLoading && <Card><LoadingSpinner /></Card>}

      {!stationLoading && !stationError && (
        <>
          <Section title="Indikator nasional">
            <div className="kpi-grid">
              <MetricCard variant="hero" label="Total stasiun AQMS" value={k.total} unit="stasiun" subtext={`${k.total} sensor terdaftar`} icon={<Network size={18} />} />
              <MetricCard label="Sensor beroperasi" value={k.active} unit="aktif" subtext={`${k.total - k.active} tidak aktif`} accentColor="var(--ispu-baik)" icon={<CheckCircle2 size={18} />} />
              <MetricCard label="Rata-rata PM2.5" value={k.avg != null ? formatNumber(k.avg, 1) : '—'} unit="µg/m³" badge={k.avg != null ? getIspuFromPm25(k.avg) : null} subtext={k.avg != null ? `${formatNumber(k.avg / who, 1)}× pedoman WHO` : null} accentColor="var(--ispu-tidak-sehat)" icon={<Wind size={18} />} />
              <MetricCard label="Kelengkapan data" value={formatNumber(filteredCompleteness, 1)} unit="%" subtext="subset wilayah terpilih" accentColor="var(--color-muted)" icon={<Database size={18} />} />
              <MetricCard label="Median jarak terdekat" value={formatNumber(filteredMedianDistance, 1)} unit="km" subtext="subset wilayah terpilih" accentColor="var(--color-elevated)" icon={<Ruler size={18} />} />
              <MetricCard label="Rawat inap pernapasan" value={formatNumber(filteredHealth.total_resp)} unit="kasus" subtext="sesuai periode & wilayah" accentColor="var(--ispu-tidak-sehat)" icon={<Activity size={18} />} />
            </div>
          </Section>

          <Section title={`Sebaran ${k.total} stasiun AQMS di Indonesia`} description="Warna titik mencerminkan kategori ISPU dari rata-rata PM2.5. Klik titik untuk melihat detail stasiun.">
            <div className="layout-main">
              <Card>
                <CardHeader title="Peta pemantauan" subtitle="Sebaran spasial stasiun AQMS pada periode analisis." action={<span className="count-pill">{filters.regionGroup ?? 'Seluruh Indonesia'}</span>} />
                <div className="map-frame"><StationMap stations={scoped} onSelect={handleSelect} height="500px" /></div>
                <div className="map-foot"><IspuLegend note="ISPU PM2.5 · Permen LHK No. 14/2020" /></div>
              </Card>
              <div className="layout-side">
                <StationRanking stations={scoped} />
                <IspuDonut stations={scoped} />
              </div>
            </div>
          </Section>

          <Section title="Temuan singkat" description="Ringkasan yang mengarahkan pembaca ke tab analisis terkait.">
            <KeyInsights stations={scoped} avgPm25={k.avg} />
          </Section>

          <AirQualityOverview analytics={analytics} filters={filters} stationIds={new Set(scoped.map(stationId))} />
          <NetworkOverview analytics={analytics} stations={scoped} />

          <Section title="Konteks lintas analisis" description="Sinyal utama dari faktor penentu, dampak kesehatan, dan kecukupan jaringan.">
            <div className="overview-pulse-grid">
              <Card className="overview-pulse overview-pulse--factor">
                <div className="overview-pulse-icon"><Wind size={18} /></div>
                <div><span className="overview-pulse-label">Faktor paling membedakan</span><h3>Lalu lintas berkaitan kuat dengan PM2.5</h3><p>Korelasi antarstasiun <strong>r = {formatNumber(summary?.factors?.traffic?.rho, 2)}</strong>; variasi yang dijelaskan sekitar {formatNumber(summary?.factors?.traffic?.variation_pct, 0)}%.</p></div>
              </Card>
              <Card className="overview-pulse overview-pulse--health">
                <div className="overview-pulse-icon"><Activity size={18} /></div>
                <div><span className="overview-pulse-label">Sinyal kesehatan</span><h3>Hubungan PM2.5–ISPA terlihat hingga lag 3 hari</h3><p>Estimasi kenaikan risiko ISPA balita sekitar {formatNumber(summary?.health?.lag_balita?.[3]?.percent, 1)}% pada lag 3.</p></div>
              </Card>
              <Card className="overview-pulse overview-pulse--network">
                <div className="overview-pulse-icon"><MapPin size={18} /></div>
                <div><span className="overview-pulse-label">Kesenjangan pemantauan</span><h3>Jarak antarlokasi masih lebar</h3><p>Jarak terjauh mencapai {formatNumber(analytics.nearest.data?.overall?.max_km, 0)} km; buka tab Kecukupan Stasiun untuk prioritas.</p></div>
              </Card>
            </div>
          </Section>
        </>
      )}
    </ModuleLayout>
  )
}
