'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  GitCompareArrows,
  HeartPulse,
  MapPin,
  Network,
  Stethoscope,
  Timer,
  Wind,
  Zap,
} from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { EChart } from '@/components/charts/EChart'
import { GROUP_COLORS, GROUP_ORDER, SECTORS, quantile } from '@/lib/korelasi'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useStations, useOverviewSummary, useOverviewAnalytics } from '@/hooks/useAqmsData'
import { useT4Data } from '@/hooks/usePm25KesehatanData'
import { useT3Tables } from '@/hooks/useKorelasiData'
import { useMonitoringNetworkSummary } from '@/hooks/useKecukupanData'
import { formatNumber } from '@/lib/formatters'
import { ccfRows } from '@/lib/pm25kesehatan'
import { useStationMaster, useStationCompleteness, useStationNearestNeighbor } from '@/hooks/useKecukupanData'
import { buildJaringanStats, COMP_THRESHOLD, FAR_KM } from '@/lib/jaringan'

const NAAQS_ANNUAL = 15
const WHO_ANNUAL = 5

/* ─── Status Scorecard Cards ───────────────────────────────────────────── */
const STATUS_CARDS = [
  {
    id: 'kualitas',
    icon: Wind,
    label: 'Kualitas Udara',
    status: 'kritis',
    statusColor: '#EF4444',
    statusLabel: 'Di atas pedoman WHO',
    desc: 'Rata-rata PM2.5 nasional di atas pedoman WHO dan naik pada 2025 dibanding 2024.',
    href: '/kualitas-udara',
    dot: '#EF4444',
  },
  {
    id: 'korelasi',
    icon: GitCompareArrows,
    label: 'Korelasi Faktor',
    status: 'perhatian',
    statusColor: '#FACC15',
    statusLabel: 'Lalu lintas paling berkaitan',
    desc: 'Intensitas lalu lintas berkaitan dengan PM2.5 secara positif, sedangkan faktor meteorologi cenderung lemah.',
    href: '/korelasi',
    dot: '#FACC15',
  },
  {
    id: 'kesehatan',
    icon: HeartPulse,
    label: 'Dampak Kesehatan',
    status: 'kritis',
    statusColor: '#EF4444',
    statusLabel: 'Tanpa bukti efek jeda',
    desc: 'Kasus ISPA, asma, PPOK, kardiovaskular, dan kematian bergerak searah dengan PM2.5. Efek jeda belum terbukti.',
    href: '/pm25-kesehatan',
    dot: '#EF4444',
  },
  {
    id: 'jaringan',
    icon: Network,
    label: 'Jaringan Stasiun',
    status: 'perhatian',
    statusColor: '#FACC15',
    statusLabel: 'Ada stasiun terisolasi',
    desc: null, // diisi dari data jaringan di ScorecardSection
    href: '/kecukupan-stasiun',
    dot: '#FACC15',
  },
]

