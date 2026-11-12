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
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useStations, useOverviewSummary, useOverviewAnalytics } from '@/hooks/useAqmsData'
import { useT4Data } from '@/hooks/usePm25KesehatanData'
import { useT3Tables } from '@/hooks/useKorelasiData'
import { useMonitoringNetworkSummary } from '@/hooks/useKecukupanData'
import { formatNumber } from '@/lib/formatters'
import { POLLUTANTS } from '@/lib/constants'

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
    statusBg: 'rgba(239,68,68,0.08)',
    statusBorder: 'rgba(239,68,68,0.2)',
    statusLabel: 'Melampaui WHO AQG',
    desc: 'PM2.5 nasional jauh di atas pedoman internasional.',
    href: '/kualitas-udara',
    dot: '#EF4444',
  },
  {
    id: 'korelasi',
    icon: GitCompareArrows,
    label: 'Korelasi Faktor',
    status: 'perhatian',
    statusColor: '#FACC15',
    statusBg: 'rgba(250,204,21,0.08)',
    statusBorder: 'rgba(250,204,21,0.25)',
    statusLabel: 'Faktor kompleks teridentifikasi',
    desc: 'Lalu lintas, suhu, kelembapan & tipe lokasi berperan.',
    href: '/korelasi',
    dot: '#FACC15',
  },
  {
    id: 'kesehatan',
    icon: HeartPulse,
    label: 'Dampak Kesehatan',
    status: 'kritis',
    statusColor: '#EF4444',
    statusBg: 'rgba(239,68,68,0.08)',
    statusBorder: 'rgba(239,68,68,0.2)',
    statusLabel: 'Lag 2–5 hari signifikan',
    desc: 'PM2.5 meningkatkan kasus ISPA dengan jeda beberapa hari.',
    href: '/pm25-kesehatan',
    dot: '#EF4444',
  },
  {
    id: 'jaringan',
    icon: Network,
    label: 'Jaringan Stasiun',
    status: 'perhatian',
    statusColor: '#FACC15',
    statusBg: 'rgba(250,204,21,0.08)',
    statusBorder: 'rgba(250,204,21,0.25)',
    statusLabel: 'Coverage terbatas',
    desc: '27 stasiun tidak cukup untuk merepresentasikan Indonesia.',
    href: '/kecukupan-stasiun',
    dot: '#FACC15',
  },
]

