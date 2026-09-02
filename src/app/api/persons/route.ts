import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPersons, createPerson, getPersonById, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import type { PersonCreate } from '@/types';

export async function GET() {
  try {
    const db = getDb();
    const persons = getPersons(db);
    return NextResponse.json(persons);
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
    if (!hasPermission(db, session.role, 'create_person')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body: PersonCreate = await request.json();

    if (!body.nama || !body.jenis_kelamin) {
      return NextResponse.json({ error: 'Nama dan jenis kelamin wajib diisi' }, { status: 400 });
    }

    // Auto-calculate nomor_generasi from father if provided
    let nomor_generasi = body.nomor_generasi ?? 1;
    if (body.father_id) {
      const father = getPersonById(db, body.father_id);
      if (father) {
        nomor_generasi = father.nomor_generasi + 1;
      }
    }

    const id = crypto.randomUUID();
    const person = createPerson(db, { ...body, id, nomor_generasi });

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
