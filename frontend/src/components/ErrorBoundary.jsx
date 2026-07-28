import React from 'react'

// Catches render-time crashes so users get a recoverable screen instead of a
// blank white page (REQ-027). A white-screen crash is also a plausible App
// Store 2.1 rejection.
export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, copied: false }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
    this.componentStack = info?.componentStack
  }

  copyDetails = () => {
    const text = [
      `FoodVault error: ${this.state.error?.message || 'unknown'}`,
      this.state.error?.stack || '',
      this.componentStack || '',
      `UA: ${navigator.userAgent}`,
    ].join('\n\n')
    navigator.clipboard?.writeText(text)
      .then(() => this.setState({ copied: true }))
      .catch(() => {})
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--cream, #FAF8F3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, margin: '0 auto 18px',
            background: 'var(--primary, #D4522A)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>🍽️</div>

          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22,
            fontWeight: 700, color: 'var(--ink, #1C1610)', marginBottom: 8,
          }}>Something went wrong</h1>

          <p style={{ fontSize: 13.5, color: 'var(--ink-2, #5C5044)', lineHeight: 1.6, marginBottom: 4 }}>
            Don't worry — your recipes and meal plans are safe.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2, #5C5044)', lineHeight: 1.6, marginBottom: 22 }}>
            Reloading usually fixes it.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: 'var(--primary, #D4522A)', color: '#fff', fontSize: 15,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
            }}
          >Reload App</button>

          <button
            onClick={this.copyDetails}
            style={{
              width: '100%', padding: '11px', borderRadius: 12,
              border: '1.5px solid var(--border, #E8E2D9)', background: 'transparent',
              color: 'var(--ink-2, #5C5044)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{this.state.copied ? '✓ Copied' : 'Copy error details'}</button>

          {this.state.error?.message && (
            <p style={{
              marginTop: 18, fontSize: 11, color: 'var(--ink-3, #9C8E80)',
              wordBreak: 'break-word', lineHeight: 1.5,
            }}>{this.state.error.message}</p>
          )}
        </div>
      </div>
    )
  }
}
