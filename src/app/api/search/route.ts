import { NextRequest, NextResponse } from 'next/server';
import { getDb, searchPersons } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q');
    if (!q || q.trim().length === 0) {
      return NextResponse.json([]);
    }

    const db = getDb();
    const results = searchPersons(db, q.trim());
    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
