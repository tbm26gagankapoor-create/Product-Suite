import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-white dark:bg-[#0B0C0E]">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            {/* Error Message */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-[#15171E] rounded-lg text-left overflow-auto max-h-32">
                <p className="text-xs font-mono text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-[#15171E] hover:bg-gray-200 dark:hover:bg-[#1F2128] text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg transition-colors border border-gray-200 dark:border-[#1F2128]"
              >
                <Home size={16} />
                Reload Page
              </button>
            </div>

            {/* Report Bug Link */}
            <button
              onClick={() => window.open('https://github.com/issues', '_blank')}
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <Bug size={12} />
              Report this issue
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
