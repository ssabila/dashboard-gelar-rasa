'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, MapPin, RotateCcw, Timer } from 'lucide-react'

const fmtDate = (v) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export const PRESETS_A = [
  { label: 'Semua data', start: '2024-01-01', end: '2026-10-14' },
  { label: 'Tahun 2026', start: '2026-01-01', end: '2026-10-14' },
  { label: 'Tahun 2025', start: '2025-01-01', end: '2025-12-31' },
  { label: 'Tahun 2024', start: '2024-01-01', end: '2024-12-31' },
  { label: 'Kemarau 2025 (Jun–Okt)', start: '2025-06-01', end: '2025-10-31' },
]
const PRESETS_B = PRESETS_A.slice(2, 4)
const GRAN = ['Harian', 'Mingguan', 'Bulanan', 'Tahunan']

/** Tutup popover saat klik di luar atau tekan Esc. */
function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && close()
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [ref, open, close])
}

function DatePill({ id, label, start, end, presets, onChange, openId, setOpenId }) {
  const ref = useRef(null)
  const open = openId === id
  const [s, setS] = useState(start)
  const [e, setE] = useState(end)
  const close = () => setOpenId(null)
  useDismiss(ref, open, close)

  // Sinkronkan draf dengan nilai terbaru (mis. setelah Reset) setiap popover dibuka
  useEffect(() => { if (open) { setS(start); setE(end) } }, [open, start, end])

  const matched = presets.find((p) => p.start === s && p.end === e)?.label

  return (
    <div ref={ref} className="fpill-wrap">
      <button type="button" className={`fpill${open ? ' active' : ''}`} aria-expanded={open} aria-haspopup="dialog"
        onClick={() => setOpenId(open ? null : id)}>
        <CalendarDays size={14} aria-hidden="true" />
        <span>{fmtDate(start)} – {fmtDate(end)}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      <div className={`fpill-menu${open ? ' open' : ''}`} role="dialog" aria-label={label}>
        <div className="dp-row">
          <span className="dp-label">Mulai</span>
          <input className="dp-input" type="date" value={s} max={e} onChange={(ev) => ev.target.value && setS(ev.target.value)} />
        </div>
        <div className="dp-row">
          <span className="dp-label">Selesai</span>
          <input className="dp-input" type="date" value={e} min={s} onChange={(ev) => ev.target.value && setE(ev.target.value)} />
        </div>
        <div className="dp-presets">
          {presets.map((p) => (
            <button key={p.label} type="button" className={`dp-preset${matched === p.label ? ' sel' : ''}`}
              onClick={() => { setS(p.start); setE(p.end) }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="dp-actions">
          <button type="button" className="dp-btn" onClick={close}>Batal</button>
          <button type="button" className="dp-btn primary" onClick={() => { onChange(s, e); close() }}>Terapkan</button>
        </div>
      </div>
    </div>
  )
}

function MenuPill({ id, icon: Icon, value, options, onPick, openId, setOpenId, active }) {
  const ref = useRef(null)
  const open = openId === id
  useDismiss(ref, open, () => setOpenId(null))
  return (
    <div ref={ref} className="fpill-wrap">
      <button type="button" className={`fpill${open ? ' active' : active ? ' has-value' : ''}`} aria-expanded={open} aria-haspopup="listbox"
        onClick={() => setOpenId(open ? null : id)}>
        <Icon size={14} aria-hidden="true" />
        <span>{value}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      <div className={`fpill-menu${open ? ' open' : ''}`} style={{ minWidth: '12rem' }}>
        <ul className="opt-list" role="listbox">
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" role="option" aria-selected={o.value === value || o.label === value}
                className={o.label === value ? 'sel' : ''}
                onClick={() => { onPick(o.value); setOpenId(null) }}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * FilterBar — filter global bergaya pill.
 * Selalu ada: periode utama, wilayah (jika `regions` ada), reset.
 * Opsional (hanya tampil bila handler diberikan, jadi tidak ada kontrol "pajangan"):
 *   onCompareChange → periode pembanding; onGranChange → granularitas waktu.
 */
export function FilterBar({
  filters, onDateChange, onReset,
  regions = [], onRegionChange,
  onCompareChange, compareStart, compareEnd,
  onGranChange, gran = 'Harian',
}) {
  const [openId, setOpenId] = useState(null)
  const regionOpts = [{ value: '', label: 'Semua wilayah' }, ...regions.map((r) => ({ value: r, label: r }))]

  return (
    <div className="filter-bar" role="group" aria-label="Filter global">
      <DatePill id="a" label="Periode utama" start={filters.dateStart} end={filters.dateEnd}
        presets={PRESETS_A} onChange={onDateChange} openId={openId} setOpenId={setOpenId} />

      {onCompareChange && (
        <>
          <span className="fpill-sep">dibanding</span>
          <DatePill id="b" label="Periode pembanding" start={compareStart} end={compareEnd}
            presets={PRESETS_B} onChange={onCompareChange} openId={openId} setOpenId={setOpenId} />
        </>
      )}

      {regions.length > 0 && (
        <MenuPill id="region" icon={MapPin} value={filters.regionGroup ?? 'Semua wilayah'}
          active={Boolean(filters.regionGroup)} options={regionOpts}
          onPick={(v) => onRegionChange?.(v || null)} openId={openId} setOpenId={setOpenId} />
      )}

      {onGranChange && (
        <MenuPill id="gran" icon={Timer} value={gran} options={GRAN.map((g) => ({ value: g, label: g }))}
          onPick={onGranChange} openId={openId} setOpenId={setOpenId} />
      )}

      <span className="filter-spacer" />
      <button type="button" className="fpill-reset" onClick={onReset}>
        <RotateCcw size={13} aria-hidden="true" /> Reset
      </button>
    </div>
  )
}
