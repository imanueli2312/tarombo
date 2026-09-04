import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUsers, createUser, createPerson, getPersons } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { consumeRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Bootstrap data awal (admin pertama + leluhur akar).
 *
 * Hardening:
 * - Hanya berjalan jika belum ada user sama sekali (idempotent, tidak menimpa).
 * - Password admin diambil dari SEED_ADMIN_PASSWORD. Di produksi, tanpa env
 *   tersebut seeding user DITOLAK. Di development memakai default 'admin123'
 *   + peringatan untuk segera diganti.
 * - Rate-limited agar endpoint tidak bisa dihammer.
 */
async function POSTHandler(request: NextRequest) {
  try {
    const rl = consumeRateLimit(`seed:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
      blockMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });
    }

    const db = getDb();

    // Seed admin user if none exists
    const users = getUsers(db);
    if (users.length === 0) {
      const isProduction = process.env.NODE_ENV === 'production';
      const password = process.env.SEED_ADMIN_PASSWORD;

      if (isProduction && (!password || password.length < 8)) {
        return NextResponse.json(
          {
            error:
              'SEED_ADMIN_PASSWORD wajib diset (minimal 8 karakter) sebelum membuat admin pertama di produksi.',
          },
          { status: 500 },
        );
      }

      const finalPassword = password || 'admin123';
      if (!password) {
        console.warn(
          '[tarombo] Admin pertama dibuat dengan password default (dev). ' +
          'Set SEED_ADMIN_PASSWORD dan segera ganti password setelah login.',
        );
      }

      const password_hash = await hashPassword(finalPassword);
      createUser(db, {
        id: crypto.randomUUID(),
        email: process.env.SEED_ADMIN_EMAIL || 'admin@tarombo.local',
        password: finalPassword,
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
    console.error('[api/seed]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const POST = withApiLogging(POSTHandler, 'POST /seed');
