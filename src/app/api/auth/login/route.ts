import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, getPermissionsForRole } from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';
import { consumeRateLimit, resetRateLimit, getClientIp, DEFAULT_LOGIN_RATE_LIMIT, LOGIN_IP_RATE_LIMIT } from '@/lib/rate-limit';
import { readJsonBody, assertSameOrigin } from '@/lib/http';

// Hash dummy agar waktu respons tetap setara ketika email tidak ditemukan
// (mitigasi timing attack untuk mencocokkan keberadaan akun).
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.pQ0GdJ7XWZxRr7RQ5xJ0y1m7RZy2N9u';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function POSTHandler(request: NextRequest) {
  try {
    // Lapis kedua CSRF (audit S-13): tolak POST lintas-origin
    const originErr = assertSameOrigin(request);
    if (originErr) return originErr;

    const parsed = await readJsonBody<{ email?: unknown; password?: unknown }>(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }
    if (password.length > 200) {
      return NextResponse.json({ error: 'Password tidak valid' }, { status: 400 });
    }

    // Rate limit berlapis (audit T-03/T-04):
    // 1. Cap per-IP murni — menutup password spraying (memutar-mutar email
    //    korban untuk menghindari bucket per-akun).
    // 2. Bucket per kombinasi IP + email — brute force satu akun.
    // IP diambil dari X-Real-IP/entri terakhir XFF yang sudah diperbaiki
    // (spoofing entri pertama XFF tidak lagi efektif).
    const ip = getClientIp(request);
    const ipRateKey = `login-ip:${ip}`;
    const ipRl = consumeRateLimit(ipRateKey, LOGIN_IP_RATE_LIMIT);
    if (!ipRl.ok) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login dari perangkat ini. Coba lagi nanti.' },
        { status: 429, headers: { 'Retry-After': String(ipRl.retryAfterSec || 900) } },
      );
    }

    const rateKey = `login:${ip}:${email}`;
    const rl = consumeRateLimit(rateKey, DEFAULT_LOGIN_RATE_LIMIT);
    if (!rl.ok) {
      const retryMin = Math.ceil((rl.retryAfterSec || 900) / 60);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${retryMin} menit.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec || 900) } },
      );
    }

    const db = getDb();
    const user = getUserByEmail(db, email);

    // Selalu jalankan verifikasi bcrypt (timing-safe terhadap user tidak ditemukan)
    const passwordValid = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !passwordValid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    resetRateLimit(rateKey);
    resetRateLimit(ipRateKey);

    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tokenVersion: user.token_version,
    });

    const { password_hash: _, token_version: __, ...safeUser } = user;
    const perms = getPermissionsForRole(db, user.role);
    const permissions = perms.filter((p) => p.allowed).map((p) => p.permission);

    // Token HANYA dikirim lewat cookie httpOnly — tidak lagi di body respons
    // untuk memperkecil permukaan serangan XSS.
    const response = NextResponse.json({ user: safeUser, permissions });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 hari
    });

    return response;
  } catch (error) {
    // Jangan bocorkan detail internal ke klien
    console.error('[api/auth/login]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const POST = withApiLogging(POSTHandler, 'POST /auth/login');
