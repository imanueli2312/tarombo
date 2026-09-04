'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';
import type { SessionUser } from '@/types';

/**
 * AuthProvider — memvalidasi sesi via /api/auth/me saat mount.
 *
 * Audit R-06: spinner layar penuh pada SETIAP reload mengganggu. Kini layout
 * (server component) meneruskan petunjuk ada-tidaknya cookie sesi:
 * - Tanpa cookie → pasti anonim: state selesai SEKETIKA, tanpa fetch & tanpa
 *   spinner (menghapus kilasan form login yang salah untuk pengunjung baru).
 * - Dengan cookie → sesi divalidasi; indikator memuat tetap ditampilkan
 *   namun ringan (skeleton pusat), hanya selama satu roundtrip.
 */
export function AuthProvider({
  children,
  initialHasSession = false,
}: {
  children: React.ReactNode;
  initialHasSession?: boolean;
}) {
  const setUser = useAuthStore((s) => s.setUser);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (!initialHasSession) {
      // Tidak ada cookie token sama sekali — tidak mungkin ada sesi.
      setUser(null);
      return;
    }

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
  }, [setUser, initialHasSession]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Memeriksa sesi masuk">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return <>{children}</>;
}
