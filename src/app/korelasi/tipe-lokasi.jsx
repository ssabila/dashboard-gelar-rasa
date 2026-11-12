'use client'

import { useMemo } from 'react'
import { Layers } from 'lucide-react'
import { MetricCard } from '@/components/ui/MetricCard'
import { GROUP_COLORS, GROUP_ORDER, fmtConc, maxBy, minBy, polLabel, polUnit } from '@/lib/korelasi'
import { CategoryDotChart, MedianLegend } from './charts'
import { BackLink, Callout, ChartCard, DataTable, EmptyState, FilterRow, PageFooter, PollutantSeg } from './panels'

/** Tipe Lokasi: satu titik = median satu stasiun; deskriptif. */
export function TipeLokasiView({ t, ix, nav, go }) {
  const pol = nav.pol ?? 'pm25'

  const groups = useMemo(() => GROUP_ORDER.map((g) => {
    const row = t.tipe_ringkasan.find((r) => r.tipe_lokasi === g && r.polutan === pol)
    const sts = ix.stations.filter((s) => s.tipe_lokasi === g)
    const pts = sts.map((s) => ({ label: `${s.stasiun} · ${s.site_type_asli}`, v: s[`med_${pol}`] })).filter((p) => p.v != null)
    return { g, row, sts, pts }
  }), [t, ix, pol])

  const items = groups.map((x) => ({
    name: x.g, color: GROUP_COLORS[x.g], med: x.row ? x.row.median : null, nLabel: `${x.row?.jumlah_stasiun ?? 0} stasiun`, points: x.pts,
  }))
  const have = groups.filter((x) => x.row)
  const hi = maxBy(have, (x) => x.row.median); const lo = minBy(have, (x) => x.row.median)
  const biggest = maxBy(groups, (x) => x.sts.length)

  const cols = [
    { key: 'g', label: 'Tipe Lokasi', render: (r) => <span><span className="legend-dot" style={{ display: 'inline-block', background: GROUP_COLORS[r.g], marginRight: 6 }} />{r.g}</span> },
    { key: 'n', label: 'Jumlah Stasiun', align: 'right', render: (r) => r.row?.jumlah_stasiun ?? 'NA', sortValue: (r) => r.row?.jumlah_stasiun },
    { key: 'median', label: `Median ${polLabel(pol)} (${polUnit(pol)})`, align: 'right', render: (r) => (r.row ? <strong>{fmtConc(r.row.median, pol)}</strong> : 'NA'), sortValue: (r) => r.row?.median },
    { key: 'q1', label: 'Q1', align: 'right', render: (r) => (r.row ? fmtConc(r.row.q1, pol) : 'NA'), sortValue: (r) => r.row?.q1 },
    { key: 'q3', label: 'Q3', align: 'right', render: (r) => (r.row ? fmtConc(r.row.q3, pol) : 'NA'), sortValue: (r) => r.row?.q3 },
    { key: 'iqr', label: 'IQR', align: 'right', render: (r) => (r.row ? fmtConc(r.row.iqr, pol) : 'NA'), sortValue: (r) => r.row?.iqr },
  ]

  return (
    <div className="stack">
      <FilterRow>
        <PollutantSeg value={pol} onChange={(v) => go({ ...nav, pol: v }, { keepScroll: true })} />
      </FilterRow>

      <div className="kor-top-grid">
        <MetricCard label="Tipe Lokasi Median Tertinggi" value={hi ? hi.g : 'NA'} variant="hero" subtext={hi ? `${fmtConc(hi.row.median, pol)} ${polUnit(pol)} · ${hi.row.jumlah_stasiun} stasiun` : 'tidak ada data'} icon={<Layers size={16} />} />
        <MetricCard label="Tipe Lokasi Median Terendah" value={lo ? lo.g : 'NA'} subtext={lo ? `${fmtConc(lo.row.median, pol)} ${polUnit(pol)} · ${lo.row.jumlah_stasiun} stasiun` : 'tidak ada data'} />
        <MetricCard label="Banyak Stasiun" value={ix.stations.length} unit="stasiun" subtext={`${groups.length} tipe lokasi`} />
      </div>

      <ChartCard
        title={`Sebaran Tipe Lokasi × ${polLabel(pol)} - 22 Stasiun`}
        subtitle="Satu titik merupakan median suatu stasiun pada tipe lokasi tersebut."
      >
        {have.length === 0 ? <EmptyState>Tidak ada data untuk polutan ini.</EmptyState> : <><CategoryDotChart items={items} pol={pol} xName="Tipe Lokasi" /><MedianLegend /></>}
      </ChartCard>

      <ChartCard title={`Tabel Tipe Lokasi × ${polLabel(pol)} - 22 Stasiun`} subtitle="Klik Judul Kolom untuk Mengurutkan">
        <DataTable columns={cols} rows={groups} rowKey={(r) => r.g} defaultSort={{ key: 'median', dir: 'desc' }} caption="Tipe lokasi dan ringkasan polutan" />
      </ChartCard>

      <ChartCard title="Insight Deskriptif">
        {hi && lo ? (
          <div className="kor-insight-text">
            <ul>
              <li>Median {polLabel(pol)} <strong>tertinggi</strong> tercatat pada tipe lokasi <strong>{hi.g}</strong>, yaitu sebesar <strong>{fmtConc(hi.row.median, pol)} {polUnit(pol)}</strong>.</li>
              <li>Median {polLabel(pol)} <strong>terendah</strong> tercatat pada tipe lokasi <strong>{lo.g}</strong>, yaitu sebesar <strong>{fmtConc(lo.row.median, pol)} {polUnit(pol)}</strong>.</li>
              <li>Selisih median tertinggi dan terendah sebesar <strong>{fmtConc(hi.row.median - lo.row.median, pol)} {polUnit(pol)}</strong>. Perbedaan ini bersifat deskriptif dan tidak diuji signifikansinya.</li>
              <li>Tipe lokasi dengan anggota stasiun terbanyak adalah <strong>{biggest.g}</strong>, yaitu <strong>{biggest.sts.length} stasiun</strong>.</li>
            </ul>
          </div>
        ) : <EmptyState>Belum ada insight karena tidak ada data.</EmptyState>}
      </ChartCard>

      <Callout tone="warn" title="Jumlah Stasiun per Tipe Terbatas">Median dan kuartil dihitung dari median tiap stasiun. Karena anggota tiap tipe lokasi sedikit, satu stasiun dapat menggeser median, sehingga perbedaan antar tipe perlu dibaca dengan hati-hati.</Callout>

      <PageFooter>
        <BackLink onClick={() => go({ group: 'kategorik', sub: 'ringkasan-kategorik' })}>Kembali ke Overview Kategorik</BackLink>
      </PageFooter>
    </div>
  )
}
