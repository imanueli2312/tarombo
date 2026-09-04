/* eslint-disable no-restricted-globals */
/**
 * Service worker Tarombo — TEMPLATE.
 *
 * File ini TIDAK disajikan langsung: scripts/gen-sw.mjs menyalinnya ke
 * public/sw.js sambil mengganti __CACHE_NAME__ dengan versi aplikasi + git
 * SHA (audit T-06 — nama cache manual 'tarombo-v2' membuat pengunjung
 * terkunci di HTML lama sampai versi dibump manual).
 *
 * Jangan edit public/sw.js langsung — ubah template ini.
 */

const CACHE_NAME = '__CACHE_NAME__';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/**
 * Strategi fetch (audit T-06):
 * - API (/api/*): network-only dan TIDAK pernah di-cache. Respons API berisi
 *   data keluarga yang sensitif — menyimpannya di Cache Storage akan
 *   meninggalkan jejak data bahkan setelah logout (hardening privasi).
 * - Navigasi HTML: network-first — pengunjung selalu mendapat versi terbaru;
 *   cache hanya dipakai saat offline.
 * - Aset statis lainnya: cache-first dengan revalidasi di belakang (SWR).
 * - Semua cache.put diikat event.waitUntil (SW tidak dimatikan browser
 *   sebelum cache selesai ditulis).
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API selalu network-only — jangan pernah respons dari cache.
  if (url.pathname.startsWith('/api/')) return;
  if (request.method !== 'GET') return;

  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
            );
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Aset statis: cache-first + revalidasi di belakang.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Perbarui cache di belakang — diikat event.waitUntil (audit T-06).
        event.waitUntil(
          fetch(request)
            .then((response) => {
              if (response.ok && url.origin === self.location.origin) {
                const clone = response.clone();
                return caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
            })
            .catch(() => undefined)
        );
        return cached;
      }
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          );
        }
        return response;
      });
    })
  );
});
