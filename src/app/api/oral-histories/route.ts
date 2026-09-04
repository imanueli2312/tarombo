import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getOralHistories, countOralHistories, getOralHistoriesByPerson, createOralHistory, hasPermission, getPersonById } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { readJsonBody, assertSameOrigin, parsePageParams } from '@/lib/http';
import { oralHistoryCreateSchema, firstIssueMessage } from '@/lib/schemas';
import type { OralHistoryCreate } from '@/types';

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
      return NextResponse.json(getOralHistoriesByPerson(db, personId));
    }

    // Paginasi opsional (audit S-06)
    const page = parsePageParams(request);
    return NextResponse.json(getOralHistories(db, page), {
      headers: { 'X-Total-Count': String(countOralHistories(db)) },
    });
  } catch (error) {
    console.error('[api/oral-histories]', error);
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

    // Audit S-03: guard JSON 400/413; audit S-01: validasi zod menggantikan
    // destructure mentah body tanpa validasi.
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = oralHistoryCreateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }
    const body: OralHistoryCreate = validated.data;
    const { person_id, category, title, content, source_person_name, recorded_date } = body;

    // Audit S-16: person_id dicek eksistensinya — pelanggaran FK dulunya
    // melempar 500 dari constraint DB, kini 404 yang informatif.
    const person = getPersonById(db, person_id);
    if (!person) {
      return NextResponse.json({ error: 'Orang (person_id) tidak ditemukan' }, { status: 404 });
    }

    // Audit S-15: penandaan terverifikasi adalah kewenangan admin —
    // editor merekam turian, admin yang memverifikasinya.
    const isAdmin = session.role === 'admin';

    const id = crypto.randomUUID();
    const created = createOralHistory(db, {
      id,
      person_id,
      category,
      title,
      content,
      source_person_name,
      recorded_date,
      is_verified: isAdmin ? body.is_verified ?? false : false,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[api/oral-histories]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /oral-histories');
export const POST = withApiLogging(POSTHandler, 'POST /oral-histories');
