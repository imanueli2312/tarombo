import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasPermission, addTransferLog } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { exportAllData, toGedcom } from '@/lib/transfer';
import { consumeRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * GET /api/transfer/export
 * Ekspor data terstruktur untuk backup & interoperabilitas.
 * Query: ?format=json (backup lengkap) | gedcom (standar genealogi 5.5.1).
 * Butuh izin transfer_data (default: admin).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'transfer_data')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Rate limit: ekspor data sensitif tidak boleh dihammer
    const rl = consumeRateLimit(`export:${getClientIp(request)}`, {
      limit: 20,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const format = (request.nextUrl.searchParams.get('format') || 'json').toLowerCase();

    if (format === 'gedcom') {
      const ged = toGedcom(db);
      const data = exportAllData(db);
      addTransferLog(db, {
        kind: 'export_gedcom',
        actor_email: session.email,
        summary: `Ekspor GEDCOM 5.5.1 — ${data.counts.persons} orang, ${data.counts.partnerships} pernikahan`,
        details: data.counts,
      });
      return new NextResponse(ged, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="tarombo-${new Date().toISOString().slice(0, 10)}.ged"`,
        },
      });
    }

    if (format !== 'json') {
      return NextResponse.json({ error: 'Format tidak dikenal (tersedia: json, gedcom)' }, { status: 400 });
    }

    const data = exportAllData(db);
    addTransferLog(db, {
      kind: 'export_json',
      actor_email: session.email,
      summary: `Ekspor JSON backup — ${data.counts.persons} orang, ${data.counts.partnerships} pernikahan, ${data.counts.oral_histories} turian, ${data.counts.pusaka_items} pusaka`,
      details: data.counts,
    });

    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="tarombo-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error('[api/transfer/export GET]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
