import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPersonById, updatePerson, deletePerson, hasPermission, getParentsOf, getChildrenOf, getActiveSpouseOf, wouldCreateCycle, getDalihanRelations } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { validateDeathAfterBirth, validateNotFuture, validateLatitude, validateLongitude, validateFieldLength } from '@/lib/validation';
import type { PersonUpdate } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_tree')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const person = getPersonById(db, id);

    if (!person) {
      return NextResponse.json({ error: 'Orang tidak ditemukan' }, { status: 404 });
    }

    const parents = getParentsOf(db, id);
    const children = getChildrenOf(db, id);
    const spouse = getActiveSpouseOf(db, id);
    // Panduan Adat: relasi Dalihan Na Tolu dihitung dari data silsilah nyata
    const dalihan = getDalihanRelations(db, id);

    return NextResponse.json({ ...person, parents, children, spouse, dalihan });
  } catch (error) {
    console.error('[api/persons/:id GET]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'edit_person')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getPersonById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Orang tidak ditemukan' }, { status: 404 });
    }

    const body: PersonUpdate = await request.json();

    // Validate nama (if provided)
    if (body.nama !== undefined) {
      const trimmed = (body.nama || '').trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Nama tidak boleh kosong' }, { status: 400 });
      }
      body.nama = trimmed;
    }

    // Field length validation
    for (const field of ['nama', 'nama_panggilan', 'tempat_lahir', 'alamat', 'agama', 'nomor_telepon', 'burial_nama', 'burial_alamat', 'marga_asal', 'tempat_asal', 'pendidikan', 'pekerjaan'] as const) {
      const val = (body as Record<string, unknown>)[field];
      if (val != null && val !== '') {
        const lenErr = validateFieldLength(field, val as string);
        if (lenErr) return NextResponse.json({ error: lenErr }, { status: 400 });
      }
    }

    // Validate jenis_kelamin (if provided)
    if (body.jenis_kelamin && !['L', 'P'].includes(body.jenis_kelamin)) {
      return NextResponse.json({ error: 'Jenis kelamin tidak valid' }, { status: 400 });
    }

    // Date validations (merge with existing values for partial updates)
    const tanggal_lahir = body.tanggal_lahir ?? existing.tanggal_lahir;
    const tanggal_kematian = body.tanggal_kematian ?? existing.tanggal_kematian;
    const dateErr = validateDeathAfterBirth(tanggal_lahir, tanggal_kematian);
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

    // Cycle detection
    if (body.father_id && wouldCreateCycle(db, body.father_id, id)) {
      return NextResponse.json({ error: 'Tidak bisa menambahkan orang tua yang menyebabkan lingkaran silsilah' }, { status: 400 });
    }
    if (body.mother_id && wouldCreateCycle(db, body.mother_id, id)) {
      return NextResponse.json({ error: 'Tidak bisa menambahkan orang tua yang menyebabkan lingkaran silsilah' }, { status: 400 });
    }

    // --- Panduan Adat: marga patrilineal saat edit ---
    // Jika marga dikosongkan secara eksplisit dan ayah diketahui (baru ataupun lama),
    // marga mengikuti marga ayah secara otomatis.
    if (body.marga_asal !== undefined && !(body.marga_asal || '').trim()) {
      const fatherId = body.father_id || getParentsOf(db, id).father?.id;
      if (fatherId) {
        const father = getPersonById(db, fatherId);
        const fatherMarga = (father?.marga_asal || '').trim();
        if (fatherMarga) body.marga_asal = fatherMarga;
      }
    }

    const person = updatePerson(db, id, body);

    return NextResponse.json(person);
  } catch (error) {
    console.error('[api/persons/:id PUT]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'delete_person')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getPersonById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Orang tidak ditemukan' }, { status: 404 });
    }

    const result = deletePerson(db, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/persons/:id DELETE]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
