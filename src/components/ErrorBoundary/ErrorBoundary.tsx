import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Invoice Gen Root Error Caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleResetSession = (): void => {
    if (window.confirm('Clear session cache and restart? Your saved database in Documents will not be deleted.')) {
      try {
        sessionStorage.clear();
      } catch {}
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 font-sans select-none">
          <div className="max-w-md w-full bg-slate-800 rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 text-center space-y-5">
            <div className="size-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Workstation Encountered an Error
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                An unexpected runtime exception was caught. Your offline invoice data is protected in your local database.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-left font-mono text-[11px] text-rose-300 max-h-32 overflow-y-auto break-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                Reload Workstation
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="py-2.5 px-4 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Cache
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
