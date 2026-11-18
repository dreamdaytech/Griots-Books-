import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected rendering error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F3EE] dark:bg-[#16110C] px-6 py-12">
          <div className="max-w-lg w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
            <h1 className="text-2xl font-serif font-semibold text-slate-900 dark:text-slate-100">
              Application Error
            </h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We encountered an error while loading this workspace view. No manuscript data was altered.
            </p>
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-stone-100 dark:bg-slate-950 p-3 text-xs font-mono text-slate-700 dark:text-slate-300">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="mt-6 px-4 py-2 text-sm font-medium rounded-lg bg-[#22170D] text-white hover:bg-[#162C4E] transition-colors"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
