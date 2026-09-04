import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPartnerships, createPartnership, getPersonById, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { validateNotFuture } from '@/lib/validation';
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

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_marriages')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const partnerships = getPartnerships(db);
    return NextResponse.json(partnerships.map((p) => populatePartnership(db, p)));
  } catch (error) {
    console.error('[api/partnerships GET]', error);
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
    if (!hasPermission(db, session.role, 'create_marriage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { person1_id, person2_id, marriage_date } = body;

    if (!person1_id || !person2_id) {
      return NextResponse.json({ error: 'Dua orang wajib diisi' }, { status: 400 });
    }

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
