'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';
import type { SessionUser } from '@/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user as SessionUser, data.permissions as string[]);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    checkSession();
  }, [setUser]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
