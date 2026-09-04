'use client';

import { useEffect } from 'react';

/**
 * Registrasi service worker + alur pembaruan (audit T-06).
 *
 * sw.js memakai skipWaiting + clients.claim, sehingga SW baru langsung
 * mengambil alih. Saat 'controllerchange' terjadi (dari controller lama ke
 * baru — kunjungan pertama tidak dihitung), halaman dimuat ulang SEKALI agar
 * aset versi baru benar-benar dipakai, bukan sisa dari cache lama.
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Adakah controller sebelum registrasi? Jika tidak, ini kunjungan
    // pertama — controllerchange pertama bukan "pembaruan", jangan reload.
    const hadController = !!navigator.serviceWorker.controller;

    let reloading = false;
    const onControllerChange = () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app still works without it
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return <>{children}</>;
}