function ScorecardSection() {
  return (
    <Section
      title="Status dashboard"
      description="Ringkasan status dari keempat tujuan analisis berdasarkan data terkini."
    >
      <div className="ins-scorecard-grid">
        {STATUS_CARDS.map(({ id, icon: Icon, label, status, statusColor, statusLabel, desc, href, dot }) => (
          <Link key={id} href={href} className="card kpi ins-scorecard-card" style={{ '--ins-color': statusColor, '--ins-text': statusColor === '#FACC15' ? '#78350F' : statusColor }}>
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
              <p className="ins-scorecard-desc">{desc}</p>
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

function FindingsTabsSection({ avgPm25, t3, t4, analytics, networkSummary }) {
  const [activeTab, setActiveTab] = useState('kualitas')

  const korelasiRows = t3?.korelasi_spearman ?? []
  const top5Korelasi = [...korelasiRows]
    .filter((r) => r.faktor && r.rho != null)
    .sort((a, b) => Math.abs(Number(b.rho)) - Math.abs(Number(a.rho)))
    .slice(0, 5)
  const maxRho = top5Korelasi.length > 0 ? Math.abs(Number(top5Korelasi[0]?.rho ?? 1)) : 1

  const ccf = t4?.ringkasan_ccf ?? []
  const ispaRingkasan = t4?.ringkasan_ispa_periode ?? {}
  const bestLag = ccf.length > 0
    ? ccf.reduce((best, r) => (!best || Math.abs(Number(r.max_ccf ?? 0)) > Math.abs(Number(best.max_ccf ?? 0)) ? r : best), null)
    : null
  const lagValue = bestLag?.lag_at_max_ccf ?? bestLag?.lag ?? null

  const networkKpi = networkSummary?.kpi ?? {}
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
            <FindingPoint icon={Zap} color="#384E77" text="Lalu lintas kendaraan bermotor menunjukkan korelasi sedang–kuat dengan PM2.5, terutama di perkotaan dan jam sibuk." />
            <FindingPoint icon={Wind} color="#8BBEB2" text="Suhu tinggi berkorelasi negatif dengan PM2.5 — kondisi panas mendukung dispersi polutan secara vertikal." />
            <FindingPoint icon={CheckCircle2} color="#22C55E" text="Kelembapan tinggi umumnya berkorelasi negatif: polutan 'menempel' ke partikel air dan mengendap lebih cepat." />
            <FindingPoint icon={AlertTriangle} color="#FB923C" text="Lokasi gambut dan kawasan industri secara konsisten menunjukkan median PM2.5 lebih tinggi dari rata-rata." />
            <FindingPoint icon={Zap} color="#FACC15" text="Arah angin tenggara berkorelasi dengan konsentrasi PM2.5 relatif lebih tinggi di beberapa lokasi." />
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#55706E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top faktor (Spearman ρ)</p>
          {top5Korelasi.length > 0 ? (
            top5Korelasi.map((r, i) => {
              const rho = Number(r.rho ?? 0)
              const color = rho > 0.3 ? '#384E77' : rho < -0.3 ? '#8BBEB2' : '#7C9693'
              return (
                <MiniBar
                  key={r.faktor ?? i}
                  value={Math.abs(rho)}
                  max={maxRho}
                  color={color}
                  label={r.faktor_label ?? r.faktor ?? '—'}
                  valueLabel={`${rho > 0 ? '+' : ''}${formatNumber(rho, 2)}`}
                />
              )
            })
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['Lalu lintas', 'Suhu', 'Kelembapan', 'Kecepatan angin', 'Radiasi surya'].map((f, i) => (
                <MiniBar key={f} value={[0.52, -0.38, -0.31, -0.28, 0.19][i]} max={0.6} color={[0.52, -0.38, -0.31, -0.28, 0.19][i] > 0 ? '#384E77' : '#8BBEB2'} label={f} valueLabel={['+0.52', '−0.38', '−0.31', '−0.28', '+0.19'][i]} />
              ))}
            </div>
          )}
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
            PM2.5 berdampak pada kasus ISPA dengan jeda {lagValue != null ? `${lagValue} hari` : '2–5 hari'}
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <FindingPoint icon={Timer} color="#FB923C" text={`Efek jeda (lag effect) PM2.5 → ISPA dan asma terdeteksi sekitar ${lagValue != null ? `${lagValue} hari` : '2–5 hari'} setelah paparan. Ini penting untuk sistem peringatan dini.`} />
            <FindingPoint icon={AlertTriangle} color="#EF4444" text="Balita (< 5 tahun) menunjukkan kerentanan jauh lebih tinggi dibanding kelompok usia lain dalam insiden ISPA." />
            <FindingPoint icon={Stethoscope} color="#8BBEB2" text="PPOK merespons paparan PM2.5 dengan lag lebih panjang — perlu analisis time-series mingguan hingga bulanan." />
            <FindingPoint icon={HeartPulse} color="#FB923C" text="Dampak kardiovaskular (hipertensi, gagal jantung) muncul lebih lambat namun signifikan secara statistik." />
            <FindingPoint icon={CheckCircle2} color="#22C55E" text="Penurunan PM2.5 pada musim hujan berkorelasi dengan pengurangan kasus rawat inap pernapasan." />
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(ispaRingkasan.total_balita != null || ispaRingkasan.total_lansia != null) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div style={{ textAlign: 'center', padding: '0.9rem', borderRadius: '0.75rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#18314F' }}>{formatNumber(ispaRingkasan.total_balita)}</div>
                <div style={{ fontSize: '0.68rem', color: '#55706E', marginTop: '0.2rem' }}>kasus balita</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.9rem', borderRadius: '0.75rem', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#18314F' }}>{formatNumber(ispaRingkasan.total_lansia)}</div>
                <div style={{ fontSize: '0.68rem', color: '#55706E', marginTop: '0.2rem' }}>kasus lansia</div>
              </div>
            </div>
          )}
          <div style={{ padding: '0.9rem', borderRadius: '0.75rem', background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#FB923C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Lag Effect</p>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((lag) => (
                <div key={lag} style={{
                  flex: 1, height: `${[0.3, 0.5, 0.75, 1, 0.9, 0.7, 0.4, 0.2][lag] * 3}rem`,
                  borderRadius: '0.25rem',
                  background: lag >= 2 && lag <= 5 ? '#FB923C' : 'rgba(24,49,79,0.12)',
                  transition: 'height 300ms ease',
                }} />
              ))}
            </div>
            <p style={{ fontSize: '0.68rem', color: '#55706E', marginTop: '0.4rem' }}>Lag 0–7 hari · oranye = puncak efek</p>
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
    jaringan: (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: '2rem', paddingTop: '1.25rem' }} className="ins-tab-grid">
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18314F', marginBottom: '1rem', lineHeight: 1.3 }}>
            27 stasiun tidak mencukupi untuk Indonesia
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <FindingPoint icon={Network} color="#60A5FA" text="27 stasiun untuk seluruh Indonesia yang luasnya > 1,9 juta km² menciptakan titik buta pemantauan yang besar." />
            <FindingPoint icon={MapPin} color="#FACC15" text={`Beberapa wilayah tanpa stasiun dalam radius ${maxDistKm != null ? `>${formatNumber(maxDistKm, 0)} km` : '>400 km'} — terutama Papua, Maluku, dan Kalimantan pedalaman.`} />
            <FindingPoint icon={AlertTriangle} color="#FB923C" text="Kelengkapan data rata-rata < 85% di sejumlah stasiun akibat gangguan sensor atau konektivitas." />
            <FindingPoint icon={CheckCircle2} color="#22C55E" text="Distribusi tidak merata: Jawa terpantau relatif baik, namun Papua dan pulau-pulau terpencil sangat minim." />
            <FindingPoint icon={Zap} color="#8BBEB2" text="Kalibrasi silang antarstasiun perlu distandardisasi untuk memastikan komparabilitas data nasional." />
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.18)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>Distribusi per pulau</p>
            {[
              { name: 'Jawa', pct: 48, count: 13 },
              { name: 'Sumatera', pct: 26, count: 7 },
              { name: 'Kalimantan', pct: 11, count: 3 },
              { name: 'Sulawesi', pct: 7, count: 2 },
              { name: 'Papua & lainnya', pct: 7, count: 2 },
            ].map((p) => (
              <div key={p.name} style={{ marginBottom: '0.5rem' }}>
                <MiniBar value={p.pct} max={100} color="#60A5FA" label={p.name} valueLabel={`${p.count} stasiun`} />
              </div>
            ))}
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

/* ═══ PAGE ══════════════════════════════════════════════════════════════════ */
export default function InsightPage() {
  const { data: stations } = useStations()
  const { data: summary } = useOverviewSummary()
  const analytics = useOverviewAnalytics()
  const { data: t4 } = useT4Data()
  const { data: t3 } = useT3Tables()
  const { data: networkSummary } = useMonitoringNetworkSummary()

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
          <ScorecardSection />
          <FindingsTabsSection
            avgPm25={avgPm25}
            t3={t3}
            t4={t4}
            analytics={analytics}
            networkSummary={networkSummary}
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
