/**
 * Buku Marga — buku silsilah digital ala tarombo tradisional Batak.
 *
 * Keluarga Batak secara tradisional menyimpan tarombo dalam bentuk buku
 * silsilah cetak: daftar anggota marga yang dikelompokkan per generasi dan
 * diberi nomor hierarkis (jalur keturunan). Modul ini membangun representasi
 * digital buku tersebut langsung dari data silsilah:
 *
 * 1. Entri hanya memuat anggota garis marga yang dipilih (patrilineal —
 *    mengikuti marga ayah, sesuai adat).
 * 2. Penomoran hierarkis: anak bernomor "1.2" berarti anak kedua dari
 *    entri "1". Nomor urut anak mengikuti nomor urut kelahiran.
 * 3. Setiap generasi diberi label (mis. "Generasi I — Leluhur Marga") beserta
 *    statistik jumlah, jenis kelamin, dan status wafat.
 * 4. Pasangan (boru/doli dari marga lain) ditampilkan sebagai info pada entri,
 *    bukan sebagai anggota garis marga.
 */

import type { SQLiteDatabase as Database } from '@/lib/db';
import { getPersons, getPartnerships, getChildrenOf } from '@/lib/db';
import type { MargaBook, MargaBookEntry, MargaBookGeneration, Gender, MaritalStatus, Person } from '@/types';
import { MARGA_UTAMA, MARGA_BY_SUBGROUP, MARGA_SUBGROUP_LABELS, normalizeMarga } from '@/lib/batak-culture';

/** Angka Romawi untuk label generasi (1–30, di luar itu pakai angka biasa) */
export function romanNumeral(n: number): string {
  if (n < 1 || n > 30) return String(n);
  const table: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let rem = n;
  let out = '';
  while (rem > 0) {
    for (const [v, s] of table) {
      if (rem >= v) {
        out += s;
        rem -= v;
        break;
      }
    }
  }
  return out;
}

/** Cari sub-etnis sebuah marga dari katalog (null jika tidak dikenal) */
export function findSubetnis(marga: string): string | null {
  const norm = normalizeMarga(marga);
  if (!norm) return null;
  for (const [key, list] of Object.entries(MARGA_BY_SUBGROUP)) {
    for (const m of list) {
      if (normalizeMarga(m) === norm) return MARGA_SUBGROUP_LABELS[key] ?? key;
    }
  }
  return null;
}

/** Label generasi untuk buku marga */
function generationLabel(generasi: number, marga: string): string {
  if (generasi === 1) return `Generasi ${romanNumeral(generasi)} — Leluhur Marga ${marga}`;
  return `Generasi ${romanNumeral(generasi)}`;
}

/** Urutan entri: tanggal lahir (null di akhir), lalu nomor urut lahir, lalu nama */
function birthOrderKey(p: Person): string {
  const d = p.tanggal_lahir || '9999-12-31';
  const no = p.nomor_urut_lahir != null ? String(p.nomor_urut_lahir).padStart(4, '0') : '9999';
  return `${d}|${no}|${p.nama}`;
}

/**
 * Bangun Buku Marga untuk satu marga (default: marga dengan anggota terbanyak
 * di data, atau MARGA_UTAMA bila ada).
 */
