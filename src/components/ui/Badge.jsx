import { getIspuFromPm25 } from '@/lib/formatters'

/** Badge — pill kategori. Manual (color + bg) atau otomatis lewat <IspuBadge pm25 />. */
export function Badge({ label, color, bg, size = 'sm' }) {
  return (
    <span
      className="badge"
      style={{
        fontSize: size === 'xs' ? '0.6875rem' : '0.75rem',
        color: `color-mix(in srgb, ${color} 55%, #18314F)`,
        background: bg,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  )
}

export function IspuBadge({ pm25, size }) {
  const cat = getIspuFromPm25(pm25)
  if (!cat) return <Badge label="—" color="#4A6480" bg="rgba(74,100,128,0.12)" size={size} />
  return <Badge label={cat.label} color={cat.color} bg={cat.bg} size={size} />
}
