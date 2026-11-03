import { Card } from './Card'
import { Badge } from './Badge'

/**
 * MetricCard — satu angka besar dengan label, satuan, dan badge opsional.
 *
 * Props:
 *   label      string   — deskripsi metrik, misal 'Rata-rata PM2.5 Nasional'
 *   value      string   — nilai yang ditampilkan, misal '43.1'
 *   unit       string   — satuan, misal 'µg/m³'
 *   badge      object   — { label, color, bg } dari ISPU_CATEGORIES (opsional)
 *   subtext    string   — keterangan kecil di bawah nilai (opsional)
 *   accent     boolean  — pakai warna accent untuk nilai (default false)
 */
export function MetricCard({
  label,
  value,
  unit,
  badge,
  subtext,
  accent = false,
  accentColor = 'var(--color-muted)',
}) {
  return (
    <Card className="metric-card" style={{ '--metric-accent': accentColor }}>
      <div className="flex flex-col gap-3">

        {/* Label */}
        <p
          className="metric-card-label text-xs font-medium uppercase tracking-wide leading-tight"
        >
          <span className="metric-card-dot" aria-hidden="true" />
          {label}
        </p>

        {/* Nilai + badge */}
        <div className="flex items-end gap-3 flex-wrap">
          <span
            className="text-metric leading-none"
            style={{
              fontFamily: 'var(--font-body)',
              color: accent ? 'var(--color-accent)' : 'var(--color-text-on-surface)',
            }}
          >
            {value ?? '—'}
          </span>

          {unit && (
            <span
              className="text-sm mb-0.5"
              style={{ color: 'var(--color-muted)' }}
            >
              {unit}
            </span>
          )}

          {badge && (
            <div className="mb-1">
              <Badge label={badge.label} color={badge.color} bg={badge.bg} />
            </div>
          )}
        </div>

        {/* Subtext */}
        {subtext && (
          <p
            className="text-xs leading-snug"
            style={{ color: 'var(--color-muted)', maxWidth: 'none' }}
          >
            {subtext}
          </p>
        )}

      </div>
    </Card>
  )
}
