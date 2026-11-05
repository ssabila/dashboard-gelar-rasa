/**
 * ModuleLayout — wrapper setiap halaman modul.
 * Props: title, description (pertanyaan yang dijawab halaman), eyebrow, actions.
 */
export function ModuleLayout({ title, description, eyebrow, actions, children }) {
  return (
    <main className="app-main">
      <div className="page-inner">
        {(title || actions) && (
          <header className="page-header">
            <div>
              {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
              {title && <h1 className="page-title">{title}</h1>}
              {description && <p className="page-description">{description}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </main>
  )
}

export function Section({ title, description, children, className = '' }) {
  return (
    <section className={`section ${className}`.trim()}>
      {(title || description) && (
        <div>
          {title && <h2 className="section-title">{title}</h2>}
          {description && <p className="section-desc">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}
