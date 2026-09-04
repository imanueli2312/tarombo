import { NextRequest, NextResponse } from 'next/server';
import { getDb, getOralHistoryById, updateOralHistory, deleteOralHistory, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    const db = getDb();
    if (!hasPermission(db, session.role, 'view_heritage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    const { id } = await params;
    const record = getOralHistoryById(db, id);

    if (!record) {
      return NextResponse.json({ error: 'Turian tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('[api/oral-histories/:id]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

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
    if (!hasPermission(db, session.role, 'edit_heritage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getOralHistoryById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Turian tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const updated = updateOralHistory(db, id, body);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/oral-histories/:id]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
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
    if (!hasPermission(db, session.role, 'delete_heritage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getOralHistoryById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Turian tidak ditemukan' }, { status: 404 });
    }

    const result = deleteOralHistory(db, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/oral-histories/:id]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
