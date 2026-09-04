import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPusakaItems, countPusakaItems, getPusakaByPerson, createPusakaItem, hasPermission, getPersonById } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { readJsonBody, assertSameOrigin, parsePageParams } from '@/lib/http';
import { pusakaCreateSchema, firstIssueMessage } from '@/lib/schemas';
import type { PusakaCreate } from '@/types';

async function GETHandler(request: NextRequest) {
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

    // Paginasi opsional (audit S-06)
    const page = parsePageParams(request);
    return NextResponse.json(getPusakaItems(db, page), {
      headers: { 'X-Total-Count': String(countPusakaItems(db)) },
    });
  } catch (error) {
    console.error('[api/pusaka]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    // Lapis kedua CSRF (audit S-13)
    const originErr = assertSameOrigin(request);
    if (originErr) return originErr;

    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'create_heritage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Audit S-03: guard JSON 400/413; audit S-01/S-02: validasi zod lengkap
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = pusakaCreateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }
    const body: PusakaCreate = validated.data;
    const { person_id, name, type, description, origin, image, passed_from_person_id, year_acquired, is_sacred } = body;

    // Audit S-16: person_id dicek eksistensinya — pelanggaran FK dulunya 500
    const person = getPersonById(db, person_id);
    if (!person) {
      return NextResponse.json({ error: 'Orang (person_id) tidak ditemukan' }, { status: 404 });
    }
    if (passed_from_person_id && !getPersonById(db, passed_from_person_id)) {
      return NextResponse.json({ error: 'Orang (passed_from_person_id) tidak ditemukan' }, { status: 404 });
    }

    const id = crypto.randomUUID();
    const created = createPusakaItem(db, {
      id,
      person_id,
      name,
      type,
      // Normalisasi undefined → nilai aman untuk binding SQLite
      description: description ?? '',
      origin: origin ?? '',
      image: image ?? null,
      passed_from_person_id: passed_from_person_id ?? null,
      year_acquired: year_acquired ?? null,
      is_sacred: is_sacred ?? false,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[api/pusaka]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /pusaka');
export const POST = withApiLogging(POSTHandler, 'POST /pusaka');
