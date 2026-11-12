'use client'

import { useMemo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Section } from '@/components/layout/ModuleLayout'
import { formatNumber } from '@/lib/formatters'
import { GROUP_COLORS, SECTORS, fmtConc, maxBy, minBy, polLabel, polUnit, quantile } from '@/lib/korelasi'
import { BackLink, ChartCard, DataTable, DetailLink, PageFooter, PollutantSeg } from './panels'

const MIN_JAM = 30   // sama dengan halaman Arah Angin: stasiun–arah dengan < 30 jam tidak ikut median

/** Gambar mata angin (8 arah, nama Indonesia). */
function CompassRose() {
  const R = 118
  const pt = (deg, r) => [150 + r * Math.sin((deg * Math.PI) / 180), 150 - r * Math.cos((deg * Math.PI) / 180)]
  const dirs = SECTORS.map((s, i) => ({ ...s, deg: i * 45 }))
  return (
    <svg viewBox="0 0 300 300" className="kor-compass" role="img" aria-label="Gambar mata angin: delapan arah datang angin">
      <circle cx="150" cy="150" r={R} fill="rgba(56,78,119,0.05)" stroke="#384E77" strokeWidth="1.5" />
      <circle cx="150" cy="150" r={R * 0.55} fill="none" stroke="rgba(56,78,119,0.25)" strokeWidth="1" strokeDasharray="3 4" />
      {dirs.map((d) => {
        const [x, y] = pt(d.deg, R)
        return <line key={d.code} x1="150" y1="150" x2={x} y2={y} stroke="rgba(56,78,119,0.3)" strokeWidth="1" />
      })}
      {dirs.map((d) => {
        const main = d.deg % 90 === 0
        const [tx, ty] = pt(d.deg, R - 2)
        const [lx, ly] = pt(d.deg - 8, main ? 44 : 32)
        const [rx, ry] = pt(d.deg + 8, main ? 44 : 32)
        return <polygon key={d.code} points={`${tx},${ty} ${lx},${ly} ${rx},${ry} 150,150`} fill={main ? '#384E77' : '#9FB3D1'} opacity={main ? 0.92 : 0.8} />
      })}
      <circle cx="150" cy="150" r="5" fill="#fff" stroke="#384E77" strokeWidth="2" />
      {dirs.map((d) => {
        const [x, y] = pt(d.deg, R + 17)
        return <text key={d.code} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={d.deg % 90 === 0 ? 13 : 11} fontWeight={d.deg % 90 === 0 ? 700 : 600} fill="#18314F">{d.name}</text>
      })}
    </svg>
  )
}

