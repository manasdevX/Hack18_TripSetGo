// src/components/common/ErrorBoundary.jsx
// Catches render-time errors anywhere in the tree and shows a branded
// fallback instead of a blank white screen. Class component is required —
// React only exposes error boundaries via getDerivedStateFromError /
// componentDidCatch lifecycle methods.
import { Component } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Surface to the console for debugging; in production this is where a
    // monitoring hook (Sentry, etc.) would report the error.
    console.error('Uncaught UI error:', error, info?.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', background: 'var(--gradient-hero)', textAlign: 'center',
      }}>
        <div className="glass" style={{ maxWidth: 460, padding: '3rem 2rem', borderRadius: 'var(--radius-xl)' }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            color: 'var(--color-accent-red)',
          }}>
            <AlertTriangle size={30} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Something went <span className="gradient-text">off course</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            An unexpected error interrupted this page. Your trips are safe — try reloading,
            or head back to your dashboard.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-accent-red)',
              background: 'rgba(0,0,0,0.35)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.5rem',
              maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.handleReload} className="btn btn-primary">
              <RotateCcw size={16} /> Reload page
            </button>
            <a href="/dashboard" className="btn btn-secondary">
              <Home size={16} /> Go to dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }
}
