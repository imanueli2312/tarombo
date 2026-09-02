import { NextRequest, NextResponse } from 'next/server';
import { getDb, getOralHistories, getOralHistoriesByPerson, createOralHistory, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import type { OralHistoryCategory } from '@/types';

const VALID_CATEGORIES: OralHistoryCategory[] = [
  'turian_asal_usul',
  'turian_migrasi',
  'turian_peristiwa',
  'gondang',
  'mangalahat',
  'saur_matua',
  'pesta_pernikahan',
  'turian_umum',
];

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('person_id');

    if (personId) {
      return NextResponse.json(getOralHistoriesByPerson(db, personId));
    }

    return NextResponse.json(getOralHistories(db));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'create_heritage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { person_id, category, title, content, source_person_name, recorded_date, is_verified } = body;

    if (!person_id) {
      return NextResponse.json({ error: 'person_id wajib diisi' }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ error: 'title minimal 1 karakter' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'category tidak valid' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const created = createOralHistory(db, {
      id,
      person_id,
      category,
      title,
      content,
      source_person_name,
      recorded_date,
      is_verified,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
