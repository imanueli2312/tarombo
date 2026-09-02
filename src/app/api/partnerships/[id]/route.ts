import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPartnershipById, updatePartnership, deletePartnership, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { validateDivorceAfterMarriage } from '@/lib/validation';

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
    if (!hasPermission(db, session.role, 'edit_marriage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getPartnershipById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pernikahan tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { marriage_date, divorce_date } = body as { marriage_date?: string | null; divorce_date?: string | null };

    // Validate divorce >= marriage (merge with existing values for partial updates)
    const effectiveMarriage = marriage_date ?? existing.marriage_date;
    const effectiveDivorce = divorce_date ?? existing.divorce_date;
    const dateErr = validateDivorceAfterMarriage(effectiveMarriage, effectiveDivorce);
    if (dateErr) return NextResponse.json({ error: dateErr }, { status: 400 });

    const partnership = updatePartnership(db, id, { marriage_date, divorce_date });
    return NextResponse.json(partnership);
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
    if (!hasPermission(db, session.role, 'delete_marriage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getPartnershipById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pernikahan tidak ditemukan' }, { status: 404 });
    }

    const result = deletePartnership(db, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
