/**
 * Aturan Adat Pernikahan Batak — validasi berbasis data silsilah.
 *
 * Dipakai oleh API /api/partnerships untuk memastikan setiap pernikahan
 * yang dicatat sesuai Panduan Adat:
 * 1. Eksogami marga        — larangan menikah semarga.
 * 2. Saudara kandung       — satu ayah dan/atau satu ibu.
 * 3. Sepupu sejajar        — anak dari saudara sejenis (dongan sabutuha).
 * 4. Garis leluhur         — leluhur ↔ keturunan langsung.
 * 5. Pariban (informasi)   — sepupu silang adalah pola adat yang dianjurkan.
 */
import type { Person } from '@/types';
import { isSameMarga } from '@/lib/batak-culture';
import { getParentsOf, type SQLiteDatabase as Database } from '@/lib/db';

export interface AdatMarriageCheckResult {
  /** false jika ada pelanggaran adat yang bersifat memblokir */
  allowed: boolean;
  /** daftar pelanggaran adat (memblokir) */
  violations: string[];
  /** catatan/calon info (tidak memblokir) */
  notes: string[];
}

/** Cek apakah dua orang berbagi orang tua yang sama (saudara kandung) */
function shareParent(db: Database, aId: string, bId: string): boolean {
  const a = getParentsOf(db, aId);
  const b = getParentsOf(db, bId);
  const ids = new Set<string>();
  if (a.father) ids.add(a.father.id);
  if (a.mother) ids.add(a.mother.id);
  if (b.father && ids.has(b.father.id)) return true;
  if (b.mother && ids.has(b.mother.id)) return true;
  return false;
}

/** Kumpulkan semua leluhur (ayah/ibu ke atas) seseorang */
function collectAncestors(db: Database, personId: string, acc: Set<string> = new Set()): Set<string> {
  const { father, mother } = getParentsOf(db, personId);
  for (const parent of [father, mother]) {
    if (parent && !acc.has(parent.id)) {
      acc.add(parent.id);
      collectAncestors(db, parent.id, acc);
    }
  }
  return acc;
}

/** Cek apakah two orang adalah sepupu sejajar (orang tua mereka bersaudara sejenis) */
function areParallelCousins(db: Database, p1: Person, p2: Person): 'father' | 'mother' | null {
  const a = getParentsOf(db, p1.id);
  const b = getParentsOf(db, p2.id);

  // Sepupu sejajar dari pihak AYAH: ayah p1 & ayah p2 bersaudara (berbagi orang tua)
  if (a.father && b.father && a.father.id !== b.father.id) {
    if (shareParent(db, a.father.id, b.father.id)) return 'father';
  }
  // Sepupu sejajar dari pihak IBU: ibu p1 & ibu p2 bersaudara (berbagi orang tua)
  if (a.mother && b.mother && a.mother.id !== b.mother.id) {
    if (shareParent(db, a.mother.id, b.mother.id)) return 'mother';
  }
  return null;
}

/** Cek apakah two orang adalah sepupu silang (pariban) */
function areCrossCousins(db: Database, p1: Person, p2: Person): boolean {
  const a = getParentsOf(db, p1.id);
  const b = getParentsOf(db, p2.id);

  // Ayah p1 bersaudara dengan ibu p2 (saudara beda jenis = silang)
  if (a.father && b.mother && a.father.id !== b.mother.id && shareParent(db, a.father.id, b.mother.id)) return true;
  // Ibu p1 bersaudara dengan ayah p2
  if (a.mother && b.father && a.mother.id !== b.father.id && shareParent(db, a.mother.id, b.father.id)) return true;
  return false;
}

/**
 * Validasi pernikahan berdasarkan Panduan Adat Batak.
 * @param db instance database
 * @param p1 orang pertama
 * @param p2 orang kedua
 */
export function checkAdatMarriage(db: Database, p1: Person, p2: Person): AdatMarriageCheckResult {
  const violations: string[] = [];
  const notes: string[] = [];

  // --- 1. Eksogami marga: larangan menikah semarga ---
  const m1 = (p1.marga_asal || '').trim();
  const m2 = (p2.marga_asal || '').trim();
  if (m1 && m2) {
    if (isSameMarga(m1, m2)) {
      violations.push(
        `Adat Batak melarang pernikahan semarga (eksogami marga): ${p1.nama} dan ${p2.nama} sama-sama bermarga ${m1}.`,
      );
    }
  } else {
    notes.push(
      'Data marga belum lengkap pada salah satu orang — aturan eksogami marga belum dapat diverifikasi. Lengkapi kolom marga untuk kepastian adat.',
    );
  }

  // --- 2. Saudara kandung ---
  if (shareParent(db, p1.id, p2.id)) {
    violations.push(
      `${p1.nama} dan ${p2.nama} adalah saudara kandung (berbagi ayah dan/atau ibu) — pernikahan dilarang adat dan hukum.`,
    );
  }

  // --- 3. Sepupu sejajar (anak dari saudara sejenis = dongan sabutuha) ---
  const parallel = areParallelCousins(db, p1, p2);
  if (parallel && !shareParent(db, p1.id, p2.id)) {
    violations.push(
      `${p1.nama} dan ${p2.nama} adalah sepupu sejajar dari pihak ${parallel === 'father' ? 'ayah' : 'ibu'} (anak dari saudara sejenis) — dalam adat Batak mereka adalah dongan sabutuha dan tidak boleh menikah.`,
    );
  }

  // --- 4. Garis leluhur ↔ keturunan ---
  const ancestors1 = collectAncestors(db, p1.id);
  if (ancestors1.has(p2.id)) {
    violations.push(
      `${p2.nama} adalah leluhur langsung ${p1.nama} — pernikahan dalam garis leluhur dilarang.`,
    );
  }
  const ancestors2 = collectAncestors(db, p2.id);
  if (ancestors2.has(p1.id)) {
    violations.push(
      `${p1.nama} adalah leluhur langsung ${p2.nama} — pernikahan dalam garis leluhur dilarang.`,
    );
  }

  // --- 5. Pariban: informasi (tidak memblokir) ---
  if (areCrossCousins(db, p1, p2)) {
    notes.push(
      'Pernikahan pariban (sepupu silang) — pola adat yang dianjurkan karena memperkokoh Dalihan Na Tolu.',
    );
  }

  // --- 6. Hubungan tulang-boru yang sudah terjalin lewat pernikahan ---
  // Jika salah satu sudah menjadi pasangan saudara kandung pihak lain (menjadi boru/tulang
  // dalam keluarga), tetap boleh — adat mengatur pola ideal, bukan larangan.
  const parent1 = getParentsOf(db, p1.id);
  const parent2 = getParentsOf(db, p2.id);
  if (parent1.mother?.id && p2.id === parent1.mother?.id) {
    violations.push(`${p2.nama} adalah ibu dari ${p1.nama} — pernikahan dilarang.`);
  }
  if (parent2.mother?.id && p1.id === parent2.mother?.id) {
    violations.push(`${p1.nama} adalah ibu dari ${p2.nama} — pernikahan dilarang.`);
  }

  return { allowed: violations.length === 0, violations, notes };
}
