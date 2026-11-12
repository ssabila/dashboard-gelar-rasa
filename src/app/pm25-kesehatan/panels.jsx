'use client'

import { useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'

/* Komponen khusus modul PM2.5 & Kesehatan. Kelas dasar (.seg, .btn, .input, .card, .count-pill)
 * berasal dari globals.css; gaya tambahan ada di pm25.css. */

/** Segmented control generik: options = [{ id, label, color? }]. */
export function Seg({ options, value, onChange, label }) {
  return (
    <div className="pk-field">
      {label && <span className="pk-field-label">{label}</span>}
      <div className="seg" role="tablist" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="tab" aria-selected={value === o.id} className={value === o.id ? 'is-active' : ''} onClick={() => onChange(o.id)}>
            {o.color && <span className="legend-dot" style={{ display: 'inline-block', background: o.color, marginRight: 6 }} />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Baris filter dalam satu kartu. */
export function FilterRow({ children }) {
  return <Card className="pk-filters">{children}</Card>
}

export function ChartCard({ title, subtitle, action, children, className = '', note }) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      {children}
      {note && <p className="pk-note">{note}</p>}
    </Card>
  )
}

export function Callout({ tone = 'info', title, children }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info
  return (
    <div className={`pk-callout pk-callout--${tone}`} role={tone === 'warn' ? 'note' : undefined}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  )
}

/** Keadaan kosong (filter tanpa data). */
export function EmptyState({ title = 'Data tidak tersedia', children }) {
  return (
    <div className="pk-empty" role="status">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  )
}

/** Tabel dengan urutan kolom dan (opsional) pagination. columns: [{ key, label, align?, render?(row), sortValue?(row) }] */
export function DataTable({ columns, rows, rowKey, defaultSort, maxHeight = 420, caption, pageSize = 0, sortable = true, emptyText = 'Tidak ada baris.' }) {
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
      <div className="pk-table-wrap" style={pageSize ? undefined : { maxHeight }}>
        <table className="pk-table">
          {caption && <caption className="pk-sr">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ textAlign: c.align ?? 'left' }} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  {sortable ? (
                    <button type="button" onClick={() => onSort(c.key)}>
                      {c.label}
                      {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />)}
                    </button>
                  ) : <span className="pk-th-plain">{c.label}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && <tr><td colSpan={columns.length} className="is-na">{emptyText}</td></tr>}
            {view.map((r) => (
              <tr key={rowKey(r)} className={r._hl ? 'is-selected' : undefined}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align ?? 'left' }} className={r[c.key] == null && !c.render ? 'is-na' : undefined}>
                    {c.render ? c.render(r) : (r[c.key] ?? 'NA')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize > 0 && sorted.length > pageSize && (
        <div className="pk-pager" role="navigation" aria-label="Halaman tabel">
          <span>{cur * pageSize + 1}–{Math.min(sorted.length, (cur + 1) * pageSize)} dari {sorted.length.toLocaleString('id-ID')} baris</span>
          <span className="pk-pager-btns">
            <button type="button" className="btn" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={14} aria-hidden="true" /></button>
            <span>Hal. {cur + 1} / {pages}</span>
            <button type="button" className="btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Halaman berikutnya"><ChevronRight size={14} aria-hidden="true" /></button>
          </span>
        </div>
      )}
    </div>
  )
}

/** Rentang tanggal (dua input date) + preset cepat. Batas diambil dari data. */
export function DateRangeFields({ start, end, min, max, onChange, presets = [] }) {
  const set = (s, e) => {
    if (!s || !e) return
    onChange(s <= e ? s : e, s <= e ? e : s)
  }
  return (
    <>
      <label className="pk-field">
        <span className="pk-field-label">Dari tanggal</span>
        <input className="input" type="date" value={start} min={min} max={end} onChange={(ev) => set(ev.target.value, end)} />
      </label>
      <label className="pk-field">
        <span className="pk-field-label">Sampai tanggal</span>
        <input className="input" type="date" value={end} min={start} max={max} onChange={(ev) => set(start, ev.target.value)} />
      </label>
      {presets.length > 0 && (
        <div className="pk-field">
          <span className="pk-field-label">Rentang cepat</span>
          <div className="seg" role="group" aria-label="Rentang cepat">
            {presets.map((p) => (
              <button key={p.label} type="button" className={start === p.start && end === p.end ? 'is-active' : ''} onClick={() => onChange(p.start, p.end)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/** Legenda bulat untuk heatmap dan grafik batang CCF. outLabel menjelaskan tanda "di luar CI". */
export function CcfLegend({ outLabel = 'Di luar CI 95%', showLine = false }) {
  return (
    <div className="legend pk-legend" aria-label="Legenda">
      <span className="legend-item"><span className="legend-dot" style={{ background: '#EA580C' }} />Korelasi positif</span>
      <span className="legend-item"><span className="legend-dot" style={{ background: '#384E77' }} />Korelasi negatif</span>
      <span className="legend-item"><span className="legend-dot" style={{ background: '#FFFFFF', boxShadow: 'inset 0 0 0 2px #18314F' }} />{outLabel}</span>
      <span className="legend-item"><span className="legend-dot" style={{ background: '#F8B77F', opacity: 0.6 }} />Di dalam CI 95% (pucat)</span>
      {showLine && <span className="legend-item"><span className="pk-legend-dash" />Batas atas dan bawah CI 95%</span>}
    </div>
  )
}
