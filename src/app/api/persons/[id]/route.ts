import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPersonById, updatePerson, deletePerson, hasPermission, getParentsOf, getChildrenOf, getActiveSpouseOf, wouldCreateCycle, getDalihanRelations } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { validateDeathAfterBirth, validateNotFuture } from '@/lib/validation';
import { readJsonBody, assertSameOrigin } from '@/lib/http';
import { personUpdateSchema, firstIssueMessage } from '@/lib/schemas';
import type { PersonUpdate } from '@/types';

async function GETHandler(
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

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lapis kedua CSRF (audit S-13)
    const originErr = assertSameOrigin(request);
    if (originErr) return originErr;

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

    // Audit S-03 + R-01: guard JSON (400/413) + validasi zod menggantikan cast
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = personUpdateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }
    const body: PersonUpdate = validated.data;

    // Validate nama (if provided)
    if (body.nama !== undefined) {
      const trimmed = (body.nama || '').trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Nama tidak boleh kosong' }, { status: 400 });
      }
      body.nama = trimmed;
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

    // Validate nomor_generasi & nomor_urut_lahir (zod sudah mengecek bentuk;
    // cek null-vs-undefined tetap untuk konsistensi pesan)
    if (body.nomor_generasi != null && (body.nomor_generasi < 1 || !Number.isInteger(body.nomor_generasi))) {
      return NextResponse.json({ error: 'Nomor generasi harus bilangan bulat positif' }, { status: 400 });
    }

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

async function DELETEHandler(
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

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /persons/[id]');
export const PUT = withApiLogging(PUTHandler, 'PUT /persons/[id]');
export const DELETE = withApiLogging(DELETEHandler, 'DELETE /persons/[id]');
