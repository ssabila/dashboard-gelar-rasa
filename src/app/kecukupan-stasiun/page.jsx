'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Filter,
  Layers,
  MapPin,
  Radio,
  RotateCcw,
  Ruler,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import {
  useNetworkSummary,
  useStationsGeo,
  useStationDistribution,
  useOperationalReadiness,
  useNearestDistance,
  useNetworkPriority,
  useMethodologyMetadata,
} from '@/hooks/useNetworkAdequacy'
import {
  NearestDistanceChart,
  OperationalReadinessChart,
  PriorityEvaluationTable,
  StationDistributionChart,
} from './NetworkCharts'
import { MethodologyModal } from './MethodologyModal'

// Dynamic import untuk Leaflet map (client-side only)
const NetworkMap = dynamic(
  () => import('./NetworkMap').then((m) => m.NetworkMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full rounded-2xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200">
        <LoadingSpinner label="Memuat peta Leaflet & tile OpenStreetMap..." />
      </div>
    ),
  }
)

export default function KecukupanStasiunPage() {
  // Fetch data kontrak JSON
  const summaryHook = useNetworkSummary()
  const geoHook = useStationsGeo()
  const distHook = useStationDistribution()
  const opsHook = useOperationalReadiness()
  const distNearHook = useNearestDistance()
  const priHook = useNetworkPriority()
  const metaHook = useMethodologyMetadata()

  // State Filter & Interaksi
  const [regionFilter, setRegionFilter] = useState('ALL')
  const [siteTypeFilter, setSiteTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [unitFilter, setUnitFilter] = useState('ALL')
  const [selectedStation, setSelectedStation] = useState(null)
  const [colorMode, setColorMode] = useState('status') // 'status' | 'unit'
  const [showAllLinks, setShowAllLinks] = useState(false)
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false)

  // Status loading dan error
  const allHooks = [
    summaryHook,
    geoHook,
    distHook,
    opsHook,
    distNearHook,
    priHook,
    metaHook,
  ]
  const isLoading = allHooks.some((h) => h.loading)
  const hasError = allHooks.find((h) => h.error)?.error

  // Filter Stasiun untuk Peta dan Analisis
  const rawStations = useMemo(() => {
    return geoHook.data?.features || []
  }, [geoHook.data])

  const filteredStations = useMemo(() => {
    return rawStations.filter((feat) => {
      const p = feat.properties
      if (regionFilter !== 'ALL' && p.region_group !== regionFilter && !p.provinsi?.includes(regionFilter)) {
        return false
      }
      if (siteTypeFilter !== 'ALL' && p.site_type !== siteTypeFilter) {
        return false
      }
      if (statusFilter !== 'ALL' && p.status_operasional !== statusFilter) {
        return false
      }
      if (unitFilter !== 'ALL' && p.pm25_unit !== unitFilter) {
        return false
      }
      return true
    })
  }, [rawStations, regionFilter, siteTypeFilter, statusFilter, unitFilter])

  // Filter Options
  const regionOptions = useMemo(() => {
    const set = new Set()
    rawStations.forEach((f) => {
      if (f.properties.region_group) set.add(f.properties.region_group)
    })
    return Array.from(set).sort()
  }, [rawStations])

  const siteTypeOptions = useMemo(() => {
    const set = new Set()
    rawStations.forEach((f) => {
      if (f.properties.site_type) set.add(f.properties.site_type)
    })
    return Array.from(set).sort()
  }, [rawStations])

  // Handler Reset Filter
  const handleResetFilter = () => {
    setRegionFilter('ALL')
    setSiteTypeFilter('ALL')
    setStatusFilter('ALL')
    setUnitFilter('ALL')
    setSelectedStation(null)
  }

  // Ringkasan KPI
  const kpi = summaryHook.data?.kpi

  if (hasError) {
    return (
      <ModuleLayout
        eyebrow="NETWORK MONITORING ASSESSMENT"
        title="Apakah jaringan pemantauan sudah tersebar secara merata?"
        description="Terjadi kendala saat memuat data evaluasi jaringan pemantauan."
      >
        <div className="py-12">
          <ErrorState message={hasError} onRetry={() => window.location.reload()} />
        </div>
      </ModuleLayout>
    )
  }

  return (
    <ModuleLayout
      eyebrow="NETWORK MONITORING ASSESSMENT"
      title="Apakah jaringan pemantauan sudah tersebar secara merata?"
      description="Meninjau persebaran lokasi AQMS, keterpisahan jarak antarlokasi, dan kesiapan pengamatan untuk menemukan bagian jaringan yang perlu dievaluasi lebih lanjut."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMethodologyOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-600" />
            <span>Lihat Metodologi</span>
          </button>
        </div>
      }
    >
      {/* ── AREA 1: Quick Filter Bar ── */}
      <div className="mb-6 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filter Jaringan:
          </span>

          {/* Filter Region */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-sky-500"
          >
            <option value="ALL">Semua Region ({regionOptions.length})</option>
            {regionOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Filter Site Type */}
          <select
            value={siteTypeFilter}
            onChange={(e) => setSiteTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-sky-500"
          >
            <option value="ALL">Semua Tipe Lokasi</option>
            {siteTypeOptions.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Filter Status Sensor */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-sky-500"
          >
            <option value="ALL">Semua Status Sensor</option>
            <option value="Active">Active (23)</option>
            <option value="Intermittent">Intermittent (3)</option>
            <option value="Defective">Defective (1 - JMB-02)</option>
          </select>

          {/* Filter Unit PM2.5 */}
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-sky-500"
          >
            <option value="ALL">Semua Satuan PM2.5</option>
            <option value="ug/m3">&mu;g/m&sup3; (24 stasiun)</option>
            <option value="ppm">ppm (3 stasiun logger)</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {(regionFilter !== 'ALL' || siteTypeFilter !== 'ALL' || statusFilter !== 'ALL' || unitFilter !== 'ALL' || selectedStation) && (
          <button
            type="button"
            onClick={handleResetFilter}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filter ({filteredStations.length}/27)</span>
          </button>
        )}
      </div>

      {/* ── AREA 2: KPI Grid (Empat Kartu Sesuai PRD Area 2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Lokasi Pemantauan"
          value={kpi?.total_monitoring_locations ?? 27}
          unit="stasiun"
          icon={<MapPin className="w-5 h-5 text-sky-600" />}
          subtext="Titik unik pada dataset tabular panitia"
        />

        <MetricCard
          label="Sensor Aktif"
          value={kpi?.sensor_status?.active ?? 23}
          unit="sensor"
          icon={<Radio className="w-5 h-5 animate-pulse" aria-label="Sensor aktif" />}
          badge={{
            label: `${kpi?.sensor_status?.intermittent ?? 3} Intermittent · ${kpi?.sensor_status?.defective ?? 1} Defective`,
            color: '#B45309',
            bg: '#FEF3C7',
          }}
          subtext="Status operasional aktual instrumen"
          variant="hero"
        />

        <MetricCard
          label="Median Jarak Antarlokasi"
          value={kpi?.nearest_distance_km?.median ?? 186.5}
          unit="km"
          icon={<Ruler className="w-5 h-5 text-amber-600" />}
          subtext="Jarak Haversine ke stasiun terdekat"
        />

        <MetricCard
          label="Kelengkapan Pengamatan"
          value={kpi?.observation_completeness?.overall_completeness_pct ?? 95.9}
          unit="%"
          icon={<Zap className="w-5 h-5 text-indigo-600" />}
          subtext="Rasio valid terhadap 24.432 jam expected"
        />
      </div>

      {/* ── AREA 3: Peta Interaktif Leaflet OSM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        <div className="lg:col-span-7 lg:row-start-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Di mana stasiun AQMS berada?
              </h2>
              <p className="text-xs text-slate-500">
                Setiap titik menunjukkan lokasi pemantauan pada dataset. Klik titik untuk melihat detail.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Menampilkan <strong>{filteredStations.length}</strong> stasiun
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 lg:row-start-2">
          <NetworkMap
            stations={filteredStations}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStation(st)}
            colorMode={colorMode}
            onChangeColorMode={setColorMode}
            showAllLinks={showAllLinks}
            onToggleLinks={setShowAllLinks}
            height="500px"
          />
        </div>

        <div className="lg:col-span-5 lg:row-start-2 flex flex-col">
          {/* Detail Stasiun yang Diklik tetap berada di samping peta */}
          {selectedStation ? (
            <div className="h-[500px] bg-sky-50/70 rounded-2xl border border-sky-200 p-4.5 shadow-xs relative animate-in fade-in">
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                className="absolute top-3.5 right-3.5 text-xs text-slate-500 hover:text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200"
              >
                Tutup Detail
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-sky-700 tracking-wide uppercase">
                  {selectedStation.station_code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedStation.recommendation_status === 'Perlu ditinjau'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {selectedStation.recommendation_status || 'Pantau'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {selectedStation.kota_kabupaten}
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                {selectedStation.provinsi} &middot; {selectedStation.site_type}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2.5 rounded-xl bg-white border border-sky-100">
                  <span className="text-slate-500 block text-[11px]">Status Sensor:</span>
                  <strong className="text-slate-800">{selectedStation.status_operasional}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-sky-100">
                  <span className="text-slate-500 block text-[11px]">Satuan Pengukuran:</span>
                  <strong className="text-slate-800">{selectedStation.pm25_unit || 'ug/m3'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-sky-100">
                  <span className="text-slate-500 block text-[11px]">Jarak ke Tetangga:</span>
                  <strong className="text-slate-800">{selectedStation.nearest_distance_km} km</strong>
                  <span className="text-[10px] text-slate-400 block">ke {selectedStation.nearest_station_code}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-sky-100">
                  <span className="text-slate-500 block text-[11px]">Kelengkapan Data:</span>
                  <strong className={selectedStation.completeness_pct < 75 ? 'text-rose-600' : 'text-emerald-700'}>
                    {selectedStation.completeness_pct != null ? `${selectedStation.completeness_pct}%` : '—'}
                  </strong>
                </div>
              </div>

              {selectedStation.primary_trigger && (
                <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Pemicu Evaluasi:</span>{' '}
                  {selectedStation.primary_trigger}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[500px] bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
              <MapPin className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <span>Pilih salah satu stasiun di peta atau tabel untuk melihat rincian evaluasi mendalam.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── AREA 4: Insight di bawah peta ── */}
      <div className="mb-8">
        {/* 4 Card Temuan Kunci Sesuai Template PRD Section 15 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Insight Evaluasi Jaringan Aktual
          </h3>

          <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p className="text-slate-700 leading-snug">
                  Distribusi stasiun paling terkonsentrasi pada <strong>Jakarta &amp; Kalimantan Tengah</strong>, dengan <strong>3 lokasi</strong> masing-masing dalam dataset.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p className="text-slate-700 leading-snug">
                  Jarak ke stasiun terdekat paling besar tercatat pada <strong>AQMS-MER-01 (Merauke)</strong>, yaitu <strong>1.318,7 km</strong> ke stasiun Sorong.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p className="text-slate-700 leading-snug">
                  Kelengkapan pengamatan terendah ditemukan pada <strong>AQMS-JMB-02 (Muaro Jambi)</strong>, sebesar <strong>0.50%</strong> akibat kerusakan sensor fatal (<code className="text-rose-700">Defective</code>).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <p className="text-slate-700 leading-snug">
                  Sebanyak <strong>24 stasiun</strong> memiliki data PM2.5 satuan &mu;g/m&sup3;, dan <strong>3 stasiun</strong> satuan ppm (Masgar Pesawaran, Medan, Banjarbaru) yang ditampilkan terpisah tanpa konversi.
                </p>
              </div>
          </div>
        </div>
      </div>

      {/* ── AREA 5: Distribusi & Kesiapan Pengamatan (Grid 2 Kolom) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <StationDistributionChart distributionData={distHook.data} />
        <OperationalReadinessChart readinessData={opsHook.data} />
      </div>

      {/* ── AREA 6: Jarak Antarlokasi ── */}
      <div className="mb-8">
        <NearestDistanceChart
          distanceData={distNearHook.data}
          onSelectStation={(st) => setSelectedStation(st)}
        />
      </div>

      {/* ── AREA 7: Prioritas Evaluasi dalam baris tersendiri ── */}
      <div className="mb-8">
        <PriorityEvaluationTable
          priorityData={priHook.data}
          onSelectStation={(st) => setSelectedStation(st)}
        />
      </div>

      {/* ── AREA 8: Modal Metodologi & Batasan Analisis ── */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        metadata={metaHook.data}
      />
    </ModuleLayout>
  )
}
