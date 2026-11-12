'use client'

import { Activity, Ruler, Layers, Wind } from 'lucide-react'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Section } from '@/components/layout/ModuleLayout'
import { formatNumber } from '@/lib/formatters'
import { GROUP_COLORS, POLLUTANT_ORDER, fmtConc, polLabel, polUnit } from '@/lib/korelasi'
import { DataTable, DetailLink } from './panels'

/** Halaman Overview Tujuan 3: KPI cakupan, kelompok faktor, dan tabel 22 stasiun. */
export function OverviewView({ t, ix, go }) {
  const m = t.meta

  const cols = [
    { key: 'stasiun', label: 'Stasiun' },
    { key: 'tipe_lokasi', label: 'Tipe Lokasi', render: (r) => <span><span className="legend-dot" style={{ display: 'inline-block', background: GROUP_COLORS[r.tipe_lokasi], marginRight: 6 }} />{r.tipe_lokasi}</span> },
    { key: 'jam_data', label: 'Jam Data', align: 'right', render: (r) => formatNumber(r.jam_data) },
    { key: 'intensitas_lalu_lintas', label: 'Intensitas Lalu Lintas', align: 'right', render: (r) => formatNumber(r.intensitas_lalu_lintas) },
    { key: 'jarak_ke_jalan_raya_m', label: 'Jarak Ke Jalan Raya (m)', align: 'right', render: (r) => formatNumber(r.jarak_ke_jalan_raya_m) },
    ...POLLUTANT_ORDER.map((p) => ({ key: `med_${p}`, label: `${polLabel(p)} (${polUnit(p)})`, align: 'right', render: (r) => fmtConc(r[`med_${p}`], p) })),
  ]

  return (
    <div className="stack">
      <div className="kpi-grid">
        <MetricCard label="Stasiun AQMS" value={m.n_stasiun} subtext={`${formatNumber(m.n_jam)} jam pengamatan`} icon={<Activity size={16} />} variant="hero" />
        <MetricCard label="Jenis Polutan" value={m.polutan.length} subtext="PM2.5, PM10, SO₂, CO, O₃, NO₂" icon={<Wind size={16} />} />
        <MetricCard label="Variabel Numerik" value={5} subtext="Meteorologi & Karakteristik Stasiun" icon={<Ruler size={16} />} />
        <MetricCard label="Variabel Kategorik" value={2} subtext="Arah Angin & Tipe Lokasi" icon={<Layers size={16} />} />
      </div>

      <Section title="Kelompok Faktor yang Dianalisis">
        <div className="kor-grid-2">
          <Card className="kor-factor">
            <h4>Variabel Numerik</h4>
            <p><strong>Meteorologi</strong></p>
            <p><strong>Suhu</strong>, <strong>kelembapan</strong>, dan <strong>kecepatan angin</strong> dikorelasikan dengan masing-masing polutan pada setiap stasiun berdasarkan data pada waktu pengamatan yang sama. Selanjutnya, nilai korelasi dari 22 stasiun diringkas menggunakan median.</p>
            <p><strong>Karakteristik Stasiun</strong></p>
            <p><strong>Intensitas lalu lintas</strong> dan <strong>jarak ke jalan raya</strong> merupakan karakteristik masing-masing stasiun, sehingga dikorelasikan dengan nilai median konsentrasi polutan pada setiap stasiun berdasarkan periode pengamatan (n = 22 stasiun), bukan menggunakan data per jam.</p>
            <div className="kor-chips"><DetailLink onClick={() => go({ group: 'numerik', sub: 'ringkasan' })}>Lihat Korelasi Polutan - Variabel Numerik</DetailLink></div>
          </Card>
          <Card className="kor-factor">
            <h4>Variabel Kategorik</h4>
            <p><strong>Arah angin</strong> dan <strong>tipe lokasi</strong> dibandingkan secara deskriptif berdasarkan nilai median, rentang interkuartil (Q1–Q3), dan jumlah observasi. Analisis ini tidak melibatkan uji signifikansi statistik.</p>
            <div className="kor-chips"><DetailLink onClick={() => go({ group: 'kategorik', sub: 'ringkasan-kategorik' })}>Lihat Korelasi Polutan - Variabel Kategorik</DetailLink></div>
          </Card>
        </div>
      </Section>

      <Card>
        <CardHeader title="Tabel 22 Stasiun" subtitle="Klik Judul Kolom untuk Mengurutkan · Kolom polutan menampilkan median konsentrasi tiap stasiun" action={<span className="count-pill">{t.stasiun.length} stasiun</span>} />
        <DataTable columns={cols} rows={ix.stations} rowKey={(r) => r.stasiun} defaultSort={{ key: 'stasiun', dir: 'asc' }} pageSize={11} caption="Tabel 22 Stasiun" />
      </Card>
    </div>
  )
}
