/**
 * Rate limiter in-memory sederhana (proteksi brute-force login).
 *
 * Untuk deployment single-instance (bun standalone) ini memadai.
 * Jika kelak berjalan multi-instance, ganti dengan penyimpanan bersama
 * (Redis / SQLite) dengan antarmuka yang sama.
 */

interface Bucket {
  /** jumlah percobaan dalam jendela saat ini */
  count: number;
  /** waktu (epoch ms) saat jendela di-reset */
  resetAt: number;
  /** waktu (epoch ms) sampai blok berakhir (0 = tidak diblok) */
  blockedUntil: number;
}

const buckets = new Map<string, Bucket>();

/** Bersihkan bucket kedaluwarsa agar memori tidak membengkak */
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt < now && b.blockedUntil < now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** maksimal percobaan dalam satu jendela */
  limit: number;
  /** durasi jendela (ms) */
  windowMs: number;
  /** durasi blok setelah limit terlampaui (ms) */
  blockMs: number;
}

export const DEFAULT_LOGIN_RATE_LIMIT: RateLimitOptions = {
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 menit
  blockMs: 15 * 60 * 1000, // blok 15 menit
};

export interface RateLimitResult {
  ok: boolean;
  /** sisa percobaan pada jendela saat ini */
  remaining: number;
  /** detik sampai boleh mencoba lagi (hanya jika diblok) */
  retryAfterSec?: number;
}

/**
 * Catat satu percobaan dan cek apakah masih diizinkan.
 * Panggil SEBELUM melakukan pencarian user di database.
 */
export function consumeRateLimit(key: string, opts: RateLimitOptions = DEFAULT_LOGIN_RATE_LIMIT): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + opts.windowMs, blockedUntil: 0 };
    buckets.set(key, b);
  }

  if (b.blockedUntil > now) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.blockedUntil - now) / 1000) };
  }

  b.count += 1;
  if (b.count > opts.limit) {
    b.blockedUntil = now + opts.blockMs;
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil(opts.blockMs / 1000) };
  }

  return { ok: true, remaining: Math.max(0, opts.limit - b.count) };
}

/** Reset bucket setelah login berhasil (agar percobaan valid tidak menghukum) */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Ambil IP klien dari header proxy standar (best-effort) */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
