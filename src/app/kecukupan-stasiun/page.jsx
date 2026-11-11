'use client'

import dynamic from 'next/dynamic'
import { useMemo, useEffect, useState, useCallback } from 'react'
import { Activity, Gauge, Radio, Ruler } from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { formatNumber } from '@/lib/formatters'
import { EChart } from './EChart'
import {
  useMonitoringNetworkSummary,
  useStationMaster,
  useStationCompleteness,
  useStationNearestNeighbor,
  useCoverageKabupatenGeoJSON,
} from '@/hooks/useKecukupanData'
const NetworkMap = dynamic(
  () => import('./NetworkMap').then((m) => m.NetworkMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

/* ─── Konstanta ────────────────────────────────────────────────────────── */
const COMP_THRESHOLD = 85
const FAR_KM        = 400

const NAVY = 'var(--color-text-primary)'
const SOFT = 'var(--color-text-secondary)'

const STATUS_COLOR = {
  Active:       '#16A34A',
  Intermittent: '#F59E0B',
  Defective:    '#EF4444',
   Unknown: '#94A3B8',
}

const STATUS_BG = {
  Active: '#DCFCE7',
  Intermittent: '#FEF3C7',
  Defective: '#FEE2E2',
  Unknown: '#F1F5F9',
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const pct = (v) => (v == null ? '—' : `${formatNumber(v, 1)}%`)

function groupCount(items, key, valueKey) {
  const map = new Map()
  for (const it of items) {
    const k = it[key] || 'Tidak diketahui'
    map.set(k, (map.get(k) ?? 0) + (valueKey ? Number(it[valueKey] ?? 0) : 1))
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function sensorStatusOf(s) {
  const statuses = String(s.sensor_status ?? '')
    .split(',')
    .map((status) => status.trim())

  if (statuses.includes('Defective')) return 'Defective'
  if (statuses.includes('Intermittent')) return 'Intermittent'
  if (statuses.includes('Active')) return 'Active'

  return 'Unknown'
}

function buildTrigger(status, comp, dist) {
  const reasons = []
  if (status !== 'Active')                   reasons.push(`Sensor ${status}`)
  if (comp != null && comp < COMP_THRESHOLD) reasons.push(`Kelengkapan ${formatNumber(comp, 1)}%`)
  if (dist != null && dist > FAR_KM)        reasons.push(`Tetangga terdekat ${formatNumber(dist, 0)} km`)
  return reasons.length ? reasons.slice(0, 2).join('; ') : null
}


function buildModel({ summary, stationsRaw, comp, nearest, geo }) {
  const nnBy = new Map(nearest.map((n) => [n.location_id, n]))

  // Rata-rata completeness per lokasi dari seluruh baris parameter.
  // Interpretasikan sebagai rata-rata antarparameter, bukan completeness
  // gabungan berbobot berdasarkan jumlah observasi.
  const compAcc = new Map()

  for (const r of comp) {
    if (r.completeness_pct == null) continue

    const value = Number(r.completeness_pct)
    if (!Number.isFinite(value)) continue

    const acc = compAcc.get(r.location_id) ?? { sum: 0, n: 0 }
    acc.sum += value
    acc.n += 1
    compAcc.set(r.location_id, acc)
  }

  const stations = stationsRaw.map((s) => {
    const status = sensorStatusOf(s)
    const acc = compAcc.get(s.location_id)

    const completeness =
      acc && acc.n > 0 ? acc.sum / acc.n : null

    const nn = nnBy.get(s.location_id)
    const dist = nn?.nearest_distance_km ?? null
    return {
      ...s,
      status_operasional: status,
      completeness_pct: completeness,
      nearest_distance_km: dist,
      nearest_station_code: nn?.nearest_station_code ?? null,
      primary_trigger: buildTrigger(status, completeness, dist),
      recommendation_status: null,
    }
  })

  const withDist = stations.filter(
    (s) => s.nearest_distance_km != null &&
      Number.isFinite(Number(s.nearest_distance_km))
  )

  const withComp = stations.filter(
    (s) => s.completeness_pct != null &&
      Number.isFinite(Number(s.completeness_pct))
  )

  const byDistDesc = [...withDist].sort(
    (a, b) => b.nearest_distance_km - a.nearest_distance_km
  )

  return {
    summary,
    geo,
    stations,

    statusCounts: ['Active', 'Intermittent', 'Defective', 'Unknown'].map((k) => ({
      label: k,
      value: stations.filter((s) => s.status_operasional === k).length,
    })),

    // Pengelompokan analitis berasal dari metadata station_master,
    // bukan dari pencocokan polygon GeoJSON.
    provinceStations: groupCount(stations, 'provinsi'),
    provinceSensors: groupCount(stations, 'provinsi', 'sensor_count'),

    compSorted: [...withComp].sort(
      (a, b) => a.completeness_pct - b.completeness_pct
    ),

    avgComp: withComp.length
      ? withComp.reduce((sum, s) => sum + s.completeness_pct, 0) / withComp.length
      : null,

    belowThreshold: withComp.filter(
      (s) => s.completeness_pct < COMP_THRESHOLD
    ).length,

    farList: byDistDesc.slice(0, 5),

    farCount: withDist.filter(
      (s) => s.nearest_distance_km > FAR_KM
    ).length,

    isolatedCount: stations.filter(
      (s) => s.nearest_distance_km == null || s.nearest_distance_km > FAR_KM
    ).length,

    below80Count: withComp.filter(
      (s) => s.completeness_pct < 80
    ).length,

  }
}


/* ─── Komponen UI lokal ────────────────────────────────────────────────── */

function HBar({ rows, format = (v) => formatNumber(v, 0), unit = '', colorOf }) {
  const max = Math.max(...rows.map((r) => r.value ?? 0), 0) || 1
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
      {rows.map((r) => (
        <li
          key={r.label}
          style={{ display: 'grid', gridTemplateColumns: '9rem 1fr 5rem', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>
            {r.label}
          </span>
          <span style={{ height: 8, background: 'rgba(24,49,79,0.08)', borderRadius: 4 }}>
            <span style={{ display: 'block', height: '100%', width: `${((r.value ?? 0) / max) * 100}%`, background: colorOf ? colorOf(r) : '#384E77', borderRadius: 4 }} />
          </span>
          <strong style={{ textAlign: 'right' }}>{format(r.value)}{unit}</strong>
        </li>
      ))}
    </ul>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function KecukupanStasiunPage() {
  const summaryHook   = useMonitoringNetworkSummary()
  const stationsHook  = useStationMaster()
  const compHook      = useStationCompleteness()
  const nearestHook   = useStationNearestNeighbor()
  const geoHook       = useCoverageKabupatenGeoJSON()
  const [selectedStation, setSelectedStation] = useState(null)
  const onStationSelect = useCallback((station) => {
    setSelectedStation(station)
  }, [])

  const core = [summaryHook, stationsHook, compHook, nearestHook]
  const error = core.find((h) => h.error)?.error
  const ready = core.every((h) => h.data) && !core.some((h) => h.loading)

  const m = useMemo(
    () =>
      ready
        ? buildModel({
            summary:     summaryHook.data,
            stationsRaw: stationsHook.data,
            comp:        compHook.data,
            nearest:     nearestHook.data,
            geo:         geoHook.data,
          })
        : null,
    [ready, summaryHook.data, stationsHook.data, compHook.data, nearestHook.data, geoHook.data]
  )

  const scatterOption = useMemo(() => {
    const normal = []
    const attention = []
    const scatterStations = m?.stations ?? []

    scatterStations.forEach((station) => {
      const isolated = station.nearest_distance_km == null ||
        station.nearest_distance_km > FAR_KM
      const lowCompleteness = station.completeness_pct < 80
      const point = {
        name: station.station_code,
        value: [
          station.nearest_distance_km == null ? 0 : Number(station.nearest_distance_km),
          station.completeness_pct == null ? 0 : Number(station.completeness_pct),
        ],
        station,
      }
      if (isolated || lowCompleteness) attention.push(point)
      else normal.push(point)
    })

    return {
      animation: false,
      grid: { left: 58, right: 24, top: 24, bottom: 52 },
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const station = params.data.station
          const distance = station.nearest_distance_km == null
            ? 'Tidak memiliki tetangga'
            : `${formatNumber(station.nearest_distance_km, 1)} km`
          return `<strong>${station.station_code}</strong><br/>` +
            `Kelengkapan: ${station.completeness_pct == null ? 'Tidak tersedia' : `${formatNumber(station.completeness_pct, 1)}%`}<br/>` +
            `Jarak terdekat: ${distance}`
        },
      },
      xAxis: {
        type: 'value',
        name: 'Jarak stasiun terdekat (km)',
        nameLocation: 'middle',
        nameGap: 30,
        min: 0,
        max: 1500,
        splitLine: { lineStyle: { color: '#E2E8F0' } },
      },
      yAxis: {
        type: 'value',
        name: 'Kelengkapan data (%)',
        nameLocation: 'middle',
        nameGap: 42,
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#E2E8F0' } },
      },
      series: [
        {
          name: 'Dalam batas perhatian',
          type: 'scatter',
          symbolSize: 10,
          itemStyle: { color: '#4B6B8C', opacity: 0.78 },
          data: normal,
        },
        {
          name: 'Perlu perhatian',
          type: 'scatter',
          symbolSize: 13,
          itemStyle: { color: '#DC2626', borderColor: '#991B1B', borderWidth: 1 },
          data: attention,
        },
      ],
    }
  }, [m])

  const layout = {
    eyebrow:     'Kecukupan jaringan',
    title:       'Kecukupan Stasiun',
    description: 'Apakah 27 stasiun sudah tersebar merata, dan wilayah mana yang paling butuh tambahan titik pemantauan?',
  }

  if (error) return <ModuleLayout {...layout}><ErrorState message={error} /></ModuleLayout>
  if (!m)    return <ModuleLayout {...layout}><LoadingSpinner label="Menyiapkan data jaringan..." /></ModuleLayout>

  /* ── Nilai turunan untuk narasi ── */
  const s             = m.summary
  const needAttention = (s.sensor_status.Intermittent ?? 0) + (s.sensor_status.Defective ?? 0)
  const topProvince = m.provinceStations[0]
  const hasIsolated = m.farCount > 0
  const hasWeakData = m.belowThreshold > 0
  const attentionStations = m.stations
    .filter((station) =>
      station.nearest_distance_km == null ||
      station.nearest_distance_km > FAR_KM ||
      station.completeness_pct < 80
    )
    .sort((a, b) => {
      const distanceA = a.nearest_distance_km ?? Infinity
      const distanceB = b.nearest_distance_km ?? Infinity
      if (distanceB !== distanceA) return distanceB - distanceA
      return (a.completeness_pct ?? Infinity) - (b.completeness_pct ?? Infinity)
    })

  return (
    <ModuleLayout {...layout}>

      {/* ── Kesimpulan di awal ───────────────────────────────────────────── */}
      <Card variant="dark">
        <h2 className="headline">
          Persebaran jaringan stasiun AQMS
          {topProvince && (
            <>
              {' '}terbanyak berada di <strong>{topProvince.label}</strong>
            </>
          )}
          .{' '}
          {hasIsolated && (
            <>
              <strong>{m.farCount} stasiun</strong> memiliki jarak ke tetangga terdekat
              lebih dari {FAR_KM} km.
            </>
          )}
          {hasWeakData && (
            <>
              {' '}<strong>{m.belowThreshold} stasiun</strong> memiliki kelengkapan
              data di bawah {COMP_THRESHOLD}%.
            </>
          )}
        </h2>
        <p className="headline-sub">
          Dari {s.total_stations} stasiun, {s.sensor_status.Active} sensor aktif.
          {needAttention > 0 && ` ${needAttention} sensor perlu diperiksa.`}{' '}
          Halaman ini menelusuri sebab dan wilayah mana yang paling butuh tambahan titik pemantauan.
        </p>
      </Card>

      {/* ── KPI ─────────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <MetricCard
          variant="hero"
          label="Stasiun AQMS"
          value={s.total_stations}
          unit="lokasi"
          subtext={`${s.total_sensors} sensor terdaftar`}
          icon={<Radio size={18} />}
        />
        <MetricCard
          label="Sensor aktif"
          value={s.sensor_status.Active}
          unit={`dari ${s.total_sensors}`}
          subtext={needAttention > 0 ? `${needAttention} perlu diperiksa` : 'Semua beroperasi'}
          accentColor={needAttention > 0 ? 'var(--ispu-tidak-sehat)' : 'var(--ispu-baik)'}
          icon={<Activity size={18} />}
        />
        <MetricCard
          label="Median jarak antarlokasi"
          value={formatNumber(s.median_nearest_distance_km, 0)}
          unit="km"
          subtext={`${m.farCount} stasiun > ${FAR_KM} km dari yang lain`}
          accentColor={m.farCount > 0 ? 'var(--ispu-sedang)' : 'var(--ispu-baik)'}
          icon={<Ruler size={18} />}
        />
        <MetricCard
          label="Rata-rata kelengkapan data"
          value={pct(m.avgComp)}
          subtext={m.belowThreshold > 0 ? `${m.belowThreshold} stasiun di bawah ${COMP_THRESHOLD}%` : `Semua di atas ${COMP_THRESHOLD}%`}
          accentColor={m.belowThreshold > 0 ? 'var(--ispu-sedang)' : 'var(--ispu-baik)'}
          icon={<Gauge size={18} />}
        />
      </div>

      {/* ═══ 1. SEBARAN ═══════════════════════════════════════════════════ */}
      <Section
        title="Persebaran geografis dan komposisi jaringan stasiun"
      >
        <Card>
          <CardHeader
            title="Peta persebaran stasiun"
            subtitle="Warna titik menunjukkan status sensor. Klik titik untuk melihat detail kelengkapan data dan jarak ke stasiun terdekat."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.75rem', marginBottom: 10 }}>
            {m.statusCounts.map((c) => (
              <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[c.label] }} />
                {c.label}: <strong>{c.value}</strong>
              </span>
            ))}
          </div>
          <div className="layout-main">
            <NetworkMap
              geo={m.geo}
              stations={m.stations}
              height="520px"
              onStationSelect={onStationSelect}
            />
            {selectedStation && (
              <Card className="station-detail-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.1rem', background: 'linear-gradient(135deg, #F8FAFC, #EAF0F7)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: SOFT, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Detail stasiun</div>
                      <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.05rem', color: NAVY }}>{selectedStation.station_code}</h3>
                    </div>
                    <button type="button" aria-label="Tutup detail stasiun" onClick={() => setSelectedStation(null)}
                      style={{ border: 0, background: '#fff', color: SOFT, borderRadius: 999, width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>
                      ×
                    </button>
                  </div>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: SOFT, lineHeight: 1.4 }}>
                    {selectedStation.kota_kabupaten} · {selectedStation.provinsi}
                  </p>
                  <span style={{ display: 'inline-flex', marginTop: 10, padding: '0.25rem 0.6rem', borderRadius: 999, background: STATUS_BG[selectedStation.status_operasional] ?? STATUS_BG.Unknown, color: STATUS_COLOR[selectedStation.status_operasional] ?? STATUS_COLOR.Unknown, fontSize: '0.7rem', fontWeight: 700 }}>
                    {selectedStation.status_operasional}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '1rem 1.1rem' }}>
                  {[
                    ['Sensor', selectedStation.sensor_count ?? '—'],
                    ['Kelengkapan', pct(selectedStation.completeness_pct)],
                    ['Tetangga terdekat', selectedStation.nearest_distance_km == null ? '—' : `${formatNumber(selectedStation.nearest_distance_km, 1)} km`],
                    ['Kode lokasi', selectedStation.location_id ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding: '0.65rem 0.7rem', borderRadius: '0.65rem', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ color: SOFT, fontSize: '0.66rem', lineHeight: 1.3 }}>{label}</div>
                      <strong style={{ display: 'block', marginTop: 3, fontSize: '0.82rem', color: NAVY, overflowWrap: 'anywhere' }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </Card>
      </Section>

      {/* ═══ 2. KONDISI JARINGAN ══════════════════════════════════════════ */}
      <Section
        title="Jarak antarstasiun dan kelengkapan data"
        description="Sebaran stasiun menunjukkan hubungan antara keterisolasian lokasi dan konsistensi pencatatan."
      >
        <div className="kpi-grid" style={{ marginBottom: 'var(--gap)' }}>
          <MetricCard
            label="Stasiun terisolasi"
            value={m.isolatedCount}
            unit="stasiun"
            subtext={`Jarak > ${FAR_KM} km atau tanpa tetangga`}
            accentColor="#DC2626"
          />
          <MetricCard
            label="Kelengkapan di bawah 80%"
            value={m.below80Count}
            unit="stasiun"
            subtext="Berdasarkan ambang perhatian"
            accentColor="#DC2626"
          />
        </div>
        <div className="layout-main">
          <Card>
            <CardHeader
              title="Jarak vs kelengkapan data"
              subtitle="Titik merah menunjukkan stasiun yang terisolasi atau memiliki kelengkapan data di bawah 80%."
            />
            <EChart
              option={scatterOption}
              height={330}
              onEvents={{ click: (params) => params.data?.station && setSelectedStation(params.data.station) }}
            />
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: SOFT, lineHeight: 1.5 }}>
              Setiap titik merepresentasikan satu stasiun AQMS. Semakin jauh jaraknya dari stasiun lain dan semakin rendah kelengkapan datanya, semakin besar perhatian yang diperlukan.
            </p>
          </Card>
          <Card>
            <CardHeader
              title="Stasiun perlu perhatian"
              subtitle={`${attentionStations.length} stasiun teridentifikasi dari dua ambang perhatian.`}
            />
            <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: 8, fontSize: '0.78rem' }}>
              {attentionStations.map((station) => (
                <li key={station.location_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStation(station)}
                    style={{ border: 0, padding: 0, background: 'none', color: NAVY, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                  >
                    <strong>{station.station_code}</strong>
                    <span style={{ display: 'inline-flex', marginLeft: 6, padding: '0.15rem 0.45rem', borderRadius: 999, background: '#FEE2E2', color: '#B91C1C', fontSize: '0.65rem', fontWeight: 700 }}>
                      {station.nearest_distance_km == null || station.nearest_distance_km > FAR_KM
                        ? station.completeness_pct != null && station.completeness_pct < 80 ? 'Dua indikator' : 'Terisolasi'
                        : 'Data tipis'}
                    </span>
                    <span style={{ display: 'block', color: SOFT, marginTop: 2 }}>
                      Jarak: {station.nearest_distance_km == null ? 'tanpa tetangga' : `${formatNumber(station.nearest_distance_km, 1)} km`}
                      {' · '}Data: {pct(station.completeness_pct)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </Section>

    </ModuleLayout>
  )
}