import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPartnerships, countPartnerships, createPartnership, getPersonById, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { validateNotFuture } from '@/lib/validation';
import { readJsonBody, assertSameOrigin, parsePageParams } from '@/lib/http';
import { partnershipCreateSchema, firstIssueMessage } from '@/lib/schemas';
import { checkAdatMarriage } from '@/lib/adat-rules';

type PopulatedPartnership = {
  id: string;
  person1_id: string;
  person2_id: string;
  marriage_date: string | null;
  divorce_date: string | null;
  created_at: string;
  updated_at: string;
  person1: import('@/types').Person | null;
  person2: import('@/types').Person | null;
};

function populatePartnership(
  db: ReturnType<typeof getDb>,
  p: import('@/types').Partnership
): PopulatedPartnership {
  return {
    ...p,
    person1: getPersonById(db, p.person1_id) ?? null,
    person2: getPersonById(db, p.person2_id) ?? null,
  };
}

async function GETHandler(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_marriages')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Paginasi opsional (audit S-06)
    const page = parsePageParams(request);
    const partnerships = getPartnerships(db, page);
    return NextResponse.json(partnerships.map((p) => populatePartnership(db, p)), {
      headers: { 'X-Total-Count': String(countPartnerships(db)) },
    });
  } catch (error) {
    console.error('[api/partnerships GET]', error);
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
    if (!hasPermission(db, session.role, 'create_marriage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Audit S-03 + R-01: guard JSON 400/413 + zod menggantikan cast mentah
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = partnershipCreateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }
    const { person1_id, person2_id, marriage_date } = validated.data;

    if (person1_id === person2_id) {
      return NextResponse.json({ error: 'Tidak bisa menikah dengan diri sendiri' }, { status: 400 });
    }

    const p1 = getPersonById(db, person1_id);
    const p2 = getPersonById(db, person2_id);
    if (!p1 || !p2) {
      return NextResponse.json({ error: 'Salah satu orang tidak ditemukan' }, { status: 404 });
    }

    // Validate marriage date not in future
    if (marriage_date) {
      const futureErr = validateNotFuture(marriage_date, 'Tanggal pernikahan');
      if (futureErr) return NextResponse.json({ error: futureErr }, { status: 400 });
    }

    // --- Panduan Adat: validasi pernikahan adat Batak ---
    // 1. Eksogami marga (larangan semarga)
    // 2. Saudara kandung
    // 3. Sepupu sejajar / dongan sabutuha
    // 4. Garis leluhur
    // (pariban dicatat sebagai catatan adat)
    const adat = checkAdatMarriage(db, p1, p2);
    if (!adat.allowed) {
      return NextResponse.json(
        {
          error: 'Pernikahan tidak sesuai Panduan Adat Batak',
          violations: adat.violations,
        },
        { status: 422 },
      );
    }

    const id = crypto.randomUUID();
    let partnership;
    try {
      partnership = createPartnership(db, { id, person1_id, person2_id, marriage_date: marriage_date ?? null });
    } catch (error) {
      if (error instanceof Error && error.message.includes('pasangan aktif')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(
      { ...populatePartnership(db, partnership!), adat_notes: adat.notes },
      { status: 201 },
    );
  } catch (error) {
    console.error('[api/partnerships POST]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /partnerships');
export const POST = withApiLogging(POSTHandler, 'POST /partnerships');
