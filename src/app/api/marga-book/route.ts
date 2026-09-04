import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasPermission, getMargaDirectory, recomputeGenerations, addTransferLog } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { buildMargaBook, findSubetnis } from '@/lib/marga-book';
import { MARGA_UTAMA } from '@/lib/batak-culture';
import { consumeRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * GET /api/marga-book
 * Buku Marga digital (format buku tarombo tradisional) + direktori marga.
 * Query: ?marga=<nama> — pilih marga (default: marga utama / terbesar).
 */
async function GETHandler(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_marga_book')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const marga = request.nextUrl.searchParams.get('marga') ?? undefined;
    const book = buildMargaBook(db, marga || undefined);

    // Direktori marga: lengkapi info sub-etnis dari katalog budaya
    const directory = getMargaDirectory(db, MARGA_UTAMA).map((d) => ({
      ...d,
      subetnis: findSubetnis(d.marga),
    }));

    return NextResponse.json({ book, directory });
  } catch (error) {
    console.error('[api/marga-book GET]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

/**
 * POST /api/marga-book
 * Rekomputasi nomor_generasi seluruh silsilah (konsistensi Buku Marga).
 * Butuh izin edit_person (editor/admin).
 */
async function POSTHandler(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'edit_person')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Rate limit: operasi tulis massal tidak boleh dihammer
    const rl = consumeRateLimit(`recompute:${getClientIp(request)}`, {
      limit: 6,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const result = recomputeGenerations(db);
    addTransferLog(db, {
      kind: 'generasi_recompute',
      actor_email: session.email,
      summary: `Rekomputasi generasi: ${result.checked} orang diperiksa, ${result.corrected} dikoreksi`,
      details: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/marga-book POST]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /marga-book');
export const POST = withApiLogging(POSTHandler, 'POST /marga-book');
