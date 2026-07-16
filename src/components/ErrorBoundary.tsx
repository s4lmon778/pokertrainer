import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
          <div className="card-premium max-w-md w-full text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto bg-accent-red/10 rounded-full flex items-center justify-center">
              <AlertTriangle size={32} className="text-accent-red" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary mb-1">Something went wrong</h2>
              <p className="text-sm text-text-secondary/60 leading-relaxed">
                An unexpected error occurred. Your game state and statistics have been preserved.
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
            <button
              onClick={this.handleReset}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
