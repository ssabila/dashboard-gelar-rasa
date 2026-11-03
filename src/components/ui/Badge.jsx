import { getIspuFromPm25 } from '@/lib/formatters'

/**
 * Badge — pill kategori ISPU.
 * Bisa dibuat manual (color + bg) atau otomatis dari nilai PM2.5.
 *
 * Penggunaan manual:
 *   <Badge label="Tidak Sehat" color="#FB923C" bg="rgba(251,146,60,0.12)" />
 *
 * Penggunaan dari PM2.5:
 *   <IspuBadge pm25={48.5} />
 */
export function Badge({ label, color, bg, size = 'sm' }) {
  const fontSize = size === 'xs' ? '0.6875rem' : '0.75rem'

  return (
    <span
      className="inline-flex items-center rounded-badge px-2 py-0.5 font-medium leading-none"
      style={{
        fontSize,
        color,
        background: bg,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  )
}

/**
 * IspuBadge — Badge yang otomatis menghitung kategori dari konsentrasi PM2.5.
 * @param {number} pm25  konsentrasi µg/m³
 */
export function IspuBadge({ pm25, size }) {
  const cat = getIspuFromPm25(pm25)
  if (!cat) return <Badge label="—" color="#4A6480" bg="rgba(74,100,128,0.12)" size={size} />
  return <Badge label={cat.label} color={cat.color} bg={cat.bg} size={size} />
}
