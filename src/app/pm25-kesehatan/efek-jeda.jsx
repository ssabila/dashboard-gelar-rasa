'use client'

import { useMemo, useState } from 'react'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { INDICATORS, SERIES_BY_ID, ccfRows, fmtCoef, strengthLabel } from '@/lib/pm25kesehatan'
import { CcfChart, CcfHeatmap } from './charts'
import { Section } from '@/components/layout/ModuleLayout'
import { Callout, CcfLegend, ChartCard, FilterRow, Seg } from './panels'

/**
 * Dua pendekatan CCF (bisa dipilih di halaman):
 *   'mentah'      → CCF biasa tanpa penyesuaian (kolom koef_ccf_mentah)
 *   'disesuaikan' → CCF setelah tren, musiman, dan hari dalam minggu dihilangkan, lalu AR(1) di-prewhitening (kolom koef_ccf)
 */
const DASAR = [
  { id: 'mentah', label: 'Tanpa Penyesuaian' },
  { id: 'disesuaikan', label: 'Dengan Penghapusan Tren' },
]

const lagText = (k) => (k === 0 ? 'hari yang sama' : `PM2.5 mendahului kasus ${k} hari`)
const arah = (v) => (v >= 0 ? 'searah' : 'berlawanan arah')

/** Baris CCF per lag untuk satu indikator, sesuai pendekatan yang dipilih. */
function pickRows(t4, indicator, dasar) {
  return ccfRows(t4.ccf, indicator).map((r) => (dasar === 'mentah'
    ? { ...r, koef_ccf: r.koef_ccf_mentah, di_luar_ci95: Math.abs(r.koef_ccf_mentah) > r.ci95_atas, di_luar_batas_bonferroni: false }
    : r))
}

function summarize(rows) {
  const best = rows.reduce((p, r) => (Math.abs(r.koef_ccf) > Math.abs(p.koef_ccf) ? r : p), rows[0])
  return { best, outLags: rows.filter((r) => r.di_luar_ci95).map((r) => r.lag), lag0: rows.find((r) => r.lag === 0), lagLast: rows.at(-1) }
}

