import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const storeCreator = (set) => ({
  user: null,
  token: null,
  _hasHydrated: false,
  setHasHydrated: (value) => {
    set({ _hasHydrated: value });
  },
  setAuth: (user, token) => {
    set({ user, token, _hasHydrated: true });
  },
  logout: () => {
    set({ user: null, token: null, _hasHydrated: true });
  },
});

export const useAuthStore = create(
  persist(
    storeCreator,
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error && process.env.NODE_ENV === 'development') {
            console.error('Error rehydrating auth store:', error);
          }
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              useAuthStore.setState({ _hasHydrated: true });
            }, 0);
          }
        };
      },
    }
  )
);