function ScorecardSection({ jaringan }) {
  const jaringanDesc = jaringan
    ? `${jaringan.farCount} stasiun berjarak lebih dari ${FAR_KM} km dari tetangga terdekat, dan ${jaringan.belowCount} stasiun kelengkapannya di bawah ${COMP_THRESHOLD}%.`
    : 'Data jaringan sedang dimuat.'

  return (
    <Section
      title="Status dashboard"
      description="Ringkasan status dari keempat tujuan analisis berdasarkan data terkini."
    >
      <div className="ins-scorecard-grid">
        {STATUS_CARDS.map(({ id, icon: Icon, label, status, statusColor, statusLabel, desc, href, dot }) => (
          <Link
            key={id}
            href={href}
            className="card kpi ins-scorecard-card"
            style={{ '--ins-color': statusColor, '--ins-text': statusColor === '#FACC15' ? '#78350F' : statusColor }}
          >
            <div className="ins-scorecard-top">
              <span className="ins-scorecard-icon">
                <Icon size={15} />
              </span>
              <span className="ins-scorecard-status">
                <i style={{ background: dot }} />
                {statusLabel}
              </span>
            </div>
            <div>
              <p className="ins-scorecard-label">{label}</p>
              <p className="ins-scorecard-value">{status === 'kritis' ? 'Perlu perhatian' : 'Perlu penguatan'}</p>
              <p className="ins-scorecard-desc">{id === 'jaringan' ? jaringanDesc : desc}</p>
            </div>
            <div className="ins-scorecard-link">
              Detail <ChevronRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </Section>
  )
}

/* ─── Temuan Utama Tabs ──────────────────────────────────────────────────── */
const TAB_DEFS = [
  { id: 'kualitas', label: 'Kualitas Udara', icon: Wind, color: '#8BBEB2', href: '/kualitas-udara' },
  { id: 'korelasi', label: 'Korelasi', icon: GitCompareArrows, color: '#384E77', href: '/korelasi' },
  { id: 'kesehatan', label: 'Kesehatan', icon: HeartPulse, color: '#FB923C', href: '/pm25-kesehatan' },
  { id: 'jaringan', label: 'Jaringan', icon: Network, color: '#60A5FA', href: '/kecukupan-stasiun' },
]

function MiniBar({ value, max = 1, color = '#384E77', label, valueLabel }) {
  const pct = Math.min(100, (Math.abs(value) / (max || 1)) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#18314F' }}>{label}</span>
          {valueLabel && <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{valueLabel}</span>}
        </div>
      )}
      <div style={{ height: '0.4rem', borderRadius: '999px', background: 'rgba(24,49,79,0.07)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 'inherit', transition: 'width 400ms ease' }} />
      </div>
    </div>
  )
}

function FindingPoint({ icon: Icon = CheckCircle2, color = '#8BBEB2', text }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.55rem 0', borderBottom: '1px solid rgba(24,49,79,0.06)' }}>
      <span style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.4rem', display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${color} 15%, #fff)`, color, flexShrink: 0 }}>
        <Icon size={12} />
      </span>
      <span style={{ fontSize: '0.82rem', color: '#18314F', lineHeight: 1.55 }}>{text}</span>
    </li>
  )
}

const LANSIA_LAGS = [0, 3, 5, 7]

function LansiaLagChart({ t4 }) {
  const picked = useMemo(() => {
    const rows = ccfRows(t4?.ccf ?? [], 'ISPA lansia')
    return LANSIA_LAGS
      .map((lag) => rows.find((r) => r.lag === lag))
      .filter(Boolean)
  }, [t4])

  const option = useMemo(() => {
    const fmt = (v) => Number(v).toFixed(3).replace('.', ',')
    return {
      textStyle: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 11 },
      grid: { left: 52, right: 16, top: 24, bottom: 36 },
      tooltip: {
        trigger: 'axis',
        formatter: (ps) => {
          const r = picked[ps[0].dataIndex]
          return `<strong>Lag ${r.lag} hari</strong><br/>` +
            `Koefisien CCF: <strong>${fmt(r.koef_ccf)}</strong><br/>` +
            `CI 95%: ${fmt(r.ci95_bawah)} s.d. ${fmt(r.ci95_atas)}<br/>` +
            `Status: ${r.di_luar_ci95 ? 'di luar CI 95%' : 'di dalam CI 95%'}`
        },
      },
      xAxis: {
        type: 'category',
        data: picked.map((r) => `Lag ${r.lag}`),
        axisLabel: { color: '#18314F', fontWeight: 600 },
      },
      yAxis: {
        type: 'value',
        name: 'Koefisien CCF',
        nameTextStyle: { color: '#55706E' },
        splitLine: { lineStyle: { color: 'rgba(24,49,79,0.08)' } },
        axisLabel: { color: '#55706E', formatter: (v) => fmt(v) },
      },
      series: [{
        type: 'bar',
        barMaxWidth: 46,
        data: picked.map((r) => ({
          value: r.koef_ccf,
          itemStyle: {
            color: r.koef_ccf >= 0 ? '#EA580C' : '#384E77',
            opacity: r.di_luar_ci95 ? 1 : 0.45,
            borderRadius: r.koef_ccf >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
          },
        })),
        label: { show: true, position: 'top', formatter: (p) => fmt(p.value), fontWeight: 700, color: '#18314F' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: 'rgba(24,49,79,0.45)', type: 'dashed' },
          label: { show: false },
          data: [{ yAxis: 0 }],
        },
      }],
    }
  }, [picked])

  if (!picked.length) {
    return <p style={{ fontSize: '0.8rem' }}>Data CCF ISPA lansia belum tersedia.</p>
  }

  return <EChart option={option} height={260} />
}

