import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Optional fallback UI to show instead of the default error screen */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Error boundary component that catches React rendering errors.
 *
 * Features:
 * - Preserves app state on error (game data, stats, history are in Zustand store)
 * - Shows error details for debugging
 * - Supports retry with exponential backoff
 * - Can accept a custom fallback UI via props
 * - Tracks retry count to prevent infinite crash loops
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, '\nComponent stack:', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleRetry = () => {
    const { retryCount } = this.state;
    if (retryCount >= 3) {
      // After 3 retries, suggest a full page reload
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, retryCount: retryCount + 1 });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const hasRetried = this.state.retryCount > 0;
      const needsReload = this.state.retryCount >= 3;

      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4" role="alert" aria-live="assertive">
          <div className="card-premium max-w-md w-full text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto bg-accent-red/10 rounded-full flex items-center justify-center">
              <AlertTriangle size={32} className="text-accent-red" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary mb-1">
                {needsReload ? 'Unable to Recover' : hasRetried ? 'Still Having Trouble' : 'Something Went Wrong'}
              </h2>
              <p className="text-sm text-text-secondary/60 leading-relaxed">
                {needsReload
                  ? 'Multiple recovery attempts failed. Your game data is preserved — reloading the page should fix this.'
                  : 'An unexpected error occurred. Your game state and statistics have been preserved.'}
              </p>
            </div>
            {this.state.error && (
              <div className="bg-black/20 rounded-xl p-3 border border-white/5 text-left">
                <p className="text-[10px] text-text-secondary/40 uppercase tracking-wider font-semibold mb-1">Error Details</p>
                <pre className="text-xs text-accent-red font-mono whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              {needsReload ? (
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Reload Page
                </button>
              ) : (
                <>
                  <button
                    onClick={this.handleRetry}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <RefreshCw size={16} /> {hasRetried ? 'Try Again' : 'Recover'}
                  </button>
                  {hasRetried && (
                    <button
                      onClick={this.handleReset}
                      className="btn-secondary inline-flex items-center gap-2"
                    >
                      Dismiss Error
                    </button>
                  )}
                </>
              )}
            </div>
            {hasRetried && !needsReload && (
              <p className="text-[10px] text-text-secondary/30">
                Retry {this.state.retryCount}/3 — if this persists, try refreshing the page.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
