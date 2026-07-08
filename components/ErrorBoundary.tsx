import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

// Last line of defense: without this, any render error blanks the whole SPA.
export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Something broke</h1>
            <p style={{ color: '#a1a1aa', marginBottom: '2rem' }}>Ein unerwarteter Fehler ist aufgetreten. / An unexpected error occurred.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '0.75rem 2rem', background: '#fff', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
