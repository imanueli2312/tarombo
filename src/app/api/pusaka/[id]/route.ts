import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPusakaById, updatePusakaItem, deletePusakaItem, hasPermission, getPersonById } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { readJsonBody, assertSameOrigin } from '@/lib/http';
import { pusakaUpdateSchema, firstIssueMessage } from '@/lib/schemas';

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
    const record = getPusakaById(db, id);

    if (!record) {
      return NextResponse.json({ error: 'Pusaka tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('[api/pusaka/:id]', error);
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
    const existing = getPusakaById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pusaka tidak ditemukan' }, { status: 404 });
    }

    // Audit S-01 (temuan inti): PUT dulunya meneruskan body mentah pengguna
    // langsung ke updatePusakaItem. Kini: guard JSON + validasi zod lengkap
    // (enum type, panjang description/origin/image, bentuk is_sacred).
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = pusakaUpdateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }

    // Audit S-16: jika relasi person diganti, pastikan tujuannya ada
    const data = { ...validated.data };
    if (data.person_id !== undefined && data.person_id !== existing.person_id) {
      if (!getPersonById(db, data.person_id)) {
        return NextResponse.json({ error: 'Orang (person_id) tidak ditemukan' }, { status: 404 });
      }
    }
    if (data.passed_from_person_id) {
      if (!getPersonById(db, data.passed_from_person_id)) {
        return NextResponse.json({ error: 'Orang (passed_from_person_id) tidak ditemukan' }, { status: 404 });
      }
    }

    const updated = updatePusakaItem(db, id, data);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/pusaka/:id]', error);
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
    const existing = getPusakaById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pusaka tidak ditemukan' }, { status: 404 });
    }

    const result = deletePusakaItem(db, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/pusaka/:id]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /pusaka/[id]');
export const PUT = withApiLogging(PUTHandler, 'PUT /pusaka/[id]');
export const DELETE = withApiLogging(DELETEHandler, 'DELETE /pusaka/[id]');
