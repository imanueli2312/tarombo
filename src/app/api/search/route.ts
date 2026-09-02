import { NextRequest, NextResponse } from 'next/server';
import { getDb, searchPersons, searchHeritage } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q');
    const includeHeritage = request.nextUrl.searchParams.get('heritage');

    if (!q || q.trim().length === 0) {
      if (includeHeritage) {
        return NextResponse.json({ persons: [], heritage: { oral: [], pusaka: [] } });
      }
      return NextResponse.json([]);
    }

    const db = getDb();
    const results = searchPersons(db, q.trim());

    if (includeHeritage) {
      const heritage = searchHeritage(db, q.trim());
      return NextResponse.json({
        persons: results,
        heritage,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
