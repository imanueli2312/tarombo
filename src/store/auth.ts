import { create } from 'zustand';
import type { User } from '@/db/schema';
import type { Locale } from '@/lib/i18n';

interface AuthState {
  user: Omit<User, 'password'> | null;
  isAuthenticated: boolean;
  locale: Locale;
  setAuth: (user: Omit<User, 'password'> | null) => void;
  setLocale: (locale: Locale) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  locale: 'id',
  setAuth: (user) => set({ user, isAuthenticated: !!user }),
  setLocale: (locale) => {
    if (typeof window !== 'undefined') {
      document.cookie = `locale=${locale};path=/;max-age=31536000`;
    }
    set({ locale });
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));