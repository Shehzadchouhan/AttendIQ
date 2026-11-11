import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: 'var(--bg-main)',
            color: 'var(--text-primary)',
          }}
        >
          <div
            className="ui-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Something went wrong
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                An unexpected application error occurred. Your attendance session data has not been lost.
              </p>
            </div>

            {this.state.error?.message && (
              <div
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.775rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  overflowX: 'auto',
                  textAlign: 'left',
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <RefreshCw size={15} /> Reload Workspace
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Home size={15} /> Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
