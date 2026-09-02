import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAllPermissions, updatePermission, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'manage_permissions')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const permissions = getAllPermissions(db);
    return NextResponse.json(permissions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'manage_permissions')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { id, allowed } = body;

    if (!id || typeof allowed !== 'boolean') {
      return NextResponse.json({ error: 'id dan allowed wajib diisi' }, { status: 400 });
    }

    const permission = updatePermission(db, id, allowed);
    return NextResponse.json(permission);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
