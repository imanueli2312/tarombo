import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPartnerships, createPartnership, getPersonById, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';

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

export async function GET() {
  try {
    const db = getDb();
    const partnerships = getPartnerships(db);
    return NextResponse.json(partnerships.map((p) => populatePartnership(db, p)));
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

    return NextResponse.json(populatePartnership(db, partnership!), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
