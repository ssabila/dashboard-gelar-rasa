'use client'

import { useMemo } from 'react'
import { Building2, CalendarDays } from 'lucide-react'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatNumber } from '@/lib/formatters'
import { INDICATORS, SERIES, SERIES_BY_ID, fmtCoef, fmtDate, fmtNum, fmtZ, rangeIdx } from '@/lib/pm25kesehatan'
import { ZScoreLine } from './charts'
import { Callout, ChartCard, DataTable, DateRangeFields, EmptyState, FilterRow } from './panels'

const mean = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null }

/** Halaman 1 — Hubungan PM2.5 dengan indikator kesehatan: Z-score tujuh seri (CCF ada di halaman Efek Jeda). */
export function HubunganView({ t4, filters, setDateRange, presets }) {
  const dates = t4.dates
  const [a, b] = rangeIdx(dates, filters.dateStart, filters.dateEnd)
  const empty = b < a

  const sliced = useMemo(() => {
    if (empty) return null
    const z = {}; const raw = {}
    for (const s of SERIES) { z[s.id] = t4.series[s.id].z.slice(a, b + 1); raw[s.id] = t4.series[s.id].v.slice(a, b + 1) }
    return { dates: dates.slice(a, b + 1), z, raw }
  }, [t4, dates, a, b, empty])

  // Jumlah kasus seluruh RS dalam rentang = Σ (rata-rata kasus/RS/hari × jumlah RS pelapor); jumlah RS = 22 pada seluruh hari (data_agregat_harian)
  const nRs = t4.ispa_ringkasan?.[0]?.n_rs ?? 22
  const totals = useMemo(() => (sliced ? Object.fromEntries(INDICATORS.map((id) => [id, Math.round(sliced.raw[id].reduce((acc, v) => acc + (v == null ? 0 : v * nRs), 0))])) : null), [sliced, nRs])

  // Insight Z-Score: dihitung dari data pada rentang yang dipilih
  const zInsight = useMemo(() => {
    if (!sliced) return null
    const pm = sliced.raw['PM2.5']
    let iMax = -1; let iMin = -1
    pm.forEach((v, i) => { if (v == null) return; if (iMax < 0 || v > pm[iMax]) iMax = i; if (iMin < 0 || v < pm[iMin]) iMin = i })
    const avgZ = INDICATORS.map((id) => ({ id, z: mean(sliced.z[id]) })).filter((x) => x.z != null).sort((p, q) => q.z - p.z)
    // rata-rata Z-Score per tahun kalender dalam rentang: PM2.5 vs rata-rata enam indikator kesehatan
    const yrs = [...new Set(sliced.dates.map((d) => d.slice(0, 4)))]
    const perYear = yrs.map((y) => {
      const idx = sliced.dates.map((d, i) => (d.startsWith(y) ? i : -1)).filter((i) => i >= 0)
      return { y, pm: mean(idx.map((i) => sliced.z['PM2.5'][i])), health: mean(INDICATORS.map((id) => mean(idx.map((i) => sliced.z[id][i])))) }
    })
    // pola bersama: rata-rata Z-Score tiap indikator pada hari PM2.5 di atas vs di bawah rata-rata
    const zp = sliced.z['PM2.5']
    const hiIdx = []; const loIdx = []
    zp.forEach((v, i) => { if (v == null) return; (v > 0 ? hiIdx : loIdx).push(i) })
    let pattern = null
    if (hiIdx.length && loIdx.length) {
      const per = INDICATORS.map((id) => ({ id, hi: mean(hiIdx.map((i) => sliced.z[id][i])), lo: mean(loIdx.map((i) => sliced.z[id][i])) })).filter((x) => x.hi != null && x.lo != null)
      if (per.length) {
        const ranked = [...per].sort((p, q) => (q.hi - q.lo) - (p.hi - p.lo))
        pattern = { nHi: hiIdx.length, nLo: loIdx.length, hi: mean(per.map((x) => x.hi)), lo: mean(per.map((x) => x.lo)), top: ranked[0], weak: ranked.at(-1), hiMin: [...per].sort((p, q) => p.hi - q.hi)[0], hiMax: [...per].sort((p, q) => q.hi - p.hi)[0] }
      }
    }
    return { iMax, iMin, avgZ, perYear, pattern }
  }, [sliced])


  const paramCols = [
    { key: 'indikator', label: 'Seri', render: (r) => <span><span className="legend-dot" style={{ display: 'inline-block', background: SERIES_BY_ID[r.indikator]?.color, marginRight: 6 }} />{r.indikator}</span> },
    { key: 'rata_rata', label: 'Rata-Rata (μ)', align: 'right', render: (r) => fmtNum(r.rata_rata, 3) },
    { key: 'simpangan_baku_ddof1', label: 'Simpangan Baku (σ)', align: 'right', render: (r) => fmtNum(r.simpangan_baku_ddof1, 3) },
    { key: 'n_observasi', label: 'Observasi Valid', align: 'right', render: (r) => formatNumber(r.n_observasi) },
    { key: 'n_missing', label: 'Missing', align: 'right', render: (r) => formatNumber(r.n_missing) },
    { key: 'satuan', label: 'Satuan Nilai Asli', render: (r) => SERIES_BY_ID[r.indikator]?.unit },
  ]
  const pmDiag = (t4.ccf_diagnostik ?? []).find((d) => d.seri === 'PM2.5')

  return (
    <div className="pk-stack">
      <FilterRow>
        <DateRangeFields start={filters.dateStart} end={filters.dateEnd} min={dates[0]} max={dates.at(-1)} onChange={setDateRange} presets={presets} />
      </FilterRow>

      <div className="pk-kpi-split">
        <div className="pk-kpi-hero">
          <MetricCard label="Hari dalam rentang" value={empty ? 0 : formatNumber(b - a + 1)} unit="hari" variant="hero" subtext={empty ? 'rentang tanggal kosong' : `${fmtDate(dates[a])} – ${fmtDate(dates[b])}`} icon={<CalendarDays size={16} />} />
          <MetricCard label="Rumah sakit" value={formatNumber(nRs)} unit="rumah sakit" variant="hero" subtext="melapor setiap hari" icon={<Building2 size={16} />} />
        </div>
        <div className="pk-kpi-cases">
          {INDICATORS.map((id) => (
            <MetricCard key={id} label={`Kasus ${id}`} value={empty ? 'NA' : formatNumber(totals[id])} unit="kasus" accentColor={SERIES_BY_ID[id].color} />
          ))}
        </div>
      </div>

      <ChartCard
        title="Z-Score PM2.5 × Kasus Penyakit"
        subtitle="Klik Legenda untuk Menyembunyikan/Menampilkan Seri dan Geser Slider untuk Rentang yang Lebih Singkat."
        action={<span className="count-pill">{empty ? '0 hari' : `${formatNumber(b - a + 1)} hari`}</span>}
      >
        {empty ? <EmptyState>Tidak ada tanggal pada rentang yang dipilih. Ubah rentang tanggal atau pilih “Semua”.</EmptyState> : <ZScoreLine dates={sliced.dates} z={sliced.z} />}
        <div className="pk-note-list">
          <strong>Catatan</strong>
          <ul>
            <li>Z-Score = (nilai − rata-rata seluruh periode) ÷ simpangan baku seluruh periode.</li>
            <li>Nilai Z-Score tidak dihitung ulang saat rentang tanggal diubah.</li>
            <li>Z-Score menunjukkan penyimpangan relatif dari rata-rata masing-masing seri, bukan perbandingan jumlah absolut.</li>
          </ul>
        </div>
      </ChartCard>

      {zInsight && zInsight.iMax >= 0 && (
        <Card>
          <CardHeader title="Insight Deskriptif" />
          <div className="pk-text">
            <ul>
              <li>Z-Score di atas 0 berarti nilai pada hari itu lebih tinggi daripada rata-rata seluruh periode, sedangkan di bawah 0 berarti lebih rendah.</li>
              <li>Pada rentang yang dipilih, PM2.5 tertinggi tercatat pada <strong>{fmtDate(sliced.dates[zInsight.iMax])}</strong> sebesar <strong>{fmtNum(sliced.raw['PM2.5'][zInsight.iMax], 2)} µg/m³</strong> (Z-Score {fmtZ(sliced.z['PM2.5'][zInsight.iMax])}), dan terendah pada <strong>{fmtDate(sliced.dates[zInsight.iMin])}</strong> sebesar <strong>{fmtNum(sliced.raw['PM2.5'][zInsight.iMin], 2)} µg/m³</strong> (Z-Score {fmtZ(sliced.z['PM2.5'][zInsight.iMin])}).</li>
              {zInsight.perYear.length > 1 ? (
                <li>Rata-rata Z-Score per tahun: PM2.5 <strong>{zInsight.perYear.map((p) => `${p.y}: ${fmtZ(p.pm)}`).join(' → ')}</strong>; rata-rata enam indikator kesehatan <strong>{zInsight.perYear.map((p) => `${p.y}: ${fmtZ(p.health)}`).join(' → ')}</strong>.</li>
              ) : (
                <li>Di antara indikator kesehatan, rata-rata Z-Score pada rentang ini tertinggi pada <strong>{zInsight.avgZ[0].id}</strong> ({fmtZ(zInsight.avgZ[0].z)}) dan terendah pada <strong>{zInsight.avgZ.at(-1).id}</strong> ({fmtZ(zInsight.avgZ.at(-1).z)}).</li>
              )}
              {zInsight.pattern && (
                <li>
                  Pola PM2.5 dan keenam indikator kesehatan: pada <strong>{formatNumber(zInsight.pattern.nHi)} hari</strong> ketika PM2.5 di atas rata-rata (Z-Score &gt; 0), rata-rata Z-Score keenam indikator adalah <strong>{fmtZ(zInsight.pattern.hi)}</strong> (dari {fmtZ(zInsight.pattern.hiMin.hi)} pada {zInsight.pattern.hiMin.id} hingga {fmtZ(zInsight.pattern.hiMax.hi)} pada {zInsight.pattern.hiMax.id}), sedangkan pada <strong>{formatNumber(zInsight.pattern.nLo)} hari</strong> ketika PM2.5 di bawah rata-rata menjadi <strong>{fmtZ(zInsight.pattern.lo)}</strong>.
                  {zInsight.pattern.hi > 0 && zInsight.pattern.lo < 0 ? <> Artinya kasus penyakit cenderung tinggi saat PM2.5 tinggi dan rendah saat PM2.5 rendah, dengan keselarasan paling jelas pada <strong>{zInsight.pattern.top.id}</strong> dan paling lemah pada <strong>{zInsight.pattern.weak.id}</strong>.</> : <> Pada rentang ini kasus penyakit tidak menunjukkan pola yang searah dengan PM2.5.</>}
                </li>
              )}
            </ul>
          </div>
        </Card>
      )}

      <Callout tone="warn" title="Naik Bersama Tidak Berarti Saling Memengaruhi">
        {pmDiag ? <>PM2.5 dan indikator kesehatan sama-sama punya tren naik selama periode (PM2.5 {fmtCoef(pmDiag.tren_per_tahun, 2)} µg/m³ per tahun) dan pola musiman. Garis yang bergerak searah di grafik ini dapat berasal dari tren/musim bersama, bukan hubungan langsung.</> : 'Garis yang bergerak searah dapat berasal dari tren atau musim bersama, bukan hubungan langsung.'}
      </Callout>

      <ChartCard title="Parameter Standardisasi" subtitle="Rata-rata dan simpangan baku seluruh periode yang dipakai setiap seri">
        <DataTable columns={paramCols} rows={t4.zscore_parameter} rowKey={(r) => r.indikator} caption="Parameter Z-Score" maxHeight={300} />
      </ChartCard>
    </div>
  )
}
