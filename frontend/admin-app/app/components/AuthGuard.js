'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { setTokenGetter } from '@/lib/api';

export default function AuthGuard({ children, requireAuth = true }) {
  const [mounted, setMounted] = useState(false);
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Set up token getter for API interceptor (runs once on mount)
    setTokenGetter(() => useAuthStore.getState().token);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!requireAuth) return;

    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
  }, [mounted, user, token, router, requireAuth]);

  // During SSR or before mount, return a loading state to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // If auth required but not authenticated, don't render (redirect is in progress)
  if (requireAuth && (!user || !token || user.role !== 'ADMIN')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Redirecting...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

