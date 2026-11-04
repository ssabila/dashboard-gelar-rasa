/**
 * ModuleLayout — wrapper yang dipakai di setiap page.jsx modul.
 * Revisi: tanpa page-header bawaan; Overview punya welcome section sendiri.
 * Modul lain bisa tetap pakai title + description seperti biasa.
 */
export function ModuleLayout({ title, description, children }) {
  const hasHeader = Boolean(title)

  return (
    <main
      className="app-main min-h-dvh w-full max-w-[1440px] mx-auto px-7 pb-16 pt-6"
    >
      {/* Page header — opsional, Overview skip ini */}
      {hasHeader && (
        <div
          className="page-header mb-6 pb-4"
          style={{ borderBottom: '1px solid rgba(24,49,79,0.1)' }}
        >
          <h1
            className="page-title"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="page-description text-sm mt-1"
              style={{ color: 'var(--color-text-secondary)', maxWidth: 'none' }}
            >
              {description}
            </p>
          )}
        </div>
      )}

      {/* Konten */}
      <div className="flex flex-col gap-8">
        {children}
      </div>
    </main>
  )
}

/**
 * Section — pembungkus per-bagian dalam sebuah modul.
 */
export function Section({ title, description, children, className = '' }) {
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && (
            <h3
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
          )}
          {description && (
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--color-text-secondary)', margin: '0.2rem 0 0', maxWidth: 'none' }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
