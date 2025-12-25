'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="max-w-md w-full bg-secondary border border-accent/20 rounded-lg p-8 text-center">
        <h1 className="text-6xl font-bold text-accent mb-4">404</h1>
        <h2 className="text-2xl font-bold text-text mb-2">Page Not Found</h2>
        <p className="text-text/70 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-accent text-primary rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-secondary border border-accent/20 text-text rounded-lg font-semibold hover:bg-accent/20 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

