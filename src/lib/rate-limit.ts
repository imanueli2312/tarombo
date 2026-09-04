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

/**
 * Cap per-IP murni pada login (audit T-04 — password spraying).
 * Bucket per IP+email bisa dilewati dengan memutar-mutar email korban;
 * bucket ini membatasi total percobaan dari satu IP berapa pun emailnya.
 */
export const LOGIN_IP_RATE_LIMIT: RateLimitOptions = {
  limit: 30,
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

/** Validasi bentuk alamat IP (IPv4 atau IPv6, dengan/tanpa kurung siku) */
function isValidIp(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) {
    return v.split('.').every((p) => Number(p) <= 255);
  }
  // IPv6 — karakter heksa + titik dua (bentuk [::1] dari beberapa proxy)
  const bare = v.startsWith('[') && v.endsWith(']') ? v.slice(1, -1) : v;
  return /^[0-9a-fA-F:]+$/.test(bare) && bare.includes(':');
}

/**
 * Ambil IP klien dengan urutan kepercayaan yang benar (audit T-03 — XFF spoof):
 * 1. X-Real-IP — di-set proxy tepercaya (Caddy) dari remote host koneksi fisik.
 * 2. Entri TERAKHIR X-Forwarded-For — ditambahkan oleh proxy tepercaya yang
 *    paling dekat dengan aplikasi. Entri PERTAMA bisa dipalsukan klien dan
 *    tidak boleh dipakai (perilaku lama sebelum perbaikan ini).
 * 3. 'unknown' — akses langsung tanpa proxy (dev) atau tanpa header sama sekali.
 *
 * Catatan: di produksi, Caddyfile juga menimpa X-Forwarded-For dengan
 * {remote_host} sehingga header palsu dari klien dihapus di lapisan proxy.
 */
export function getClientIp(request: Request): string {
  const real = request.headers.get('x-real-ip');
  if (real && isValidIp(real)) return real.trim();

  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (isValidIp(parts[i])) return parts[i];
    }
  }

  return 'unknown';
}
