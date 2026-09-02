import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUsers, createUser, hasPermission } from '@/lib/db';
import { getAuthUserAsync, hashPassword } from '@/lib/auth';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['viewer', 'editor', 'admin'];

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
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
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

    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Email, password, nama, dan role wajib diisi' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    const id = crypto.randomUUID();

    const user = createUser(db, { id, email, password, password_hash, name, role });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
