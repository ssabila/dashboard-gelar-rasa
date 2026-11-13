'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  CloudRain,
  Database,
  GitCompareArrows,
  HeartPulse,
  Lightbulb,
  LayoutDashboard,
  MapPin,
  Sun,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import './overview.css'
import { Card, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { FilterBar } from '@/components/shared/FilterBar'
import { IspuLegend } from '@/components/shared/IspuLegend'
import {
  useStations,
  useOverviewSummary,
  useOverviewAnalytics,
  useIspuDaily,
  useAnnualRows,
  useSeasonalRows,
  useHourlyRows,
} from '@/hooks/useAqmsData'
import { useFilter } from '@/hooks/useFilter'
import { ISPU_CATEGORIES, POLLUTANTS } from '@/lib/constants'
import { formatNumber, getIspuFromPm25 } from '@/lib/formatters'
import { IspuDonut, StationRanking, shortName } from './panels'

const StationMap = dynamic(
  () => import('@/map/StationMap').then((m) => m.StationMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

const EMPTY = []
const NAAQS = POLLUTANTS.pm25.naaqsAnnual // 15 µg/m³, PP 22/2021 tahunan
const WHO = POLLUTANTS.pm25.whoAnnual     // 5 µg/m³, WHO AQG 2021 tahunan
const MONTHS_SPAN = 33.4                  // Jan 2024 – 14 Okt 2026, untuk normalisasi per bulan
const UNHEALTHY = ['Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya']

const SUB_TABS = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'metodologi', label: 'Metodologi & keterbatasan', icon: BookOpen },
]

function SubTabs({ value, onChange }) {
  return (
    <div className="ov-tabbar" role="tablist" aria-label="Bagian overview">
      {SUB_TABS.map(({ id, label, icon: Icon }) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`ov-tab${active ? ' is-active' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="ov-tab-ico" aria-hidden="true">
              <Icon size={15} />
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Helper ───────────────────────────────────────────────────────────── */
const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : formatNumber(v, d))
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
const inRange = (d, start, end) => {
  const x = String(d ?? '').slice(0, 10)
  return x >= start && x <= end
}
const isPpm = (r) => String(r.satuan ?? r.unit ?? '').toLowerCase().includes('ppm')
const stationId = (s) => String(s?.station_code ?? '').replace(/^AQMS-/, '')

/** Perubahan rata-rata 2025 dibanding 2024, hanya stasiun yang punya data kedua tahun. */
function annualChange(rows) {
  const by = { 2024: new Map(), 2025: new Map() }
  rows.forEach((r) => {
    const y = Number(r.tahun)
    const v = Number(r.pm25)
    if (!by[y] || isPpm(r) || !r.station_id || !Number.isFinite(v)) return
    by[y].set(r.station_id, v)
  })
  const common = [...by[2024].keys()].filter((k) => by[2025].has(k))
  const a = mean(common.map((k) => by[2024].get(k)))
  const b = mean(common.map((k) => by[2025].get(k)))
  if (a == null || b == null || a === 0) return null
  return { change: ((b - a) / a) * 100, n: common.length }
}

/** Rata-rata PM2.5 musim hujan dan kemarau dalam periode terpilih. */
function seasonStats(rows, start, end) {
  const g = { 'Musim Hujan': [], 'Musim Kemarau': [] }
  rows.forEach((r) => {
    if (isPpm(r) || !inRange(r.tanggal, start, end)) return
    const v = Number(r.pm25)
    if (!Number.isFinite(v) || !g[r.musim]) return
    g[r.musim].push(v)
  })
  return { hujan: mean(g['Musim Hujan']), kemarau: mean(g['Musim Kemarau']) }
}

/** Jam dengan rata-rata PM2.5 tertinggi. */
function peakHour(rows, start, end) {
  const g = Array.from({ length: 24 }, () => [])
  rows.forEach((r) => {
    if (isPpm(r)) return
    if (r.tanggal && !inRange(r.tanggal, start, end)) return
    const h = Number(r.jam)
    const v = Number(r.pm25)
    if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isFinite(v)) return
    g[h].push(v)
  })
  let best = null
  g.forEach((arr, h) => {
    const m = mean(arr)
    if (m != null && (!best || m > best.value)) best = { hour: h, value: m }
  })
  return best
}

function OvSection({ no, title, desc, children }) {
  return (
    <section className="ov-sec">
      <header className="ov-sec-head">
        <span className="ov-sec-no" aria-hidden="true">{no}</span>
        <div>
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function KpiCard({ label, icon: Icon, value, unit, note }) {
  return (
    <article className="ov-kpi">
      <div className="ov-kpi-top">
        <span className="ov-kpi-label">{label}</span>
        {Icon && (
          <span className="ov-kpi-ico" aria-hidden="true">
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="ov-kpi-val">
        {value ?? '—'}
        {unit && <small>{unit}</small>}
      </div>
      {note && <p className="ov-kpi-note">{note}</p>}
    </article>
  )
}

function Takeaway({ children }) {
  return (
    <div className="ov-takeaway">
      <span className="ov-takeaway-label">Kesimpulan</span>
      <p>{children}</p>
    </div>
  )
}

/** Meter PM2.5 dengan penanda WHO dan PP 22/2021. */
function Meter({ value, max, color }) {
  const pct = (v) => `${Math.min(100, (Math.max(0, v) / max) * 100)}%`
  return (
    <div className="ov-meter" role="img" aria-label={`PM2.5 ${fmt(value)} µg/m³ dibanding acuan tahunan`}>
      <div className="ov-meter-track">
        <span className="ov-meter-fill" style={{ width: pct(value ?? 0), background: color ? color : undefined }} />
        <span className="ov-meter-mark" style={{ left: pct(WHO) }} />
        <span className="ov-meter-mark" style={{ left: pct(NAAQS) }} />
      </div>
      <div className="ov-meter-labels">
        <span style={{ left: pct(WHO) }}>WHO {WHO}</span>
        <span style={{ left: pct(NAAQS) }}>PP 22/2021 {NAAQS}</span>
      </div>
    </div>
  )
}

const NAV_LINKS = [
  { question: 'Bagaimana kondisi tiap wilayah dan waktu?', href: '/kualitas-udara', icon: Wind, color: '#8BBEB2' },
  { question: 'Faktor apa yang berhubungan dengan PM2.5?', href: '/korelasi', icon: GitCompareArrows, color: '#384E77' },
  { question: 'Bagaimana dampaknya bagi balita dan lansia?', href: '/pm25-kesehatan', icon: HeartPulse, color: '#FB923C' },
  { question: 'Apakah 27 stasiun sudah cukup?', href: '/kecukupan-stasiun', icon: MapPin, color: '#FACC15' },
  { question: 'Apa rekomendasi kebijakannya?', href: '/insight', icon: Lightbulb, color: '#E6F9AF' },
]

function MethodologyPanel() {
  const groups = [
    {
      title: 'Data dan pengolahan',
      items: [
        'Dataset bersifat sintetis dan disediakan panitia Gelar Rasa 2026. Tidak ada data eksternal yang digunakan.',
        'Hanya observasi dengan qc_flag = VALID yang digunakan.',
        'Nilai kosong dipertahankan sebagai null dan tidak diubah menjadi nol.',
        'PM2.5 dalam ppm dan µg/m³ tidak dicampur dan tidak dikonversi.',
      ],
    },
    {
      title: 'Baku mutu dan acuan',
      items: [
        'Baku mutu nasional: PP No. 22/2021, PM2.5 tahunan 15 µg/m³.',
        'Pedoman WHO AQG 2021, PM2.5 tahunan 5 µg/m³, sebagai pembanding kesehatan.',
        'Kategori ISPU mengacu pada Permen LHK No. 14/2020. Breakpoint ISPU berlaku untuk konsentrasi 24 jam.',
      ],
    },
    {
      title: 'Batasan interpretasi',
      items: [
        'Korelasi menunjukkan keterkaitan, bukan hubungan sebab-akibat.',
        'Data kesehatan belum dipisah per stasiun dan tidak mewakili seluruh populasi.',
        'Jarak antarstasiun menggambarkan kedekatan lokasi pemantauan, bukan bukti area yang tidak terpantau.',
        'Hasil di setiap halaman mencerminkan stasiun yang tersedia, bukan kondisi seluruh wilayah Indonesia.',
      ],
    },
  ]

  return (
    <div className="ov-method-grid">
      {groups.map((g) => (
        <Card key={g.title} variant="tint" className="ov-method-card">
          <h4>{g.title}</h4>
          <ul>
            {g.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

/* ═══ PAGE ══════════════════════════════════════════════════════════════════ */
export default function OverviewPage() {
  const { data: stations, loading: stationLoading, error: stationError } = useStations()
  const { data: summary } = useOverviewSummary()
  const { data: ispuDaily } = useIspuDaily()
  const { data: annualRows } = useAnnualRows()
  const { data: seasonalRows } = useSeasonalRows()
  const { data: hourlyRows } = useHourlyRows()
  const analytics = useOverviewAnalytics()
  const { filters, setDateRange, setRegion, resetFilters } = useFilter()
  const [subTab, setSubTab] = useState('overview')

  const all = stations ?? EMPTY

  const regions = useMemo(
    () => [...new Set(all.map((s) => s.region_group).filter(Boolean))].sort(),
    [all]
  )

  /* Stasiun dalam wilayah terpilih */
  const regionStations = useMemo(
    () => (filters.regionGroup ? all.filter((s) => s.region_group === filters.regionGroup) : all),
    [all, filters.regionGroup]
  )
  const regionProvinces = useMemo(
    () => (filters.regionGroup ? new Set(regionStations.map((s) => s.provinsi)) : null),
    [regionStations, filters.regionGroup]
  )

  /* Satu sumber data: observasi harian, sama dengan tab Kualitas Udara */
  const dailyScoped = useMemo(
    () =>
      (ispuDaily ?? EMPTY).filter(
        (r) =>
          inRange(r.tanggal, filters.dateStart, filters.dateEnd) &&
          !isPpm(r) &&
          (!regionProvinces || regionProvinces.has(r.provinsi))
      ),
    [ispuDaily, filters.dateStart, filters.dateEnd, regionProvinces]
  )

  const dailyByStation = useMemo(() => {
    const m = new Map()
    dailyScoped.forEach((r) => {
      const v = Number(r.pm25)
      if (!r.station_id || !Number.isFinite(v)) return
      const g = m.get(r.station_id) ?? { sum: 0, n: 0 }
      g.sum += v
      g.n += 1
      m.set(r.station_id, g)
    })
    return m
  }, [dailyScoped])

  /* Stasiun dengan rata-rata PM2.5 dari observasi harian (untuk peta dan peringkat) */
  const scoped = useMemo(
    () =>
      regionStations.map((s) => {
        const g = dailyByStation.get(stationId(s))
        return { ...s, avg_pm25: g ? g.sum / g.n : null }
      }),
    [regionStations, dailyByStation]
  )

  const nationalAvg = useMemo(() => {
    const values = dailyScoped.map((r) => Number(r.pm25)).filter(Number.isFinite)
    return mean(values)
  }, [dailyScoped])

  const valid = useMemo(() => scoped.filter((s) => Number.isFinite(s.avg_pm25)), [scoped])
  const exceedCount = valid.filter((s) => s.avg_pm25 > NAAQS).length
  const ratioNaaqs = nationalAvg != null ? nationalAvg / NAAQS : null
  const ratioWho = nationalAvg != null ? nationalAvg / WHO : null
  const nationalCat = nationalAvg != null ? getIspuFromPm25(nationalAvg) : null

  /* Sebaran ISPU dari observasi harian */
  const ispuCounts = useMemo(
    () => ISPU_CATEGORIES.map((c) => ({ ...c, count: dailyScoped.filter((r) => r.kategori_ispu === c.label).length })),
    [dailyScoped]
  )
  const totalObs = dailyScoped.length
  const unhealthyCount = ispuCounts.filter((c) => UNHEALTHY.includes(c.label)).reduce((s, c) => s + c.count, 0)
  const unhealthyPct = totalObs ? (unhealthyCount / totalObs) * 100 : null

  /* Peringkat provinsi */
  const provinceRank = useMemo(() => {
    const g = new Map()
    dailyScoped.forEach((r) => {
      const v = Number(r.pm25)
      if (!r.provinsi || !Number.isFinite(v)) return
      const x = g.get(r.provinsi) ?? { sum: 0, n: 0 }
      x.sum += v
      x.n += 1
      g.set(r.provinsi, x)
    })
    return [...g.entries()].map(([name, x]) => ({ name, value: x.sum / x.n })).sort((a, b) => b.value - a.value)
  }, [dailyScoped])
  const topProvince = provinceRank[0] ?? null

  /* Tren, musim, dan jam */
  const trend = useMemo(() => (annualRows ? annualChange(annualRows) : null), [annualRows])
  const season = useMemo(
    () => (seasonalRows ? seasonStats(seasonalRows, filters.dateStart, filters.dateEnd) : null),
    [seasonalRows, filters.dateStart, filters.dateEnd]
  )
  
  const seasonWord =
    season && season.hujan != null && season.kemarau != null
      ? season.kemarau > season.hujan ? 'Kemarau' : 'Hujan'
      : null
  const peak = useMemo(
    () => (hourlyRows ? peakHour(hourlyRows, filters.dateStart, filters.dateEnd) : null),
    [hourlyRows, filters.dateStart, filters.dateEnd]
  )

  /* Kesehatan: total dinormalisasi per bulan */
  const health = summary?.health ?? null
  const respPerMonth = health ? health.total_resp / MONTHS_SPAN : null
  const deathPerMonth = health ? health.total_death / MONTHS_SPAN : null

  /* Kelengkapan data */
  const avgCompleteness = useMemo(() => {
    const codes = new Set(scoped.map((s) => s.station_code))
    const values = (analytics.readiness.data?.stations ?? [])
      .filter((r) => codes.has(r.station_code))
      .map((r) => Number(r.completeness_pct))
      .filter(Number.isFinite)
    return mean(values)
  }, [analytics.readiness.data, scoped])

  const trendWord = trend ? (trend.change >= 0 ? 'naik' : 'turun') : null
  const meterMax = Math.max(nationalAvg ?? 0, NAAQS) * 1.25

    return (
    <ModuleLayout
      eyebrow="Gambaran besar"
      title="Overview"
      description="Seberapa buruk kualitas udara Indonesia, di mana dan kapan paling buruk, serta apa dampaknya bagi kesehatan."
    >
      <SubTabs value={subTab} onChange={setSubTab} />

      {subTab === 'overview' && (
        <div className="ov-page">
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
              {/* Hero: seberapa buruk? */}
              <section className="ov-hero">
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <span className="ov-kicker">Ringkasan nasional</span>
                  <h2 className="ov-hero-title">
                    Rata-rata PM2.5 nasional <em>{fmt(nationalAvg)} µg/m³</em>, sekitar {fmt(ratioNaaqs)}× batas tahunan PP 22/2021.
                  </h2>
                  <p className="ov-hero-sub">
                    {exceedCount} dari {valid.length} stasiun berada di atas batas tersebut.{' '}
                    {trend
                      ? `Dibanding 2024, rata-rata PM2.5 ${trendWord} ${fmt(Math.abs(trend.change))}% pada 2025.`
                      : 'Perubahan tahunan belum tersedia untuk periode ini.'}
                  </p>
                  <div className="ov-chips">
                    <span className="ov-chip">
                      <CalendarRange size={12} aria-hidden="true" />
                      {filters.dateStart.slice(0, 7).replace('-', '/')} – {filters.dateEnd.slice(0, 7).replace('-', '/')}
                    </span>
                    <span className="ov-chip">
                      <Database size={12} aria-hidden="true" />
                      {formatNumber(summary?.total_valid_records ?? totalObs)} observasi valid
                    </span>
                    {avgCompleteness != null && (
                      <span className="ov-chip">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Kelengkapan {fmt(avgCompleteness)}%
                      </span>
                    )}
                    <span className="ov-chip">Data sintetis · Gelar Rasa 2026</span>
                  </div>
                </div>

                <aside className="ov-hero-panel" style={{ position: 'relative', zIndex: 1 }}>
                  <span className="ov-hero-panel-label">PM2.5 dibanding acuan tahunan</span>
                  <Meter value={nationalAvg} max={meterMax} color={nationalCat?.color} />
                  <p className="ov-hero-panel-note">
                    Kategori ISPU: <strong>{nationalCat?.label ?? '—'}</strong> · {fmt(ratioWho)}× pedoman WHO
                  </p>
                </aside>
              </section>

              <div className="ov-kpis">
                <KpiCard
                  label="PM2.5 rata-rata nasional"
                  icon={Wind}
                  value={fmt(nationalAvg)}
                  unit="µg/m³"
                  color="#FB923C"
                  note={nationalCat ? `Kategori ${nationalCat.label}` : '—'}
                />
                <KpiCard
                  label="Stasiun di atas baku mutu"
                  icon={MapPin}
                  value={exceedCount}
                  unit={`dari ${valid.length}`}
                  color="#EF4444"
                  note={`Rata-rata periode di atas ${NAAQS} µg/m³ per tahun`}
                />
                <KpiCard
                  label="Perubahan 2025 vs 2024"
                  icon={trend && trend.change > 0 ? TrendingUp : TrendingDown}
                  value={trend ? `${trend.change > 0 ? '+' : ''}${fmt(trend.change)}%` : '—'}
                  color={trend && trend.change > 0 ? '#EF4444' : '#22C55E'}
                  note={trend ? `Rata-rata ${trend.n} stasiun yang punya data kedua tahun` : 'Data tahunan belum tersedia'}
                />
              </div>

              {/* 01 */}
              <OvSection
                no="01"
                title="Di mana paling buruk?"
                desc="Warna titik menunjukkan kategori ISPU dari rata-rata PM2.5 stasiun pada periode terpilih."
              >
                <div className="ov-map-layout">
                  <Card className="ov-map-card">
                    <div className="map-frame">
                      <StationMap stations={scoped} height="400px" />
                    </div>
                    <div className="map-foot">
                      <IspuLegend note="ISPU PM2.5 · Permen LHK No. 14/2020" />
                    </div>
                  </Card>
                  <div className="ov-map-side">
                    <IspuDonut counts={ispuCounts} unit="observasi" />
                  </div>
                  <StationRanking stations={scoped} className="ov-rank-full" />
                </div>
                <Takeaway>
                  {topProvince && (
                    <>Provinsi <strong>{topProvince.name}</strong> mencatat rata-rata tertinggi ({fmt(topProvince.value)} µg/m³). </>
                  )}
                  {unhealthyPct != null && (
                    <>Sekitar {fmt(unhealthyPct, 0)}% observasi harian berada di kategori Tidak Sehat atau lebih buruk.</>
                  )}
                </Takeaway>
              </OvSection>

              {/* 02 */}
              <OvSection
                no="02"
                title="Kapan paling buruk?"
                desc="Perbedaan musim dan jam dalam sehari, dari pola rata-rata periode terpilih."
              >
                <div className="ov-kpis is-2">
                  <KpiCard
                    label="Musim dengan PM2.5 lebih tinggi"
                    icon={seasonWord === 'Hujan' ? CloudRain : Sun}
                    value={seasonWord ?? '—'}
                    color="#384E77"
                    note={
                      season && season.hujan != null && season.kemarau != null
                        ? `Kemarau ${fmt(season.kemarau)} µg/m³ · Hujan ${fmt(season.hujan)} µg/m³`
                        : 'Data musim belum tersedia'
                    }
                  />
                  <KpiCard
                    label="Jam dengan PM2.5 tertinggi"
                    icon={Wind}
                    value={peak ? `${String(peak.hour).padStart(2, '0')}.00` : '—'}
                    color="#FB923C"
                    note={peak ? `Rata-rata ${fmt(peak.value)} µg/m³ pada jam tersebut` : 'Data per jam belum tersedia'}
                  />
                </div>
                <Takeaway>
                  {seasonWord && <>Udara cenderung lebih buruk pada musim <strong>{seasonWord.toLowerCase()}</strong>. </>}
                  {peak && <>Konsentrasi tertinggi rata-rata terjadi sekitar pukul {String(peak.hour).padStart(2, '0')}.00.</>}
                </Takeaway>
                <a href="/kualitas-udara" className="ov-link">
                  Lihat pola lengkap per musim dan jam <ArrowRight size={14} aria-hidden="true" />
                </a>
              </OvSection>

              {/* 03 */}
              <OvSection
                no="03"
                title="Dampaknya bagi kesehatan"
                desc="Angka kesehatan dinormalisasi per bulan agar mudah dibandingkan, bukan total mentah."
              >
                <div className="ov-kpis is-2">
                  <KpiCard
                    label="Rawat inap pernapasan"
                    icon={HeartPulse}
                    value={respPerMonth != null ? formatNumber(respPerMonth) : '—'}
                    unit="kasus/bulan"
                    color="#EF4444"
                    note="Rata-rata seluruh periode data kesehatan"
                  />
                  <KpiCard
                    label="Kematian"
                    icon={HeartPulse}
                    value={deathPerMonth != null ? formatNumber(deathPerMonth, 1) : '—'}
                    unit="jiwa/bulan"
                    color="#55706E"
                    note="Rata-rata seluruh periode data kesehatan"
                  />
                </div>
                <Takeaway>
                  Kasus pernapasan tercatat setiap bulan, tetapi keterkaitannya dengan PM2.5 perlu dibaca di halaman khusus, karena angka ini belum menunjukkan sebab-akibat.
                </Takeaway>
                <a href="/pm25-kesehatan" className="ov-link">
                  Lihat hubungan PM2.5 dan kesehatan <ArrowRight size={14} aria-hidden="true" />
                </a>
              </OvSection>

              {/* 04 */}
              <OvSection
                no="04"
                title="Seberapa bisa dipercaya datanya?"
                desc="Batasan ini berlaku untuk seluruh halaman dashboard."
              >
                <div className="ov-trust">
                  <div className="ov-trust-item">
                    <h3>Data sintetis</h3>
                    <p>Data berasal dari panitia Gelar Rasa 2026, sehingga bukan hasil pengukuran resmi di lapangan.</p>
                  </div>
                  <div className="ov-trust-item">
                    <h3>ISPU sebagai gambaran umum</h3>
                    <p>Kategori dihitung dari rata-rata harian dan periode. Ini gambaran umum, bukan penilaian resmi setiap hari.</p>
                  </div>
                  <div className="ov-trust-item" >
                    <h3>Asosiasi, bukan sebab-akibat</h3>
                    <p>Keterkaitan antarvariabel menunjukkan asosiasi. Jarak antarstasiun juga bukan bukti wilayah tanpa polusi.</p>
                  </div>
                </div>
                <button type="button" className="ov-link" onClick={() => setSubTab('metodologi')}>
                  Lihat metodologi lengkap <ArrowRight size={14} aria-hidden="true" />
                </button>
              </OvSection>

              {/* 05 */}
              <OvSection no="05" title="Telusuri lebih lanjut">
                <nav className="ov-nav" aria-label="Halaman terkait">
                  {NAV_LINKS.map(({ question, href, icon: Icon, color }) => (
                    <a key={href} href={href} className="ov-nav-tile" style={{ '--nc': color }}>
                      <span className="ov-nav-ico" aria-hidden="true">
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="ov-nav-text">{question}</span>
                      <ArrowRight size={16} className="ov-nav-arrow" aria-hidden="true" />
                    </a>
                  ))}
                </nav>
              </OvSection>
            </>
          )}
        </div>
      )}

      {subTab === 'metodologi' && <MethodologyPanel />}
    </ModuleLayout>
  )
}