function FindingsTabsSection({ avgPm25, t3, t4, analytics, networkSummary, jaringan }) {
  const [activeTab, setActiveTab] = useState('kualitas')

  const pm = buildPm25Stats(t3)
  const top5Korelasi = (pm?.faktor ?? []).slice(0, 5)
  const maxRho = top5Korelasi.length ? Math.abs(top5Korelasi[0].rho) : 1
  const utara = pm?.arah.find((r) => r.name === 'Utara')
  const arahTop = pm?.arah.reduce((b, r) => (!b || r.med > b.med ? r : b), null)
  const arahRep = pm?.arah
    .filter((r) => r.nStasiun >= ARAH_MIN_STASIUN)
    .reduce((b, r) => (!b || r.med > b.med ? r : b), null)

  const tipeOption = pm?.tipe.length
    ? barOption(pm.tipe, {
        colorOf: (r) => GROUP_COLORS[r.name] ?? '#384E77',
        tipOf: (r) =>
          `<strong>${r.name}</strong><br/>Median PM2.5: ${fmt2(r.med)} µg/m³<br/>${r.n} stasiun`,
      })
    : null
  const industri = pm?.tipe.find((r) => r.name === 'Industri')
  const ccf = t4?.ringkasan_ccf ?? []
  const bestLag = ccf.length > 0
    ? ccf.reduce((best, r) => (!best || Math.abs(Number(r.max_ccf ?? 0)) > Math.abs(Number(best.max_ccf ?? 0)) ? r : best), null)
    : null
  
  const maxDistKm = analytics.nearest.data?.overall?.max_km

  const TAB_CONTENT = {
    kualitas: (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: '2rem', paddingTop: '1.25rem' }} className="ins-tab-grid">
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18314F', marginBottom: '1rem', lineHeight: 1.3 }}>
            PM2.5 nasional {avgPm25 != null ? `${formatNumber(avgPm25 / WHO_ANNUAL, 1)}×` : '—'} di atas pedoman WHO
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <FindingPoint icon={AlertTriangle} color="#EF4444" text={`Rata-rata nasional ${avgPm25 != null ? formatNumber(avgPm25, 1) : '—'} µg/m³ — melampaui PP 22/2021 (${NAAQS_ANNUAL} µg/m³) maupun WHO AQG (${WHO_ANNUAL} µg/m³).`} />
            <FindingPoint icon={Wind} color="#8BBEB2" text="Polutan tertinggi terkonsentrasi di stasiun perkotaan padat dan wilayah lahan gambut saat musim kemarau." />
            <FindingPoint icon={Zap} color="#FACC15" text="Pola musiman jelas: musim kemarau (Juni–Oktober) secara konsisten memperburuk kualitas udara di sebagian besar lokasi." />
            <FindingPoint icon={AlertTriangle} color="#FB923C" text="Episode haze teridentifikasi di beberapa stasiun Kalimantan dan Sumatera dengan nilai PM2.5 sangat tinggi." />
            <FindingPoint icon={CheckCircle2} color="#22C55E" text="Stasiun di pesisir dan dataran tinggi umumnya menunjukkan kualitas udara lebih baik dibanding perkotaan." />
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Perbandingan standar</p>
            <MiniBar value={avgPm25 ?? 0} max={WHO_ANNUAL} color="#EF4444" label="vs WHO AQG 2021" valueLabel={avgPm25 != null ? `${formatNumber(avgPm25, 1)} µg/m³` : '—'} />
            <div style={{ marginTop: '0.65rem' }}>
              <MiniBar value={avgPm25 ?? 0} max={NAAQS_ANNUAL} color="#FB923C" label="vs PP 22/2021" valueLabel={avgPm25 != null ? `${formatNumber(avgPm25 / NAAQS_ANNUAL * 100, 0)}%` : '—'} />
            </div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(139,190,178,0.08)', border: '1px solid rgba(139,190,178,0.2)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#55706E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Interpretasi</p>
            <p style={{ fontSize: '0.78rem', color: '#18314F', lineHeight: 1.6 }}>
              Rata-rata PM2.5 nasional berada dalam kategori <strong>Sedang–Tidak Sehat</strong> menurut ISPU, yang berarti populasi sensitif sudah menghadapi risiko kesehatan nyata.
            </p>
          </div>
          <Link href="/kualitas-udara" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.65rem', background: '#18314F', color: '#E6F9AF', fontSize: '0.78rem', fontWeight: 700 }}>
              <Wind size={14} />
              Eksplorasi data kualitas udara
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </div>
          </Link>
        </div>
      </div>
    ),
    korelasi: (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: '2rem', paddingTop: '1.25rem' }} className="ins-tab-grid">
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18314F', marginBottom: '1rem', lineHeight: 1.3 }}>
            Faktor penentu PM2.5 bersifat multi-dimensi
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <FindingPoint
              icon={Zap}
              color="#384E77"
              text="Intensitas lalu lintas yang lebih tinggi cenderung berkaitan dengan peningkatan konsentrasi PM2.5."
            />
            <FindingPoint
              icon={MapPin}
              color="#FB923C"
              text="Jarak ke jalan raya menunjukkan hubungan negatif dengan konsentrasi PM2.5, sehingga stasiun yang lebih dekat dengan jalan raya cenderung memiliki konsentrasi PM2.5 lebih tinggi."
            />
            <FindingPoint
              icon={Wind}
              color="#8BBEB2"
              text="Faktor meteorologi, seperti suhu, kelembapan, dan kecepatan angin, cenderung menunjukkan hubungan yang lemah dengan konsentrasi PM2.5."
            />
            <FindingPoint
              icon={AlertTriangle}
              color="#EF4444"
              text={`Tipe lokasi industri memiliki median konsentrasi PM2.5 tertinggi dibandingkan kelompok lokasi lainnya, yaitu ${industri ? fmt2(industri.med) : '—'} µg/m³.`}
            />
            <FindingPoint
              icon={Zap}
              color="#FACC15"
              text={
                arahTop && arahRep && arahTop.name !== arahRep.name
                  ? `Median PM2.5 tertinggi secara keseluruhan tercatat saat angin dari arah ${arahTop.name} (${fmt2(arahTop.med)} µg/m³), tetapi hanya didukung ${arahTop.nStasiun} stasiun. Arah yang lebih representatif adalah ${arahRep.name} (${fmt2(arahRep.med)} µg/m³) dengan ${arahRep.nStasiun} stasiun.`
                  : arahRep
                    ? `Median PM2.5 tertinggi tercatat saat angin dari arah ${arahRep.name} (${fmt2(arahRep.med)} µg/m³), didukung ${arahRep.nStasiun} stasiun.`
                    : 'Data arah angin belum tersedia.'
              }
            />
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#55706E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top faktor (Spearman ρ)</p>
          {top5Korelasi.map((r) => {
            const rho = Number(r.rho)
            const color = rho > 0.3 ? '#384E77' : rho < -0.3 ? '#8BBEB2' : '#7C9693'
            return (
              <MiniBar
                key={r.key}
                value={Math.abs(rho)}
                max={maxRho}
                color={color}
                label={r.label}
                valueLabel={`${rho > 0 ? '+' : ''}${formatNumber(rho, 2)}`}
              />
            )
          })}
          <div style={{ marginTop: '0.75rem', padding: '0.9rem', borderRadius: '0.75rem', background: 'rgba(56,78,119,0.05)', border: '1px solid rgba(56,78,119,0.14)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#384E77', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Median PM2.5 per tipe lokasi
            </p>
            {tipeOption ? (
              <EChart option={tipeOption} height={190} />
            ) : (
              <LoadingSpinner label="Memuat data..." />
            )}
          </div>
          <Link href="/korelasi" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.65rem', background: '#384E77', color: '#E6F9AF', fontSize: '0.78rem', fontWeight: 700 }}>
              <GitCompareArrows size={14} />
              Eksplorasi korelasi faktor
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </div>
          </Link>
        </div>
      </div>
    ),
    kesehatan: (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: '2rem', paddingTop: '1.25rem' }} className="ins-tab-grid">
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18314F', marginBottom: '1rem', lineHeight: 1.3 }}>
            Kesimpulan kesehatan
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <FindingPoint icon={HeartPulse} color="#FB923C" text="PM2.5 menunjukkan korelasi positif dengan kasus ISPA balita, ISPA lansia, asma, dan PPOK, terutama pada hari yang sama dengan paparan." />
            <FindingPoint icon={Timer} color="#EF4444" text="Hubungan PM2.5 dengan sebagian besar indikator kesehatan cenderung paling kuat pada hari yang sama (lag 0), tanpa pola efek jeda yang konsisten hingga 14 hari." />
            <FindingPoint icon={AlertTriangle} color="#94A3B8" text="Penyakit kardiovaskular dan kematian tidak menunjukkan hubungan yang jelas dengan PM2.5 pada sebagian besar periode jeda yang dianalisis." />
            <FindingPoint icon={Stethoscope} color="#8BBEB2" text="Rata-rata kasus ISPA per rumah sakit per hari, baik pada balita maupun lansia, cenderung meningkat dari tahun 2024 hingga 2026. Kasus ISPA lansia juga secara konsisten lebih tinggi dibandingkan ISPA balita." />
            <FindingPoint icon={CheckCircle2} color="#22C55E" text="Meskipun jumlah kasus ISPA lansia lebih tinggi, hal tersebut belum cukup untuk menyimpulkan bahwa lansia lebih rentan, karena data jumlah populasi masing-masing kelompok tidak tersedia." />
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.9rem', borderRadius: '0.75rem', background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#FB923C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
              ISPA lansia · koefisien CCF pada lag terpilih
            </p>
            <p style={{ fontSize: '0.7rem', color: '#55706E', marginBottom: '0.5rem' }}>
              Nilai dibaca langsung dari hasil CCF (dengan penghapusan tren). Batang pekat berada di luar CI 95%.
            </p>
            <LansiaLagChart t4={t4} />
          </div>
          <Link href="/pm25-kesehatan" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.65rem', background: '#FB923C', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
              <HeartPulse size={14} />
              Eksplorasi data kesehatan
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </div>
          </Link>
        </div>
      </div>
    ),
    jaringan: !jaringan ? (
      <LoadingSpinner label="Memuat data jaringan..." />
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: '2rem', paddingTop: '1.25rem' }} className="ins-tab-grid">
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18314F', marginBottom: '1rem', lineHeight: 1.3 }}>
            {jaringan.total} stasiun, {jaringan.farCount} berjarak jauh dari tetangga, dan {jaringan.belowCount} di bawah {COMP_THRESHOLD}% kelengkapan
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <FindingPoint
              icon={Network}
              color="#60A5FA"
              text={`Median jarak ke tetangga terdekat ${jaringan.medianJarak != null ? formatNumber(jaringan.medianJarak, 1) : '—'} km. ${jaringan.isolatedCount} stasiun tergolong terisolasi (tanpa tetangga atau jarak di atas ${FAR_KM} km).`}
            />
            <FindingPoint
              icon={MapPin}
              color="#FACC15"
              text={jaringan.farCount > 0
                ? `${jaringan.farCount} stasiun berjarak lebih dari ${FAR_KM} km dari tetangga terdekatnya: ${jaringan.far.map((s) => s.code).join(', ')}.`
                : `Tidak ada stasiun yang berjarak lebih dari ${FAR_KM} km dari tetangga terdekatnya.`}
            />
            <FindingPoint
              icon={AlertTriangle}
              color="#FB923C"
              text={jaringan.belowCount > 0
                ? `${jaringan.belowCount} stasiun memiliki kelengkapan data di bawah ${COMP_THRESHOLD}%: ${jaringan.belowComp.map((s) => `${s.code} (${formatNumber(s.completeness, 1)}%)`).join(', ')}.`
                : `Semua stasiun memiliki kelengkapan data di atas ${COMP_THRESHOLD}%.`}
            />
            <FindingPoint
              icon={Zap}
              color={jaringan.intermittent + jaringan.defective > 0 ? '#EF4444' : '#22C55E'}
              text={`${jaringan.active} dari ${jaringan.totalSensors ?? '—'} sensor berstatus Active. ${jaringan.intermittent} Intermittent dan ${jaringan.defective} Defective perlu diperiksa.`}
            />
            <FindingPoint
              icon={CheckCircle2}
              color="#8BBEB2"
              text={jaringan.lowest
                ? `Kelengkapan rata-rata seluruh stasiun ${jaringan.avgComp != null ? formatNumber(jaringan.avgComp, 1) : '—'}%. Nilai terendah tercatat di ${jaringan.lowest.code} (${formatNumber(jaringan.lowest.completeness, 1)}%).`
                : 'Data kelengkapan belum tersedia.'}
            />
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.18)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
              Jumlah stasiun per pulau
            </p>
            {jaringan.islands.map((p) => (
              <div key={p.name} style={{ marginBottom: '0.5rem' }}>
                <MiniBar
                  value={p.count}
                  max={jaringan.total || 1}
                  color="#60A5FA"
                  label={p.name}
                  valueLabel={`${p.count} stasiun`}
                />
              </div>
            ))}
          </div>
          <div style={{ padding: '0.9rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Stasiun perlu perhatian ({jaringan.attention.length})
            </p>
            <p style={{ fontSize: '0.76rem', color: '#18314F', lineHeight: 1.6 }}>
              {jaringan.attention.map((s) => s.code).join(', ') || 'Tidak ada.'}
            </p>
          </div>
          <Link href="/kecukupan-stasiun" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.65rem', background: '#384E77', color: '#E6F9AF', fontSize: '0.78rem', fontWeight: 700 }}>
              <Network size={14} />
              Eksplorasi kecukupan jaringan
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </div>
          </Link>
        </div>
      </div>
    ),
  }

  const activeTabDef = TAB_DEFS.find((t) => t.id === activeTab)

  return (
    <Section
      title="Temuan utama per tujuan"
      description="Pilih tab untuk menjelajahi temuan kunci dari setiap modul analisis."
    >
      <Card className="ins-findings-card">
        {/* Tab Bar */}
        <div className="overview-tabs ins-findings-tabs">
          {TAB_DEFS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={activeTab === id ? 'is-active' : ''}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Icon size={13} style={{ color: activeTab === id ? activeTabDef?.color : undefined }} />
              {label}
            </button>
          ))}
        </div>
        {/* Tab Content */}
        <div className="ins-findings-content">
          {TAB_CONTENT[activeTab] ?? null}
        </div>
      </Card>
    </Section>
  )
}

