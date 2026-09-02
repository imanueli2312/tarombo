import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserById, updateUser, deleteUser, hasPermission } from '@/lib/db';
import { getAuthUserAsync, hashPassword } from '@/lib/auth';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['viewer', 'editor', 'admin'];

export async function PUT(
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
    const existing = getUserById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { name, role, password } = body as { name?: string; role?: string; password?: string };

    const updateData: { name?: string; role?: UserRole; password_hash?: string } = {};

    if (name !== undefined) updateData.name = name;
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role as UserRole)) {
        return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
      }
      updateData.role = role as UserRole;
    }
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }

    const user = updateUser(db, id, updateData);
    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
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

    const result = deleteUser(db, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
