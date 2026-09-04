import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserById, updateUser, deleteUser, hasPermission } from '@/lib/db';
import { getAuthUserAsync, hashPassword } from '@/lib/auth';
import { readJsonBody, assertSameOrigin } from '@/lib/http';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['viewer', 'editor', 'admin'];

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

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lapis kedua CSRF (audit S-13)
    const originErr = assertSameOrigin(request);
    if (originErr) return originErr;

    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'manage_users')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getUserById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Guard JSON seragam (S-03) + batas body 1 MB (S-07)
    const parsed = await readJsonBody<{ name?: unknown; role?: unknown; password?: unknown }>(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const { name, role, password } = body;

    const updateData: { name?: string; role?: UserRole; password_hash?: string } = {};

    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName.length < 1 || trimmedName.length > 100) {
        return NextResponse.json({ error: 'Nama harus 1-100 karakter' }, { status: 400 });
      }
      updateData.name = trimmedName;
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role as UserRole)) {
        return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
      }
      // Proteksi admin terakhir: jangan menurunkan role admin terakhir yang tersisa
      if (existing.role === 'admin' && role !== 'admin') {
        const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'Tidak bisa menurunkan role administrator terakhir — minimal harus ada satu admin.' },
            { status: 400 },
          );
        }
      }
      updateData.role = role as UserRole;
    }

    if (password) {
      const pwErr = validatePasswordStrength(password);
      if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
      updateData.password_hash = await hashPassword(password as string);
    }

    const user = updateUser(db, id, updateData);
    return NextResponse.json(user);
  } catch (error) {
    console.error('[api/rbac/users/:id PUT]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'manage_users')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
    }

    const existing = getUserById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Proteksi admin terakhir: jangan menghapus admin terakhir yang tersisa
    if (existing.role === 'admin') {
      const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Tidak bisa menghapus administrator terakhir — minimal harus ada satu admin.' },
          { status: 400 },
        );
      }
    }

    const result = deleteUser(db, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/rbac/users/:id DELETE]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const PUT = withApiLogging(PUTHandler, 'PUT /rbac/users/[id]');
export const DELETE = withApiLogging(DELETEHandler, 'DELETE /rbac/users/[id]');
