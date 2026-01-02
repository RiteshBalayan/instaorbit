import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console; integrate with monitoring here if needed
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#1a1c22',
          color: '#ffb4b4',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Component failed to render</div>
          <div style={{ fontSize: '0.9rem', color: '#ffd6d6' }}>
            {this.props.fallbackMessage || 'Please try switching views or reloading.'}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
