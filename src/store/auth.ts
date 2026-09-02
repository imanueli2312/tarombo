import { create } from 'zustand';
import type { SessionUser } from '@/types';

type AuthState = {
  user: SessionUser | null;
  permissions: string[];
  loading: boolean;
  setUser: (user: SessionUser | null, permissions?: string[]) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (perm: string) => boolean;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: ['view_tree', 'search'],
  loading: true,
  setUser: (user, permissions) =>
    set({ user, permissions: permissions ?? (user ? [] : ['view_tree', 'search']), loading: false }),
  setLoading: (loading) => set({ loading }),
  hasPermission: (perm) => {
    const { user, permissions } = get();
    if (!user) return ['view_tree', 'search'].includes(perm);
    return permissions.includes(perm);
  },
  logout: () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    set({ user: null, permissions: ['view_tree', 'search'], loading: false });
  },
}));
