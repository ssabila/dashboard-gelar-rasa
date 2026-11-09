'use client'

import { useMemo, useState } from 'react'
import { EChart } from '@/components/charts/EChart'
import { AlertTriangle, CheckCircle, Info, Search, ShieldAlert, Sparkles } from 'lucide-react'

const NAVY = '#18314F'
const SKY = '#0284C7'
const AMBER = '#F59E0B'
const RED = '#EF4444'
const EMERALD = '#10B981'

/**
 * 1. Grafik Distribusi Stasiun (ECharts Bar Horizontal)
 */
export function StationDistributionChart({ distributionData }) {
  const [activeTab, setActiveTab] = useState('region') // 'region' | 'provinsi' | 'site_type'

  const currentList = useMemo(() => {
    if (!distributionData) return []
    if (activeTab === 'region') return distributionData.by_region_group || []
    if (activeTab === 'provinsi') return distributionData.by_provinsi || []
    return distributionData.by_site_type || []
  }, [distributionData, activeTab])

  // Urutkan dari nilai terkecil ke terbesar agar bar horizontal teratas adalah yang terbanyak
  const sortedData = useMemo(() => {
    return [...currentList].reverse()
  }, [currentList])

  const chartOption = useMemo(() => {
    const categories = sortedData.map((d) => d.category)
    const counts = sortedData.map((d) => d.count)
    const percentages = sortedData.map((d) => d.percentage)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0]
          const idx = p.dataIndex
          return `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px">
            <strong>${p.name}</strong><br/>
            Jumlah: <strong>${p.value} lokasi</strong><br/>
            Proporsi: <strong>${percentages[idx]}%</strong> dari total jaringan
          </div>`
        },
      },
      grid: { left: '3%', right: '7%', top: '3%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Jumlah Lokasi',
        splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
        axisLabel: { color: '#64748B' },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: {
          color: '#334155',
          fontSize: 11,
          formatter: (val) => (val.length > 22 ? val.slice(0, 20) + '…' : val),
        },
      },
      series: [
        {
          name: 'Jumlah Lokasi',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: '#0284C7',
            borderRadius: [0, 6, 6, 0],
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{c}',
            color: '#475569',
            fontSize: 11,
            fontWeight: 'bold',
          },
        },
      ],
    }
  }, [sortedData])

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Distribusi Jaringan Pemantauan</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Konsentrasi 27 stasiun berdasarkan klasifikasi wilayah & lingkungan
          </p>
        </div>

        {/* Tab Selector */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('region')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'region' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pulau / Region
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('provinsi')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'provinsi' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Provinsi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('site_type')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'site_type' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tipe Lokasi
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <EChart option={chartOption} height={320} />
      </div>

      <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <strong>Catatan PRD:</strong> Jumlah lokasi dihitung dari titik unik (<code className="text-slate-700">location_id</code>). Distribusi ini mencerminkan ketersediaan dalam dataset, bukan penetapan kecukupan cakupan secara definitif.
      </p>
    </div>
  )
}

/**
 * 2. Grafik Kesiapan Operasional & Kelengkapan Pengamatan
 */
export function OperationalReadinessChart({ readinessData }) {
  const stations = useMemo(() => {
    if (!readinessData?.stations) return []
    // Urutkan dari kelengkapan terkecil ke terbesar
    return [...readinessData.stations].sort((a, b) => (a.completeness_pct ?? 0) - (b.completeness_pct ?? 0))
  }, [readinessData])

  const chartOption = useMemo(() => {
    const codes = stations.map((s) => s.station_code)
    const completeness = stations.map((s) => s.completeness_pct ?? 0)
    const colors = stations.map((s) => {
      if (s.status_operasional === 'Defective') return RED
      if (s.status_operasional === 'Intermittent') return AMBER
      if ((s.completeness_pct ?? 0) < 75) return '#F97316'
      return EMERALD
    })

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const idx = params[0].dataIndex
          const st = stations[idx]
          return `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px">
            <strong>${st.station_code}</strong> (${st.kota_kabupaten})<br/>
            Status: <strong>${st.status_operasional}</strong><br/>
            Kelengkapan: <strong>${st.completeness_pct}%</strong><br/>
            Observasi Valid: <strong>${st.valid_records?.toLocaleString('id-ID')} / ${st.expected_records?.toLocaleString('id-ID')} jam</strong>
          </div>`
        },
      },
      grid: { left: '3%', right: '7%', top: '6%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        max: 115,
        name: 'Kelengkapan (%)',
        splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
        axisLabel: { color: '#64748B' },
      },
      yAxis: {
        type: 'category',
        data: codes,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: '#334155', fontSize: 10.5 },
      },
      series: [
        {
          name: 'Kelengkapan Valid',
          type: 'bar',
          data: completeness.map((val, i) => ({
            value: val,
            itemStyle: { color: colors[i], borderRadius: [0, 5, 5, 0] },
          })),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: '#DC2626', width: 1.5 },
            data: [{ xAxis: 75, label: { formatter: 'Threshold 75%', position: 'end', color: '#DC2626', fontSize: 10 } }],
          },
        },
      ],
    }
  }, [stations])

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Kesiapan & Kelengkapan Pengamatan</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Persentase jam pengamatan valid terhadap ekspektasi nominal 24.432 jam
          </p>
        </div>

        {/* Legend Ringkas */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active &ge;75%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Intermittent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Defective
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <EChart option={chartOption} height={320} />
      </div>

      <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <strong>Temuan Kritis:</strong> <code className="text-rose-700 font-semibold">AQMS-JMB-02</code> berstatus Defective dengan kelengkapan hanya 0.50% akibat sensor dead. Stasiun <code className="text-slate-700">AQMS-PLB-01</code> mencatatkan kelengkapan &gt;100% karena adanya periode frekuensi sampling 15-menit.
      </p>
    </div>
  )
}

