'use client'

import { useMemo } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatNumber } from '@/lib/formatters'
import { FACTORS, GROUP_COLORS, LOC_KEYS, POLLUTANT_ORDER, fmtConc, fmtFactor, linearFit, polLabel, polUnit } from '@/lib/korelasi'
import { RhoByPollutantBar, StationScatter } from './charts'
import { BackLink, ChartCard, CorrelationLegend, DataTable, FilterRow, PageFooter, PollutantSeg, RhoCard, Seg, maknai, rSigned } from './panels'

/** Nama variabel di halaman ini: huruf awal kapital, kecuali kata penghubung "ke". */
const LABELS = { lalu_lintas: 'Intensitas Lalu Lintas', jarak_jalan: 'Jarak ke Jalan Raya' }

/** Detail Karakteristik Stasiun: unit analisis = 22 stasiun (median polutan per stasiun). */
export function KarakteristikDetail({ t, ix, nav, go }) {
  const factor = LOC_KEYS.includes(nav.factor) ? nav.factor : 'lalu_lintas'
  const pol = nav.pol ?? 'pm25'
  const set = (patch) => go({ ...nav, group: 'numerik', sub: 'karakteristik', ...patch }, { keepScroll: true })
  const f = FACTORS[factor]
  const label = LABELS[factor]

  const points = useMemo(
    () => ix.stations.map((s) => ({ stasiun: s.stasiun, tipe: s.tipe_lokasi, x: s[f.col], y: s[`med_${pol}`] })).filter((p) => p.x != null && p.y != null),
    [ix, f.col, pol]
  )
  const line = useMemo(() => {
    if (points.length < 3) return []
    const fit = linearFit(points.map((p) => [p.x, p.y]))
    if (!fit) return []
    const xs = points.map((p) => p.x); const a = Math.min(...xs); const b = Math.max(...xs)
    return [a, b].map((x) => [x, fit.intercept + fit.slope * x])
  }, [points])

  const c = ix.cells[factor]?.[pol]
  const byPol = POLLUTANT_ORDER.map((p) => ({ pol: p, rho: ix.cells[factor]?.[p]?.rho ?? null, note: `antar-${ix.cells[factor]?.[p]?.n ?? 22} stasiun` })).filter((r) => r.rho != null)

  const cols = [
    { key: 'stasiun', label: 'Stasiun' },
    { key: 'tipe_lokasi', label: 'Tipe Lokasi', render: (r) => <span><span className="legend-dot" style={{ display: 'inline-block', background: GROUP_COLORS[r.tipe_lokasi], marginRight: 6 }} />{r.tipe_lokasi}</span> },
    { key: 'intensitas_lalu_lintas', label: 'Intensitas Lalu Lintas', align: 'right', render: (r) => fmtFactor(r.intensitas_lalu_lintas, 'lalu_lintas') },
    { key: 'jarak_ke_jalan_raya_m', label: 'Jarak ke Jalan Raya (m)', align: 'right', render: (r) => fmtFactor(r.jarak_ke_jalan_raya_m, 'jarak_jalan') },
    ...POLLUTANT_ORDER.map((p) => ({
      key: `med_${p}`, label: `${polLabel(p)} (${polUnit(p)})`, align: 'right',
      render: (r) => (p === pol ? <strong>{fmtConc(r[`med_${p}`], p)}</strong> : fmtConc(r[`med_${p}`], p)),
    })),
  ]

  return (
    <div className="stack">
      <FilterRow>
        <Seg label="Variabel karakteristik" value={factor} onChange={(v) => set({ factor: v })} options={LOC_KEYS.map((k) => ({ id: k, label: LABELS[k] }))} />
        <PollutantSeg value={pol} onChange={(v) => set({ pol: v })} />
      </FilterRow>

      {/* 1. Kotak nilai korelasi (kiri) + insight (kanan, lebih lebar) */}
      <div className="kor-split-2">
        <div className="kor-card-stack">
          <RhoCard label="Korelasi Spearman Antar Stasiun" rho={c ? c.rho : null} caption={`Median ${polLabel(pol)} × ${label}`} />
        </div>
        <Card>
          <CardHeader title="Insight" />
          <div className="kor-insight-text">
            {c ? (
              <ul>
                <li>Berdasarkan korelasi Spearman antar {formatNumber(c.n)} stasiun, didapatkan variabel <strong>{label.toLowerCase()}</strong> berkorelasi sebesar <strong>{rSigned(c.rho)}</strong> terhadap median <strong>{polLabel(pol)}</strong>. Hal ini menunjukkan bahwa {maknai(c.rho)}.</li>
              </ul>
            ) : (
              <ul><li>Koefisien korelasi tidak tersedia untuk {label.toLowerCase()} dan {polLabel(pol)}.</li></ul>
            )}
          </div>
        </Card>
      </div>

      {/* 2. Korelasi menurut polutan */}
      <ChartCard title={`Korelasi ${label} × Polutan`} subtitle="Klik Batang untuk Mengganti Polutan">
        <RhoByPollutantBar items={byPol} selected={pol} onSelect={(p) => set({ pol: p })} />
        <CorrelationLegend />
      </ChartCard>

      {/* 3. Scatter plot 22 stasiun */}
      <ChartCard
        title={`Scatter Plot Median ${polLabel(pol)} × ${label}`}
        action={<span className="count-pill">{points.length} stasiun</span>}
      >
        <StationScatter points={points} xKey={factor} xLabel={label} pol={pol} line={line} />
      </ChartCard>

      {/* 4. Tabel */}
      <ChartCard title="Tabel Karakteristik 22 Stasiun" subtitle="Klik Judul Kolom untuk Mengurutkan · Kolom polutan menampilkan median konsentrasi tiap stasiun">
        <DataTable columns={cols} rows={ix.stations} rowKey={(r) => r.stasiun} defaultSort={{ key: `med_${pol}`, dir: 'desc' }} pageSize={11} caption="Tabel karakteristik 22 stasiun" />
      </ChartCard>

      <PageFooter>
        <BackLink onClick={() => go({ group: 'numerik', sub: 'ringkasan' })}>Kembali ke Overview Numerik</BackLink>
      </PageFooter>
    </div>
  )
}
