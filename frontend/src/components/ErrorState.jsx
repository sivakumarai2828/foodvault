/**
 * Shown when a view's data failed to load.
 *
 * This exists because the previous behaviour was worse than useless: a backend
 * outage swallowed the error and rendered the "Your library is empty" state, so
 * users were told they had no recipes when in fact the server was unreachable.
 */
export default function ErrorState({
  message = 'Something went wrong.',
  onRetry,
  retrying = false,
  compact = false,
}) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 10,
        padding: compact ? '20px 16px' : '48px 20px',
      }}
    >
      <div style={{
        width: compact ? 40 : 54, height: compact ? 40 : 54, borderRadius: 16,
        background: 'var(--cream-2)', border: '1.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? 20 : 26,
      }}>
        {/* cloud-off */}
        <svg width={compact ? 20 : 26} height={compact ? 20 : 26} viewBox="0 0 24 24"
             fill="none" stroke="var(--ink-3)" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M5.8 5.8A6 6 0 0 0 8 18h9a4 4 0 0 0 1.5-7.7" />
          <path d="M10.7 4.2A6 6 0 0 1 18 9.3" />
        </svg>
      </div>

      <h3 style={{
        fontFamily: "'Playfair Display',serif", fontWeight: 700,
        fontSize: compact ? 15 : 18, color: 'var(--ink)',
      }}>
        Couldn't load
      </h3>

      <p style={{
        fontSize: compact ? 12.5 : 13.5, color: 'var(--ink-2)',
        lineHeight: 1.6, maxWidth: 300,
      }}>
        {message}
      </p>

      {onRetry && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRetry}
          disabled={retrying}
          style={{ marginTop: 4 }}
        >
          {retrying ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Retrying…</> : 'Try again'}
        </button>
      )}
    </div>
  )
}
