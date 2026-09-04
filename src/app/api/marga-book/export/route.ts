import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasPermission, addTransferLog } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { buildMargaBook, renderMargaBookHtml } from '@/lib/marga-book';

/**
 * GET /api/marga-book/export
 * Unduh Buku Marga: ?format=html (siap cetak / print-to-PDF) atau json.
 * Query: ?marga=<nama> — pilih marga (default: marga utama / terbesar).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_marga_book')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const format = (request.nextUrl.searchParams.get('format') || 'html').toLowerCase();
    const marga = request.nextUrl.searchParams.get('marga') || undefined;
    const book = buildMargaBook(db, marga);

    addTransferLog(db, {
      kind: 'marga_book_export',
      actor_email: session.email,
      summary: `Ekspor Buku Marga ${book.marga} (format ${format}) — ${book.total_anggota} anggota, ${book.jumlah_generasi} generasi`,
      details: { marga: book.marga, format, total_anggota: book.total_anggota, jumlah_generasi: book.jumlah_generasi },
    });

    if (format === 'json') {
      return NextResponse.json(book, {
        headers: {
          'Content-Disposition': `attachment; filename="buku-marga-${book.marga.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json"`,
        },
      });
    }

    // format html — dokumen siap cetak
    const html = renderMargaBookHtml(book);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="buku-marga-${book.marga.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html"`,
      },
    });
  } catch (error) {
    console.error('[api/marga-book/export GET]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
