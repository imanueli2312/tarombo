import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasPermission, getTransferLogs } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';

/**
 * GET /api/transfer/logs
 * Riwayat (audit trail) seluruh operasi transfer: ekspor/impor data,
 * transfer pusaka, ekspor buku marga, rekomputasi generasi.
 * Butuh izin transfer_data (default: admin). Query: ?limit=<n> (maks 200).
 */
async function GETHandler(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'transfer_data')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const limitRaw = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const logs = getTransferLogs(db, limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[api/transfer/logs GET]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /transfer/logs');