/** Overview Kategorik: deskripsi, ringkasan arah angin, dan ringkasan tipe lokasi (PM2.5, 22 stasiun). */
export function KategorikOverview({ t, ix, go }) {
  const [polA, setPolA] = useState('pm25')   // polutan kartu Arah Angin
  const [polT, setPolT] = useState('pm25')   // polutan kartu Tipe Lokasi

  const arah = useMemo(() => SECTORS.map((s) => {
    const all = t.arah_angin.filter((r) => r.polutan === polA && r.arah_angin === s.name)
    const used = all.filter((r) => r.n_valid >= MIN_JAM)
    return { ...s, n: all.reduce((a, r) => a + r.n_valid, 0), med: used.length ? quantile(used.map((r) => r.median), 0.5) : null }
  }), [t, polA])
  const valid = arah.filter((s) => s.med != null)
  const hi = maxBy(valid, (s) => s.med); const lo = minBy(valid, (s) => s.med)
  const freq = maxBy(arah, (s) => s.n)
  const plA = polLabel(polA); const uA = polUnit(polA)

  const tipe = useMemo(() => {
    const rows = ['Lalu lintas', 'Perkotaan', 'Industri', 'Gambut', 'Latar bersih/regional'].map((g) => ({
      g, row: t.tipe_ringkasan.find((r) => r.tipe_lokasi === g && r.polutan === polT), n: ix.stations.filter((s) => s.tipe_lokasi === g).length,
    })).filter((x) => x.row)
    return { hi: maxBy(rows, (x) => x.row.median), lo: minBy(rows, (x) => x.row.median), biggest: maxBy(rows, (x) => x.n) }
  }, [t, ix, polT])
  const plT = polLabel(polT); const uT = polUnit(polT)

  const cols = [
    { key: 'stasiun', label: 'Nama Stasiun' },
    { key: 'site_type_asli', label: 'Site Type' },
    { key: 'tipe_lokasi', label: 'Tipe Lokasi', render: (r) => <span><span className="legend-dot" style={{ display: 'inline-block', background: GROUP_COLORS[r.tipe_lokasi], marginRight: 6 }} />{r.tipe_lokasi}</span> },
  ]

  return (
    <div className="stack">
      <Card className="kor-factor">
        <CardHeader title="Variabel Kategorik" />
        <div className="kor-insight-text">
          <p>Variabel kategorik adalah variabel yang berupa kelompok, bukan angka kontinu. Karena itu, hubungannya dengan polutan tidak dihitung dengan koefisien korelasi, melainkan dengan <strong>membandingkan sebaran konsentrasi polutan antar kelompok</strong>. Ada dua variabel kategorik yang dianalisis, yaitu <strong>arah angin</strong> dan <strong>tipe lokasi</strong> stasiun. Keduanya dibaca secara deskriptif dan tidak melibatkan uji signifikansi statistik.</p>
        </div>
      </Card>

      <Section title="Arah Angin">
        <div className="kor-split-arah">
          <Card className="kor-compass-card"><CompassRose /></Card>
          <Card className="kor-factor">
            <CardHeader title="Insight Deskriptif" />
            <PollutantSeg value={polA} onChange={setPolA} showLabel={false} />
            {hi && lo ? (
              <div className="kor-insight-text">
                <ul>
                  <li>Median {plA} antar 22 stasiun <strong>tertinggi</strong> tercatat saat angin bertiup dari arah <strong>{hi.name}</strong>, yaitu sebesar <strong>{fmtConc(hi.med, polA)} {uA}</strong>.</li>
                  <li>Median {plA} <strong>terendah</strong> tercatat saat angin bertiup dari arah <strong>{lo.name}</strong>, yaitu sebesar <strong>{fmtConc(lo.med, polA)} {uA}</strong>.</li>
                  <li>Selisih median tertinggi dan terendah sebesar <strong>{fmtConc(hi.med - lo.med, polA)} {uA}</strong>. Perbedaan ini bersifat deskriptif dan tidak diuji signifikansinya.</li>
                  <li>Arah angin yang paling sering terjadi adalah <strong>{freq.name}</strong>, dengan total <strong>{formatNumber(freq.n)} jam</strong> observasi.</li>
                </ul>
              </div>
            ) : null}
            <div className="kor-chips"><DetailLink onClick={() => go({ group: 'kategorik', sub: 'arah-angin' })}>Lihat Lebih Detail</DetailLink></div>
          </Card>
        </div>
      </Section>

      <Section title="Tipe Lokasi">
        <div className="kor-split-tipe">
          <ChartCard title="Tabel Tipe Lokasi" subtitle="Klik Judul Kolom untuk Mengurutkan">
            <DataTable columns={cols} rows={ix.stations} rowKey={(r) => r.stasiun} defaultSort={{ key: 'stasiun', dir: 'asc' }} pageSize={11} caption="Tipe lokasi tiap stasiun" />
          </ChartCard>
          <Card className="kor-factor">
            <CardHeader title="Insight Deskriptif" />
            <PollutantSeg value={polT} onChange={setPolT} showLabel={false} />
            {tipe.hi && tipe.lo ? (
              <div className="kor-insight-text">
                <ul>
                  <li>Median {plT} <strong>tertinggi</strong> tercatat pada tipe lokasi <strong>{tipe.hi.g}</strong>, yaitu sebesar <strong>{fmtConc(tipe.hi.row.median, polT)} {uT}</strong>.</li>
                  <li>Median {plT} <strong>terendah</strong> tercatat pada tipe lokasi <strong>{tipe.lo.g}</strong>, yaitu sebesar <strong>{fmtConc(tipe.lo.row.median, polT)} {uT}</strong>.</li>
                  <li>Selisih median tertinggi dan terendah sebesar <strong>{fmtConc(tipe.hi.row.median - tipe.lo.row.median, polT)} {uT}</strong>. Perbedaan ini bersifat deskriptif dan tidak diuji signifikansinya.</li>
                  <li>Tipe lokasi dengan anggota stasiun terbanyak adalah <strong>{tipe.biggest.g}</strong>, yaitu <strong>{tipe.biggest.n} stasiun</strong>.</li>
                </ul>
              </div>
            ) : null}
            <div className="kor-chips"><DetailLink onClick={() => go({ group: 'kategorik', sub: 'tipe-lokasi' })}>Lihat Lebih Detail</DetailLink></div>
          </Card>
        </div>
      </Section>

      <PageFooter>
        <BackLink onClick={() => go({ group: 'overview' })}>Kembali ke Pengantar</BackLink>
      </PageFooter>
    </div>
  )
}
