export function LoadingSpinner({ label = 'Memuat data...' }) {
  return (
    <div className="state muted-text" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message = 'Data gagal dimuat.' }) {
  return (
    <div className="state state-error" role="alert">
      {message}
    </div>
  )
}
