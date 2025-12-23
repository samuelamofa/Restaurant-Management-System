import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
      setAuth: (user, token) => {
        set({ user, token, _hasHydrated: true });
      },
      logout: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: 'kds-auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Error rehydrating auth store:', error);
            // Even on error, mark as hydrated so the app doesn't hang
            if (state) {
              state._hasHydrated = true;
            }
            return;
          }
          // Directly set the hydration flag on the state object
          if (state) {
            state._hasHydrated = true;
          }
        };
      },
    }
  )
);

