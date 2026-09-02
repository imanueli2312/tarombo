import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPersons, createPerson, getPersonById, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { validateDeathAfterBirth, validateNotFuture, validateLatitude, validateLongitude } from '@/lib/validation';
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

    // Validate nama (trimmed, non-empty)
    const nama = (body.nama || '').trim();
    if (!nama) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }
    body.nama = nama;

    if (!body.jenis_kelamin || !['L', 'P'].includes(body.jenis_kelamin)) {
      return NextResponse.json({ error: 'Jenis kelamin tidak valid' }, { status: 400 });
    }

    // Date validations
    const dateErr = validateDeathAfterBirth(body.tanggal_lahir, body.tanggal_kematian);
    if (dateErr) return NextResponse.json({ error: dateErr }, { status: 400 });

    const futureBirth = validateNotFuture(body.tanggal_lahir, 'Tanggal lahir');
    if (futureBirth) return NextResponse.json({ error: futureBirth }, { status: 400 });

    // Validate father_id and mother_id exist and have correct gender
    if (body.father_id) {
      const father = getPersonById(db, body.father_id);
      if (!father) return NextResponse.json({ error: 'Ayah tidak ditemukan' }, { status: 404 });
      if (father.jenis_kelamin !== 'L') return NextResponse.json({ error: 'Ayah harus berjenis kelamin laki-laki' }, { status: 400 });
    }
    if (body.mother_id) {
      const mother = getPersonById(db, body.mother_id);
      if (!mother) return NextResponse.json({ error: 'Ibu tidak ditemukan' }, { status: 404 });
      if (mother.jenis_kelamin !== 'P') return NextResponse.json({ error: 'Ibu harus berjenis kelamin perempuan' }, { status: 400 });
    }

    // Validate nomor_generasi
    if (body.nomor_generasi != null && (body.nomor_generasi < 1 || !Number.isInteger(body.nomor_generasi))) {
      return NextResponse.json({ error: 'Nomor generasi harus bilangan bulat positif' }, { status: 400 });
    }

    // Validate nomor_urut_lahir
    if (body.nomor_urut_lahir != null && (body.nomor_urut_lahir < 1 || !Number.isInteger(body.nomor_urut_lahir))) {
      return NextResponse.json({ error: 'Nomor urut kelahiran harus bilangan bulat positif' }, { status: 400 });
    }

    // Validate burial coordinates
    const latErr = validateLatitude(body.burial_latitude);
    if (latErr) return NextResponse.json({ error: latErr }, { status: 400 });
    const lngErr = validateLongitude(body.burial_longitude);
    if (lngErr) return NextResponse.json({ error: lngErr }, { status: 400 });

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
