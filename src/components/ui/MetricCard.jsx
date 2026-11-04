import { Card } from './Card'
import { Badge } from './Badge'

/**
 * MetricCard — KPI card dengan desain light-mode.
 *
 * Props:
 *   label        string   — deskripsi metrik
 *   value        string   — nilai utama
 *   unit         string   — satuan (opsional)
 *   badge        object   — { label, color, bg } dari ISPU_CATEGORIES (opsional)
 *   subtext      string   — keterangan kecil (opsional)
 *   trend        string   — misal '+2.3%' untuk delta (opsional)
 *   trendUp      boolean  — apakah trend positif (hijau) atau negatif (merah)
 *   icon         ReactNode — ikon kecil di pojok kanan atas (opsional)
 *   accentColor  string   — warna aksen strip kiri
 */
export function MetricCard({
  label,
  value,
  unit,
  badge,
  subtext,
  trend,
  trendUp,
  icon,
  accentColor = 'var(--color-muted)',
}) {
  return (
    <div
      className="metric-card card-surface p-5"
      style={{ '--metric-accent': accentColor }}
    >
      <div className="metric-card-content flex flex-col gap-3 h-full pl-1">

        {/* Top row: label + icon */}
        <div className="flex items-start justify-between gap-2">
          <p
            className="metric-card-label text-xs font-semibold leading-snug"
            style={{ color: 'var(--color-text-secondary)', maxWidth: 'none', margin: 0 }}
          >
            {label}
          </p>
          {icon && (
            <div
              className="kpi-icon-circle"
              style={{
                background: `${accentColor}18`,
                color: accentColor,
              }}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-end gap-2 flex-wrap mt-auto">
          <span
            className="text-metric"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {value ?? '—'}
          </span>

          {unit && (
            <span
              className="text-xs mb-1 font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {unit}
            </span>
          )}
        </div>

        {/* Bottom row: badge + trend */}
        <div className="flex items-center gap-2 flex-wrap">
          {badge && (
            <Badge label={badge.label} color={badge.color} bg={badge.bg} />
          )}
          {trend && (
            <span
              className="text-xs font-semibold"
              style={{ color: trendUp ? 'var(--ispu-baik)' : 'var(--ispu-tidak-sehat)' }}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
          {subtext && !badge && !trend && (
            <p
              className="text-xs leading-snug"
              style={{ color: 'var(--color-text-secondary)', maxWidth: 'none', margin: 0 }}
            >
              {subtext}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