export function buildMargaBook(db: Database, marga?: string): MargaBook {
  const persons = getPersons(db);

  // Pilih marga: parameter → marga terbesar → MARGA_UTAMA bila ada anggotanya
  const byNorm = new Map<string, Person[]>();
  for (const p of persons) {
    const n = normalizeMarga(p.marga_asal);
    if (!n) continue;
    const list = byNorm.get(n) || [];
    list.push(p);
    byNorm.set(n, list);
  }

  let targetNorm: string | null = null;
  let targetLabel = '';
  if (marga) {
    targetNorm = normalizeMarga(marga);
    const list = byNorm.get(targetNorm);
    if (list && list.length > 0) targetLabel = list[0].marga_asal;
  }
  if (!targetNorm || !targetLabel) {
    const utama = byNorm.get(normalizeMarga(MARGA_UTAMA));
    if (utama && utama.length > 0) {
      targetNorm = normalizeMarga(MARGA_UTAMA);
      targetLabel = utama[0].marga_asal;
    } else if (byNorm.size > 0) {
      // marga dengan anggota terbanyak
      let best: string | null = null;
      let bestLen = -1;
      for (const [n, list] of byNorm) {
        if (list.length > bestLen) {
          best = n;
          bestLen = list.length;
        }
      }
      targetNorm = best;
      targetLabel = byNorm.get(best!)![0].marga_asal;
    }
  }

  const empty: MargaBook = {
    marga: targetLabel || marga || MARGA_UTAMA,
    subetnis: findSubetrisSafe(targetLabel || marga || MARGA_UTAMA),
    total_anggota: 0,
    jumlah_generasi: 0,
    lahir_terawal: null,
    lahir_terakhir: null,
    generations: [],
  };
  if (!targetNorm || !targetLabel) return empty;

  const personMap = new Map(persons.map((p) => [p.id, p]));

  // Peta anak → ayah (garis patrilineal: penomoran hanya lewat ayah)
  const fatherOf = new Map<string, string>();
  const parentRows = db.prepare('SELECT parent_id, child_id FROM parent_child').all() as { parent_id: string; child_id: string }[];
  for (const pc of parentRows) {
    const parent = personMap.get(pc.parent_id);
    if (parent && parent.jenis_kelamin === 'L') fatherOf.set(pc.child_id, pc.parent_id);
  }

  // Peta ayah → anak (hanya anak garis marga yang sama)
  const childrenOfFather = new Map<string, Person[]>();
  for (const p of byNorm.get(targetNorm) || []) {
    const f = fatherOf.get(p.id);
    if (!f) continue;
    const list = childrenOfFather.get(f) || [];
    list.push(p);
    childrenOfFather.set(f, list);
  }
  for (const [, list] of childrenOfFather) list.sort((a, b) => birthOrderKey(a).localeCompare(birthOrderKey(b)));

  // Peta pasangan aktif
  const spouseMap = new Map<string, Person>();
  for (const ps of getPartnerships(db)) {
    if (ps.divorce_date) continue;
    const p1 = personMap.get(ps.person1_id);
    const p2 = personMap.get(ps.person2_id);
    if (!p1 || !p2) continue;
    spouseMap.set(p1.id, p2);
    spouseMap.set(p2.id, p1);
  }

  // Penomoran hierarkis + kumpulkan entri
  const entries: (MargaBookEntry & { _sort: string })[] = [];

  function buildEntry(p: Person, nomor: string) {
    const spouse = spouseMap.get(p.id) || null;
    entries.push({
      id: p.id,
      nomor_buku: nomor,
      nama: p.nama,
      nama_panggilan: p.nama_panggilan,
      jenis_kelamin: p.jenis_kelamin as Gender,
      marga: p.marga_asal,
      tanggal_lahir: p.tanggal_lahir,
      tempat_lahir: p.tempat_lahir,
      tanggal_kematian: p.tanggal_kematian,
      status_pernikahan: p.status_pernikahan as MaritalStatus,
      ayah_id: fatherOf.get(p.id) || null,
      ayah_nama: fatherOf.get(p.id) ? personMap.get(fatherOf.get(p.id)!)?.nama ?? null : null,
      pasangan: spouse
        ? { id: spouse.id, nama: spouse.nama, marga: spouse.marga_asal }
        : null,
      jumlah_anak: getChildrenOf(db, p.id).length,
      _sort: nomor,
    });
    const kids = childrenOfFather.get(p.id) || [];
    kids.forEach((kid, i) => buildEntry(kid, `${nomor}.${i + 1}`));
  }

  // Akar buku: anggota marga tanpa ayah, ATAU ayahnya bukan anggota marga
  // (tidak terjangkau lewat jalur penomoran — tetap harus tampil di buku).
  const roots = (byNorm.get(targetNorm) || [])
    .filter((p) => {
      const f = fatherOf.get(p.id);
      if (!f) return true;
      return normalizeMarga(personMap.get(f)?.marga_asal ?? '') !== targetNorm;
    })
    .sort((a, b) => birthOrderKey(a).localeCompare(birthOrderKey(b)));
  roots.forEach((root, i) => buildEntry(root, String(i + 1)));

  // Kelompokkan per generasi
  const byGen = new Map<number, (MargaBookEntry & { _sort: string })[]>();
  for (const e of entries) {
    const p = personMap.get(e.id);
    const g = p?.nomor_generasi ?? 1;
    const list = byGen.get(g) || [];
    list.push(e);
    byGen.set(g, list);
  }

  const generations: MargaBookGeneration[] = [];
  for (const g of Array.from(byGen.keys()).sort((a, b) => a - b)) {
    const list = (byGen.get(g) || []).sort((a, b) => a._sort.localeCompare(b._sort));
    generations.push({
      generasi: g,
      label: generationLabel(g, targetLabel),
      jumlah: list.length,
      jumlah_laki: list.filter((e) => e.jenis_kelamin === 'L').length,
      jumlah_perempuan: list.filter((e) => e.jenis_kelamin === 'P').length,
      jumlah_wafat: list.filter((e) => e.tanggal_kematian != null).length,
      entries: list.map(({ _sort, ...rest }) => rest),
    });
  }

  const allEntries = generations.flatMap((gen) => gen.entries);
  const lahir = allEntries.map((e) => e.tanggal_lahir).filter((d): d is string => !!d).sort();

  return {
    marga: targetLabel,
    subetnis: findSubetrisSafe(targetLabel),
    total_anggota: allEntries.length,
    jumlah_generasi: generations.length,
    lahir_terawal: lahir[0] ?? null,
    lahir_terakhir: lahir[lahir.length - 1] ?? null,
    generations,
  };
}

function findSubetrisSafe(marga: string): string | null {
  try {
    return findSubetnis(marga);
  } catch {
    return null;
  }
}

// ============================================================================
// EKSPOR BUKU MARGA — HTML siap cetak (print-to-PDF dari browser)
// ============================================================================

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtYear(d: string | null): string {
  if (!d) return '';
  return d.slice(0, 4);
}

