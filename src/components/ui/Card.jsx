export function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`card-surface rounded-card border p-5 shadow-card ${className}`}
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-on-surface)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
