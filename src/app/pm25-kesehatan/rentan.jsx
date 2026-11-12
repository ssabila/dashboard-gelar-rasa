'use client'

import { useMemo } from 'react'
import { Baby, Users } from 'lucide-react'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatNumber } from '@/lib/formatters'
import { BALITA_COLOR, LANSIA_COLOR, fmtDate, fmtNum, rangeIdx } from '@/lib/pm25kesehatan'
import { IspaLine, TotalsBar } from './charts'
import { Callout, ChartCard, DataTable, DateRangeFields, EmptyState, FilterRow } from './panels'

const GROUPS = [
  { key: 'balita', name: 'ISPA balita', label: 'ISPA Balita', color: BALITA_COLOR },
  { key: 'lansia', name: 'ISPA lansia', label: 'ISPA Lansia', color: LANSIA_COLOR },
]

/** Rata-rata kasus/RS/hari per tahun kalender (dari seluruh data); tahun yang belum penuh diberi keterangan. */
function perYear(dates, arr) {
  const by = {}
  dates.forEach((d, i) => { if (arr[i] == null) return; const y = d.slice(0, 4); (by[y] ??= []).push(arr[i]) })
  const last = dates.at(-1)
  return Object.keys(by).sort().map((y) => ({
    year: y, mean: by[y].reduce((s, v) => s + v, 0) / by[y].length,
    label: y === last.slice(0, 4) && last.slice(5) !== '12-31' ? `${y} (s.d. ${fmtDate(last)})` : y,
  }))
}

