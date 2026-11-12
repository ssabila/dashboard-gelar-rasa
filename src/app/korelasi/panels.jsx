'use client'

import { useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { fmtRho, polLabel, POLLUTANT_ORDER, STRENGTH_BANDS, strengthLabel } from '@/lib/korelasi'
import { HEAT_NEG, HEAT_POS, heatColor } from './charts'

/* Komponen khusus modul Korelasi. Kelas dasar (.seg, .btn, .input, .card, .insight, .count-pill)
 * berasal dari globals.css; gaya tambahan ada di korelasi.css. */

/** Pilihan polutan (6 tombol). */
export function PollutantSeg({ value, onChange, label = 'Polutan', showLabel = true }) {
  return (
    <div className="kor-field">
      {showLabel && <span className="kor-field-label">{label}</span>}
      <div className="seg" role="tablist" aria-label={label}>
        {POLLUTANT_ORDER.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={value === p} className={value === p ? 'is-active' : ''} onClick={() => onChange(p)}>
            {polLabel(p)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Segmented control generik: options = [{ id, label }]. */
export function Seg({ options, value, onChange, label }) {
  return (
    <div className="kor-field">
      {label && <span className="kor-field-label">{label}</span>}
      <div className="seg" role="tablist" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="tab" aria-selected={value === o.id} className={value === o.id ? 'is-active' : ''} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Dropdown. options = [{ value, label }] */
export function SelectField({ label, value, onChange, options }) {
  return (
    <label className="kor-field">
      <span className="kor-field-label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

/** Baris filter dalam satu kartu. */
export function FilterRow({ children }) {
  return <Card className="kor-filters">{children}</Card>
}

export function ChartCard({ title, subtitle, action, children, className = '', note }) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      {children}
      {note && <p className="kor-note">{note}</p>}
    </Card>
  )
}

export function Callout({ tone = 'info', title, children }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info
  return (
    <div className={`kor-callout kor-callout--${tone}`} role={tone === 'warn' ? 'note' : undefined}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  )
}

/** Daftar temuan otomatis. */
export function InsightList({ title = 'Temuan dari data', subtitle = 'Dihitung langsung dari tabel hasil; menunjukkan hubungan statistik, bukan sebab-akibat.', lines }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <ul className="kor-insights">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </Card>
  )
}

/** Kartu temuan bergaya .insight dari globals.css. */
export function InsightCard({ icon: Icon, color, title, children }) {
  return (
    <Card className="insight">
      <span className="insight-icon" style={{ '--ins': color }}><Icon size={18} aria-hidden="true" /></span>
      <h4>{title}</h4>
      <p>{children}</p>
    </Card>
  )
}

export function DetailLink({ onClick, children }) {
  return (
    <button type="button" className="btn" onClick={onClick}>
      {children} <ArrowRight size={14} aria-hidden="true" />
    </button>
  )
}

export function BackLink({ onClick, children }) {
  return (
    <button type="button" className="btn" onClick={onClick}>
      <ArrowLeft size={14} aria-hidden="true" /> {children}
    </button>
  )
}

/** Keadaan kosong (filter tanpa data). */
export function EmptyState({ title = 'Data tidak tersedia', children }) {
  return (
    <div className="kor-empty" role="status">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  )
}

/** Legenda arah korelasi (warna). */
export function DirectionLegend() {
  return (
    <div className="legend">
      <span className="legend-item"><span className="legend-dot" style={{ background: '#EA580C' }} />Hubungan positif</span>
      <span className="legend-item"><span className="legend-dot" style={{ background: '#384E77' }} />Hubungan negatif</span>
    </div>
  )
}

/** Penjelasan kategori kekuatan |ρ| (sama di seluruh halaman). */
export function StrengthLegend() {
  return (
    <div className="legend" aria-label="Kategori kekuatan hubungan">
      {STRENGTH_BANDS.map((b) => (
        <span key={b.label} className="legend-item"><strong>{b.label}</strong> {b.range}</span>
      ))}
    </div>
  )
}

/* ─── Tabel dengan urutan & pagination ───────────────────────────────── */

/**
 * columns: [{ key, label, align?, render?(row), sortValue?(row) }]
 * pageSize > 0 → pagination; selain itu menampilkan semua baris di area scroll.
 */
export function DataTable({ columns, rows, rowKey, defaultSort, onRowClick, selectedKey, maxHeight = 420, caption, pageSize = 0, emptyText = 'Tidak ada baris.' }) {
  const [sort, setSort] = useState(defaultSort ?? null)
  const [page, setPage] = useState(0)
  const col = columns.find((c) => c.key === sort?.key)
  const val = (r) => (col?.sortValue ? col.sortValue(r) : r[col?.key])
  const sorted = col
    ? [...rows].sort((a, b) => {
        const x = val(a); const y = val(b)
        if (x == null && y == null) return 0
        if (x == null) return 1
        if (y == null) return -1
        const c = typeof x === 'string' ? x.localeCompare(y) : x - y
        return sort.dir === 'asc' ? c : -c
      })
    : rows
  const onSort = (key) => { setPage(0); setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })) }
  const pages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const cur = Math.min(page, pages - 1) // halaman aktif tidak melewati jumlah halaman terbaru
  const view = pageSize ? sorted.slice(cur * pageSize, (cur + 1) * pageSize) : sorted

  return (
    <div>
      <div className="kor-table-wrap" style={pageSize ? undefined : { maxHeight }}>
        <table className="kor-table">
          {caption && <caption className="kor-sr">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ textAlign: c.align ?? 'left' }} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => onSort(c.key)}>
                    {c.label}
                    {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && <tr><td colSpan={columns.length} className="is-na">{emptyText}</td></tr>}
            {view.map((r) => {
              const k = rowKey(r)
              return (
                <tr key={k} className={`${selectedKey === k ? 'is-selected' : ''}${onRowClick ? ' is-clickable' : ''}`.trim()} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ textAlign: c.align ?? 'left' }} className={r[c.key] == null && !c.render ? 'is-na' : undefined}>
                      {c.render ? c.render(r) : (r[c.key] ?? 'NA')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pageSize > 0 && sorted.length > pageSize && (
        <div className="kor-pager" role="navigation" aria-label="Halaman tabel">
          <span>{cur * pageSize + 1}–{Math.min(sorted.length, (cur + 1) * pageSize)} dari {sorted.length.toLocaleString('id-ID')} baris</span>
          <span className="kor-pager-btns">
            <button type="button" className="btn" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={14} aria-hidden="true" /></button>
            <span>Hal. {cur + 1} / {pages}</span>
            <button type="button" className="btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Halaman berikutnya"><ChevronRight size={14} aria-hidden="true" /></button>
          </span>
        </div>
      )}
    </div>
  )
}

/** Footer halaman: navigasi antar-halaman (kiri = kembali, kanan = lanjut). Isi bebas lewat children. */
export function PageFooter({ children }) {
  return <footer className="kor-footer">{children}</footer>
}

const STRENGTH_TABLE = [
  ['|Korelasi| = 0', 'Tidak Berkorelasi'],
  ['0 < |Korelasi| < 0,2', 'Sangat Lemah'],
  ['0,2 ≤ |Korelasi| < 0,4', 'Lemah'],
  ['0,4 ≤ |Korelasi| < 0,6', 'Sedang'],
  ['0,6 ≤ |Korelasi| < 0,8', 'Kuat'],
  ['0,8 ≤ |Korelasi| ≤ 1', 'Sangat Kuat'],
]

/** Legenda warna korelasi (biru = positif/searah, oranye = negatif/berlawanan arah) + tabel kategori kekuatan. */
export function CorrelationLegend() {
  return (
    <>
      <div className="legend" style={{ marginTop: '0.9rem' }}>
        <span className="legend-item"><span className="legend-dot" style={{ background: HEAT_POS }} />Korelasi Positif (Hubungan Searah)</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: HEAT_NEG }} />Korelasi Negatif (Hubungan Berlawanan Arah)</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#F3F5F8', border: '1px solid rgba(24,49,79,0.2)' }} />Netral (Mendekati 0)</span>
      </div>
      <div className="kor-table-wrap kor-strength">
        <table className="kor-table">
          <caption className="kor-sr">Kategori kekuatan korelasi</caption>
          <thead><tr><th style={{ textAlign: 'left' }}><span className="kor-th">|Korelasi|</span></th><th style={{ textAlign: 'left' }}><span className="kor-th">Kategori</span></th></tr></thead>
          <tbody>{STRENGTH_TABLE.map(([rg, k]) => <tr key={k}><td>{rg}</td><td><strong>{k}</strong></td></tr>)}</tbody>
        </table>
      </div>
    </>
  )
}

/* ─── Kotak nilai korelasi berwarna (dipakai Meteorologi & Karakteristik Stasiun) ─── */
/** Kategori kekuatan; ρ = 0 → "tidak berkorelasi". */
export const kekuatan = (r) => (r === 0 ? 'tidak berkorelasi' : strengthLabel(r))
/** ρ dengan koma desimal dan tanda minus, tanpa tanda plus (untuk kalimat insight). */
export const rSigned = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(3).replace('.', ',')}`
/** Kalimat "Hal ini menunjukkan bahwa …" dari nilai ρ. */
export function maknai(r) {
  if (r === 0) return 'tidak terdapat korelasi di antara keduanya'
  return `hubungan tersebut ${r > 0 ? 'searah' : 'berlawanan arah'} dan ${kekuatan(r)}`
}

/** Kotak nilai ρ; warna latar mengikuti skala heatmap (biru positif, oranye negatif). */
export function RhoCard({ label, rho, caption }) {
  const has = rho != null
  return (
    <Card className="kor-topcard" style={has ? { background: heatColor(rho), color: Math.abs(rho) > 0.55 ? '#FFFFFF' : '#18314F' } : undefined}>
      <span className="kor-topcard-label">{label}</span>
      <span className="kor-topcard-value"><strong>{has ? fmtRho(rho) : 'NA'}</strong>{has && <span>({kekuatan(rho)})</span>}</span>
      <span className="kor-topcard-factor">{caption}</span>
    </Card>
  )
}
