import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserById, getPermissionsForRole } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    const user = getUserById(db, session.id);
    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 401 });
    }

    const perms = getPermissionsForRole(db, user.role);
    const permissions = perms.filter(p => p.allowed).map(p => p.permission);

    return NextResponse.json({ user, permissions });
  } catch (error) {
    console.error('[api/auth/me]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
