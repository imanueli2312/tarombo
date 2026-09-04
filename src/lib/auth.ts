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

export async function createToken(payload: { id: string; email: string; name: string; role: string }): Promise<string> {
  return new SignJWT(payload as unknown as import('jose').JWTPayload)
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
    return payload as unknown as { id: string; email: string; name: string; role: string; exp: number; iat: number };
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

export async function getAuthUserAsync(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}
