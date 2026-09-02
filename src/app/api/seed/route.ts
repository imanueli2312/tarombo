import { NextResponse } from 'next/server';
import { getDb, getUsers, getUserByEmail, createUser, createPerson, getPersons } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    const db = getDb();

    // Seed admin user if none exists
    const users = getUsers(db);
    if (users.length === 0) {
      const password_hash = await hashPassword('admin123');
      createUser(db, {
        id: crypto.randomUUID(),
        email: 'admin@tarombo.local',
        password: 'admin123',
        password_hash,
        name: 'Administrator',
        role: 'admin',
      });
    }

    // Seed root ancestor if no persons exist
    const persons = getPersons(db);
    if (persons.length === 0) {
      createPerson(db, {
        id: crypto.randomUUID(),
        nama: 'Raja Hariandja',
        nama_panggilan: 'Raja',
        jenis_kelamin: 'L',
        nomor_generasi: 1,
        tempat_lahir: '',
        alamat: '',
        agama: '',
        nomor_telepon: '',
        status_pernikahan: 'belum_menikah',
      });
    }

    return NextResponse.json({ seeded: true, message: 'Data awal berhasil dibuat' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
