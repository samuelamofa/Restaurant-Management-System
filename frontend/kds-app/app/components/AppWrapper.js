'use client';

import { ErrorBoundary } from './ErrorBoundary';
import KDSLayout from './KDSLayout';

export default function AppWrapper({ children }) {
  return (
    <ErrorBoundary>
      <KDSLayout>{children}</KDSLayout>
    </ErrorBoundary>
  );
}

