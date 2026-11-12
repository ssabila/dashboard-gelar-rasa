'use client'

import { useMemo, useState } from 'react'
import { Activity, CalendarRange, Clock, Users } from 'lucide-react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { useFilter } from '@/hooks/useFilter'
import { useT4Data } from '@/hooks/usePm25KesehatanData'
import { fmtDate } from '@/lib/pm25kesehatan'
import { HubunganView } from './hubungan'
import { EfekJedaView } from './efek-jeda'
import { RentanView } from './rentan'
import './pm25.css'

/**
 * Modul PM2.5 & Kesehatan (Tujuan 4) — satu route, tiga halaman:
 *   1. Hubungan PM2.5 dengan Indikator Kesehatan (Z-score tujuh seri)
 *   2. Efek Jeda (CCF lag 0–14 hari, plus balita vs lansia)
 *   3. Perbandingan Kelompok Rentan (ISPA balita vs lansia)
 * Semua angka dari public/data/pm25-kesehatan/t4.json (salinan tabel preprocessing; dibuat scripts/preprocess_t3_t4_web.py).
 * Z-score dan CCF tidak dihitung ulang: filter tanggal hanya memotong tampilan.
 */
const VIEWS = {
  hubungan: { label: 'Hubungan PM2.5 & Kesehatan', icon: Activity, question: 'Apakah kenaikan PM2.5 berjalan bersama kasus ISPA, asma, PPOK, kardiovaskular, dan kematian?', Body: HubunganView },
  jeda:     { label: 'Efek Jeda',                  icon: Clock,    question: 'Berapa hari setelah PM2.5 naik, kasus penyakit paling berkaitan dengannya?', Body: EfekJedaView },
  rentan:   { label: 'Kelompok Rentan',            icon: Users,    question: 'Bagaimana kasus ISPA balita dibandingkan lansia pada periode yang dipilih?', Body: RentanView },
}

export default function Pm25KesehatanPage() {
  const { data: t4, loading, error } = useT4Data()
  const { filters, setDateRange } = useFilter()
  const [view, setView] = useState('hubungan')

  const presets = useMemo(() => {
    if (!t4) return []
    const first = t4.dates[0]
    const last = t4.dates.at(-1)
    const ago = t4.dates[Math.max(0, t4.dates.length - 90)]
    return [
      { label: 'Semua', start: first, end: last },
      { label: '2024', start: '2024-01-01', end: '2024-12-31' },
      { label: '2025', start: '2025-01-01', end: '2025-12-31' },
      { label: '2026', start: '2026-01-01', end: last },
      { label: '90 hari terakhir', start: ago, end: last },
    ].filter((p) => p.start >= first && p.end <= last)
  }, [t4])

  const go = (v) => {
    setView(v)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const cfg = VIEWS[view]
  const Body = cfg.Body

  return (
    <ModuleLayout
      eyebrow={`Tujuan 4 · ${cfg.label}`}
      title="PM2.5 & Kesehatan"
      description={cfg.question}
      actions={
        <span className="coverage-chip">
          <CalendarRange size={13} aria-hidden="true" />
          {t4 ? `22 RS ↔ 22 stasiun · ${fmtDate(t4.dates[0])} – ${fmtDate(t4.dates.at(-1))}` : 'Memuat…'}
        </span>
      }
    >
      <nav className="filter-bar pk-nav" aria-label="Halaman Tujuan 4">
        {Object.entries(VIEWS).map(([id, v]) => {
          const Icon = v.icon
          const active = view === id
          return (
            <button key={id} type="button" className={`fpill${active ? ' active is-current' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => go(id)}>
              <Icon size={14} aria-hidden="true" /> {v.label}
            </button>
          )
        })}
      </nav>

      {error && <ErrorState message={`Data gagal dimuat: ${error}. Jalankan scripts/preprocess_t3_t4_web.py terlebih dahulu.`} />}
      {loading && <Card><LoadingSpinner label="Memuat data PM2.5 dan kesehatan..." /></Card>}
      {t4 && <Body t4={t4} filters={filters} setDateRange={setDateRange} presets={presets} />}
    </ModuleLayout>
  )
}
