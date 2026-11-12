'use client'

import { useMemo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { FACTORS, FACTOR_KEYS, POLLUTANT_ORDER, fmtRho, polLabel, strengthLabel } from '@/lib/korelasi'
import { CorrelationHeatmap, HEAT_NEG, HEAT_POS, TopFactorsBar, heatColor } from './charts'
import { BackLink, Callout, PageFooter, PollutantSeg } from './panels'

/** Nama variabel di heatmap/kartu: huruf awal tiap kata kapital. */
const LABELS = {
  temperature: 'Suhu',
  humidity: 'Kelembapan',
  wind_speed: 'Kecepatan Angin',
  lalu_lintas: 'Intensitas Lalu Lintas',
  jarak_jalan: 'Jarak Ke Jalan Raya',
}

/** Kategori kekuatan |ρ| untuk halaman ini (0 = tidak berkorelasi). */
const kekuatan = (r) => (r === 0 ? 'tidak berkorelasi' : strengthLabel(r))
const rAbs = (v) => Math.abs(v).toFixed(3).replace('.', ',')
const rSigned = (v) => `${v < 0 ? '−' : ''}${rAbs(v)}`

const STRENGTH_TABLE = [
  ['|Korelasi| = 0', 'Tidak Berkorelasi'],
  ['0 < |Korelasi| < 0,2', 'Sangat Lemah'],
  ['0,2 ≤ |Korelasi| < 0,4', 'Lemah'],
  ['0,4 ≤ |Korelasi| < 0,6', 'Sedang'],
  ['0,6 ≤ |Korelasi| < 0,8', 'Kuat'],
  ['0,8 ≤ |Korelasi| ≤ 1', 'Sangat Kuat'],
]

/** Overview Numerik: kotak korelasi tertinggi per polutan, insight, heatmap 5 × 6, top 3 variabel, legenda, disclaimer. */
export function NumerikOverview({ t, ix, go }) {
  const [pol, setPol] = useState('pm25')
  const open = (k, p) => go({ group: 'numerik', sub: FACTORS[k].nav, factor: k, ...(p ? { pol: p } : {}) })

  // Untuk tiap polutan: variabel diurutkan menurut |ρ| (median 22 stasiun untuk meteorologi, antar-22 stasiun untuk karakteristik)
  const ranked = useMemo(() => {
    const out = {}
    POLLUTANT_ORDER.forEach((p) => {
      out[p] = FACTOR_KEYS
        .map((k) => ({ key: k, label: LABELS[k], rho: ix.cells[k]?.[p]?.rho ?? null, sub: ix.cells[k]?.[p]?.sub ?? '' }))
        .filter((r) => r.rho != null)
        .sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho))
    })
    return out
  }, [ix])

  const cell = (k, p) => ix.cells[k]?.[p]?.rho
  const topPos = (p) => ranked[p].filter((r) => r.rho > 0).sort((a, b) => b.rho - a.rho)[0]
  const topNeg = (p) => ranked[p].filter((r) => r.rho < 0).sort((a, b) => a.rho - b.rho)[0]
  const lower = (s) => s.toLowerCase()

  const insight = useMemo(() => {
    const need = [cell('lalu_lintas', 'pm25'), cell('lalu_lintas', 'pm10'), cell('jarak_jalan', 'pm25'), cell('jarak_jalan', 'pm10')]
    if (need.some((v) => v == null) || !topPos('so2') || !topPos('o3') || !topNeg('o3')) return null
    return { so2: topPos('so2'), o3p: topPos('o3'), o3n: topNeg('o3') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked])

  const heatLegend = (
    <div className="legend" style={{ marginTop: '0.9rem' }}>
      <span className="legend-item"><span className="legend-dot" style={{ background: HEAT_POS }} />Korelasi Positif (Hubungan Searah)</span>
      <span className="legend-item"><span className="legend-dot" style={{ background: HEAT_NEG }} />Korelasi Negatif (Hubungan Berlawanan Arah)</span>
      <span className="legend-item"><span className="legend-dot" style={{ background: '#F3F5F8', border: '1px solid rgba(24,49,79,0.2)' }} />Netral (Mendekati 0)</span>
    </div>
  )

  const r = (k, p) => cell(k, p)

  return (
    <div className="stack">
      {/* 1. Korelasi terkuat per polutan (3 × 2); warna kotak mengikuti skala heatmap */}
      <div className="kor-top-grid">
        {POLLUTANT_ORDER.map((p) => {
          const top = ranked[p][0]
          const strong = top && Math.abs(top.rho) > 0.55
          return (
            <Card key={p} className="kor-topcard" style={top ? { background: heatColor(top.rho), color: strong ? '#FFFFFF' : '#18314F' } : undefined}>
              <span className="kor-topcard-label">Korelasi {polLabel(p)}</span>
              <span className="kor-topcard-value"><strong>{top ? fmtRho(top.rho) : 'NA'}</strong>{top && <span>({kekuatan(top.rho)})</span>}</span>
              <span className="kor-topcard-factor">{top ? top.label : 'Tidak ada data'}</span>
            </Card>
          )
        })}
      </div>

      {/* 2. Heatmap + top 3 variabel */}
      <Card>
        <CardHeader
          title="Korelasi Polutan - Meteorologi & Karakteristik Stasiun"
          subtitle="Klik Nama Variabel untuk Melihat Secara Detail"
          action={<span className="count-pill">5 × 6 sel</span>}
        />
        <div className="kor-heat-split">
          <CorrelationHeatmap rowKeys={FACTOR_KEYS} cells={ix.cells} labels={LABELS} onCell={open} />
          <div>
            <PollutantSeg value={pol} onChange={setPol} label="Polutan" showLabel={false} />
            <p className="kor-subhead" style={{ marginTop: '0.7rem' }}>3 Variabel dengan Korelasi Terkuat terhadap {polLabel(pol)}</p>
            <TopFactorsBar items={ranked[pol].slice(0, 3)} pol={pol} />
          </div>
        </div>

        {heatLegend}
        <div className="kor-table-wrap kor-strength">
          <table className="kor-table">
            <caption className="kor-sr">Kategori kekuatan korelasi</caption>
            <thead><tr><th style={{ textAlign: 'left' }}><span className="kor-th">|Korelasi|</span></th><th style={{ textAlign: 'left' }}><span className="kor-th">Kategori</span></th></tr></thead>
            <tbody>{STRENGTH_TABLE.map(([rg, k]) => <tr key={k}><td>{rg}</td><td><strong>{k}</strong></td></tr>)}</tbody>
          </table>
        </div>
      </Card>

      {/* 3. Insight (poin-poin, lalu kesimpulan) + catatan */}
      {insight && (
        <Card>
          <CardHeader title="Insight" />
          <div className="kor-insight-text">
            <ul>
              <li><strong>Intensitas lalu lintas</strong> menunjukkan korelasi positif paling kuat terhadap konsentrasi <strong>PM2.5 (r = {rAbs(r('lalu_lintas', 'pm25'))})</strong> dan <strong>PM10 (r = {rAbs(r('lalu_lintas', 'pm10'))})</strong>. Peningkatan intensitas lalu lintas cenderung berkaitan dengan meningkatnya konsentrasi kedua polutan tersebut.</li>
              <li><strong>Jarak ke jalan raya</strong> menunjukkan korelasi negatif yang cukup kuat terhadap <strong>PM2.5 (r = {rSigned(r('jarak_jalan', 'pm25'))})</strong> dan <strong>PM10 (r = {rSigned(r('jarak_jalan', 'pm10'))})</strong>, serta menjadi variabel dengan korelasi negatif terkuat terhadap sebagian besar polutan lainnya.</li>
              <li><strong>SO₂</strong> memiliki korelasi positif tertinggi dengan <strong>{lower(insight.so2.label)} (r = {rSigned(insight.so2.rho)})</strong>.</li>
              <li><strong>O₃</strong> memiliki korelasi positif tertinggi dengan <strong>{lower(insight.o3p.label)} (r = {rSigned(insight.o3p.rho)})</strong> dan korelasi negatif tertinggi dengan <strong>{lower(insight.o3n.label)} (r = {rSigned(insight.o3n.rho)})</strong>.</li>
            </ul>
            <p><strong>Dengan demikian, intensitas lalu lintas dan jarak ke jalan raya merupakan dua variabel yang paling menonjol hubungannya dengan konsentrasi PM2.5 dan PM10.</strong> Adapun SO₂, CO, O₃, dan NO₂ memperlihatkan pola hubungan yang bervariasi terhadap faktor meteorologi maupun karakteristik lingkungan.</p>
          </div>
        </Card>
      )}
      <Callout title="Catatan">
        Korelasi menunjukkan hubungan antarvariabel, bukan hubungan sebab-akibat. Nilai korelasi ini juga tidak menunjukkan signifikansi statistik karena tidak dilakukan uji signifikansi.
      </Callout>

      {/* 4. Dasar perhitungan */}
      <Callout tone="warn" title="Perhatikan Dasar Perhitungan">
        <ol>
          <li><strong>Meteorologi (Suhu, Kelembapan, Kecepatan Angin):</strong> dianalisis menggunakan ribuan observasi per jam pada setiap stasiun, kemudian diringkas berdasarkan median dari 22 koefisien korelasi stasiun.</li>
          <li><strong>Karakteristik Stasiun (Intensitas Lalu Lintas, Jarak Ke Jalan Raya):</strong> dianalisis menggunakan 22 titik data (satu titik untuk setiap stasiun), sehingga representasi datanya lebih terbatas dan tingkat ketelitiannya berbeda. Oleh karena itu, hasil korelasi kedua kelompok variabel tidak dapat dibandingkan secara langsung.</li>
        </ol>
      </Callout>

      {/* 5. Footer navigasi */}
      <PageFooter>
        <BackLink onClick={() => go({ group: 'overview' })}>Kembali ke Pengantar</BackLink>
      </PageFooter>
    </div>
  )
}
