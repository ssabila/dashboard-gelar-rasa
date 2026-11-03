/**
 * ModuleLayout — wrapper yang dipakai di setiap page.jsx modul.
 *
 * Mengurus:
 * - Offset navbar (padding-top = --navbar-h)
 * - Max-width dan horizontal padding konsisten
 * - Vertical rhythm antar section
 *
 * Penggunaan:
 *   <ModuleLayout title="Kualitas Udara" description="...">
 *     <Section>...</Section>
 *   </ModuleLayout>
 */
export function ModuleLayout({ title, description, children }) {
  return (
    <main
      className="app-main min-h-dvh w-full max-w-[1440px] mx-auto px-6 pb-16"
    >
      {/* Page header */}
      <div className="page-header mb-6 border-b border-[rgba(139,190,178,0.18)] pb-4">
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className="page-description text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {description}
          </p>
        )}
      </div>

      {/* Konten modul */}
      <div className="flex flex-col gap-10">
        {children}
      </div>
    </main>
  )
}

/**
 * Section — pembungkus per-bagian dalam sebuah modul.
 * Opsional tapi dianjurkan untuk spacing yang konsisten.
 *
 * Penggunaan:
 *   <Section title="Tren Bulanan">
 *     <LineChart ... />
 *   </Section>
 */
export function Section({ title, description, children, className = '' }) {
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && <h3>{title}</h3>}
          {description && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