/* ─── Matriks Rekomendasi ───────────────────────────────────────────────── */
const RECS = [
  { priority: 'tinggi', num: 1, label: 'Ekspansi jaringan stasiun', desc: 'Tambah 15–20 stasiun baru di wilayah terpencil (Papua, Kalimantan, NTT)', target: 'KLHK / BMKG', urgensi: 'Segera', color: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.18)' },
  { priority: 'tinggi', num: 2, label: 'Sistem peringatan dini', desc: 'Perkuat sistem alert PM2.5 berbasis threshold WHO (5 µg/m³) dan PP 22/2021 (15 µg/m³)', target: 'Dinas Kesehatan', urgensi: 'Segera', color: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.18)' },
  { priority: 'tinggi', num: 3, label: 'Intervensi kesehatan prioritas', desc: 'Program intervensi saat PM2.5 > 35 µg/m³ — fokus balita & lansia di area tercemar', target: 'Dinkes + Faskes', urgensi: 'Segera', color: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.18)' },
  { priority: 'tinggi', num: 4, label: 'Mitigasi gambut musim kemarau', desc: 'Protokol mitigasi emisi di wilayah gambut saat musim kemarau terdeteksi', target: 'BRGM + KLHK', urgensi: 'Musiman', color: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.18)' },
  { priority: 'sedang', num: 5, label: 'Perbaikan kelengkapan data', desc: 'Audit & perbaikan stasiun dengan kelengkapan < 80% — target ≥ 95% per stasiun', target: 'Operator AQMS', urgensi: '6 bulan', color: '#FACC15', bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.25)' },
  { priority: 'sedang', num: 6, label: 'Integrasi data lalu lintas', desc: 'Hubungkan data lalu lintas real-time (Waze/Google Maps API) dengan sistem AQMS', target: 'Tim IT KLHK', urgensi: '12 bulan', color: '#FACC15', bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.25)' },
  { priority: 'sedang', num: 7, label: 'Protokol episode haze', desc: 'SOP evakuasi, distribusi masker N95, penutupan sekolah saat haze terdeteksi', target: 'BNPB + Pemda', urgensi: '3 bulan', color: '#FACC15', bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.25)' },
  { priority: 'sedang', num: 8, label: 'Studi kardiovaskular-PM2.5', desc: 'Riset lanjutan korelasi PM2.5 dengan penyakit kardiovaskular & kematian dini', target: 'Lembaga riset', urgensi: '18 bulan', color: '#FACC15', bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.25)' },
  { priority: 'rendah', num: 9, label: 'Standardisasi kalibrasi sensor', desc: 'Protokol kalibrasi silang PM2.5 antar-stasiun untuk komparabilitas nasional', target: 'BSN + KLHK', urgensi: '24 bulan', color: '#22C55E', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)' },
  { priority: 'rendah', num: 10, label: 'Open data AQMS', desc: 'Publikasi data terbuka (open data) untuk komunitas peneliti dan masyarakat umum', target: 'Tim IT KLHK', urgensi: '24 bulan', color: '#22C55E', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)' },
]

