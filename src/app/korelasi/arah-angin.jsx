'use client'

import { useMemo, useState } from 'react'
import { Compass } from 'lucide-react'
import { MetricCard } from '@/components/ui/MetricCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatNumber } from '@/lib/formatters'
import { SECTORS, boxStats, fmtConc, maxBy, minBy, polLabel, polUnit, quantile } from '@/lib/korelasi'
import { useStationArah } from '@/hooks/useKorelasiData'
import { CategoryDotChart, CountBar, MedianLegend } from './charts'
import { BackLink, Callout, ChartCard, DataTable, EmptyState, FilterRow, PageFooter, PollutantSeg, SelectField } from './panels'

const MIN_JAM = 30   // kombinasi stasiun–arah dengan < 30 jam tidak ikut boxplot lintas stasiun

/** Arah Angin: deskriptif, 8 arah, jam calm (< 0,5 m/s) dikeluarkan. */
export function ArahAnginView({ t, ix, nav, go }) {
  const pol = nav.pol ?? 'pm25'
  const [station, setStation] = useState('ALL')
  const single = station !== 'ALL'

  const summary = useMemo(() => SECTORS.map((s) => {
    const all = t.arah_angin.filter((r) => r.polutan === pol && r.arah_angin === s.name)
    if (single) {
      const r = all.find((x) => x.stasiun === station)
      if (!r) return { ...s, n: 0, nStasiun: 0, empty: true }
      return { ...s, n: r.n_valid, nStasiun: 1, med: r.median, q1: r.q1, q3: r.q3, iqr: r.iqr, wLow: r.whisker_bawah, wHigh: r.whisker_atas, nPencilan: r.n_pencilan, box: r.n_valid >= MIN_JAM, points: [] }
    }
    const used = all.filter((r) => r.n_valid >= MIN_JAM)
    const meds = used.map((r) => r.median)
    const b = boxStats(meds)
    return {
      ...s, n: all.reduce((a, r) => a + r.n_valid, 0), nStasiun: used.length, nExcluded: all.length - used.length,
      med: quantile(meds, 0.5), q1: quantile(meds, 0.25), q3: quantile(meds, 0.75), iqr: b ? b.iqr : null, wLow: b?.min, wHigh: b?.max, box: used.length >= 5,
      points: used.map((r) => ({ label: `${r.stasiun} · ${formatNumber(r.n_valid)} jam`, v: r.median })), empty: used.length === 0,
    }
  }), [t, pol, station, single])

  const { data: arahData, loading: arahLoading } = useStationArah(single ? station : null)
  const items = summary.map((s) => ({
    name: s.name, color: '#384E77', med: s.empty ? null : s.med,
    nLabel: single ? `${formatNumber(s.n)} jam valid` : `${s.nStasiun} stasiun · ${formatNumber(s.n)} jam`,
    ...(single ? { values: arahData?.[pol]?.[s.name] ?? [] } : { points: s.points }),
  }))
  const valid = summary.filter((s) => !s.empty && s.med != null)
  const hi = maxBy(valid, (s) => s.med); const lo = minBy(valid, (s) => s.med)
  const totalN = summary.reduce((a, s) => a + s.n, 0)

  const scope = single ? station : '22 Stasiun'
  const cols = [
    { key: 'name', label: 'Arah Angin (Asal)', render: (r) => `${r.name} (${r.code})` },
    { key: 'med', label: `Median ${polLabel(pol)} (${polUnit(pol)})`, align: 'right', render: (r) => (r.empty ? 'NA' : <strong>{fmtConc(r.med, pol)}</strong>) },
    { key: 'q1', label: 'Q1', align: 'right', render: (r) => (r.empty ? 'NA' : fmtConc(r.q1, pol)) },
    { key: 'q3', label: 'Q3', align: 'right', render: (r) => (r.empty ? 'NA' : fmtConc(r.q3, pol)) },
    { key: 'iqr', label: 'IQR', align: 'right', render: (r) => (r.iqr == null ? 'NA' : fmtConc(r.iqr, pol)) },
    ...(single ? [] : [{ key: 'nStasiun', label: 'Stasiun', align: 'right', render: (r) => r.nStasiun }]),
    { key: 'n', label: 'Jam Valid', align: 'right', render: (r) => formatNumber(r.n) },
  ]
  const countItems = summary.map((s) => ({ name: s.name, n: s.n }))

  const freq = maxBy(summary, (s) => s.n)

  return (
    <div className="stack">
      <FilterRow>
        <PollutantSeg value={pol} onChange={(v) => go({ ...nav, pol: v }, { keepScroll: true })} />
        <SelectField label="Stasiun (opsional)" value={station} onChange={setStation} options={[{ value: 'ALL', label: 'Semua stasiun (22)' }, ...ix.stations.map((s) => ({ value: s.stasiun, label: `${s.stasiun} · ${s.tipe_lokasi}` }))]} />
      </FilterRow>

      <div className="kor-top-grid">
        <MetricCard label={`Arah Median Tertinggi - ${single ? `Stasiun ${station}` : '22 Stasiun'}`} value={hi ? hi.name : 'NA'} variant="hero" subtext={hi ? `${fmtConc(hi.med, pol)} ${polUnit(pol)} · ${formatNumber(hi.n)} jam` : 'tidak ada data'} icon={<Compass size={16} />} />
        <MetricCard label={`Arah Median Terendah - ${single ? `Stasiun ${station}` : '22 Stasiun'}`} value={lo ? lo.name : 'NA'} subtext={lo ? `${fmtConc(lo.med, pol)} ${polUnit(pol)} · ${formatNumber(lo.n)} jam` : 'tidak ada data'} />
        <MetricCard label={`Banyak Observasi - ${single ? `Stasiun ${station}` : '22 Stasiun'}`} value={formatNumber(totalN)} unit="jam" subtext={`Arah angin × ${polLabel(pol)}`} />
      </div>

      <ChartCard
        title={`Sebaran Arah Mata Angin × ${polLabel(pol)} - ${scope}`}
        subtitle={single ? 'Satu titik merupakan observasi di stasiun tersebut pada arah mata angin tersebut.' : 'Satu titik merupakan median suatu stasiun pada arah mata angin tersebut.'}
      >
        {valid.length === 0 ? <EmptyState>Tidak ada data arah angin untuk stasiun dan polutan ini.</EmptyState> : single && arahLoading ? <LoadingSpinner label="Memuat observasi stasiun..." /> : <><CategoryDotChart items={items} pol={pol} xName="Mata Angin" /><MedianLegend /></>}
        <p className="kor-note kor-note--em"><strong>Catatan:</strong> Pengamatan <strong>calm</strong>, yaitu ketika kecepatan angin &lt; 0,5 m/s, tidak dimasukkan ke dalam analisis.</p>
      </ChartCard>

      <div className="kor-split-arah">
        <ChartCard title={`Banyak Observasi per Arah Mata Angin × ${polLabel(pol)} - ${scope}`}>
          <CountBar items={countItems} xName="Mata Angin" />
        </ChartCard>
        <ChartCard title={`Tabel Deskriptif Arah Mata Angin × Median ${polLabel(pol)}`}>
          <DataTable columns={cols} rows={summary} rowKey={(r) => r.code} caption="Median polutan menurut arah angin" />
        </ChartCard>
      </div>

      <ChartCard title="Insight Deskriptif">
        {hi && lo ? (
          <div className="kor-insight-text">
            <ul>
              <li>Median {polLabel(pol)} {single ? `di stasiun ${station}` : 'antar 22 stasiun'} <strong>tertinggi</strong> tercatat saat angin bertiup dari arah <strong>{hi.name}</strong>, yaitu sebesar <strong>{fmtConc(hi.med, pol)} {polUnit(pol)}</strong>.</li>
              <li>Median {polLabel(pol)} <strong>terendah</strong> tercatat saat angin bertiup dari arah <strong>{lo.name}</strong>, yaitu sebesar <strong>{fmtConc(lo.med, pol)} {polUnit(pol)}</strong>.</li>
              <li>Selisih median tertinggi dan terendah sebesar <strong>{fmtConc(hi.med - lo.med, pol)} {polUnit(pol)}</strong>. Perbedaan ini bersifat deskriptif dan tidak diuji signifikansinya.</li>
              <li>Arah angin yang paling sering terjadi adalah <strong>{freq.name}</strong>, dengan total <strong>{formatNumber(freq.n)} jam</strong> observasi.</li>
            </ul>
          </div>
        ) : <EmptyState>Belum ada insight karena tidak ada data.</EmptyState>}
      </ChartCard>

      <Callout tone="warn" title="Arah Angin ≠ Sumber">Arah datang angin tidak otomatis menunjukkan lokasi sumber polutan. Jumlah jam antar arah juga sangat tidak seimbang, sehingga median perlu dibandingkan dengan hati-hati.</Callout>

      <PageFooter>
        <BackLink onClick={() => go({ group: 'kategorik', sub: 'ringkasan-kategorik' })}>Kembali ke Overview Kategorik</BackLink>
      </PageFooter>
    </div>
  )
}
