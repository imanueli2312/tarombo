import { create } from 'zustand';
import type { SessionUser } from '@/types';

type AuthState = {
  user: SessionUser | null;
  permissions: string[];
  loading: boolean;
  setUser: (user: SessionUser | null, permissions?: string[]) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (perm: string) => boolean;
  /**
   * Logout: memanggil /api/auth/logout agar cookie token httpOnly dihapus
   * server-side, lalu mereset state. Tanpa panggilan server, cookie httpOnly
   * tetap tersimpan dan sesi tetap aktif.
   */
  logout: () => Promise<void>;
};

// Pengguna yang belum login tidak memiliki izin apa pun.
// Semua endpoint data kini mensyaratkan autentikasi (hardening).
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  loading: true,
  setUser: (user, permissions) =>
    set({ user, permissions: permissions ?? (user ? [] : []), loading: false }),
  setLoading: (loading) => set({ loading }),
  hasPermission: (perm) => {
    const { user, permissions } = get();
    if (!user) return false;
    return permissions.includes(perm);
  },
  logout: async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Abaikan kegagalan jaringan — tetap bersihkan state lokal
    }
    set({ user: null, permissions: [], loading: false });
  },
}));
