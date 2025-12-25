'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Application error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="max-w-md w-full bg-secondary border border-accent/20 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-16 h-16 text-danger" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Something went wrong!</h1>
        <p className="text-text/70 mb-6">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-accent text-primary rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-secondary border border-accent/20 text-text rounded-lg font-semibold hover:bg-accent/20 transition-colors"
          >
            Go home
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && error.message && (
          <details className="mt-6 text-left">
            <summary className="text-text/60 cursor-pointer text-sm mb-2">Error details (dev only)</summary>
            <pre className="bg-primary p-4 rounded text-xs text-text/80 overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