/** Render Buku Marga menjadi dokumen HTML siap cetak */
export function renderMargaBookHtml(book: MargaBook): string {
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const genSections = book.generations
    .map((gen) => {
      const rows = gen.entries
        .map((e) => {
          const years = [fmtYear(e.tanggal_lahir), fmtYear(e.tanggal_kematian)]
            .filter(Boolean)
            .join(' – ');
          const pasangan = e.pasangan
            ? `<span class="sp">${esc(e.jenis_kelamin === 'L' ? 'Boru' : 'Doli')}: ${esc(e.pasangan.nama)}${e.pasangan.marga ? ` (${esc(e.pasangan.marga)})` : ''}</span>`
            : '';
          return `
        <tr>
          <td class="no">${esc(e.nomor_buku)}</td>
          <td class="nm">
            <span class="name">${esc(e.nama)}</span>
            ${e.tanggal_kematian ? '<span class="alm"> ✝</span>' : ''}
            ${pasangan}
            ${e.tempat_lahir ? `<span class="meta">Lahir: ${esc(e.tempat_lahir)}${years ? `, ${years}` : ''}</span>` : years ? `<span class="meta">${years}</span>` : ''}
            ${e.ayah_nama ? `<span class="meta">Anak dari: ${esc(e.ayah_nama)}</span>` : ''}
            ${e.jumlah_anak > 0 ? `<span class="meta">${e.jumlah_anak} anak</span>` : ''}
          </td>
        </tr>`;
        })
        .join('');

      return `
    <section class="gen">
      <h2>${esc(gen.label)}</h2>
      <p class="gensum">${gen.jumlah} anggota · ${gen.jumlah_laki} laki-laki · ${gen.jumlah_perempuan} perempuan${gen.jumlah_wafat > 0 ? ` · ${gen.jumlah_wafat} telah wafat` : ''}</p>
      <table>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
    })
    .join('');

  const periode =
    book.lahir_terawal && book.lahir_terakhir
      ? `${fmtYear(book.lahir_terawal)} – ${fmtYear(book.lahir_terakhir)}`
      : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Buku Marga ${esc(book.marga)}</title>
<style>
  :root { --ink: #1c1917; --muted: #78716c; --accent: #9a3412; --line: #e7e5e4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: var(--ink); background: #fafaf9; padding: 40px 24px; }
  .book { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid var(--line); padding: 48px 56px; }
  header.cover { text-align: center; border-bottom: 3px double var(--accent); padding-bottom: 28px; margin-bottom: 32px; }
  header.cover h1 { font-size: 30px; letter-spacing: 1px; }
  header.cover .sub { color: var(--muted); font-style: italic; margin-top: 8px; }
  header.cover .periode { color: var(--muted); margin-top: 4px; font-size: 13px; }
  .cover-stats { display: flex; justify-content: center; gap: 28px; margin-top: 18px; font-size: 13px; color: var(--muted); }
  .cover-stats b { color: var(--ink); font-size: 17px; display: block; }
  section.gen { margin-bottom: 30px; break-inside: avoid-page; }
  section.gen h2 { font-size: 17px; color: var(--accent); border-bottom: 1px solid var(--line); padding-bottom: 6px; margin-bottom: 4px; }
  p.gensum { font-size: 12px; color: var(--muted); margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  td { border-bottom: 1px solid var(--line); padding: 7px 10px 7px 0; vertical-align: top; font-size: 13.5px; }
  td.no { width: 64px; color: var(--accent); font-weight: bold; white-space: nowrap; }
  td.nm .name { font-weight: 600; }
  td.nm .alm { color: var(--muted); }
  td.nm .sp { display: block; font-size: 12px; color: #57534e; margin-top: 2px; }
  td.nm .meta { display: block; font-size: 11.5px; color: var(--muted); margin-top: 1px; }
  footer.print { text-align: center; color: var(--muted); font-size: 11px; margin-top: 36px; border-top: 1px solid var(--line); padding-top: 14px; }
  @media print {
    body { background: #fff; padding: 0; }
    .book { border: none; max-width: none; padding: 0; }
    td, section.gen h2 { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="book">
  <header class="cover">
    <h1>BUKU MARGA ${esc(book.marga.toUpperCase())}</h1>
    <p class="sub">Tarombo · Silsilah Keluarga Marga ${esc(book.marga)}</p>
    ${periode ? `<p class="periode">Rentang kelahiran anggota: ${periode}</p>` : ''}
    <div class="cover-stats">
      <div><b>${book.total_anggota}</b>Anggota</div>
      <div><b>${book.jumlah_generasi}</b>Generasi</div>
      ${book.subetnis ? `<div><b>${esc(book.subetnis)}</b>Sub-etnis</div>` : ''}
    </div>
  </header>
  ${genSections}
  <footer class="print">
    Hasangapon · Hagabeon · Hamoraon — dicetak dari aplikasi Tarombo pada ${esc(today)}
  </footer>
</div>
</body>
</html>`;
}
