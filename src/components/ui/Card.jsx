/**
 * Card — panel dasar dengan surface putih untuk light-mode canvas.
 * Gunakan sebagai wrapper panel baru agar style konsisten.
 */
export function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`card-surface p-4 md:p-5 ${className}`}
      style={{
        background: '#FFFFFF',
        borderColor: 'var(--color-card-border)',
        color: 'var(--color-text-primary)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
