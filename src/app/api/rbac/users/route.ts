import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUsers, createUser, hasPermission, getUserByEmail } from '@/lib/db';
import { getAuthUserAsync, hashPassword } from '@/lib/auth';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['viewer', 'editor', 'admin'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validasi kekuatan password: minimal 8 karakter, ada huruf dan angka */
function validatePasswordStrength(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password minimal 8 karakter';
  }
  if (password.length > 200) {
    return 'Password maksimal 200 karakter';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password harus mengandung huruf dan angka';
  }
  return null;
}

/** Jumlah administrator yang tersisa (untuk proteksi admin terakhir) */
function countAdmins(db: ReturnType<typeof getDb>): number {
  const row = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number };
  return row.c;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'manage_users')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const users = getUsers(db);
    return NextResponse.json(users);
  } catch (error) {
    console.error('[api/rbac/users GET]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'manage_users')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    let body: { email?: unknown; password?: unknown; name?: unknown; role?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Format permintaan tidak valid' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const { password, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Email, password, nama, dan role wajib diisi' }, { status: 400 });
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }
    if (email.length > 200) {
      return NextResponse.json({ error: 'Email maksimal 200 karakter' }, { status: 400 });
    }
    if (name.length < 1 || name.length > 100) {
      return NextResponse.json({ error: 'Nama harus 1-100 karakter' }, { status: 400 });
    }
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
    if (!VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    // Cegah akun ganda dengan email yang sama (case-insensitive)
    const existing = getUserByEmail(db, email);
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    const password_hash = await hashPassword(password as string);
    const id = crypto.randomUUID();

    const user = createUser(db, { id, email, password: password as string, password_hash, name, role: role as UserRole });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('[api/rbac/users POST]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
