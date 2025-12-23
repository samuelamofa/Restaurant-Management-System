import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const store = (set) => ({
  user: null,
  token: null,
  _hasHydrated: false,
  setHasHydrated: (state) => {
    set({ _hasHydrated: state });
  },
  setAuth: (user, token) => {
    set({ user, token });
  },
  logout: () => {
    set({ user: null, token: null });
  },
});

export const useAuthStore = create(
  persist(store, {
    name: 'pos-auth-storage',
    storage: createJSONStorage(() => {
      if (typeof window !== 'undefined') {
        return localStorage;
      }
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      };
    }),
      onRehydrateStorage: () => {
        // Hydration will be handled by HydrationHandler component
        return () => {};
      },
  })
);

