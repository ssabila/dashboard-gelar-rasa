'use client'

import { useMemo, useState } from 'react'
import { Ruler, CalendarRange, Layers, LayoutGrid } from 'lucide-react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { useT3Tables } from '@/hooks/useKorelasiData'
import { formatNumber } from '@/lib/formatters'
import { LOC_KEYS, MET_KEYS, indexTables } from '@/lib/korelasi'
import { OverviewView } from './overview'
import { NumerikOverview } from './numerik'
import { MeteorologiDetail } from './meteorologi'
import { KarakteristikDetail } from './karakteristik'
import { KategorikOverview } from './kategorik'
import { ArahAnginView } from './arah-angin'
import { TipeLokasiView } from './tipe-lokasi'
import './korelasi.css'
import { SubTabs } from '@/components/ui/SubTabs'

/**
 * Modul Korelasi Polutan (Tujuan 3) — satu route, navigasi bertingkat:
 *   Overview · Numerik (Overview Numerik · Meteorologi [Suhu/Kelembapan/Kecepatan Angin] · Karakteristik Stasiun [Lalu Lintas/Jarak Jalan]) · Kategorik (Arah Angin · Tipe Lokasi)
 * Semua angka dari public/data/korelasi/t3_tabel.json dan scatter/<STASIUN>.json
 * (salinan tabel preprocessing; dibuat scripts/preprocess_t3_t4_web.py). Tidak ada korelasi yang dihitung ulang di browser.
 */
const GROUPS = {
  overview: { label: 'Pengantar', icon: LayoutGrid, subs: [] },
  numerik: {
    label: 'Numerik', icon: Ruler,
    subs: [
      { id: 'ringkasan', label: 'Overview Numerik' },
      { id: 'meteorologi', label: 'Meteorologi', factors: ['temperature', 'humidity', 'wind_speed'] },
      { id: 'karakteristik', label: 'Karakteristik Stasiun', factors: ['lalu_lintas', 'jarak_jalan'] },
    ],
  },
  kategorik: {
    label: 'Kategorik', icon: Layers,
    subs: [{ id: 'ringkasan-kategorik', label: 'Overview Kategorik' }, { id: 'arah-angin', label: 'Arah Angin' }, { id: 'tipe-lokasi', label: 'Tipe Lokasi' }],
  },
}

const VIEWS = {
  overview:       { Body: OverviewView,        question: 'Faktor apa yang berasosiasi dengan variasi konsentrasi polutan di 22 stasiun?' },
  ringkasan:      { Body: NumerikOverview,     question: 'Seberapa kuat suhu, kelembapan, angin, lalu lintas, dan jarak jalan berkorelasi dengan tiap polutan?' },
  meteorologi:    { Body: MeteorologiDetail,   question: 'Bagaimana suhu, kelembapan, dan kecepatan angin berhubungan dengan konsentrasi polutan di satu stasiun?' },
  karakteristik:  { Body: KarakteristikDetail, question: 'Apakah stasiun yang lebih padat lalu lintas atau lebih dekat jalan cenderung bermedian polutan lebih tinggi?' },
  'ringkasan-kategorik': { Body: KategorikOverview, question: 'Bagaimana konsentrasi polutan dibandingkan menurut arah angin dan tipe lokasi stasiun?' },
  'arah-angin':   { Body: ArahAnginView,       question: 'Apakah konsentrasi polutan berbeda menurut arah datangnya angin? (deskriptif)' },
  'tipe-lokasi':  { Body: TipeLokasiView,      question: 'Bagaimana sebaran median polutan antar tipe lokasi stasiun? (deskriptif)' },
}

export default function KorelasiPage() {
  const { data: t, loading, error } = useT3Tables()
  const ix = useMemo(() => (t ? indexTables(t) : null), [t])
  const [nav, setNav] = useState({ group: 'overview', sub: null, factor: null, pol: null })

  const go = (patch, opts = {}) => {
    const next = { ...patch }
    if (next.group === 'numerik' && !next.sub) next.sub = 'ringkasan'
    if (next.group === 'kategorik' && !next.sub) next.sub = 'ringkasan-kategorik'
    if (next.group === 'overview') next.sub = null
    if (next.sub === 'meteorologi' && !MET_KEYS.includes(next.factor)) next.factor = 'temperature'
    if (next.sub === 'karakteristik' && !LOC_KEYS.includes(next.factor)) next.factor = 'lalu_lintas'
    setNav(next)
    if (!opts.keepScroll && typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const viewId = nav.group === 'overview' ? 'overview' : nav.sub
  const { Body, question } = VIEWS[viewId]
  const group = GROUPS[nav.group]
  const sub = group.subs.find((s) => s.id === nav.sub)

  return (
    <ModuleLayout
      eyebrow={nav.group === 'overview' ? 'Tujuan 3' : `Tujuan 3 · ${group.label}${sub ? ` · ${sub.label}` : ''}`}
      title="Korelasi Polutan"
      description={question}
      actions={
        <span className="coverage-chip">
          <CalendarRange size={13} aria-hidden="true" />
          {t ? `${t.meta.n_stasiun} stasiun · ${formatNumber(t.meta.n_jam)} jam valid · ` : ''}1 Jan 2024 – 14 Okt 2026
        </span>
      }
    >
      <SubTabs
        label="Navigasi Tujuan 3"
        tabs={Object.entries(GROUPS).map(([id, g]) => ({ id, label: g.label, icon: g.icon }))}
        value={nav.group}
        onChange={(id) => go({ ...nav, group: id, sub: null })}
      />
      {group.subs.length > 0 && (
        <SubTabs
          label={`Subhalaman ${group.label}`}
          tabs={group.subs.map((s) => ({ id: s.id, label: s.label }))}
          value={nav.sub}
          onChange={(id) => go({ ...nav, group: nav.group, sub: id })}
        />
      )}

      {error && <ErrorState message={`Data gagal dimuat: ${error}. Jalankan scripts/preprocess_t3_t4_web.py terlebih dahulu.`} />}
      {loading && <Card><LoadingSpinner label="Memuat tabel korelasi..." /></Card>}
      {t && ix && <Body t={t} ix={ix} nav={nav} go={go} />}
    </ModuleLayout>
  )
}
