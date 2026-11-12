'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { Activity, AlertTriangle, ArrowRight, Gauge, Radio, Ruler } from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { formatNumber } from '@/lib/formatters'
import {
  useMonitoringNetworkSummary,
  useStationMaster,
  useStationCompleteness,
  useStationNearestNeighbor,
  useStationPollutantSummary,
  useStationPriority,
  useCoverageKabupatenGeoJSON,
} from '@/hooks/useKecukupanData'

const NetworkMap = dynamic(
  () => import('./NetworkMap').then((m) => m.NetworkMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

/* ─── Konstanta ────────────────────────────────────────────────────────── */
const COMP_THRESHOLD = 85
const FAR_KM        = 400
const OPS_REVIEW    = 35

const NAVY = 'var(--color-text-primary)'
const SOFT = 'var(--color-text-secondary)'

const STATUS_COLOR = {
  Active:       '#16A34A',
  Intermittent: '#F59E0B',
  Defective:    '#EF4444',
}

const DIST_BINS = [
  { label: '< 100 km',    min: 0,   max: 100      },
  { label: '100–400 km',  min: 100, max: 400       },
  { label: '400–800 km',  min: 400, max: 800       },
  { label: '> 800 km',    min: 800, max: Infinity  },
]

const AVAIL = [
  { key: 'avail_distance',    label: 'jarak'          },
  { key: 'avail_region',      label: 'wilayah'        },
  { key: 'avail_site',        label: 'tipe lokasi'    },
  { key: 'avail_status',      label: 'status sensor'  },
  { key: 'avail_completeness',label: 'kelengkapan'    },
  { key: 'avail_invalid',     label: 'data QC'        },
]

const METHOD_ITEMS = [
  {
    title: 'Sumber dan cakupan data',
    text: 'Metadata stasiun (sites.csv), sensor (sensors.csv), periode observasi (metadata_dates.csv), dan 27 file observasi AQMS. Periode evaluasi 1 Januari 2024 sampai 14 Oktober 2026. Dataset bersifat sintetis.',
  },
  {
    title: 'Definisi indikator',
    text: 'Kelengkapan: jumlah jam yang memiliki nilai valid dibagi jumlah jam yang seharusnya diamati, dibatasi maksimal 100%. Jarak: jarak geodesik ke stasiun terdekat. Status sensor: Active, Intermittent, atau Defective sesuai sensors.csv.',
  },
  {
    title: 'Metode jarak Haversine',
    text: 'Jarak dihitung dari koordinat lintang dan bujur setiap stasiun dengan rumus Haversine dan jari-jari bumi 6.371 km. Jarak ini menunjukkan keterpisahan antarlokasi, bukan luas wilayah yang tercakup.',
  },
  {
    title: 'Penanganan data hilang',
    text: 'Data hilang tidak dianggap nol. Jam tanpa observasi valid tidak dihitung sebagai valid. Stasiun tanpa data PM2.5 valid ditandai dan tidak dibandingkan.',
  },
  {
    title: 'Pemisahan satuan PM2.5',
    text: 'Stasiun dengan satuan µg/m³ dan ppm dianalisis terpisah. Nilai ppm tidak dikonversi ke µg/m³ karena tidak ada dasar konversi yang tervalidasi untuk PM2.5.',
  },
  {
    title: 'Peran SHP',
    text: 'Batas administrasi dipakai sebagai polygon visual untuk menghitung jumlah stasiun dan sensor per kabupaten/kota. Detail peatland berasal dari tipe lokasi dan karakteristik wilayah pada metadata stasiun.',
  },
  {
    title: 'Batasan interpretasi',
    text: 'Hasil ini menunjukkan kondisi jaringan yang tercatat dalam dataset, bukan kepastian cakupan wilayah. Peringkat prioritas adalah bahan untuk tinjauan lanjutan, bukan keputusan lokasi pembangunan. Rekomendasi kebijakan dibahas di halaman Insight.',
  },
]

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
  if (s.sensor_status?.includes('Defective'))    return 'Defective'
  if (s.sensor_status?.includes('Intermittent')) return 'Intermittent'
  return 'Active'
}

function buildTrigger(status, comp, dist) {
  const reasons = []
  if (status !== 'Active')                   reasons.push(`Sensor ${status}`)
  if (comp != null && comp < COMP_THRESHOLD) reasons.push(`Kelengkapan ${formatNumber(comp, 1)}%`)
  if (dist != null && dist > FAR_KM)        reasons.push(`Tetangga terdekat ${formatNumber(dist, 0)} km`)
  return reasons.length ? reasons.slice(0, 2).join('; ') : null
}

function buildModel({ summary, stationsRaw, comp, nearest, pollutant, priority, geo }) {
  const nnBy  = new Map(nearest.map((n) => [n.location_id, n]))
  const opsBy = new Map((priority?.operational_ranking ?? []).map((o) => [o.location_id, o]))

  const compAcc = new Map()
  for (const r of comp) {
    if (r.completeness_pct == null) continue
    const a = compAcc.get(r.location_id) ?? { sum: 0, n: 0 }
    a.sum += r.completeness_pct
    a.n   += 1
    compAcc.set(r.location_id, a)
  }

  const stations = stationsRaw.map((s) => {
    const status       = sensorStatusOf(s)
    const a            = compAcc.get(s.location_id)
    const completeness = a ? a.sum / a.n : null
    const nn           = nnBy.get(s.location_id)
    const dist         = nn?.nearest_distance_km ?? null
    const ops          = opsBy.get(s.location_id)
    return {
      ...s,
      status_operasional:    status,
      completeness_pct:      completeness,
      nearest_distance_km:   dist,
      nearest_station_code:  nn?.nearest_station_code ?? null,
      primary_trigger:       buildTrigger(status, completeness, dist),
      recommendation_status: ops ? (ops.operational_score >= OPS_REVIEW ? 'Perlu ditinjau' : 'Pantau') : null,
    }
  })

  const withDist   = stations.filter((s) => s.nearest_distance_km != null)
  const withComp   = stations.filter((s) => s.completeness_pct    != null)
  const byDistDesc = [...withDist].sort((a, b) => b.nearest_distance_km - a.nearest_distance_km)

  const dualIssue = stations.filter(
    (s) => s.nearest_distance_km > FAR_KM && s.completeness_pct != null && s.completeness_pct < COMP_THRESHOLD
  )

  return {
    summary,
    geo,
    stations,
    statusCounts: ['Active', 'Intermittent', 'Defective'].map((k) => ({
      label: k,
      value: stations.filter((s) => s.status_operasional === k).length,
    })),
    regionStations: groupCount(stations, 'region_group'),
    regionSensors:  groupCount(stations, 'region_group', 'sensor_count'),
    siteTypes:      groupCount(stations, 'site_type'),
    compSorted:     [...withComp].sort((a, b) => a.completeness_pct - b.completeness_pct),
    avgComp: withComp.length
      ? withComp.reduce((s, x) => s + x.completeness_pct, 0) / withComp.length
      : null,
    belowThreshold: withComp.filter((s) => s.completeness_pct < COMP_THRESHOLD).length,
    distBins: DIST_BINS.map((b) => ({
      label: b.label,
      value: withDist.filter((s) => s.nearest_distance_km >= b.min && s.nearest_distance_km < b.max).length,
    })),
    farList:    byDistDesc.slice(0, 5),
    nearList:   [...byDistDesc].reverse().slice(0, 5),
    farCount:   withDist.filter((s) => s.nearest_distance_km > FAR_KM).length,
    dualIssue,
    pmUg:  pollutant.filter((r) => r.pollutant === 'pm25_ug_m3').sort((a, b) => b.mean - a.mean),
    pmPpm: pollutant.filter((r) => r.pollutant === 'pm25_ppm'),
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

function Insight({ icon: Icon = AlertTriangle, color = '#C2410C', bg = 'rgba(251,146,60,0.08)', border = 'rgba(251,146,60,0.3)', title, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '0.85rem 1rem', borderRadius: '0.85rem', border: `1px solid ${border}`, background: bg }}>
      <Icon size={18} style={{ color, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <div style={{ fontSize: '0.8rem', color: NAVY, lineHeight: 1.55 }}>
        {title && <strong style={{ display: 'block', marginBottom: 2, color }}>{title}</strong>}
        {children}
      </div>
    </div>
  )
}

function RankTable({ title, subtitle, rows, scoreKey, rankKey, farIds, lowCompIds }) {
  const top = [...rows].sort((a, b) => a[rankKey] - b[rankKey]).slice(0, 10)
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: 10, fontSize: '0.8rem' }}>
        {top.map((r) => {
          const missing   = AVAIL.filter((a) => !r[a.key]).map((a) => a.label)
          const isFar     = farIds?.has(r.location_id ?? r.station_code)
          const isLowComp = lowCompIds?.has(r.location_id ?? r.station_code)
          const tags = []
          if (isFar)     tags.push({ label: 'Terisolasi', color: '#C2410C', bg: 'rgba(251,146,60,0.1)' })
          if (isLowComp) tags.push({ label: 'Data tipis',  color: '#B45309', bg: 'rgba(245,158,11,0.1)' })
          return (
            <li key={r.location_id ?? r.station_code}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <strong>{r.station_code}</strong>
                <span style={{ color: SOFT }}>· skor {formatNumber(r[scoreKey], 1)}</span>
                {tags.map((t) => (
                  <span key={t.label} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999, background: t.bg, color: t.color }}>
                    {t.label}
                  </span>
                ))}
              </div>
              {missing.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: '#B45309', marginTop: 2 }}>
                  Data tidak tersedia: {missing.join(', ')}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

function Bridge({ children }) {
  return (
    <p style={{ fontSize: '0.82rem', color: SOFT, lineHeight: 1.65, padding: '0.1rem 0 0.25rem' }}>
      {children}
    </p>
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
  const pollutantHook = useStationPollutantSummary()
  const priorityHook  = useStationPriority()
  const geoHook       = useCoverageKabupatenGeoJSON()

  const core  = [summaryHook, stationsHook, compHook, nearestHook, pollutantHook, geoHook]
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
            pollutant:   pollutantHook.data,
            priority:    priorityHook.data ?? null,
            geo:         geoHook.data,
          })
        : null,
    [ready, summaryHook.data, stationsHook.data, compHook.data, nearestHook.data, pollutantHook.data, priorityHook.data, geoHook.data]
  )

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
  const topRegion     = m.regionStations[0]
  const bottomRegion  = m.regionStations.at(-1)
  const topSite       = m.siteTypes[0]
  const topPm         = m.pmUg[0]
  const ppmCount      = s.pm25_unit_groups.ppm_stations

  const farIds     = new Set(m.farList.map((s) => s.location_id))
  const lowCompIds = new Set(m.compSorted.filter((s) => s.completeness_pct < COMP_THRESHOLD).map((s) => s.location_id))

  const isUneven  = topRegion && bottomRegion && topRegion.value >= 3 * bottomRegion.value
  const hasIsolated = m.farCount > 0
  const hasWeakData = m.belowThreshold > 0

  return (
    <ModuleLayout {...layout}>

      {/* ── Kesimpulan di awal ───────────────────────────────────────────── */}
      <Card variant="dark">
        <h2 className="headline">
          Jaringan{' '}
          {isUneven
            ? <>terkonsentrasi di <strong>{topRegion.label}</strong> dan belum merata ke timur</>
            : <>sudah tersebar di semua wilayah, tapi belum merata</>
          }.{' '}
          {hasIsolated && <><strong>{m.farCount} stasiun</strong> berdiri sendiri lebih dari {FAR_KM} km dari yang lain. </>}
          {hasWeakData && <><strong>{m.belowThreshold} stasiun</strong> datanya di bawah {COMP_THRESHOLD}% kelengkapan.</>}
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
        title={`Stasiun terkonsentrasi di ${topRegion?.label ?? '—'} — wilayah timur jauh tertinggal`}
        description="Langkah pertama: lihat di mana saja stasiun berada dan apakah sebarannya merata."
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
          <NetworkMap geo={m.geo} stations={m.stations} height="520px" />
          <p style={{ marginTop: 10, fontSize: '0.72rem', color: SOFT }}>
            Warna polygon menunjukkan jumlah stasiun atau sensor per kabupaten/kota. Klik polygon yang memiliki stasiun untuk melihat detail pemantauan dan peatland.
          </p>
        </Card>

        <div className="layout-main">
          <Card>
            <CardHeader
              title="Tipe lokasi stasiun"
              subtitle={`Terbanyak: ${topSite?.label ?? '—'}. Beragamnya tipe lokasi menentukan representativitas data.`}
            />
            <HBar rows={m.siteTypes} />
          </Card>
        </div>

        <Bridge>
          Sebaran tampak tidak merata. Langkah berikutnya: periksa seberapa jauh stasiun satu sama lain —
          celah besar dalam jarak berarti ada wilayah yang tidak terpantau sama sekali.
        </Bridge>
      </Section>

      {/* ═══ 2. KONDISI JARINGAN ══════════════════════════════════════════ */}
      <Section
        title={`${m.farCount} stasiun terisolasi dan ${m.belowThreshold} datanya tipis — dua masalah yang memperkuat satu sama lain`}
        description="Stasiun yang jauh dari yang lain seharusnya jadi andalan datanya. Kalau datanya juga bolong, wilayah itu praktis tidak terpantau."
      >
        <div className="layout-3">
          <Card>
            <CardHeader
              title="Distribusi jarak ke stasiun terdekat"
              subtitle={`Dihitung dengan rumus Haversine. Di atas ${FAR_KM} km dianggap terisolasi.`}
            />
            <HBar
              rows={m.distBins}
              colorOf={(r) => (r.label.startsWith('>') || r.label.startsWith('400') ? '#EF4444' : '#384E77')}
            />
          </Card>
          <Card>
            <CardHeader
              title="Paling terpisah dari jaringan"
              subtitle="Lima stasiun dengan jarak terjauh ke stasiun lain — daerahnya kemungkinan paling kurang terpantau."
            />
            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', display: 'grid', gap: 6 }}>
              {m.farList.map((r) => (
                <li key={r.location_id}>
                  <strong>{r.station_code}</strong>
                  <span style={{ color: SOFT }}> → {r.nearest_station_code}: {formatNumber(r.nearest_distance_km, 1)} km</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader
              title="Paling berdekatan"
              subtitle="Lima stasiun yang paling rapat — potensi tumpang tindih cakupan pemantauan."
            />
            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', display: 'grid', gap: 6 }}>
              {m.nearList.map((r) => (
                <li key={r.location_id}>
                  <strong>{r.station_code}</strong>
                  <span style={{ color: SOFT }}> → {r.nearest_station_code}: {formatNumber(r.nearest_distance_km, 1)} km</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </Section>

      {/* ═══ 3. KUALITAS DATA PM2.5 ═══════════════════════════════════════ */}
      <Section
        title={`PM2.5 tertinggi di ${topPm?.station_code ?? '—'} (${formatNumber(topPm?.mean, 1)} µg/m³) — tapi ${ppmCount} stasiun tidak bisa dibandingkan langsung`}
        description="Dua kelompok satuan dianalisis terpisah. Ini bukan kekurangan data, tapi batas teknis yang perlu dicatat."
      >
        <div className="layout-main">
          <Card>
            <CardHeader
              title={`PM2.5 dalam µg/m³ — ${m.pmUg.length} stasiun`}
              subtitle="Rata-rata seluruh periode per stasiun. Bisa dibandingkan satu sama lain."
            />
            <HBar
              rows={m.pmUg.map((r) => ({ label: r.station_code, value: r.mean }))}
              format={(v) => formatNumber(v, 1)}
              unit=" µg/m³"
              colorOf={(r) => r.value > 55 ? '#EF4444' : r.value > 25 ? '#F59E0B' : '#16A34A'}
            />
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
            <Card>
              <CardHeader
                title={`PM2.5 dalam ppm — ${m.pmPpm.length} stasiun`}
                subtitle="Hanya ditampilkan. Tidak dikonversi dan tidak dibandingkan dengan µg/m³."
              />
              {m.pmPpm.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: SOFT }}>Tidak ada stasiun dengan satuan ppm.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', display: 'grid', gap: 4 }}>
                  {m.pmPpm.map((r) => (
                    <li key={r.station_code}>
                      <strong>{r.station_code}</strong>: {formatNumber(r.mean, 4)} ppm
                      <span style={{ color: SOFT }}> ({formatNumber(r.valid_records, 0)} observasi valid)</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Insight
              icon={ArrowRight}
              color="#384E77"
              bg="rgba(56,78,119,0.07)"
              border="rgba(56,78,119,0.2)"
              title="Analisis PM2.5 lebih lanjut ada di halaman lain"
            >
              Tren, pola harian, dan episode kabut asap dibahas di halaman <strong>Kualitas Udara</strong>.
              Hubungan PM2.5 dengan kasus kesehatan ada di <strong>PM2.5 &amp; Kesehatan</strong>.
            </Insight>
          </div>
        </div>

        <Bridge>
          Dengan mengetahui sebaran lokasi, kondisi jaringan, dan kualitas data PM2.5, kita sudah bisa
          menentukan wilayah mana yang paling perlu tambahan titik pemantauan.
        </Bridge>
      </Section>

      {/* ═══ 4. PRIORITAS EVALUASI ════════════════════════════════════════ */}
      <Section
        title="Wilayah mana yang paling perlu ditambah titik pemantauan?"
        description="Dua peringkat dihitung terpisah: satu berdasarkan posisi stasiun dalam jaringan, satu berdasarkan kondisi operasional. Tag 'Terisolasi' dan 'Data tipis' menandai stasiun yang muncul di kedua daftar masalah."
      >
        {priorityHook.error || !priorityHook.data ? (
          <Insight title="Peringkat prioritas belum tersedia">
            Jalankan sel prioritas di notebook preprocessing agar file <code>station_priority.json</code> terbentuk.
          </Insight>
        ) : (
          <>
            <div className="layout-main">
              <RankTable
                title="Prioritas berdasarkan distribusi jaringan"
                subtitle="Stasiun yang terisolasi dan berada di wilayah dengan sedikit pemantauan."
                rows={priorityHook.data.distribution_ranking}
                scoreKey="distribution_score"
                rankKey="distribution_rank"
                farIds={farIds}
                lowCompIds={lowCompIds}
              />
              <RankTable
                title="Prioritas berdasarkan kesiapan operasional"
                subtitle="Stasiun dengan sensor bermasalah atau data yang sering bolong."
                rows={priorityHook.data.operational_ranking}
                scoreKey="operational_score"
                rankKey="operational_rank"
                farIds={farIds}
                lowCompIds={lowCompIds}
              />
            </div>
            <Insight
              icon={AlertTriangle}
              color="#384E77"
              bg="rgba(56,78,119,0.07)"
              border="rgba(56,78,119,0.2)"
              title="Cara membaca peringkat ini"
            >
              Peringkat ini adalah bahan untuk tinjauan lanjutan, bukan keputusan lokasi pembangunan.
              Stasiun yang muncul di kedua daftar — ditandai &quot;Terisolasi&quot; dan &quot;Data tipis&quot; — adalah
              yang paling prioritas untuk dievaluasi. Rekomendasi kebijakan konkret dibahas di halaman{' '}
              <strong>Insight &amp; Rekomendasi</strong>.
            </Insight>
          </>
        )}
      </Section>

      {/* ═══ 5. METODOLOGI ════════════════════════════════════════════════ */}
      <Section
        title="Metodologi dan catatan interpretasi"
        description="Sumber data, definisi indikator, dan batasan yang perlu dibaca sebelum menarik kesimpulan."
      >
        <div className="layout-3">
          {METHOD_ITEMS.map((item) => (
            <Card key={item.title}>
              <h4 style={{ margin: 0, color: NAVY, fontSize: '0.9rem' }}>{item.title}</h4>
              <p style={{ marginTop: 6, fontSize: '0.8rem', lineHeight: 1.6 }}>{item.text}</p>
            </Card>
          ))}
        </div>
      </Section>

    </ModuleLayout>
  )
}