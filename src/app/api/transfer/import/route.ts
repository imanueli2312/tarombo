import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasPermission, addTransferLog } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import {
  MAX_IMPORT_SIZE, validateImport, applyImport,
  csvToPersonsPayload, gedcomToPayload, normalizeJsonPayload, type ImportPayload, type ImportStrategy,
} from '@/lib/transfer';
import { consumeRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/transfer/import
 * Impor data silsilah: JSON (ekspor Tarombo), CSV (daftar orang), atau GEDCOM.
 *
 * Body: { format: 'json'|'csv'|'gedcom', mode: 'validate'|'apply',
 *         strategy: 'skip'|'overwrite', data: <objek|string> }
 *
 * Hardening (TR-6):
 * - Izin transfer_data (default admin) + rate limit.
 * - Batas ukuran payload 5 MB & 10.000 entitas.
 * - Mode "validate" (dry-run) memeriksa seluruh data tanpa menulis.
 * - Mode "apply" menulis dalam SATU transaksi atomik + tercatat di log.
 * - Validasi ketat: enum, tanggal, panjang field, referensi, siklus, monogami,
 *   dan adat eksogami marga.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'transfer_data')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Rate limit: impor 6x per 10 menit (baca + validasi berat)
    const rl = consumeRateLimit(`import:${getClientIp(request)}`, {
      limit: 6,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    // Batas ukuran body (Content-Length bila tersedia)
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_IMPORT_SIZE + 64 * 1024) {
      return NextResponse.json({ error: `Ukuran payload melebihi batas ${Math.floor(MAX_IMPORT_SIZE / 1024 / 1024)} MB` }, { status: 413 });
    }

    let body: { format?: string; mode?: string; strategy?: string; data?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body harus JSON yang valid' }, { status: 400 });
    }

    const format = (body.format || '').toLowerCase();
    if (!['json', 'csv', 'gedcom'].includes(format)) {
      return NextResponse.json({ error: "format harus 'json', 'csv', atau 'gedcom'" }, { status: 400 });
    }
    const mode = (body.mode || 'validate').toLowerCase();
    if (!['validate', 'apply'].includes(mode)) {
      return NextResponse.json({ error: "mode harus 'validate' atau 'apply'" }, { status: 400 });
    }
    const strategy: ImportStrategy = (body.strategy || 'skip').toLowerCase() as ImportStrategy;
    if (!['skip', 'overwrite'].includes(strategy)) {
      return NextResponse.json({ error: "strategy harus 'skip' atau 'overwrite'" }, { status: 400 });
    }

    // --- Konversi data mentah → payload terstandar ---
    const issues: import('@/types').ImportIssue[] = [];
    let payload: ImportPayload;

    if (body.data === undefined || body.data === null) {
      return NextResponse.json({ error: 'Field "data" wajib diisi' }, { status: 400 });
    }

    if (typeof body.data === 'string') {
      if (body.data.length > MAX_IMPORT_SIZE) {
        return NextResponse.json({ error: `Ukuran data melebihi batas ${Math.floor(MAX_IMPORT_SIZE / 1024 / 1024)} MB` }, { status: 413 });
      }
      if (format === 'csv') {
        payload = csvToPersonsPayload(body.data, issues);
      } else if (format === 'gedcom') {
        payload = gedcomToPayload(body.data, issues);
      } else {
        // json berupa string → parse dulu
        try {
          payload = normalizeJsonPayload(JSON.parse(body.data), issues);
        } catch {
          return NextResponse.json({ error: 'Data JSON tidak valid (parse gagal)' }, { status: 400 });
        }
      }
    } else if (format === 'json') {
      const serialized = JSON.stringify(body.data);
      if (serialized.length > MAX_IMPORT_SIZE) {
        return NextResponse.json({ error: `Ukuran data melebihi batas ${Math.floor(MAX_IMPORT_SIZE / 1024 / 1024)} MB` }, { status: 413 });
      }
      payload = normalizeJsonPayload(body.data, issues);
    } else {
      return NextResponse.json({ error: `Format "${format}" mengharuskan data berupa string` }, { status: 400 });
    }

    // --- Parse error level awal (CSV/GEDCOM) → tolak sebelum validasi lanjut ---
    if (issues.some((x) => x.severity === 'error')) {
      return NextResponse.json({
        ok: false,
        applied: false,
        summary: { persons: payload.persons.length, partnerships: payload.partnerships.length, parent_child: payload.parent_child.length, oral_histories: payload.oral_histories.length, pusaka_items: payload.pusaka_items.length, persons_baru: 0, persons_duplikat: 0 },
        issues,
      }, { status: 400 });
    }

    // --- Mode validate: dry-run tanpa menulis ---
    if (mode === 'validate') {
      const report = validateImport(db, payload);
      return NextResponse.json({ ...report, applied: false });
    }

    // --- Mode apply: transaksi atomik ---
    const result = applyImport(db, payload, strategy);
    if (!result.applied) {
      return NextResponse.json(result, { status: 400 });
    }

    addTransferLog(db, {
      kind: format === 'json' ? 'import_json' : format === 'csv' ? 'import_csv' : 'import_gedcom',
      actor_email: session.email,
      summary: `Impor ${format.toUpperCase()} (${strategy}): +${result.inserted.persons} orang, +${result.inserted.partnerships} pernikahan, +${result.inserted.parent_child} relasi, ~${result.updated.persons} diperbarui, ${result.skipped.persons} dilewati`,
      details: {
        format,
        strategy,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        summary: result.summary,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/transfer/import POST]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
