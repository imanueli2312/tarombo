import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getOralHistoryById, updateOralHistory, deleteOralHistory, hasPermission, getPersonById } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { readJsonBody, assertSameOrigin } from '@/lib/http';
import { oralHistoryUpdateSchema, firstIssueMessage } from '@/lib/schemas';

async function GETHandler(
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
    if (!hasPermission(db, session.role, 'edit_heritage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getOralHistoryById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Turian tidak ditemukan' }, { status: 404 });
    }

    // Audit S-01 (temuan inti): PUT dulunya meneruskan body mentah pengguna
    // langsung ke updateOralHistory — enum ilegal/panjang field tak dibatasi.
    // Kini: guard JSON (S-03) + validasi zod lengkap (S-02).
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = oralHistoryUpdateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }

    // Audit S-15: hanya admin boleh mengubah status is_verified
    const data = { ...validated.data };
    if (data.is_verified !== undefined && session.role !== 'admin') {
      delete data.is_verified;
    }

    // Audit S-16: jika person_id diganti, pastikan orang tujuannya ada
    if (data.person_id !== undefined && data.person_id !== existing.person_id) {
      if (!getPersonById(db, data.person_id)) {
        return NextResponse.json({ error: 'Orang (person_id) tidak ditemukan' }, { status: 404 });
      }
    }

    const updated = updateOralHistory(db, id, data);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/oral-histories/:id]', error);
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

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /oral-histories/[id]');
export const PUT = withApiLogging(PUTHandler, 'PUT /oral-histories/[id]');
export const DELETE = withApiLogging(DELETEHandler, 'DELETE /oral-histories/[id]');
