import { NextResponse } from 'next/server';
import { getDb, getPersons } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const persons = getPersons(db);

    // Total counts
    const totalPersons = persons.length;
    const totalMale = persons.filter((p) => p.jenis_kelamin === 'L').length;
    const totalFemale = persons.filter((p) => p.jenis_kelamin === 'P').length;
    const totalDeceased = persons.filter((p) => !!p.tanggal_kematian).length;
    const totalLiving = totalPersons - totalDeceased;
    const totalPartnerships = db
      .prepare('SELECT COUNT(*) as c FROM partnerships')
      .get() as { c: number };
    const activePartnerships = db
      .prepare('SELECT COUNT(*) as c FROM partnerships WHERE divorce_date IS NULL')
      .get() as { c: number };

    // Generation distribution
    const genRows = db
      .prepare(
        'SELECT nomor_generasi, COUNT(*) as count, SUM(CASE WHEN jenis_kelamin = \'L\' THEN 1 ELSE 0 END) as male, SUM(CASE WHEN jenis_kelamin = \'P\' THEN 1 ELSE 0 END) as female FROM persons GROUP BY nomor_generasi ORDER BY nomor_generasi'
      )
      .all() as { nomor_generasi: number; count: number; male: number; female: number }[];

    const generationDistribution = genRows.map((r) => ({
      generasi: `Gen ${r.nomor_generasi}`,
      jumlah: r.count,
      lakiLaki: r.male,
      perempuan: r.female,
    }));

    // Marital status distribution
    const maritalRows = db
      .prepare(
        'SELECT status_pernikahan, COUNT(*) as count FROM persons GROUP BY status_pernikahan ORDER BY count DESC'
      )
      .all() as { status_pernikahan: string; count: number }[];

    const MARITAL_LABELS: Record<string, string> = {
      belum_menikah: 'Belum Menikah',
      menikah: 'Menikah',
      cerai: 'Cerai',
      duda: 'Duda',
      janda: 'Janda',
    };

    const maritalDistribution = maritalRows.map((r) => ({
      status: MARITAL_LABELS[r.status_pernikahan] || r.status_pernikahan,
      jumlah: r.count,
    }));

    // Age distribution (decades for living persons)
    const now = new Date();
    const ageGroups: Record<string, number> = {};
    for (const p of persons) {
      if (!p.tanggal_lahir || p.tanggal_kematian) continue;
      const birth = new Date(p.tanggal_lahir);
      const age = Math.floor(
        (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      const decade = Math.floor(age / 10) * 10;
      const label = age < 0 ? '< 0' : age >= 100 ? '100+' : `${decade}-${decade + 9}`;
      ageGroups[label] = (ageGroups[label] || 0) + 1;
    }
    const ageDistribution = Object.entries(ageGroups)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([range, jumlah]) => ({ range, jumlah }));

    // Oldest living person
    const livingPersonsWithBirth = persons
      .filter((p) => p.tanggal_lahir && !p.tanggal_kematian)
      .sort(
        (a, b) =>
          new Date(a.tanggal_lahir).getTime() - new Date(b.tanggal_lahir).getTime()
      );

    const oldestLiving = livingPersonsWithBirth[0] || null;

    // Youngest member
    const allWithBirth = persons
      .filter((p) => p.tanggal_lahir)
      .sort(
        (a, b) =>
          new Date(b.tanggal_lahir).getTime() - new Date(a.tanggal_lahir).getTime()
      );

    const youngest = allWithBirth[0] || null;

    // Deepest generation
    const maxGen = genRows.length > 0 ? genRows[genRows.length - 1].nomor_generasi : 0;

    return NextResponse.json({
      summary: {
        totalPersons,
        totalMale,
        totalFemale,
        totalDeceased,
        totalLiving,
        totalPartnerships: totalPartnerships.c,
        activePartnerships: activePartnerships.c,
        deepestGeneration: maxGen,
      },
      oldestLiving: oldestLiving
        ? {
            nama: oldestLiving.nama_panggilan || oldestLiving.nama,
            tanggal_lahir: oldestLiving.tanggal_lahir,
          }
        : null,
      youngest: youngest
        ? {
            nama: youngest.nama_panggilan || youngest.nama,
            tanggal_lahir: youngest.tanggal_lahir,
          }
        : null,
      generationDistribution,
      maritalDistribution,
      ageDistribution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
