/**
 * Card — panel dasar. Varian: default | flush | tint | dark
 */
export function Card({ children, className = '', style, variant = 'default', as: Tag = 'div', ...rest }) {
  const v = variant === 'default' ? '' : ` card--${variant}`
  return (
    <Tag className={`card${v} ${className}`.trim()} style={style} {...rest}>
      {children}
    </Tag>
  )
}

/** Header kartu: judul, subjudul, dan aksi/ikon di kanan. */
export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="card-head">
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
