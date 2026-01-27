import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // eslint-disable-next-line no-unused-vars
  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  handleGlobalError = (event) => {
    this.setState({ 
      hasError: true, 
      error: event.error || new Error(event.message),
      errorInfo: { componentStack: 'Global Window Error' }
    });
  };

  handlePromiseRejection = (event) => {
    this.setState({ 
      hasError: true, 
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      errorInfo: { componentStack: 'Unhandled Promise Rejection' }
    });
  };

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#c00', backgroundColor: '#fff', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 9999, overflow: 'auto' }}>
          <h1 style={{fontSize: '2rem', marginBottom: '1rem'}}>⚠️ Something went wrong ⚠️</h1>
          <div style={{ padding: '1rem', border: '2px solid red', borderRadius: '8px', display: 'inline-block', maxWidth: '90%', textAlign: 'left' }}>
              <h3 style={{margin: 0}}>Error:</h3>
              <pre style={{whiteSpace: 'pre-wrap', color: '#d00', fontSize: '1.2rem'}}>
                {this.state.error && this.state.error.toString()}
              </pre>
              <hr />
              <h3>Stack Trace:</h3>
              <details open>
                <summary>Click to collapse</summary>
                <pre style={{whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#333'}}>
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                    {this.state.error && this.state.error.stack}
                </pre>
              </details>
          </div>
          <p>Please copy the text above and share it.</p>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