/** Halaman 2 — Perbandingan kelompok rentan: ISPA balita vs ISPA lansia (tanpa variabel total ISPA). */
export function RentanView({ t4, filters, setDateRange, presets }) {
  const dates = t4.dates
  const [a, b] = rangeIdx(dates, filters.dateStart, filters.dateEnd)
  const empty = b < a
  const nRs = t4.ispa_ringkasan?.[0]?.n_rs ?? 22
  const sl = (arr) => arr.slice(a, b + 1)
  const sliced = useMemo(() => (empty ? null : {
    dates: sl(dates), balita: sl(t4.ispa.balita), lansia: sl(t4.ispa.lansia), nB: sl(t4.ispa.n_rs_balita), nL: sl(t4.ispa.n_rs_lansia),
  }), [t4, dates, a, b, empty]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ringkasan pada rentang terpilih: total = Σ (rata-rata kasus/RS/hari × jumlah RS pelapor); statistik harian dihitung dari total kasus semua RS per hari
  const stats = useMemo(() => Object.fromEntries(GROUPS.map((g) => {
    if (!sliced) return [g.key, null]
    const v = sliced[g.key]; const n = g.key === 'balita' ? sliced.nB : sliced.nL
    const daily = v.map((x, i) => (x == null ? null : x * (n[i] ?? 0))).filter((x) => x != null)
    const days = daily.length
    const total = Math.round(daily.reduce((s, x) => s + x, 0))
    const mean = days ? daily.reduce((s, x) => s + x, 0) / days : null
    const sorted = [...daily].sort((p, q) => p - q)
    const median = days ? (days % 2 ? sorted[(days - 1) / 2] : (sorted[days / 2 - 1] + sorted[days / 2]) / 2) : null
    const sd = days > 1 ? Math.sqrt(daily.reduce((s, x) => s + (x - mean) ** 2, 0) / (days - 1)) : null
    const perRs = days ? v.reduce((s, x) => s + (x ?? 0), 0) / days : null
    return [g.key, { total, days, perDay: mean, median, min: days ? sorted[0] : null, max: days ? sorted[days - 1] : null, sd, perRs }]
  })), [sliced])

  const years = useMemo(() => Object.fromEntries(GROUPS.map((g) => [g.key, perYear(dates, t4.ispa[g.key])])), [t4, dates])
  const rising = (arr) => arr.length > 1 && arr.every((y, i) => i === 0 || y.mean > arr[i - 1].mean)
  const trendText = (arr) => arr.map((y) => `${y.label}: ${fmtNum(y.mean, 2)}`).join(' → ')
  const lansiaAlways = years.lansia.length > 0 && years.lansia.every((y, i) => y.mean > (years.balita[i]?.mean ?? Infinity))

  const totalItems = GROUPS.map((g) => ({ name: g.name, total: stats[g.key]?.total ?? 0, color: g.color, hari: stats[g.key]?.days ?? 0, nRs }))
  // Tabel ditranspos: kolom = kelompok, baris = ukuran deskriptif
  const f0 = (x) => formatNumber(Math.round(x))
  const f1 = (x) => fmtNum(x, 1)
  const sumRows = [
    { id: 'total', label: 'Total Kasus', fmt: f0 },
    { id: 'days', label: 'Jumlah Hari', fmt: f0 },
    { id: 'perDay', label: 'Rata-Rata Kasus per Hari (Semua RS)', fmt: f1 },
    { id: 'median', label: 'Median Kasus per Hari (Semua RS)', fmt: f1 },
    { id: 'min', label: 'Kasus Harian Terendah (Semua RS)', fmt: f0 },
    { id: 'max', label: 'Kasus Harian Tertinggi (Semua RS)', fmt: f0 },
    { id: 'sd', label: 'Simpangan Baku Kasus Harian (Semua RS)', fmt: f1 },
    { id: 'perRs', label: 'Rata-Rata Kasus per RS per Hari', fmt: (x) => fmtNum(x, 2) },
  ]
  const statCell = (key, row) => { const v = stats[key]?.[row.id]; return v == null ? <span className="is-na">NA</span> : (row.id === 'total' ? <strong>{row.fmt(v)}</strong> : row.fmt(v)) }
  const sumCols = [
    { key: 'label', label: 'Ukuran Deskriptif' },
    ...GROUPS.map((g) => ({ key: g.key, label: <span><span className="legend-dot" style={{ display: 'inline-block', background: g.color, marginRight: 6 }} />{g.label}</span>, align: 'right', render: (row) => statCell(g.key, row) })),
  ]

  return (
    <div className="pk-stack">
      <FilterRow>
        <DateRangeFields start={filters.dateStart} end={filters.dateEnd} min={dates[0]} max={dates.at(-1)} onChange={setDateRange} presets={presets} />
      </FilterRow>

      <div className="kpi-grid">
        <MetricCard label="Kasus ISPA Balita" value={empty ? 'NA' : formatNumber(stats.balita.total)} unit="kasus" subtext={empty ? 'rentang tanggal kosong' : `Sesuai periode dan ${nRs} rumah sakit`} icon={<Baby size={16} />} accentColor={BALITA_COLOR} variant="hero" />
        <MetricCard label="Kasus ISPA Lansia" value={empty ? 'NA' : formatNumber(stats.lansia.total)} unit="kasus" subtext={empty ? 'rentang tanggal kosong' : `Sesuai periode dan ${nRs} rumah sakit`} icon={<Users size={16} />} accentColor={LANSIA_COLOR} />
      </div>

      <ChartCard
        title="Rata-rata Kasus ISPA Harian Balita dan Lansia"
        subtitle="Rata-rata jumlah kasus per rumah sakit per hari. Geser slider atau gulir untuk rentang yang lebih singkat."
        action={<span className="count-pill">{empty ? '0 hari' : `${formatNumber(b - a + 1)} hari`}</span>}
      >
        {empty ? <EmptyState>Tidak ada tanggal pada rentang yang dipilih. Ubah rentang tanggal atau pilih “Semua”.</EmptyState> : <IspaLine dates={sliced.dates} balita={sliced.balita} lansia={sliced.lansia} nBalita={sliced.nB} nLansia={sliced.nL} />}
      </ChartCard>

      <div className="pk-split">
        <ChartCard title="Total Kasus ISPA Balita dan Lansia" subtitle={empty ? undefined : `${fmtDate(dates[a])} – ${fmtDate(dates[b])}`}>
          {empty ? <EmptyState>Tidak ada data pada rentang ini.</EmptyState> : <TotalsBar items={totalItems} />}
        </ChartCard>
        <ChartCard title="Ringkasan Periode" subtitle="Mengikuti rentang tanggal yang dipilih">
          {empty ? <EmptyState>Tidak ada data pada rentang ini.</EmptyState> : <DataTable columns={sumCols} rows={sumRows} rowKey={(r) => r.id} caption="Ringkasan ISPA periode" sortable={false} />}
        </ChartCard>
      </div>

      <Card>
        <CardHeader title="Insight Deskriptif" />
        <div className="pk-text">
          <ul>
            <li>Rata-rata kasus <strong>ISPA balita</strong> per rumah sakit per hari {rising(years.balita) ? <><strong>cenderung meningkat dari tahun ke tahun</strong></> : 'berubah dari tahun ke tahun'}: {trendText(years.balita)}.</li>
            <li>Rata-rata kasus <strong>ISPA lansia</strong> per rumah sakit per hari {rising(years.lansia) ? <><strong>cenderung meningkat dari tahun ke tahun</strong></> : 'berubah dari tahun ke tahun'}: {trendText(years.lansia)}.</li>
            <li>{lansiaAlways ? <>Jumlah kasus <strong>ISPA lansia lebih tinggi daripada ISPA balita</strong> pada setiap tahun.</> : 'Jumlah kasus ISPA lansia dan balita bervariasi antar tahun.'} Rata-rata dihitung per hari agar tahun yang belum penuh tetap sebanding.</li>
          </ul>
        </div>
      </Card>

      <Callout tone="warn" title="Jumlah Kasus Mentah ≠ Tingkat Kerentanan">
        Perbedaan jumlah kasus tercatat belum menunjukkan perbedaan risiko atau kerentanan: jumlah penduduk balita dan lansia di wilayah tiap RS tidak tersedia (tanpa denominator), dan cakupan pelaporan serta jenis pasien tiap RS dapat berbeda. Karena itu tidak ada kesimpulan kelompok mana yang lebih rentan.
      </Callout>
    </div>
  )
}
