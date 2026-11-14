'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Gauge, Info, MapPin, Radio, Ruler, Search, X } from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { ErrorState, LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatNumber } from '@/lib/formatters'
import { EChart } from './EChart'
import {
  useMonitoringNetworkSummary,
  useStationCompleteness,
  useStationMaster,
  useStationNearestNeighbor,
} from '@/hooks/useKecukupanData'
import './kecukupan.css'

const NetworkMap = dynamic(
  () => import('./NetworkMap').then((m) => m.NetworkMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

/* ─── Konstanta tampilan ───────────────────────────────────────────────── */
const STATUS_ORDER = ['Active', 'Intermittent', 'Defective', 'Unknown']
const STATUS_INFO = {
  Active: { color: '#16A34A', text: '#166534' },
  Intermittent: { color: '#F59E0B', text: '#92400E' },
  Defective: { color: '#EF4444', text: '#991B1B' },
  Unknown: { color: '#94A3B8', text: '#475569' },
}
const STATUS_RANK = { Defective: 3, Intermittent: 2, Active: 1, Unknown: 0 }
const ATTENTION_COLOR = '#DC2626'
const AXIS_TXT = { color: '#55706E', fontSize: 11 }
const GRID_LINE = { lineStyle: { color: 'rgba(24,49,79,0.08)' } }
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"
const tooltipBase = {
  backgroundColor: '#FFFFFF',
  borderColor: 'rgba(24,49,79,0.15)',
  borderWidth: 1,
  textStyle: { color: '#18314F', fontFamily: FONT, fontSize: 12 },
}

/* ─── Helper ───────────────────────────────────────────────────────────── */
const pct = (v, d = 1) => (v == null || !Number.isFinite(Number(v)) ? '—' : `${formatNumber(Number(v), d)}%`)
const km = (v, d = 1) => (v == null || !Number.isFinite(Number(v)) ? '—' : `${formatNumber(Number(v), d)} km`)

/** Status terburuk dari daftar status sensor stasiun, mis. "Active, Defective" → Defective. */
function worstStatus(str) {
  const tokens = String(str ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!tokens.length) return 'Unknown'
  return tokens.reduce((best, t) => ((STATUS_RANK[t] ?? 0) > (STATUS_RANK[best] ?? 0) ? t : best), tokens[0])
}

/** Gabungkan metadata dan tetangga terdekat menjadi satu baris per stasiun. */
function buildRows(master, nearest) {
  const nnBy = new Map(nearest.map((n) => [n.location_id, n]))
  return master.map((s) => {
    const nn = nnBy.get(s.location_id) ?? {}
    return {
      ...s,
      pulau: s.pulau || 'Lainnya',
      status_operasional: worstStatus(s.sensor_status),
      nearest_distance_km: nn.nearest_distance_km ?? null,
      nearest_station_code: nn.nearest_station_code ?? null,
    }
  })
}

const SORT_GET = {
  station_code: (r) => r.station_code,
  kota_kabupaten: (r) => r.kota_kabupaten,
  provinsi: (r) => r.provinsi,
  pulau: (r) => r.pulau,
  status_operasional: (r) => STATUS_ORDER.indexOf(r.status_operasional),
  nearest_distance_km: (r) => r.nearest_distance_km,
  nearest_station_code: (r) => r.nearest_station_code,
  completeness_pct: (r) => r.completeness_pct,
}

function sortRows(list, key, dir) {
  const get = SORT_GET[key]
  return [...list].sort((a, b) => {
    const x = get(a)
    const y = get(b)
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    const c = typeof x === 'string' ? x.localeCompare(y, 'id') : x - y
    return dir === 'asc' ? c : -c
  })
}

/* ─── Komponen kecil ───────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const info = STATUS_INFO[status] ?? STATUS_INFO.Unknown
  return (
    <span className="kc-pill" style={{ '--c': info.color, '--ct': info.text }}>
      <i aria-hidden="true" />
      {status}
    </span>
  )
}

function StatusLegend({ counts }) {
  return (
    <div className="kc-legend" aria-label="Legenda status sensor">
      {STATUS_ORDER.filter((s) => counts?.[s] != null).map((s) => (
        <span key={s}>
          <i className="kc-dot" style={{ background: STATUS_INFO[s].color }} />
          {s} <strong>({counts[s]})</strong>
        </span>
      ))}
    </div>
  )
}

function StationDetail({ station, onClose }) {
  if (!station) {
    return (
      <div className="kc-empty">
        <MapPin size={22} style={{ color: 'var(--color-elevated)' }} />
        <strong>Pilih stasiun</strong>
        <span>Klik titik pada peta, baris pada tabel, atau titik pada grafik untuk melihat detail.</span>
      </div>
    )
  }
  return (
    <div className="kc-detail">
      <div className="kc-detail-head">
        <div>
          <span className="kc-eyebrow">Stasiun terpilih</span>
          <h3>{station.station_code}</h3>
          <p>{station.kota_kabupaten} · {station.provinsi}</p>
        </div>
        <button type="button" className="kc-icon-btn" onClick={onClose} aria-label="Tutup detail stasiun">
          <X size={16} />
        </button>
      </div>

      <StatusPill status={station.status_operasional} />

      <dl className="kc-dl">
        <div><dt>Pulau</dt><dd>{station.pulau}</dd></div>
        <div><dt>Tipe lokasi</dt><dd>{station.site_type ?? '—'}</dd></div>
        <div><dt>Sensor aktif</dt><dd>{station.active_sensor_count ?? 0} dari {station.sensor_count ?? 0}</dd></div>
        <div><dt>Kelengkapan</dt><dd>{pct(station.completeness_pct)}</dd></div>
        <div><dt>Tetangga terdekat</dt><dd>{station.nearest_station_code ?? '—'}</dd></div>
        <div><dt>Jarak</dt><dd>{km(station.nearest_distance_km)}</dd></div>
      </dl>
    </div>
  )
}

/* ═══ PAGE ═════════════════════════════════════════════════════════════════ */
export default function KecukupanStasiunPage() {
  const summaryH = useMonitoringNetworkSummary()
  const masterH = useStationMaster()
  const compH = useStationCompleteness()
  const nnH = useStationNearestNeighbor()

  const [selectedId, setSelectedId] = useState(null)
  const [pulauFilter, setPulauFilter] = useState('Semua')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'nearest_distance_km', dir: 'desc' })

  const core = [summaryH, masterH, compH, nnH]
  const error = core.find((h) => h.error)?.error
  const ready = core.every((h) => h.data)

  const summary = summaryH.data
  const ref = summary?.observation_completeness?.reference_pct ?? null
  const refSource = summary?.observation_completeness?.reference_source ?? ''

  // Kelengkapan per stasiun (rata-rata antarpolutan) sudah tersedia di station_master.completeness_pct
  const rows = useMemo(
    () => (ready ? buildRows(masterH.data, nnH.data) : []),
    [ready, masterH.data, nnH.data]
  )

  /* Median jarak ke tetangga terdekat seluruh stasiun (batas "jauh"), dari JSON */
  const distMedian = summary?.median_nearest_distance_km ?? null

  const selected = useMemo(() => rows.find((r) => r.location_id === selectedId) ?? null, [rows, selectedId])
  const onStationSelect = useCallback((station) => setSelectedId(station.location_id), [])
  const pulauList = useMemo(() => [...new Set(rows.map((r) => r.pulau))].sort(), [rows])

  /* Dua kriteria: jarak di atas median seluruh stasiun, dan kelengkapan di bawah acuan.
     Stasiun yang memenuhi keduanya adalah prioritas dan ditampilkan lebih dulu. */
  const isFar = (r) => distMedian != null && r.nearest_distance_km != null && r.nearest_distance_km > distMedian
  const isLow = (r) => ref != null && r.completeness_pct != null && r.completeness_pct < ref
  const byDistDesc = (a, b) => (b.nearest_distance_km ?? 0) - (a.nearest_distance_km ?? 0)

  const priority = useMemo(
    () => rows.filter((r) => isFar(r) && isLow(r)).sort(byDistDesc),
    [rows, distMedian, ref] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const secondary = useMemo(
    () => rows.filter((r) => isFar(r) !== isLow(r)).sort(byDistDesc),
    [rows, distMedian, ref] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const attention = useMemo(() => [...priority, ...secondary], [priority, secondary])
  const priorityIds = useMemo(() => new Set(priority.map((r) => r.location_id)), [priority])
  const secondaryIds = useMemo(() => new Set(secondary.map((r) => r.location_id)), [secondary])

  const belowRef = useMemo(
    () => (ref == null ? 0 : rows.filter((r) => r.completeness_pct != null && r.completeness_pct < ref).length),
    [rows, ref]
  )

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = rows.filter((r) => {
      if (pulauFilter !== 'Semua' && r.pulau !== pulauFilter) return false
      if (!q) return true
      return [r.station_code, r.kota_kabupaten, r.provinsi].some((v) => String(v ?? '').toLowerCase().includes(q))
    })
    return sortRows(filtered, sort.key, sort.dir)
  }, [rows, pulauFilter, query, sort])

  /* ─── Opsi grafik ─── */
  const pulauOption = useMemo(() => {
    const islands = pulauList
    return {
      tooltip: { ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, textStyle: AXIS_TXT, itemWidth: 12, itemHeight: 8 },
      grid: { left: 8, right: 16, top: 16, bottom: 42, containLabel: true },
      xAxis: { type: 'category', data: islands, axisLabel: { ...AXIS_TXT, color: '#18314F', fontWeight: 600, interval: 0 } },
      yAxis: { type: 'value', name: 'Stasiun', nameTextStyle: AXIS_TXT, splitLine: GRID_LINE, axisLabel: AXIS_TXT, minInterval: 1 },
      series: STATUS_ORDER.map((st) => ({
        name: st,
        type: 'bar',
        stack: 'status',
        barMaxWidth: 46,
        itemStyle: { color: STATUS_INFO[st].color },
        data: islands.map((i) => rows.filter((r) => r.pulau === i && r.status_operasional === st).length),
      })),
    }
  }, [pulauList, rows])


  const scatterOption = useMemo(() => {
    const points = rows.filter((r) => r.nearest_distance_km != null && r.completeness_pct != null)
    const mk = (p) => ({
      value: [p.nearest_distance_km, p.completeness_pct],
      code: p.station_code,
      kota: p.kota_kabupaten,
      id: p.location_id,
    })
    const pts = (set) => points.filter((p) => set.has(p.location_id)).map(mk)
    const restIds = new Set(points.map((p) => p.location_id).filter((id) => !priorityIds.has(id) && !secondaryIds.has(id)))
    const markLines = [
      distMedian != null && { xAxis: distMedian, label: { formatter: `Median jarak ${formatNumber(distMedian, 1)} km`, color: '#475569', fontSize: 10, position: 'insideEndTop' } },
      ref != null && { yAxis: ref, label: { formatter: `Acuan ${ref}%`, color: '#475569', fontSize: 10, position: 'insideEndTop' } },
    ].filter(Boolean)
    const lineStyle = { color: '#64748B', type: 'dashed', width: 1.2 }
    return {
      tooltip: {
        ...tooltipBase,
        trigger: 'item',
        formatter: (p) => `<strong>${p.data.code}</strong><br/>${p.data.kota}<br/>Jarak tetangga: ${km(p.value[0])}<br/>Kelengkapan: ${pct(p.value[1])}`,
      },
      legend: { top: 0, right: 0, textStyle: AXIS_TXT, itemWidth: 10, itemHeight: 10 },
      grid: { left: 52, right: 20, top: 40, bottom: 44 },
      xAxis: { type: 'value', name: 'Jarak ke tetangga terdekat (km)', nameLocation: 'middle', nameGap: 28, nameTextStyle: AXIS_TXT, min: 0, splitLine: GRID_LINE, axisLabel: AXIS_TXT },
      yAxis: { type: 'value', name: 'Kelengkapan rata-rata (%)', nameTextStyle: { ...AXIS_TXT, align: 'left' }, min: 0, max: 100, splitLine: GRID_LINE, axisLabel: AXIS_TXT },
      series: [
        {
          name: 'Prioritas (jarak jauh & kelengkapan rendah)',
          type: 'scatter',
          symbolSize: 15,
          itemStyle: { color: ATTENTION_COLOR, borderColor: '#fff', borderWidth: 1.5 },
          label: { show: true, formatter: (p) => p.data.code, position: 'top', fontSize: 9, color: '#7F1D1D', fontFamily: FONT },
          labelLayout: { hideOverlap: true },
          data: pts(priorityIds),
        },
        {
          name: 'Salah satu kriteria',
          type: 'scatter',
          symbolSize: 13,
          itemStyle: { color: '#F59E0B', borderColor: '#fff', borderWidth: 1.5 },
          label: { show: true, formatter: (p) => p.data.code, position: 'top', fontSize: 9, color: '#92400E', fontFamily: FONT },
          labelLayout: { hideOverlap: true },
          data: pts(secondaryIds),
        },
        {
          name: 'Lainnya',
          type: 'scatter',
          symbolSize: 11,
          itemStyle: { color: '#8BBEB2', borderColor: '#fff', borderWidth: 1.5 },
          label: { show: true, formatter: (p) => p.data.code, position: 'top', fontSize: 9, color: '#55706E', fontFamily: FONT },
          labelLayout: { hideOverlap: true },
          data: pts(restIds),
          markLine: { silent: true, symbol: 'none', lineStyle, data: markLines },
        },
      ],
    }
  }, [rows, priorityIds, secondaryIds, distMedian, ref])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const sortTh = (k, label, align) => (
    <th style={{ textAlign: align ?? 'left' }} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => toggleSort(k)}>
        {label}
        {sort.key === k && (sort.dir === 'asc' ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />)}
      </button>
    </th>
  )

  /* ─── Loading & error ─── */
  const layout = {
    eyebrow: 'Tujuan 5',
    title: 'Kecukupan Stasiun',
    description: 'Bagaimana sebaran dan kondisi stasiun AQMS, seberapa jauh jarak antarlokasi, dan seberapa lengkap data yang tercatat?',
  }

  if (error) return <ModuleLayout {...layout}><ErrorState message={`Data gagal dimuat: ${error}`} /></ModuleLayout>
  if (!ready) return <ModuleLayout {...layout}><LoadingSpinner label="Menyiapkan data jaringan..." /></ModuleLayout>

  const s = summary
  const activeSensors = s.sensor_status?.Active ?? 0
  const notActive = (s.sensor_status?.Intermittent ?? 0) + (s.sensor_status?.Defective ?? 0)

  return (
    <ModuleLayout {...layout}>
      <div className="kc-stack">

        {/* ── Ringkasan ─────────────────────────────────────────────────── */}
        <Card className="kc-hero">
          <h2>
            Jaringan terdiri atas <strong>{s.total_stations} stasiun</strong> dengan{' '}
            <strong>{activeSensors} dari {s.total_sensors} sensor</strong> berstatus Active.
            {priority.length > 0 && <> <strong>{priority.length} stasiun</strong> berjarak jauh sekaligus berkelengkapan rendah.</>}
          </h2>
          <p>
            Rata-rata kelengkapan data {pct(s.observation_completeness.avg_completeness_pct)}.
            {ref != null && <> {belowRef} stasiun berada di bawah acuan {ref}%.</>}
            {notActive > 0 && <> {notActive} sensor berstatus Intermittent atau Defective.</>}
          </p>
        </Card>

        {/* ── KPI ───────────────────────────────────────────────────────── */}
        <div className="kpi-grid">
          <MetricCard
            variant="hero"
            label="Stasiun AQMS"
            value={s.total_stations}
            unit="lokasi"
            subtext={`${pulauList.length} pulau · ${s.total_sensors} sensor`}
            icon={<MapPin size={18} />}
          />
          <MetricCard
            label="Sensor aktif"
            value={activeSensors}
            unit={`dari ${s.total_sensors}`}
            subtext={`Intermittent ${s.sensor_status.Intermittent ?? 0} · Defective ${s.sensor_status.Defective ?? 0}`}
            icon={<Radio size={18} />}
          />
          <MetricCard
            label="Median jarak tetangga terdekat"
            value={formatNumber(distMedian, 1)}
            unit="km"
            subtext={s.nearest_distance_km ? `Rentang ${formatNumber(s.nearest_distance_km.min, 1)} – ${formatNumber(s.nearest_distance_km.max, 1)} km` : '—'}
            icon={<Ruler size={18} />}
          />
          <MetricCard
            label="Rata-rata kelengkapan data"
            value={pct(s.observation_completeness.avg_completeness_pct)}
            subtext={ref != null ? `${belowRef} stasiun di bawah acuan ${ref}%` : '—'}
            icon={<Gauge size={18} />}
          />
        </div>

        {/* ── 1. Persebaran ─────────────────────────────────────────────── */}
        <Section title="Persebaran stasiun" description="Warna titik menunjukkan status sensor. Klik titik untuk melihat detail.">
          <div className="kc-map-grid">
            <Card>
              <CardHeader title="Peta stasiun AQMS" subtitle="Mode warna dapat diganti: status sensor atau satuan PM2.5." />
              <NetworkMap stations={rows} height="480px" onStationSelect={onStationSelect} />
              <div style={{ marginTop: '0.8rem' }}>
                <StatusLegend counts={s.sensor_status} />
              </div>
            </Card>
            <Card>
              <StationDetail station={selected} onClose={() => setSelectedId(null)} />
            </Card>
          </div>
        </Section>

        {/* ── 2. Komposisi ──────────────────────────────────────────────── */}
        <Section title="Komposisi jaringan" description="Jumlah stasiun per pulau menurut status sensor terburuk pada setiap stasiun.">
          <Card>
            <CardHeader title="Stasiun per pulau" subtitle="Setiap batang dibagi menurut status sensor terburuk pada stasiun." />
            <EChart option={pulauOption} height={300} />
          </Card>
        </Section>

        {/* ── 3. Jarak vs kelengkapan + perlu diperhatikan ──────────────── */}
        <Section
          title="Jarak dan kelengkapan data"
          description="Garis putus-putus menandai median jarak ke tetangga terdekat seluruh stasiun."
        >
          <div className="kc-grid-attn">
            <Card>
              <CardHeader title="Jarak vs kelengkapan data" subtitle="Setiap titik adalah satu stasiun. Klik titik untuk melihat detail." />
              <EChart
                option={scatterOption}
                height={360}
                onEvents={{ click: (p) => p.data?.id && setSelectedId(p.data.id) }}
              />
            </Card>

            <Card>
              <CardHeader
                title="Stasiun perlu diperhatikan"
                subtitle={`${priority.length} prioritas, ${secondary.length} berdasarkan salah satu kriteria.`}
              />
              {attention.length === 0 ? (
                <div className="kc-empty" style={{ minHeight: '12rem' }}>
                  <Info size={20} style={{ color: 'var(--color-elevated)' }} />
                  <strong>Tidak ada stasiun yang memenuhi kriteria.</strong>
                </div>
              ) : (
                <ol className="kc-attn-list">
                  {attention.map((r) => {
                    const isPriority = priorityIds.has(r.location_id)
                    const reason = isPriority ? 'Prioritas' : isFar(r) ? 'Jarak jauh' : 'Kelengkapan rendah'
                    return (
                      <li key={r.location_id}>
                        <button
                          type="button"
                          className={`kc-attn-item${isPriority ? ' is-priority' : ''}${r.location_id === selectedId ? ' is-selected' : ''}`}
                          onClick={() => setSelectedId(r.location_id)}
                        >
                          <div className="kc-attn-top">
                            <strong>{r.station_code}</strong>
                            <span className="kc-attn-badges">
                              <span className={`kc-attn-tag${isPriority ? ' is-priority' : ''}`}>{reason}</span>
                              <StatusPill status={r.status_operasional} />
                            </span>
                          </div>
                          <div className="kc-attn-meta">{r.kota_kabupaten} · {r.provinsi}</div>
                          <div className="kc-attn-stats">
                            <span>Jarak <strong style={isFar(r) ? { color: '#B91C1C' } : undefined}>{km(r.nearest_distance_km)}</strong></span>
                            <span>Kelengkapan <strong style={isLow(r) ? { color: '#B91C1C' } : undefined}>{pct(r.completeness_pct)}</strong></span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
              <div className="kc-note-src" style={{ marginTop: '0.8rem' }}>
                Prioritas: jarak di atas median seluruh stasiun ({formatNumber(distMedian, 1)} km) dan kelengkapan di bawah {ref ?? '—'}%. Acuan kelengkapan mengacu pada Permen LHK No. 7 dan No. 14 Tahun 2020.
              </div>
            </Card>
          </div>
        </Section>

        {/* ── 4. Tabel ──────────────────────────────────────────────────── */}
        <Section title="Tabel seluruh stasiun" description="Cari dan saring stasiun, lalu klik judul kolom untuk mengurutkan.">
          <Card>
            <div className="kc-toolbar">
              <label className="kc-search">
                <Search size={14} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Cari kode stasiun, kota, atau provinsi"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Cari stasiun"
                />
              </label>
              <select className="kc-select" value={pulauFilter} onChange={(e) => setPulauFilter(e.target.value)} aria-label="Filter pulau">
                <option value="Semua">Semua pulau</option>
                {pulauList.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <span className="kc-count">{tableRows.length} dari {rows.length} stasiun</span>
            </div>
            <div className="kc-table-wrap">
              <table className="kc-table">
                <caption className="kc-sr">Tabel stasiun AQMS</caption>
                <thead>
                  <tr>
                    {sortTh('station_code', 'Stasiun')}
                    {sortTh('kota_kabupaten', 'Kota/Kabupaten')}
                    {sortTh('provinsi', 'Provinsi')}
                    {sortTh('pulau', 'Pulau')}
                    {sortTh('status_operasional', 'Status')}
                    {sortTh('nearest_distance_km', 'Jarak (km)', 'right')}
                    {sortTh('nearest_station_code', 'Tetangga')}
                    {sortTh('completeness_pct', 'Kelengkapan', 'right')}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr
                      key={r.location_id}
                      className={r.location_id === selectedId ? 'is-selected' : ''}
                      onClick={() => setSelectedId(r.location_id)}
                    >
                      <td><strong>{r.station_code}</strong></td>
                      <td>{r.kota_kabupaten ?? '—'}</td>
                      <td>{r.provinsi ?? '—'}</td>
                      <td>{r.pulau}</td>
                      <td><StatusPill status={r.status_operasional} /></td>
                      <td className="kc-num">{r.nearest_distance_km != null ? formatNumber(r.nearest_distance_km, 1) : <span className="kc-na">—</span>}</td>
                      <td>{r.nearest_station_code ?? <span className="kc-na">—</span>}</td>
                      <td className="kc-num">
                        {r.completeness_pct != null ? (
                          <span className="kc-mini">
                            <span className="kc-track">
                              <span style={{ width: `${Math.min(100, r.completeness_pct)}%`, background: ref != null && r.completeness_pct < ref ? '#F59E0B' : '#16A34A' }} />
                            </span>
                            {pct(r.completeness_pct)}
                          </span>
                        ) : <span className="kc-na">—</span>}
                      </td>
                    </tr>
                  ))}
                  {tableRows.length === 0 && (
                    <tr><td colSpan={8} className="kc-na" style={{ textAlign: 'center', padding: '1.5rem' }}>Tidak ada stasiun yang cocok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </Section>

      </div>
    </ModuleLayout>
  )
}