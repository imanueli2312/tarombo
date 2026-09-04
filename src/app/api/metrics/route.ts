import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { getMetricsSnapshot, withApiLogging } from '@/lib/logger';

/**
 * GET /api/metrics — metrik ringkas per endpoint (audit R-08): jumlah
 * request, error (status >= 500), latensi total/rata-rata, status terakhir.
 * Khusus admin (data operasional tidak untuk pengguna biasa).
 *
 * Catatan: metrik in-memory — reset saat restart. Cukup untuk melihat
 * kesehatan antar-restart; monitoring jangka panjang tetap disarankan
 * memakai uptime monitor eksternal terhadap /api/health (lihat
 * docs/DEPLOYMENT.md).
 */
async function GETHandler(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const snapshot = getMetricsSnapshot();
    const endpoints = Object.values(snapshot);
    const totalRequests = endpoints.reduce((a, m) => a + m.count, 0);
    const totalErrors = endpoints.reduce((a, m) => a + m.errors, 0);

    return NextResponse.json(
      {
        uptimeSec: Math.floor(process.uptime()),
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
        endpoints: snapshot,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[api/metrics]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /api/metrics');
