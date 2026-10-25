export function ErrorNote({ error }) {
  if (!error) return null;
  const details =
    error.details && typeof error.details === 'object' && !Array.isArray(error.details)
      ? Object.values(error.details).filter((v) => typeof v === 'string')
      : [];
  return (
    <div className="note note-error" role="alert">
      {error.message}
      {details.length > 0 && (
        <ul>
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export function Loading() {
  return <p className="muted">Loading…</p>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Stars({ value }) {
  const rounded = Math.round(value || 0);
  return (
    <span className="stars" aria-label={`${value || 0} out of 5`}>
      {'★'.repeat(rounded)}
      <span className="stars-off">{'★'.repeat(5 - rounded)}</span>
    </span>
  );
}
