import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPersonById, updatePerson, deletePerson, hasPermission, getParentsOf, getChildrenOf, getActiveSpouseOf } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import type { PersonUpdate } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const person = getPersonById(db, id);

    if (!person) {
      return NextResponse.json({ error: 'Orang tidak ditemukan' }, { status: 404 });
    }

    const parents = getParentsOf(db, id);
    const children = getChildrenOf(db, id);
    const spouse = getActiveSpouseOf(db, id);

    return NextResponse.json({ ...person, parents, children, spouse });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
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

    const person = updatePerson(db, id, body);

    return NextResponse.json(person);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
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
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
