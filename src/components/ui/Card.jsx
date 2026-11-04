/**
 * Card — panel dasar dengan surface putih untuk light-mode canvas.
 * Gunakan sebagai wrapper panel baru agar style konsisten.
 */
export function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`card-surface p-5 ${className}`}
      style={{
        background: '#FFFFFF',
        borderColor: 'rgba(24, 49, 79, 0.08)',
        color: 'var(--color-text-primary)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
