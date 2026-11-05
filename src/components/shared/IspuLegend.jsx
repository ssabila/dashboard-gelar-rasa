import { ISPU_CATEGORIES } from '@/lib/constants'

export function IspuLegend({ note }) {
  return (
    <div className="legend" aria-label="Legenda kategori ISPU">
      {ISPU_CATEGORIES.map((c) => (
        <span key={c.id} className="legend-item">
          <span className="legend-dot" style={{ background: c.color }} />
          {c.label}
        </span>
      ))}
      {note && <span className="legend-note">{note}</span>}
    </div>
  )
}
