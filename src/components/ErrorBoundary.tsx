import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-slate-50 p-6 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-5 shadow-sm border border-red-200">
            <AlertOctagon className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-3">
            Application Error
          </h2>
          <p className="text-sm text-slate-500 max-w-sm mb-8 leading-relaxed">
            We encountered an unexpected issue while rendering the application. Please reload the app to continue.
          </p>
          
          <button
            onClick={this.handleReload}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-lime text-slate-900 rounded-xl shadow-md hover:bg-brand-lime/90 active:scale-95 transition-all font-semibold"
          >
            <RefreshCcw className="w-5 h-5" />
            Reload App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
