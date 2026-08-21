import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "Couldn't load data. Please check your connection and try again.",
  onRetry,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center h-full w-full bg-slate-50 ${className}`}>
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-100">
        <AlertTriangle className="w-8 h-8" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-[280px] mb-6 leading-relaxed">
        {message}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl shadow-sm hover:bg-slate-700 active:scale-95 transition-all font-medium text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;
