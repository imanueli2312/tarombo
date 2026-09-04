import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

/**
 * Secret JWT (lazy — dihitung saat pertama kali dipakai agar proses build
 * produksi tidak gagal ketika env belum tersedia).
 * - Produksi: JWT_SECRET wajib diset minimal 32 karakter, aplikasi menolak jalan.
 * - Development: jika tidak diset, dibuat secret acak sementara + peringatan
 *   (token hangus saat server restart — dapat diterima untuk dev).
 */
let _cachedSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (_cachedSecret) return _cachedSecret;

  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET wajib diset (minimal 32 karakter acak) saat NODE_ENV=production. ' +
        'Generate dengan: openssl rand -hex 32',
      );
    }
    _cachedSecret = new TextEncoder().encode(secret);
    return _cachedSecret;
  }
  if (!secret) {
    console.warn(
      '[tarombo] JWT_SECRET tidak diset — memakai secret acak sementara untuk development. ' +
      'Token akan hangus setiap restart. Set JWT_SECRET untuk sesi stabil.',
    );
    _cachedSecret = new TextEncoder().encode('tarombo-dev-' + crypto.randomUUID());
    return _cachedSecret;
  }
  _cachedSecret = new TextEncoder().encode(secret);
  return _cachedSecret;
}
const JWT_ISSUER = 'tarombo';
const JWT_AUDIENCE = 'tarombo-app';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: {
  id: string;
  email: string;
  name: string;
  role: string;
  /** Versi token sesi — naik saat role/password berubah (revocasi, audit T-02) */
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    tv: payload.tokenVersion,
  } as unknown as import('jose').JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload as unknown as {
      id: string;
      email: string;
      name: string;
      role: string;
      tv?: number;
      exp: number;
      iat: number;
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);

  // Also check cookie
  const cookie = request.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

/** Sesi terautentikasi — role SELALU dibaca ulang dari database (terkini). */
export interface AuthSession {
  id: string;
  email: string;
  name: string;
  role: import('@/types').UserRole;
}

/**
 * Ambil user terautentikasi dari request, dengan validasi sesi server-side
 * (revocasi, audit T-02):
 * 1. Verifikasi tanda tangan + expiry JWT (jose).
 * 2. Muat ulang user dari DB berdasarkan id di klaim — akun yang sudah
 *    dihapus langsung ditolak, role yang dipakai otorisasi selalu terkini
 *    (demote berlaku seketika, bukan menunggu token 7 hari hangus).
 * 3. Bandingkan klaim `tv` dengan users.token_version — token yang diterbitkan
 *    sebelum perubahan role/password ditolak.
 *
 * Dynamic import menghindari dependensi melingkar auth.ts ↔ db.ts
 * (db.ts mengimpor hashPassword untuk seeding).
 */
export async function getAuthUserAsync(request: Request): Promise<AuthSession | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.id) return null;

  try {
    const { getDb, getUserSessionData } = await import('./db');
    const user = getUserSessionData(getDb(), String(payload.id));
    if (!user) return null;
    if ((typeof payload.tv === 'number' ? payload.tv : 0) !== user.token_version) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  } catch (error) {
    // DB tidak bisa diakses — perlakukan sebagai tidak terautentikasi, log ke server
    console.error('[auth] gagal memuat data sesi dari DB:', error);
    return null;
  }
}
