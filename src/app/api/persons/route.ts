import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPersons, countPersons, createPerson, getPersonById, hasPermission, wouldCreateCycle } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { validateDeathAfterBirth, validateNotFuture, validateChildAfterParent } from '@/lib/validation';
import { readJsonBody, assertSameOrigin, parsePageParams } from '@/lib/http';
import { personCreateSchema, firstIssueMessage } from '@/lib/schemas';
import type { PersonCreate } from '@/types';

async function GETHandler(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_tree')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Paginasi opsional (audit S-06): ?limit=&offset= + header X-Total-Count.
    // Default 500 baris — perilaku UI untuk data keluarga normal tidak berubah.
    const page = parsePageParams(request);
    const persons = getPersons(db, page);
    return NextResponse.json(persons, {
      headers: { 'X-Total-Count': String(countPersons(db)) },
    });
  } catch (error) {
    console.error('[api/persons GET]', error);
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
    if (!hasPermission(db, session.role, 'create_person')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Audit S-03 + R-01: guard JSON (400/413) + validasi zod menggantikan cast
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = personCreateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }
    const body: PersonCreate = validated.data;

    // Validate nama (trimmed, non-empty — zod min(1) tidak menangkap spasi murni)
    const nama = (body.nama || '').trim();
    if (!nama) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }
    body.nama = nama;

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

    // Validate nomor_generasi (double-check null vs undefined setelah zod)
    if (body.nomor_generasi != null && (body.nomor_generasi < 1 || !Number.isInteger(body.nomor_generasi))) {
      return NextResponse.json({ error: 'Nomor generasi harus bilangan bulat positif' }, { status: 400 });
    }

    // Auto-calculate nomor_generasi from father if provided
    let nomor_generasi = body.nomor_generasi ?? 1;
    if (body.father_id) {
      const father = getPersonById(db, body.father_id);
      if (father) {
        nomor_generasi = father.nomor_generasi + 1;
      }
    }

    // Validate child birth date vs parent birth date
    if (body.tanggal_lahir && body.father_id) {
      const father = getPersonById(db, body.father_id);
      if (father?.tanggal_lahir) {
        const childErr = validateChildAfterParent(father.tanggal_lahir, body.tanggal_lahir);
        if (childErr) return NextResponse.json({ error: childErr }, { status: 400 });
      }
    }
    if (body.tanggal_lahir && body.mother_id) {
      const mother = getPersonById(db, body.mother_id);
      if (mother?.tanggal_lahir) {
        const childErr = validateChildAfterParent(mother.tanggal_lahir, body.tanggal_lahir);
        if (childErr) return NextResponse.json({ error: childErr }, { status: 400 });
      }
    }

    const id = crypto.randomUUID();
    // Cycle detection
    if (body.father_id && wouldCreateCycle(db, body.father_id, id)) {
      return NextResponse.json({ error: 'Tidak bisa menambahkan orang tua yang menyebabkan lingkaran silsilah' }, { status: 400 });
    }
    if (body.mother_id && wouldCreateCycle(db, body.mother_id, id)) {
      return NextResponse.json({ error: 'Tidak bisa menambahkan orang tua yang menyebabkan lingkaran silsilah' }, { status: 400 });
    }

    // --- Panduan Adat: marga diwariskan patrilineal (mengikuti marga ayah) ---
    // Jika marga anak kosong dan ayah diketahui, anak otomatis mengikuti marga ayah.
    if ((!body.marga_asal || !body.marga_asal.trim()) && body.father_id) {
      const father = getPersonById(db, body.father_id);
      const fatherMarga = (father?.marga_asal || '').trim();
      if (fatherMarga) {
        body.marga_asal = fatherMarga;
      }
    }

    const person = createPerson(db, { ...body, id, nomor_generasi });

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error('[api/persons POST]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /persons');
export const POST = withApiLogging(POSTHandler, 'POST /persons');
