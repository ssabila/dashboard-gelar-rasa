import { Badge } from './Badge'

/**
 * MetricCard — KPI card kecil.
 * variant: 'default' (putih) | 'hero' (gelap, angka lime — pakai untuk 1 KPI terpenting)
 */
export function MetricCard({
  label, value, unit, badge, subtext, trend, trendUp, icon,
  accentColor = 'var(--color-elevated)', variant = 'default',
}) {
  return (
    <div
      className={`card kpi${variant === 'hero' ? ' kpi--hero' : ''}`}
      style={{ '--kpi-accent': accentColor }}
    >
      <div className="kpi-top">
        <p className="kpi-label">{label}</p>
        {icon && <span className="kpi-icon" aria-hidden="true">{icon}</span>}
      </div>

      <div className="kpi-value-row">
        <span className="kpi-value">{value ?? '—'}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>

      <div className="kpi-foot">
        {badge && <Badge label={badge.label} color={badge.color} bg={badge.bg} size="xs" />}
        {trend && (
          <span className="kpi-trend" style={{ color: trendUp ? 'var(--ispu-baik)' : 'var(--ispu-tidak-sehat)' }}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
        {subtext && <span>{subtext}</span>}
      </div>
    </div>
  )
}
