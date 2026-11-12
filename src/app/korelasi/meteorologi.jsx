'use client'

import { useMemo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import { useStationScatter } from '@/hooks/useKorelasiData'
import { formatNumber } from '@/lib/formatters'
import { FACTORS, MET_KEYS, binnedMedian, polLabel } from '@/lib/korelasi'
import { HourlyScatter, StationRhoBar } from './charts'
import { BackLink, ChartCard, CorrelationLegend, EmptyState, FilterRow, PageFooter, PollutantSeg, RhoCard, Seg, SelectField, maknai, rSigned } from './panels'

const titleCase = (s) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase())

/** Detail Meteorologi: satu halaman untuk suhu, kelembapan, dan kecepatan angin. */
export function MeteorologiDetail({ t, ix, nav, go }) {
  const factor = MET_KEYS.includes(nav.factor) ? nav.factor : 'temperature'
  const pol = nav.pol ?? 'pm25'
  const [station, setStation] = useState(ix.stations[0]?.stasiun ?? null)
  const set = (patch) => go({ ...nav, group: 'numerik', sub: 'meteorologi', ...patch }, { keepScroll: true })

  const { data, loading, error } = useStationScatter(station)
  const row = ix.detail.get(`${station}|${factor}|${pol}`)
  const f = FACTORS[factor]
  const xs = data?.[factor]; const ys = data?.[pol]
  const trend = useMemo(() => (xs && ys ? binnedMedian(xs, ys, 20) : []), [xs, ys])
  const nObs = useMemo(() => (xs && ys ? xs.reduce((n, x, i) => n + (x != null && ys[i] != null ? 1 : 0), 0) : 0), [xs, ys])
  const perStation = useMemo(() => ix.stations.map((s) => { const r = ix.detail.get(`${s.stasiun}|${factor}|${pol}`); return { stasiun: s.stasiun, rho: r?.status === 'ok' ? r.spearman_rho : null, n: r?.n_valid } }), [ix, factor, pol])
  const med = ix.cells[factor]?.[pol]
  const rhoSt = row && row.status === 'ok' ? row.spearman_rho : null
  const fl = f.label.toLowerCase()

  // Stasiun penentu median: jumlah stasiun ganjil -> satu stasiun tengah; genap -> dua stasiun tengah (median = rata-ratanya)
  const medianInfo = useMemo(() => {
    const v = perStation.filter((r) => r.rho != null).sort((a, b) => a.rho - b.rho)
    if (!v.length) return null
    const n = v.length
    const mid = n % 2 ? [v[(n - 1) / 2]] : [v[n / 2 - 1], v[n / 2]]
    return { mid: mid.map((m) => m.stasiun) }
  }, [perStation])
  const isMedianStation = !!medianInfo && medianInfo.mid.includes(station)
  const partner = isMedianStation ? medianInfo.mid.find((s) => s !== station) : null

  return (
    <div className="stack">
      <FilterRow>
        <Seg label="Variabel meteorologi" value={factor} onChange={(v) => set({ factor: v })} options={MET_KEYS.map((k) => ({ id: k, label: FACTORS[k].label }))} />
        <SelectField label="Stasiun AQMS (22)" value={station ?? ''} onChange={setStation} options={ix.stations.map((s) => ({ value: s.stasiun, label: `${s.stasiun} · ${s.tipe_lokasi}` }))} />
        <PollutantSeg value={pol} onChange={(v) => set({ pol: v })} />
      </FilterRow>

      {/* 1. Nilai korelasi (median 22 stasiun, stasiun terpilih) dan banyak observasi */}
      <div className="kor-top-grid">
        <RhoCard label="Korelasi Spearman - Median 22 Stasiun" rho={med ? med.rho : null} caption={`${f.label} × ${polLabel(pol)}`} />
        <RhoCard label={`Korelasi Spearman - Stasiun ${station}`} rho={rhoSt} caption={`${f.label} × ${polLabel(pol)}`} />
        <Card className="kor-topcard">
          <span className="kor-topcard-label">Banyak Observasi</span>
          <span className="kor-topcard-value"><strong>{loading ? '…' : formatNumber(nObs)}</strong><span>jam</span></span>
          <span className="kor-topcard-factor">{f.label} × {polLabel(pol)}</span>
        </Card>
      </div>

      {/* 2. Insight */}
      <Card>
        <CardHeader title="Insight" />
        <div className="kor-insight-text">
          <ul>
            {med && (
              <li>Berdasarkan median korelasi Spearman dari 22 stasiun, didapatkan variabel <strong>{fl}</strong> berkorelasi sebesar <strong>{rSigned(med.rho)}</strong> terhadap <strong>{polLabel(pol)}</strong>. Hal ini menunjukkan bahwa {maknai(med.rho)}.</li>
            )}
            {rhoSt != null && (isMedianStation ? (
              <li>Stasiun <strong>{station}</strong> merupakan {partner ? <>salah satu dari dua stasiun penentu median (bersama <strong>{partner}</strong>)</> : 'stasiun median'} dari korelasi antara variabel <strong>{fl}</strong> dan polutan <strong>{polLabel(pol)}</strong>, dengan korelasi sebesar <strong>{rSigned(rhoSt)}</strong>. Hal ini menunjukkan bahwa {maknai(rhoSt)}.</li>
            ) : (
              <li>Pada stasiun <strong>{station}</strong>, didapatkan variabel <strong>{fl}</strong> berkorelasi sebesar <strong>{rSigned(rhoSt)}</strong> terhadap <strong>{polLabel(pol)}</strong>. Hal ini menunjukkan bahwa {maknai(rhoSt)}.</li>
            ))}
            {rhoSt == null && <li>Stasiun <strong>{station}</strong> tidak memiliki koefisien korelasi yang valid untuk {fl} dan {polLabel(pol)}.</li>}
          </ul>
        </div>
      </Card>

      {/* 3. Korelasi di 22 stasiun */}
      <ChartCard title={`Korelasi ${titleCase(f.label)} × ${polLabel(pol)} di 22 Stasiun`} subtitle="Klik Batang untuk Memilih Stasiun">
        <StationRhoBar rows={perStation} selected={station} onSelect={setStation} />
        <CorrelationLegend />
      </ChartCard>

      {/* 4. Scatter plot */}
      <ChartCard
        title={`Scatter Plot ${titleCase(f.label)} × ${polLabel(pol)} - ${station}`}
        action={<span className="count-pill">{loading ? 'memuat…' : `${formatNumber(nObs)} jam`}</span>}
      >
        {error && <ErrorState message={`Data stasiun gagal dimuat: ${error}`} />}
        {loading && <LoadingSpinner label={`Memuat data jam ${station}...`} />}
        {data && nObs === 0 && <EmptyState>Stasiun ini tidak memiliki pasangan observasi valid untuk kombinasi yang dipilih.</EmptyState>}
        {data && nObs > 0 && <HourlyScatter xs={xs} ys={ys} xKey={factor} pol={pol} trend={trend} />}
      </ChartCard>

      <PageFooter>
        <BackLink onClick={() => go({ group: 'numerik', sub: 'ringkasan' })}>Kembali ke Overview Numerik</BackLink>
      </PageFooter>
    </div>
  )
}