/**
 * 3. Grafik Jarak Antarlokasi Terdekat (Haversine Distance)
 */
export function NearestDistanceChart({ distanceData, onSelectStation }) {
  const stationList = useMemo(() => {
    if (!distanceData?.stations) return []
    // Urutkan dari jarak terdekat ke terjauh
    return [...distanceData.stations].reverse()
  }, [distanceData])

  const chartOption = useMemo(() => {
    const codes = stationList.map((s) => s.station_code)
    const dists = stationList.map((s) => s.nearest_distance_km)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const idx = params[0].dataIndex
          const st = stationList[idx]
          return `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px">
            <strong>${st.station_code}</strong> (${st.provinsi})<br/>
            Jarak ke Tetangga: <strong>${st.nearest_distance_km} km</strong><br/>
            Stasiun Terdekat: <strong>${st.nearest_station_code}</strong> (${st.nearest_station_city})
          </div>`
        },
      },
      grid: { left: '3%', right: '7%', top: '3%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Jarak Terdekat (km)',
        splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
        axisLabel: { color: '#64748B' },
      },
      yAxis: {
        type: 'category',
        data: codes,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: '#334155', fontSize: 10.5 },
      },
      series: [
        {
          name: 'Jarak Terdekat (km)',
          type: 'bar',
          data: dists.map((d) => ({
            value: d,
            itemStyle: {
              color: d > 1000 ? '#EF4444' : d > 400 ? '#F59E0B' : '#0284C7',
              borderRadius: [0, 5, 5, 0],
            },
          })),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: '#64748B', width: 1.5 },
            data: [{ xAxis: distanceData?.overall?.median_km ?? 186.5, label: { formatter: 'Median 186.5 km', position: 'end', color: '#475569', fontSize: 10 } }],
          },
        },
      ],
    }
  }, [stationList, distanceData])

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Keterpisahan Spasial Antarlokasi</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Jarak lingkaran besar (Haversine) ke stasiun pemantauan terdekat
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500">Median Jaringan:</span>{' '}
          <strong className="text-sm text-slate-800 font-bold">
            {distanceData?.overall?.median_km ?? 186.5} km
          </strong>
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <EChart
          option={chartOption}
          height={320}
          onEvents={{
            click: (params) => {
              const st = stationList[params.dataIndex]
              if (st && onSelectStation) onSelectStation(st)
            },
          }}
        />
      </div>

      <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <strong>Interpretasi PRD:</strong> Jarak terdekat yang sangat besar (&gt;1.000 km pada Merauke dan Sorong) menandakan stasiun tersebut berdiri secara terisolasi, bukan bukti area di antaranya kosong tanpa polusi.
      </p>
    </div>
  )
}

/**
 * 4. Section PM2.5 Terpisah Berdasarkan Satuan (ug/m3 vs ppm vs Kualitas Data)
 */
