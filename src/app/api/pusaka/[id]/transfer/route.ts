import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasPermission, transferPusakaItem } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { consumeRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/pusaka/[id]/transfer
 * Transfer kepemilikan pusaka ke pemegang baru (TR-4).
 *
 * Body: { to_person_id: string }
 *
 * Efek:
 * - Pemegang lama tercatat otomatis sebagai passed_from (riwayat pewarisan).
 * - Operasi tercatat di transfer_log (audit trail).
 *
 * Butuh izin edit_heritage (editor/admin).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    // Rate limit: transfer pusaka 15x / 10 menit
    const rl = consumeRateLimit(`pusaka-transfer:${getClientIp(request)}`, {
      limit: 15,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const { id } = await params;

    let body: { to_person_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body harus JSON yang valid' }, { status: 400 });
    }

    const toPersonId = (body.to_person_id || '').trim();
    if (!toPersonId) {
      return NextResponse.json({ error: 'to_person_id wajib diisi' }, { status: 400 });
    }

    const result = transferPusakaItem(db, id, toPersonId, session.email);
    if ('error' in result) {
      const status = result.error === 'Pusaka tidak ditemukan' ? 404
        : result.error === 'Orang tujuan tidak ditemukan' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      message: 'Pusaka berhasil ditransfer',
      item: result.item,
    });
  } catch (error) {
    console.error('[api/pusaka/:id/transfer POST]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
