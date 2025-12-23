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
        set({ user, token });
      },
      logout: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (i) =>
            i.menuItemId === item.menuItemId &&
            i.variantId === item.variantId &&
            JSON.stringify(i.addons?.sort()) === JSON.stringify(item.addons?.sort())
        );

        if (existingIndex >= 0) {
          const updated = [...items];
          updated[existingIndex].quantity += item.quantity;
          updated[existingIndex].totalPrice = updated[existingIndex].unitPrice * updated[existingIndex].quantity;
          set({ items: updated });
        } else {
          set({ items: [...items, item] });
        }
      },
      removeItem: (index) => {
        const items = get().items;
        set({ items: items.filter((_, i) => i !== index) });
      },
      updateQuantity: (index, quantity) => {
        const items = get().items;
        if (quantity <= 0) {
          set({ items: items.filter((_, i) => i !== index) });
        } else {
          const updated = [...items];
          updated[index].quantity = quantity;
          set({ items: updated });
        }
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        const items = get().items;
        return items.reduce((sum, item) => sum + item.totalPrice, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);