export function Pm25TimeseriesSection({ timeseriesUg, timeseriesPpm, readinessData }) {
  const [activeTab, setActiveTab] = useState('ug_m3') // 'ug_m3' | 'ppm' | 'qc'

  // Tab 1 Option: ug/m3 24 stasiun
  const ugChartOption = useMemo(() => {
    if (!timeseriesUg?.station_stats) return {}
    const entries = Object.entries(timeseriesUg.station_stats)
    entries.sort((a, b) => (b[1].stats?.mean ?? 0) - (a[1].stats?.mean ?? 0))

    const codes = entries.map(([_, v]) => v.station_code)
    const means = entries.map(([_, v]) => v.stats?.mean ?? null)
    const medians = entries.map(([_, v]) => v.stats?.median ?? null)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const idx = params[0].dataIndex
          const info = entries[idx][1]
          return `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px">
            <strong>${info.station_code}</strong> (${info.kota_kabupaten})<br/>
            Tipe: ${info.site_type}<br/>
            Mean: <strong>${info.stats?.mean} &mu;g/m&sup3;</strong><br/>
            Median: <strong>${info.stats?.median} &mu;g/m&sup3;</strong><br/>
            Baseline: <strong>${info.baseline_pm25 ?? '—'} &mu;g/m&sup3;</strong>
          </div>`
        },
      },
      legend: { data: ['Rata-rata Terukur', 'Median Terukur'], top: 0, textStyle: { color: '#475569', fontSize: 11 } },
      grid: { left: '3%', right: '4%', top: '14%', bottom: '18%', containLabel: true },
      xAxis: {
        type: 'category',
        data: codes,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: '#334155', rotate: 45, fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: 'Konsentrasi (ug/m3)',
        splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
        axisLabel: { color: '#64748B' },
      },
      series: [
        {
          name: 'Rata-rata Terukur',
          type: 'bar',
          data: means,
          itemStyle: { color: '#0284C7', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Median Terukur',
          type: 'line',
          data: medians,
          itemStyle: { color: '#10B981' },
          lineStyle: { width: 2 },
        },
      ],
    }
  }, [timeseriesUg])

  // Tab 2 Option: ppm 3 stasiun
  const ppmChartOption = useMemo(() => {
    if (!timeseriesPpm?.station_stats) return {}
    const entries = Object.entries(timeseriesPpm.station_stats)
    const codes = entries.map(([_, v]) => v.station_code)
    const means = entries.map(([_, v]) => v.stats?.mean ?? null)
    const medians = entries.map(([_, v]) => v.stats?.median ?? null)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const idx = params[0].dataIndex
          const info = entries[idx][1]
          return `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px">
            <strong>${info.station_code}</strong> (${info.kota_kabupaten})<br/>
            Satuan: <strong>ppm</strong> (logger export)<br/>
            Mean: <strong>${info.stats?.mean} ppm</strong><br/>
            Median: <strong>${info.stats?.median} ppm</strong><br/>
            Observasi: <strong>${info.stats?.count?.toLocaleString('id-ID')} jam</strong>
          </div>`
        },
      },
      legend: { data: ['Rata-rata (ppm)', 'Median (ppm)'], top: 0, textStyle: { color: '#475569', fontSize: 11 } },
      grid: { left: '4%', right: '4%', top: '16%', bottom: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: codes,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: '#334155', fontSize: 11, fontWeight: 'bold' },
      },
      yAxis: {
        type: 'value',
        name: 'Konsentrasi (ppm)',
        splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
        axisLabel: { color: '#64748B' },
      },
      series: [
        {
          name: 'Rata-rata (ppm)',
          type: 'bar',
          data: means,
          barWidth: '35%',
          itemStyle: { color: '#EA580C', borderRadius: [6, 6, 0, 0] },
          label: {
            show: true,
            position: 'top',
            formatter: '{c} ppm',
            color: '#9A3412',
            fontWeight: 'bold',
            fontSize: 11,
          },
        },
        {
          name: 'Median (ppm)',
          type: 'line',
          data: medians,
          itemStyle: { color: '#475569' },
          lineStyle: { width: 2, type: 'dashed' },
        },
      ],
    }
  }, [timeseriesPpm])

  // Diurnal Comparison Option (24 jam)
  const diurnalUg = timeseriesUg?.diurnal_profile || []
  const diurnalPpm = timeseriesPpm?.diurnal_profile || []

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Konteks Konsentrasi PM2.5 Antarkelompok Satuan</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesuai PRD Section 5: Satuan &mu;g/m&sup3; dan ppm diproses &amp; dianalisis secara terpisah
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ug_m3')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'ug_m3' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Konsentrasi Massa (&mu;g/m&sup3;) &middot; 24 Stasiun
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ppm')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'ppm' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Konsentrasi Logger (ppm) &middot; 3 Stasiun
          </button>
        </div>
      </div>

      {/* Tampilan Tab 1: ug/m3 */}
      {activeTab === 'ug_m3' && (
        <div>
          <div className="h-[280px]">
            <EChart option={ugChartOption} height={280} />
          </div>
          <div className="mt-3 p-3 bg-sky-50/60 rounded-xl border border-sky-100 flex items-start gap-2.5 text-xs text-sky-900">
            <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <div>
              Kelompok ini mencakup 24 stasiun dengan instrumen baku (Thermo 5014i BAM, MetOne BAM-1020, Horiba APDA-372, Aeroqual AQS 1). Konsentrasi rata-rata jaringan adalah sekitar <strong>28.4 &mu;g/m&sup3;</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Tampilan Tab 2: ppm */}
      {activeTab === 'ppm' && (
        <div>
          {/* Banner Peringatan PRD */}
          <div className="mb-4 p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Penetapan PRD: Nilai ppm Tidak Dikonversi ke &mu;g/m&sup3;</strong>
              PM2.5 adalah aerosol partikulat dengan campuran fisik-kimiawi beragam, bukan gas berbobot molekul tunggal. Tanpa formula konversi tervalidasi dan parameter massa jenis spesifik, nilai ppm ditampilkan secara terpisah dan dilarang dibandingkan langsung dengan baku mutu &mu;g/m&sup3;.
            </div>
          </div>

          <div className="h-[260px]">
            <EChart option={ppmChartOption} height={260} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {Object.values(timeseriesPpm?.station_stats || {}).map((st) => (
              <div key={st.station_code} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-800">{st.station_code}</div>
                <div className="text-[11px] text-slate-500">{st.kota_kabupaten}, {st.provinsi}</div>
                <div className="mt-2 text-base font-extrabold text-orange-600">
                  {st.stats?.mean} <span className="text-xs font-normal text-slate-600">ppm</span>
                </div>
                <div className="text-[10.5px] text-slate-500 mt-1">
                  Baseline metadata: {st.baseline_pm25 ?? '—'} &mu;g/m&sup3; (referensi saja)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 5. Tabel Prioritas Evaluasi Jaringan (MCDA Table)
 */
export function PriorityEvaluationTable({ priorityData, onSelectStation }) {
  const [activeTab, setActiveTab] = useState('operational') // 'operational' | 'distribution' | 'all'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'Perlu ditinjau' | 'Pantau'

  const currentRows = useMemo(() => {
    if (!priorityData) return []
    let list = []
    if (activeTab === 'operational') list = priorityData.operational_priority_ranking || []
    else if (activeTab === 'distribution') list = priorityData.distribution_priority_ranking || []
    else list = priorityData.combined_evaluation_table || []

    return list.filter((r) => {
      const matchSearch =
        searchTerm === '' ||
        r.station_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.provinsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.primary_trigger.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === 'ALL' || r.recommendation_status === statusFilter

      return matchSearch && matchStatus
    })
  }, [priorityData, activeTab, searchTerm, statusFilter])

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Prioritas Evaluasi Jaringan AQMS</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar stasiun prioritas untuk peninjauan operasional &amp; distribusi lanjutan (PRD Section 6.F)
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('operational')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'operational' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Prioritas Operasional
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('distribution')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'distribution' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Prioritas Distribusi
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode stasiun, provinsi, atau pemicu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-sky-500 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
        >
          <option value="ALL">Semua Rekomendasi</option>
          <option value="Perlu ditinjau">Perlu Ditinjau</option>
          <option value="Pantau">Pantau</option>
        </select>
      </div>

      {/* Table */}
      <div className="priority-table-scroll overflow-auto border border-slate-200/70 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 font-semibold">
              <th className="py-2.5 px-3 w-12 text-center">Rank</th>
              <th className="py-2.5 px-3">Kode Stasiun</th>
              <th className="py-2.5 px-3">Wilayah</th>
              <th className="py-2.5 px-3">Status Sensor</th>
              <th className="py-2.5 px-3 text-right">
                {activeTab === 'operational' ? 'Skor Operasional' : 'Skor Distribusi'}
              </th>
              <th className="py-2.5 px-3">Pemicu Evaluasi Utama</th>
              <th className="py-2.5 px-3 text-center">Rekomendasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Tidak ada stasiun yang memenuhi kriteria filter.
                </td>
              </tr>
            ) : (
              currentRows.map((row, idx) => {
                const rank = activeTab === 'operational' ? row.priority_operational_rank : row.priority_distribution_rank
                const score = activeTab === 'operational' ? row.priority_operational_score : row.priority_distribution_score
                const isNeedReview = row.recommendation_status === 'Perlu ditinjau'

                return (
                  <tr
                    key={row.location_id}
                    onClick={() => onSelectStation?.(row)}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                      #{rank}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-sky-700">
                      {row.station_code}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {row.provinsi}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                          row.status_operasional === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.status_operasional === 'Intermittent'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                        }`}
                      >
                        {row.status_operasional}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-800">
                      {score?.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[240px] truncate" title={row.primary_trigger}>
                      {row.primary_trigger}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          isNeedReview
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {row.recommendation_status}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
        <span>Menampilkan <strong>{currentRows.length}</strong> stasiun</span>
        <span>Klik baris untuk menyorot stasiun di peta</span>
      </div>
    </div>
  )
}
