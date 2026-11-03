export function LoadingSpinner({ label = 'Memuat data...' }) {
  return (
    <div className="flex items-center gap-3 text-sm muted-text" role="status">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-accent)]"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message = 'Data gagal dimuat.' }) {
  return (
    <div
      className="rounded-card border p-4 text-sm"
      style={{
        color: 'var(--ispu-tidak-sehat)',
        background: 'rgba(251, 146, 60, 0.08)',
        borderColor: 'rgba(251, 146, 60, 0.3)',
      }}
      role="alert"
    >
      {message}
    </div>
  )
}
