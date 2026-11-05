'use client'

import { CalendarDays, MapPin, RotateCcw } from 'lucide-react'

export const DATE_PRESETS = [
  { label: 'Semua',  start: '2024-01-01', end: '2026-10-14' },
  { label: '2026',   start: '2026-01-01', end: '2026-10-14' },
  { label: '2025',   start: '2025-01-01', end: '2025-12-31' },
  { label: '2024',   start: '2024-01-01', end: '2024-12-31' },
]

const fmt = (v) =>
  v
    ? new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

/**
 * FilterBar — filter global (periode + wilayah). State dimiliki page lewat useFilter.
 */
export function FilterBar({ filters, onDateChange, onReset, regions = [], onRegionChange }) {
  return (
    <div className="filterbar" role="group" aria-label="Filter global">
      <div className="filterbar-label">
        <span className="card-icon" aria-hidden="true"><CalendarDays size={16} /></span>
        <div>
          <small>Periode analisis</small>
          <strong>{fmt(filters.dateStart)} – {fmt(filters.dateEnd)}</strong>
        </div>
      </div>

      <div className="seg" role="group" aria-label="Rentang cepat">
        {DATE_PRESETS.map((p) => {
          const active = filters.dateStart === p.start && filters.dateEnd === p.end
          return (
            <button
              key={p.label}
              type="button"
              className={active ? 'is-active' : ''}
              aria-pressed={active}
              onClick={() => onDateChange(p.start, p.end)}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <div className="date-range">
        <input
          className="input" type="date" aria-label="Tanggal mulai"
          value={filters.dateStart} max={filters.dateEnd}
          onChange={(e) => e.target.value && onDateChange(e.target.value, filters.dateEnd)}
        />
        <span aria-hidden="true">–</span>
        <input
          className="input" type="date" aria-label="Tanggal selesai"
          value={filters.dateEnd} min={filters.dateStart}
          onChange={(e) => e.target.value && onDateChange(filters.dateStart, e.target.value)}
        />
      </div>

      <span className="filterbar-spacer" />

      {regions.length > 0 && (
        <label className="select-wrap">
          <MapPin size={14} aria-hidden="true" />
          <select
            className="input" aria-label="Wilayah"
            value={filters.regionGroup ?? ''}
            onChange={(e) => onRegionChange?.(e.target.value || null)}
          >
            <option value="">Semua wilayah</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      )}

      <button type="button" className="btn" onClick={onReset}>
        <RotateCcw size={13} aria-hidden="true" /> Reset
      </button>
    </div>
  )
}