/** Halaman 2 — Efek jeda: CCF PM2.5 × indikator kesehatan pada lag 0–14 hari (heatmap enam indikator + detail per indikator). */
export function EfekJedaView({ t4 }) {
  const [indicator, setIndicator] = useState('ISPA balita')
  const [dasar, setDasar] = useState('mentah')
  const mentah = dasar === 'mentah'
  const all = useMemo(() => INDICATORS.map((id) => { const r = pickRows(t4, id, dasar); return { id, rows: r, ...summarize(r) } }), [t4, dasar])
  const cur = all.find((m) => m.id === indicator)
  const { rows, best, outLags } = cur
  const lo = rows.reduce((p, r) => (r.koef_ccf < p.koef_ccf ? r : p), rows[0])
  const hi = rows.reduce((p, r) => (r.koef_ccf > p.koef_ccf ? r : p), rows[0])
  const color = SERIES_BY_ID[indicator].color

  // Insight heatmap: seluruh sel (6 indikator × 15 lag)
  const heat = useMemo(() => {
    const cells = all.flatMap((m) => m.rows.map((r) => ({ id: m.id, ...r })))
    const top = cells.reduce((p, c) => (Math.abs(c.koef_ccf) > Math.abs(p.koef_ccf) ? c : p), cells[0])
    const outAll = cells.filter((c) => c.di_luar_ci95)
    const outNon0 = outAll.filter((c) => c.lag > 0)
    const share = {}; outNon0.forEach((c) => { share[c.lag] = (share[c.lag] ?? 0) + 1 })
    const maxShare = Math.max(0, ...Object.values(share))
    const at0 = all.map((m) => ({ id: m.id, v: m.lag0.koef_ccf, out: m.lag0.di_luar_ci95 })).sort((p, q) => q.v - p.v)
    return { cells, top, outAll, outNon0, maxShare, at0, best0: all.filter((m) => m.best.lag === 0), notBest0: all.filter((m) => m.best.lag !== 0) }
  }, [all])

  return (
    <div className="pk-stack">
      <Section title="Cross-Correlation Function (CCF)">
        <Card>
          <div className="pk-text">
            <ul>
              <li>CCF mengukur seberapa kuat PM2.5 berhubungan dengan jumlah kasus penyakit ketika kasus digeser beberapa hari ke belakang. Pergeseran ini disebut <strong>lag</strong>, dihitung dari 0 sampai 14 hari.</li>
              <li><strong>Lag 0</strong> membandingkan PM2.5 dan kasus pada hari yang sama.</li>
              <li><strong>Lag k</strong> membandingkan PM2.5 hari ini dengan kasus k hari sesudahnya, sehingga CCF dipakai untuk melihat apakah ada efek jeda setelah paparan.</li>
              <li>Nilainya berkisar dari −1 sampai +1: mendekati +1 berarti bergerak searah, mendekati −1 berarti berlawanan arah, dan mendekati 0 berarti hampir tidak berhubungan.</li>
              <li>Batas CI 95% (garis putus-putus pada grafik batang): koefisien di luar batas berarti hubungannya lebih besar daripada yang diharapkan terjadi secara kebetulan.</li>
            </ul>
          </div>
        </Card>
      </Section>

      <FilterRow>
        <Seg label="Pendekatan CCF" value={dasar} onChange={setDasar} options={DASAR} />
      </FilterRow>
      <p className="pk-note pk-note--em">{mentah
        ? <><strong>Tanpa Penyesuaian:</strong> korelasi dihitung langsung dari data harian apa adanya, sehingga tren naik dan pola musiman ikut terhitung.</>
        : <><strong>Dengan Penghapusan Tren:</strong> tren jangka panjang, pola musiman, dan pola hari dalam minggu dihilangkan dari kedua deret lebih dulu, lalu korelasi dihitung dari sisa yang tersisa.</>}</p>

      <ChartCard
        title="CCF PM2.5 × Indikator Kesehatan (Lag 0–14)"
        action={<span className="count-pill">{heat.outAll.length} dari {heat.cells.length} sel di luar CI</span>}
      >
        <CcfHeatmap matrix={all} onSelect={setIndicator} />
        <CcfLegend outLabel="Di luar interval kepercayaan (CI) 95% (bingkai tebal)" />
      </ChartCard>

      <Card>
        <CardHeader title="Insight Deskriptif" />
        <div className="pk-text">
          <ul>
            <li>Korelasi terkuat dari seluruh sel ada pada <strong>{heat.top.id}</strong> di <strong>lag {heat.top.lag} hari</strong>, yaitu <strong>{fmtCoef(heat.top.koef_ccf)}</strong> ({strengthLabel(heat.top.koef_ccf)}). Pada lag 0, korelasi tertinggi ada pada <strong>{heat.at0[0].id}</strong> ({fmtCoef(heat.at0[0].v)}) dan terendah pada <strong>{heat.at0.at(-1).id}</strong> ({fmtCoef(heat.at0.at(-1).v)}).</li>
            <li>{heat.best0.length === all.length
              ? <>Pada <strong>keenam indikator</strong>, korelasi terkuat berada di <strong>lag 0</strong>.</>
              : <>Korelasi terkuat berada di lag 0 pada <strong>{heat.best0.length} dari {all.length} indikator</strong>; indikator lain terkuat pada {heat.notBest0.map((m) => `${m.id} (lag ${m.best.lag})`).join(', ')}.</>} Artinya kasus paling selaras dengan PM2.5 pada hari yang sama.</li>
            <li>{heat.outAll.length === heat.cells.length
              ? <>Seluruh <strong>{heat.cells.length} sel</strong> berada di luar CI 95%.</>
              : <><strong>{heat.outAll.length} dari {heat.cells.length} sel</strong> berada di luar CI 95%, dan {heat.outNon0.length} di antaranya ada pada lag selain 0.</>} Dengan {heat.cells.length} pengujian, sekitar {(heat.cells.length * 0.05).toFixed(1).replace('.', ',')} sel dapat melewati batas hanya karena kebetulan.</li>
            <li>{mentah
              ? 'Warna yang hampir merata di semua lag muncul karena PM2.5 dan kasus sama-sama bertren naik dan bermusim, bukan karena efek jeda. Pilih “Dengan penghapusan tren” untuk melihat hubungan setelah pengaruh itu dihilangkan.'
              : heat.outNon0.length === 0
                ? 'Setelah tren dan musim dihilangkan, tidak ada lag selain 0 yang melewati batas, sehingga tidak ada bukti efek jeda.'
                : heat.maxShare >= 3
                  ? `Setelah tren dan musim dihilangkan, ada lag selain 0 yang sama-sama melewati batas pada ${heat.maxShare} indikator, sehingga kemungkinan efek jeda perlu ditelaah lebih lanjut.`
                  : 'Setelah tren dan musim dihilangkan, sel di luar batas pada lag selain 0 tersebar di indikator dan lag yang berbeda-beda, tidak membentuk pola yang konsisten, sehingga tidak ada bukti efek jeda yang meyakinkan.'}</li>
          </ul>
        </div>
      </Card>

      <FilterRow>
        <Seg label="Indikator kesehatan (detail)" value={indicator} onChange={setIndicator} options={INDICATORS.map((i) => ({ id: i, label: i, color: SERIES_BY_ID[i].color }))} />
      </FilterRow>

      <div className="pk-split-2">
        <div className="pk-card-stack">
          <MetricCard label="Lag (Hari)" value={`${best.lag}`} unit="hari" variant="hero" subtext={lagText(best.lag)} />
          <MetricCard label="Koefisien CCF" value={fmtCoef(best.koef_ccf)} subtext={`kekuatan ${strengthLabel(best.koef_ccf)}, ${arah(best.koef_ccf)}`} accentColor={color} />
        </div>
        <Card>
          <CardHeader title="Insight Deskriptif" />
          <div className="pk-text">
            <ul>
              <li>Korelasi antara PM2.5 dan jumlah kasus <strong>{indicator}</strong> paling kuat ditemukan pada <strong>lag {best.lag} hari</strong> ({lagText(best.lag)}), dengan koefisien korelasi sebesar <strong>{fmtCoef(best.koef_ccf)}</strong> yang menunjukkan hubungan {best.koef_ccf >= 0 ? 'positif' : 'negatif'} {strengthLabel(best.koef_ccf)}.</li>
              <li>{outLags.length === rows.length
                ? <>Seluruh <strong>{rows.length} lag</strong> menunjukkan koefisien korelasi di luar interval kepercayaan (CI) 95%</>
                : outLags.length === 0
                  ? <>Tidak ada lag yang koefisien korelasinya berada di luar interval kepercayaan (CI) 95%</>
                  : <><strong>{outLags.length} dari {rows.length} lag</strong> (lag {outLags.join(', ')}) menunjukkan koefisien korelasi di luar interval kepercayaan (CI) 95%</>}
                , dengan nilai korelasi berkisar antara <strong>{fmtCoef(lo.koef_ccf)}</strong> pada lag {lo.lag} hingga <strong>{fmtCoef(hi.koef_ccf)}</strong> pada lag {hi.lag}.</li>
              <li>{best.lag === 0
                ? (best.di_luar_ci95
                  ? <>Temuan ini menunjukkan bahwa hubungan antara konsentrasi PM2.5 dan jumlah kasus {indicator} paling kuat terjadi pada hari yang sama{mentah ? '' : ', setelah tren dan musim dihilangkan'}. Namun, pola korelasi tersebut belum cukup untuk menyimpulkan adanya efek jeda (lag effect) antara paparan PM2.5 dan peningkatan kasus {indicator}.</>
                  : <>Karena tidak ada lag yang melewati batas, hubungan antara PM2.5 dan kasus {indicator} tidak dapat dibedakan dari kebetulan, baik pada hari yang sama maupun dengan jeda. Dengan demikian tidak ada bukti efek jeda (lag effect).</>)
                : <>Temuan ini menunjukkan bahwa hubungan paling kuat muncul setelah {best.lag} hari, yang mengarah pada kemungkinan efek jeda (lag effect) antara paparan PM2.5 dan kasus {indicator}. Namun, hasil ini tetap bersifat asosiasi, bukan sebab-akibat{mentah ? '' : `, dan dari ${rows.length} lag yang diuji sekitar 1 lag memang dapat melewati batas hanya karena kebetulan`}.</>}</li>
            </ul>
          </div>
        </Card>
      </div>

      <ChartCard
        title={`CCF PM2.5 × ${indicator} (Lag 0–14)`}
        action={<span className="count-pill">{outLags.length} dari {rows.length} lag di luar CI</span>}
      >
        <CcfChart rows={rows} />
        <CcfLegend outLabel="Di luar interval kepercayaan (CI) 95% (batang pekat)" showLine />
      </ChartCard>

      <Callout tone="warn" title="Perhatian dalam Menafsirkan CCF">
        {mentah
          ? <>PM2.5 dan kasus penyakit sama-sama memiliki tren naik dan pola musiman, sehingga koefisien cenderung tinggi pada hampir semua lag. Nilai ini menunjukkan keselarasan pergerakan kedua deret, bukan bukti adanya efek jeda atau hubungan sebab-akibat. Dengan 15 lag yang diuji, sebagian lag di luar CI juga dapat muncul secara kebetulan.</>
          : <>Deret sudah disesuaikan dengan tren, musiman, dan hari dalam minggu sebelum dihitung. Dengan 15 lag yang diuji, sekitar 0,75 lag di luar CI dapat muncul secara kebetulan. Hasil ini adalah asosiasi statistik, bukan bukti sebab-akibat.</>}
      </Callout>
    </div>
  )
}