const PRIORITY_LABELS = { tinggi: 'Prioritas Tinggi', sedang: 'Prioritas Sedang', rendah: 'Prioritas Rendah' }
const PRIORITY_COLORS = { tinggi: '#EF4444', sedang: '#FACC15', rendah: '#22C55E' }

function RecommendationMatrix() {
  return (
    <Section
      title="Matriks rekomendasi"
      description="10 rekomendasi berbasis data, dikelompokkan berdasarkan prioritas dan urgensi implementasi."
    >
      <Card className="ins-recommendation-card">
        <div className="ins-recommendation-groups">
        {['tinggi', 'sedang', 'rendah'].map((priority) => {
          const recs = RECS.filter((r) => r.priority === priority)
          const color = PRIORITY_COLORS[priority]
          return (
            <div key={priority} className="ins-recommendation-group">
              <div className="ins-priority-heading">
                <span style={{ background: color }} />
                <h3>{PRIORITY_LABELS[priority]}</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0.75rem' }} className="ins-rec-grid">
                {recs.map((r) => (
                  <div key={r.num} className="ins-recommendation-item" style={{ '--rec-color': r.color, '--rec-bg': r.bg, '--rec-border': r.border }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: `color-mix(in srgb, ${r.color} 20%, #fff)`, color: r.color === '#FACC15' ? '#78350F' : r.color, display: 'grid', placeItems: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                          {r.num}
                        </span>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#18314F', margin: 0, lineHeight: 1.3 }}>{r.label}</p>
                      </div>
                      <span style={{ padding: '0.18rem 0.5rem', borderRadius: '999px', background: `color-mix(in srgb, ${r.color} 15%, #fff)`, color: r.color === '#FACC15' ? '#78350F' : r.color, fontSize: '0.64rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{r.urgensi}</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#55706E', lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
                    <p style={{ fontSize: '0.68rem', color: '#7C9693', margin: 0 }}>Target: <strong style={{ color: '#18314F' }}>{r.target}</strong></p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        </div>
      </Card>
    </Section>
  )
}

/* ─── Timeline Implementasi ─────────────────────────────────────────────── */
const TIMELINE_PHASES = [
  {
    num: 1,
    period: '0 – 6 bulan',
    title: 'Intervensi Darurat',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.18)',
    items: ['Sistem peringatan dini PM2.5', 'Distribusi APD saat episode haze', 'Audit kelengkapan data stasiun', 'SOP protokol kesehatan darurat'],
  },
  {
    num: 2,
    period: '6 – 18 bulan',
    title: 'Ekspansi & Integrasi',
    color: '#FACC15',
    bg: 'rgba(250,204,21,0.06)',
    border: 'rgba(250,204,21,0.25)',
    items: ['Pembangunan 8–10 stasiun baru (Papua, Kalimantan)', 'Integrasi data lalu lintas real-time', 'Perbaikan & upgrade sensor defective', 'Studi korelasi kardiovaskular-PM2.5'],
  },
  {
    num: 3,
    period: '18 – 36 bulan',
    title: 'Sistem Terintegrasi',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.2)',
    items: ['Jaringan 40+ stasiun nasional', 'Platform open data publik', 'Standardisasi kalibrasi sensor nasional', 'Evaluasi dampak intervensi kebijakan'],
  },
]

function TimelineSection() {
  return (
    <Section
      title="Timeline implementasi"
      description="Tiga fase implementasi rekomendasi berdasarkan urgency dan kompleksitas."
    >
      <Card className="ins-timeline-card">
      <div className="ins-timeline-grid">
        {/* Connector line */}
        <div style={{
          position: 'absolute', top: '2.25rem', left: '10%', right: '10%', height: '2px',
          background: 'linear-gradient(90deg, #EF4444, #FACC15, #22C55E)',
          zIndex: 0, borderRadius: '1px',
        }} className="ins-timeline-line" />
        {TIMELINE_PHASES.map((phase) => (
          <div key={phase.num} className="ins-timeline-phase" style={{ '--phase-color': phase.color, '--phase-bg': phase.bg, '--phase-border': phase.border }}>
            {/* Phase number */}
            <div className="ins-timeline-phase-head">
              <div className="ins-timeline-number">
                <span>F{phase.num}</span>
              </div>
              <div>
                <p className="ins-timeline-period">{phase.period}</p>
                <p className="ins-timeline-title">{phase.title}</p>
              </div>
            </div>
            {/* Items */}
            <ul className="ins-timeline-items">
              {phase.items.map((item) => (
                <li key={item}>
                  <span style={{ background: phase.color }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      </Card>
    </Section>
  )
}

/* ─── Data PM2.5 dari tabel T3 (sumber sama dengan halaman Korelasi) ──── */
const MIN_JAM_ARAH = 30
const FACTOR_LABEL = {
  temperature: 'Suhu',
  humidity: 'Kelembapan',
  wind_speed: 'Kecepatan angin',
  lalu_lintas: 'Intensitas lalu lintas',
  jarak_jalan: 'Jarak ke jalan raya',
}

const ARAH_MIN_STASIUN = 10 // arah dengan jumlah stasiun di bawah ini dianggap kurang terwakili
function buildPm25Stats(t) {
  if (!t) return null

  // Median PM2.5 per arah angin: median dari median stasiun (stasiun dengan >= 30 jam valid)
  const arah = SECTORS.map((s) => {
    const all = (t.arah_angin ?? []).filter(
      (r) => r.polutan === 'pm25' && r.arah_angin === s.name
    )
    const used = all.filter((r) => r.n_valid >= MIN_JAM_ARAH)
    const meds = used.map((r) => r.median)
    return {
      name: s.name,
      med: meds.length ? quantile(meds, 0.5) : null,
      nStasiun: used.length,
    }
  }).filter((x) => x.med != null)

  // Median PM2.5 per tipe lokasi
  const tipe = GROUP_ORDER.map((g) => {
    const row = (t.tipe_ringkasan ?? []).find(
      (r) => r.tipe_lokasi === g && r.polutan === 'pm25'
    )
    return row ? { name: g, med: row.median, n: row.jumlah_stasiun } : null
  })
    .filter(Boolean)
    .sort((a, b) => b.med - a.med)

  // Korelasi Spearman PM2.5 dengan tiap faktor
  const faktor = [
    ...(t.median_korelasi ?? [])
      .filter((r) => r.polutan === 'pm25')
      .map((r) => ({ key: r.variabel, rho: r.median_spearman })),
    ...(t.korelasi_karakteristik ?? [])
      .filter((r) => r.polutan === 'pm25')
      .map((r) => ({ key: r.variabel_karakteristik, rho: r.spearman_rho })),
  ]
    .filter((r) => r.rho != null)
    .map((r) => ({ ...r, label: FACTOR_LABEL[r.key] ?? r.key }))
    .sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho))

  return { arah, tipe }
}

const fmt2 = (v) => Number(v).toFixed(2).replace('.', ',')

function barOption(items, { colorOf, tipOf }) {
  return {
    textStyle: { fontFamily: 'inherit', fontSize: 11 },
    grid: { left: 8, right: 64, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (ps) => tipOf(items[ps[0].dataIndex]),
    },
    xAxis: {
      type: 'value',
      name: 'µg/m³',
      nameLocation: 'end',
      nameTextStyle: { fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map((i) => i.name),
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      barMaxWidth: 22,
      data: items.map((i) => ({
        value: i.med,
        itemStyle: { color: colorOf(i), borderRadius: [0, 6, 6, 0] },
      })),
      label: {
        show: true,
        position: 'right',
        formatter: (p) => fmt2(p.value),
        fontWeight: 'bold',
        fontSize: 11,
      },
    }],
  }
}


/* ═══ PAGE ══════════════════════════════════════════════════════════════════ */
export default function InsightPage() {
  const { data: stations } = useStations()
  const { data: summary } = useOverviewSummary()
  const analytics = useOverviewAnalytics()
  const { data: t4 } = useT4Data()
  const { data: t3 } = useT3Tables()
  const { data: networkSummary } = useMonitoringNetworkSummary()
  const { data: stationMaster } = useStationMaster()
  const { data: stationComp } = useStationCompleteness()
  const { data: stationNearest } = useStationNearestNeighbor()

  const jaringan = useMemo(
    () => buildJaringanStats({
      summary: networkSummary,
      stationsRaw: stationMaster,
      comp: stationComp,
      nearest: stationNearest,
    }),
    [networkSummary, stationMaster, stationComp, stationNearest]
  )

  const all = stations ?? []

  const avgPm25 = useMemo(() => {
    const valid = (all).filter((s) => Number.isFinite(s.avg_pm25))
    if (!valid.length) return null
    return valid.reduce((t, s) => t + s.avg_pm25, 0) / valid.length
  }, [all])

  const [subTab, setSubTab] = useState('insight')

  return (
    <ModuleLayout
      eyebrow="Sintesis & Rekomendasi"
      title="Insight & Rekomendasi"
      description="Sintesis temuan lintas empat tujuan analisis: kualitas udara, korelasi polutan, dampak kesehatan, dan kecukupan jaringan."
    >
      <div className="ov-subtabs" role="tablist" aria-label="Bagian insight">
        {[
          { id: 'insight', label: 'Insight' },
          { id: 'rekomendasi', label: 'Rekomendasi' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            className={`ov-subtab${subTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'insight' && (
        <>
          <ScorecardSection jaringan={jaringan} />
          <FindingsTabsSection
            avgPm25={avgPm25}
            t3={t3}
            t4={t4}
            analytics={analytics}
            networkSummary={networkSummary}
            jaringan={jaringan}
          />
        </>
      )}

      {subTab === 'rekomendasi' && (
        <>
          <RecommendationMatrix />
          <TimelineSection />
        </>
      )}
    </ModuleLayout>
  )
}
