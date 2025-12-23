'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

export default function HydrationHandler() {
  const setHasHydrated = useAuthStore((state) => state.setHasHydrated);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    // Mark as hydrated once component mounts on client
    if (!_hasHydrated) {
      // Use a small delay to ensure Zustand has finished rehydrating
      const timer = setTimeout(() => {
        setHasHydrated(true);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [_hasHydrated, setHasHydrated]);

  return null;
}

