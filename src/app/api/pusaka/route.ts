import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPusakaItems, getPusakaByPerson, createPusakaItem, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import type { PusakaType } from '@/types';

const VALID_PUSAKA_TYPES: PusakaType[] = [
  'tombak',
  'ulos',
  'tunggal_panaluan',
  'gorga',
  'gabe',
  'hasangapon',
  'rattan_box',
  'kalung_bulan',
  'gutar_guar',
  'tali_tiga',
  'porhala',
  'jamita',
  'sial_solam_sial_sao',
  'lainnya',
];

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_heritage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('person_id');

    if (personId) {
      return NextResponse.json(getPusakaByPerson(db, personId));
    }

    return NextResponse.json(getPusakaItems(db));
  } catch (error) {
    console.error('[api/pusaka]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
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
    const { person_id, name, type, description, origin, image, passed_from_person_id, year_acquired, is_sacred } = body;

    if (!person_id) {
      return NextResponse.json({ error: 'person_id wajib diisi' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return NextResponse.json({ error: 'name minimal 1 karakter' }, { status: 400 });
    }

    if (!type || !VALID_PUSAKA_TYPES.includes(type)) {
      return NextResponse.json({ error: 'type tidak valid' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const created = createPusakaItem(db, {
      id,
      person_id,
      name,
      type,
      description,
      origin,
      image,
      passed_from_person_id,
      year_acquired,
      is_sacred,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[api/pusaka]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
