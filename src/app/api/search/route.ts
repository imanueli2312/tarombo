import { NextRequest, NextResponse } from 'next/server';
import { getDb, searchPersons, searchHeritage, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'search')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const q = request.nextUrl.searchParams.get('q');
    const includeHeritage = request.nextUrl.searchParams.get('heritage');

    if (!q || q.trim().length === 0) {
      if (includeHeritage) {
        return NextResponse.json({ persons: [], heritage: { oral: [], pusaka: [] } });
      }
      return NextResponse.json([]);
    }

    // Batasi panjang kueri pencarian (mitigasi beban & input tidak wajar)
    const query = q.trim().slice(0, 100);
    const results = searchPersons(db, query);

    if (includeHeritage) {
      // Pencarian warisan budaya membutuhkan izin view_heritage tambahan
      if (!hasPermission(db, session.role, 'view_heritage')) {
        return NextResponse.json({ persons: results, heritage: { oral: [], pusaka: [] } });
      }
      const heritage = searchHeritage(db, query);
      return NextResponse.json({
        persons: results,
        heritage,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[api/search]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
