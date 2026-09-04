/**
 * Transfer — ekspor/impor data silsilah & konversi format.
 *
 * Menutup celah transfer data yang krusial:
 * - TR-1: ekspor JSON lengkap (backup seluruh basis data silsilah).
 * - TR-2: impor JSON & CSV dengan validasi ketat, mode dry-run, transaksi atomik.
 * - TR-3: ekspor & impor GEDCOM 5.5.1 (standar pertukaran genealogi dunia).
 * - TR-6: hardening — batas ukuran payload, validasi seluruh kolom, cek siklus
 *   & monogami lintas data, strategi konflik ID (skip/overwrite).
 *
 * Semua penulisan dilakukan dalam SATU transaksi — kegagalan di tengah jalan
 * tidak meninggalkan data setengah-impor.
 */

import type { SQLiteDatabase as Database } from '@/lib/db';
import {
  getPersons, getPartnerships, getPersonById, createPerson, updatePerson,
  createPartnership, updatePartnership, createOralHistory, createPusakaItem,
} from '@/lib/db';
import type {
  TransferExportData, ImportReport, ImportResult, ImportIssue, ImportStrategy,
  Person, Partnership, OralHistory, PusakaItem, Gender, MaritalStatus,
} from '@/types';

export type { ImportStrategy };
import {
  parseDate, validateDeathAfterBirth, validateNotFuture, validateChildAfterParent,
  validateFieldLength,
} from '@/lib/validation';
import { isSameMarga, MARGA_UTAMA } from '@/lib/batak-culture';

// ============================================================================
// KONSTANTA HARDENING
// ============================================================================

/** Batas ukuran payload impor ( karakter string data) — 5 MB */
export const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
/** Batas jumlah entitas per impor */
export const MAX_IMPORT_ENTITIES = 10000;

const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

const MARITAL_STATUSES = ['belum_menikah', 'menikah', 'cerai', 'duda', 'janda'];
const ORAL_CATEGORIES = [
  'turian_asal_usul', 'turian_migrasi', 'turian_peristiwa', 'gondang', 'mangalahat',
  'saur_matua', 'pesta_pernikahan', 'turian_umum',
];
const PUSAKA_TYPES = [
  'tombak', 'ulos', 'tunggal_panaluan', 'gorga', 'gabe', 'hasangapon', 'rattan_box',
  'kalung_bulan', 'gutar_guar', 'tali_tiga', 'porhala', 'jamita',
  'sial_solam_sial_sao', 'lainnya',
];

// ============================================================================
// TIPE INTERNAL
// ============================================================================

export interface ImportPersonRow {
  id?: string;
  nama: string;
  nama_panggilan?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  tanggal_kematian?: string | null;
  nomor_urut_lahir?: number | null;
  jenis_kelamin: string;
  alamat?: string | null;
  agama?: string | null;
  nomor_telepon?: string | null;
  photo?: string | null;
  status_pernikahan?: string | null;
  nomor_generasi?: number | null;
  marga_asal?: string | null;
  tempat_asal?: string | null;
  pendidikan?: string | null;
  pekerjaan?: string | null;
  keterangan?: string | null;
  burial_nama?: string | null;
  burial_alamat?: string | null;
  burial_latitude?: number | null;
  burial_longitude?: number | null;
  father_id?: string | null;
  mother_id?: string | null;
  /** Khusus CSV: rujukan orang tua berdasarkan nama (best-effort) */
  father_nama?: string | null;
  mother_nama?: string | null;
}

export interface ImportPartnershipRow {
  id?: string;
  person1_id: string;
  person2_id: string;
  marriage_date?: string | null;
  divorce_date?: string | null;
}

export interface ImportParentChildRow {
  parent_id: string;
  child_id: string;
}

export interface ImportOralHistoryRow {
  id?: string;
  person_id: string;
  category: string;
  title: string;
  content?: string | null;
  source_person_name?: string | null;
  recorded_date?: string | null;
  is_verified?: boolean;
}

export interface ImportPusakaRow {
  id?: string;
  person_id: string;
  name: string;
  type: string;
  description?: string | null;
  origin?: string | null;
  image?: string | null;
  passed_from_person_id?: string | null;
  year_acquired?: string | null;
  is_sacred?: boolean;
}

export interface ImportPayload {
  persons: ImportPersonRow[];
  partnerships: ImportPartnershipRow[];
  parent_child: ImportParentChildRow[];
  oral_histories: ImportOralHistoryRow[];
  pusaka_items: ImportPusakaRow[];
}

// ============================================================================
// EKSPOR JSON (TR-1) — backup lengkap
// ============================================================================

export function exportAllData(db: Database): TransferExportData {
  const persons = getPersons(db);
  const partnerships = getPartnerships(db);
  const parent_child = db.prepare('SELECT id, parent_id, child_id FROM parent_child').all() as { id: string; parent_id: string; child_id: string }[];
  const oral_histories = db.prepare('SELECT * FROM oral_histories').all() as OralHistory[];
  const pusaka_items = db.prepare('SELECT * FROM pusaka_items').all() as PusakaItem[];

  return {
    format: 'tarombo-export',
    version: 2,
    exported_at: new Date().toISOString(),
    app: { nama: 'Tarombo', marga_utama: MARGA_UTAMA },
    counts: {
      persons: persons.length,
      partnerships: partnerships.length,
      parent_child: parent_child.length,
      oral_histories: oral_histories.length,
      pusaka_items: pusaka_items.length,
    },
    persons,
    partnerships,
    parent_child,
    oral_histories,
    pusaka_items,
  };
}

// ============================================================================
// EKSPOR GEDCOM 5.5.1 (TR-3)
// ============================================================================

const GEDCOM_MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function isoToGedcomDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const day = parseInt(m[3], 10);
  const monthAbbr = Object.entries(GEDCOM_MONTHS).find(([, v]) => v === m[2])?.[0];
  if (!monthAbbr) return m[1];
  const dayStr = day >= 1 && day <= 31 ? `${day} ` : '';
  return `${dayStr}${monthAbbr} ${m[1]}`.trim();
}

/** Nama GEDCOM: "Raja /Hariandja/" (marga sebagai nama keluarga) */
function toGedcomName(nama: string, marga: string): string {
  const n = nama.trim();
  const mg = marga.trim();
  if (mg && n.toLowerCase().endsWith(mg.toLowerCase())) {
    const given = n.slice(0, n.length - mg.length).trim();
    return `${given} /${mg}/`;
  }
  if (mg) return `${n} /${mg}/`;
  return n;
}

/** Ekspor seluruh silsilah ke GEDCOM 5.5.1 (INDI + FAM) */
export function toGedcom(db: Database): string {
  const persons = getPersons(db);
  const partnerships = getPartnerships(db);
  const parentChild = db.prepare('SELECT parent_id, child_id FROM parent_child').all() as { parent_id: string; child_id: string }[];

  const idToXref = new Map<string, string>();
  persons.forEach((p, i) => idToXref.set(p.id, `I${i + 1}`));

  // Anak per keluarga: kelompokkan child berdasarkan pasangan orang tuanya
  const childrenByParents = new Map<string, string[]>();
  for (const pc of parentChild) {
    const father = getPersonById(db, pc.parent_id)?.jenis_kelamin === 'L' ? pc.parent_id : null;
    const mother = getPersonById(db, pc.parent_id)?.jenis_kelamin === 'P' ? pc.parent_id : null;

    if (father) {
      const kids = childrenByParents.get(`f:${father}`) || [];
      kids.push(pc.child_id);
      childrenByParents.set(`f:${father}`, kids);
    }
    if (mother) {
      const kids = childrenByParents.get(`m:${mother}`) || [];
      kids.push(pc.child_id);
      childrenByParents.set(`m:${mother}`, kids);
    }
  }

  // FAM: partnership aktif & non-aktif (cerai tetap dicatat dengan DIV)
  const fams: { husb: string | null; wife: string | null; children: string[]; marriage: string | null; divorce: string | null }[] = [];
  partnerships.forEach((ps, i) => {
    const kids = new Set<string>([
      ...(childrenByParents.get(`f:${ps.person1_id}`) || []),
      ...(childrenByParents.get(`f:${ps.person2_id}`) || []),
      ...(childrenByParents.get(`m:${ps.person1_id}`) || []),
      ...(childrenByParents.get(`m:${ps.person2_id}`) || []),
    ]);
    fams.push({
      husb: getPersonById(db, ps.person1_id)?.jenis_kelamin === 'L' ? ps.person1_id
        : getPersonById(db, ps.person2_id)?.jenis_kelamin === 'L' ? ps.person2_id : null,
      wife: getPersonById(db, ps.person1_id)?.jenis_kelamin === 'P' ? ps.person1_id
        : getPersonById(db, ps.person2_id)?.jenis_kelamin === 'P' ? ps.person2_id : null,
      children: Array.from(kids),
      marriage: ps.marriage_date,
      divorce: ps.divorce_date,
    });
  });
  const famIndexById = (id: string) => fams.findIndex((f) => f.husb === id || f.wife === id);

  const lines: string[] = [];
  const now = new Date();
  const nowGed = `${now.getUTCDate()} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][now.getUTCMonth()]} ${now.getUTCFullYear()}`;

  lines.push('0 HEAD');
  lines.push('1 SOUR TAROMBO');
  lines.push('2 NAME Tarombo — Buku Silsilah Batak');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push(`1 DATE ${nowGed}`);

  for (const p of persons) {
    const xref = idToXref.get(p.id)!;
    lines.push(`0 @${xref}@ INDI`);
    lines.push(`1 NAME ${toGedcomName(p.nama, p.marga_asal)}`);
    lines.push(`1 SEX ${p.jenis_kelamin === 'L' ? 'M' : 'F'}`);
    if (p.tanggal_lahir || p.tempat_lahir) {
      lines.push('1 BIRT');
      const d = isoToGedcomDate(p.tanggal_lahir);
      if (d) lines.push(`2 DATE ${d}`);
      if (p.tempat_lahir) lines.push(`2 PLAC ${p.tempat_lahir}`);
    }
    if (p.tanggal_kematian) {
      lines.push('1 DEAT');
      const d = isoToGedcomDate(p.tanggal_kematian);
      if (d) lines.push(`2 DATE ${d}`);
    }
    const famIdx = famIndexById(p.id);
    if (famIdx >= 0) lines.push(`1 FAMS @F${famIdx + 1}@`);
    // FAMC: keluarga asal anak (keluarga pasangan orang tuanya)
    const asChild = parentChild.find((pc) => pc.child_id === p.id);
    if (asChild) {
      const parent = getPersonById(db, asChild.parent_id);
      if (parent) {
        const parentFamIdx = famIndexById(parent.id);
        if (parentFamIdx >= 0) lines.push(`1 FAMC @F${parentFamIdx + 1}@`);
      }
    }
  }

  fams.forEach((f, i) => {
    lines.push(`0 @F${i + 1}@ FAM`);
    if (f.husb) lines.push(`1 HUSB @${idToXref.get(f.husb)}@`);
    if (f.wife) lines.push(`1 WIFE @${idToXref.get(f.wife)}@`);
    for (const c of f.children) {
      const cx = idToXref.get(c);
      if (cx) lines.push(`1 CHIL @${cx}@`);
    }
    if (f.marriage) {
      lines.push('1 MARR');
      const d = isoToGedcomDate(f.marriage);
      if (d) lines.push(`2 DATE ${d}`);
    }
    if (f.divorce) {
      lines.push('1 DIV');
      const d = isoToGedcomDate(f.divorce);
      if (d) lines.push(`2 DATE ${d}`);
    }
  });

  lines.push('0 TRLR');
  return lines.join('\n') + '\n';
}

// ============================================================================
// PARSER CSV (TR-2) — tanpa dependensi eksternal
// ============================================================================

/** Parse CSV: dukung kutip ganda, koma dalam kutip, CRLF/CR/LF */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => {
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushField();
      pushRow();
    } else if (ch === '\r') {
      // CRLF: \r diikuti \n ditangani di \n; CR tunggal = akhir baris
      if (text[i + 1] !== '\n') { pushField(); pushRow(); }
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) { pushField(); pushRow(); }
  return rows;
}

const GENDER_CSV_MAP: Record<string, Gender> = {
  l: 'L', p: 'P', m: 'L', f: 'P',
  'laki-laki': 'L', laki: 'L', pria: 'L', lelaki: 'L', cowok: 'L',
  perempuan: 'P', wanita: 'P', betina: 'P', cewek: 'P',
};

const MARITAL_CSV_MAP: Record<string, MaritalStatus> = {
  'belum menikah': 'belum_menikah', lajang: 'belum_menikah', single: 'belum_menikah',
  menikah: 'menikah', kawin: 'menikah', married: 'menikah', menikahcerai: 'cerai',
  cerai: 'cerai', bercerai: 'cerai', divorced: 'cerai',
  duda: 'duda', janda: 'janda', widow: 'janda', widower: 'duda',
};

/** Normalisasi tanggal dari berbagai format umum → YYYY-MM-DD */
export function normalizeDateInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s); // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(s); // YYYY/MM/DD
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}

const CSV_FIELD_ALIASES: Record<string, string> = {
  id: 'id', nama: 'nama', name: 'nama', 'nama lengkap': 'nama',
  panggilan: 'nama_panggilan', 'nama panggilan': 'nama_panggilan', nickname: 'nama_panggilan',
  'jenis kelamin': 'jenis_kelamin', 'jenis_kelamin': 'jenis_kelamin', gender: 'jenis_kelamin', kelamin: 'jenis_kelamin', sex: 'jenis_kelamin',
  'tempat lahir': 'tempat_lahir', 'tempat_lahir': 'tempat_lahir',
  'tanggal lahir': 'tanggal_lahir', lahir: 'tanggal_lahir', 'tanggal_lahir': 'tanggal_lahir', birth: 'tanggal_lahir',
  'tanggal kematian': 'tanggal_kematian', 'tanggal_kematian': 'tanggal_kematian', wafat: 'tanggal_kematian', meninggal: 'tanggal_kematian',
  'nomor urut lahir': 'nomor_urut_lahir', urut: 'nomor_urut_lahir', 'anak ke': 'nomor_urut_lahir',
  marga: 'marga_asal', 'marga asal': 'marga_asal', 'marga_asal': 'marga_asal',
  'tempat asal': 'tempat_asal', 'tempat_asal': 'tempat_asal',
  alamat: 'alamat', address: 'alamat',
  agama: 'agama', religion: 'agama',
  'nomor telepon': 'nomor_telepon', telepon: 'nomor_telepon', 'no telepon': 'nomor_telepon', hp: 'nomor_telepon', phone: 'nomor_telepon',
  'status pernikahan': 'status_pernikahan', 'status_pernikahan': 'status_pernikahan', status: 'status_pernikahan',
  pendidikan: 'pendidikan', pekerjaan: 'pekerjaan', keterangan: 'keterangan', catatan: 'keterangan',
  'nama ayah': 'father_nama', 'nama_ayah': 'father_nama', ayah: 'father_nama', bapak: 'father_nama',
  'nama ibu': 'mother_nama', 'nama_ibu': 'mother_nama', ibu: 'mother_nama',
};

function toIntOrNull(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Konversi baris CSV menjadi payload impor persons.
 * Baris pertama harus header. Kolom tak dikenal diabaikan (warning).
 */
export function csvToPersonsPayload(text: string, issues: ImportIssue[]): ImportPayload {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    issues.push({ index: 0, entity: 'csv', message: 'File CSV kosong', severity: 'error' });
    return { persons: [], partnerships: [], parent_child: [], oral_histories: [], pusaka_items: [] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colMap = new Map<number, string>();
  header.forEach((h, i) => {
    const field = CSV_FIELD_ALIASES[h];
    if (field) colMap.set(i, field);
    else if (h) issues.push({ index: 0, entity: 'csv', field: h, message: `Kolom "${h}" tidak dikenali dan diabaikan`, severity: 'warning' });
  });

  if (!Array.from(colMap.values()).includes('nama')) {
    issues.push({ index: 0, entity: 'csv', message: 'CSV wajib memiliki kolom "nama" (baris header tidak ditemukan?)', severity: 'error' });
    return { persons: [], partnerships: [], parent_child: [], oral_histories: [], pusaka_items: [] };
  }

  const get = (row: string[], field: string): string => {
    for (const [i, f] of colMap) if (f === field) return (row[i] ?? '').trim();
    return '';
  };

  const persons: ImportPersonRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const nama = get(row, 'nama');
    if (!nama) {
      issues.push({ index: r, entity: 'person', message: `Baris ${r}: kolom nama kosong — baris dilewati`, severity: 'warning' });
      continue;
    }
    const jkRaw = get(row, 'jenis_kelamin').toLowerCase();
    const jenis_kelamin = GENDER_CSV_MAP[jkRaw] ?? null;
    if (!jenis_kelamin) {
      issues.push({ index: r, entity: 'person', field: 'jenis_kelamin', message: `Baris ${r}: jenis kelamin "${jkRaw || '(kosong)'}" tidak dikenali (harus L/P)`, severity: 'error' });
    }

    const statusRaw = get(row, 'status_pernikahan').toLowerCase();
    const status = statusRaw ? MARITAL_CSV_MAP[statusRaw] ?? null : 'belum_menikah';
    if (statusRaw && !status) {
      issues.push({ index: r, entity: 'person', field: 'status_pernikahan', message: `Baris ${r}: status pernikahan "${statusRaw}" tidak dikenali`, severity: 'warning' });
    }

    const tanggal_lahir = normalizeDateInput(get(row, 'tanggal_lahir')) || null;
    const tanggal_kematian = normalizeDateInput(get(row, 'tanggal_kematian')) || null;
    if (get(row, 'tanggal_lahir') && !tanggal_lahir) {
      issues.push({ index: r, entity: 'person', field: 'tanggal_lahir', message: `Baris ${r}: format tanggal lahir tidak valid (harus YYYY-MM-DD atau DD/MM/YYYY)`, severity: 'error' });
    }
    if (get(row, 'tanggal_kematian') && !tanggal_kematian) {
      issues.push({ index: r, entity: 'person', field: 'tanggal_kematian', message: `Baris ${r}: format tanggal kematian tidak valid`, severity: 'error' });
    }

    const p: ImportPersonRow = {
      nama,
      jenis_kelamin: jenis_kelamin ?? 'L',
      nama_panggilan: get(row, 'nama_panggilan') || null,
      tempat_lahir: get(row, 'tempat_lahir') || null,
      tanggal_lahir,
      tanggal_kematian,
      nomor_urut_lahir: toIntOrNull(get(row, 'nomor_urut_lahir')),
      alamat: get(row, 'alamat') || null,
      agama: get(row, 'agama') || null,
      nomor_telepon: get(row, 'nomor_telepon') || null,
      status_pernikahan: status ?? 'belum_menikah',
      marga_asal: get(row, 'marga_asal') || null,
      tempat_asal: get(row, 'tempat_asal') || null,
      pendidikan: get(row, 'pendidikan') || null,
      pekerjaan: get(row, 'pekerjaan') || null,
      keterangan: get(row, 'keterangan') || null,
      father_nama: get(row, 'father_nama') || null,
      mother_nama: get(row, 'mother_nama') || null,
    };
    const idRaw = get(row, 'id');
    if (idRaw) p.id = idRaw;
    persons.push(p);
  }

  return { persons, partnerships: [], parent_child: [], oral_histories: [], pusaka_items: [] };
}

// ============================================================================
// PARSER GEDCOM (TR-3) — impor dasar 5.5.1
// ============================================================================

/** Konversi tanggal GEDCOM ("15 JUN 1925", "ABT 1925") → ISO + presisi */
function gedcomDateToIso(raw: string): { iso: string | null; approx: boolean } {
  const s = raw.trim().replace(/^(ABT|EST|CAL|AFT|BEF)\s+/i, '');
  let m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(s);
  if (m) {
    const mm = GEDCOM_MONTHS[m[2].toUpperCase()];
    if (mm) return { iso: `${m[3]}-${mm}-${m[1].padStart(2, '0')}`, approx: false };
  }
  m = /^([A-Za-z]{3})\s+(\d{4})$/.exec(s);
  if (m) {
    const mm = GEDCOM_MONTHS[m[1].toUpperCase()];
    if (mm) return { iso: `${m[2]}-${mm}-01`, approx: true };
  }
  m = /^(\d{4})$/.exec(s);
  if (m) return { iso: `${m[1]}-01-01`, approx: true };
  return { iso: null, approx: false };
}

interface GedcomIndi {
  xref: string;
  nama: string;
  marga: string;
  sex: 'L' | 'P';
  birthIso: string | null;
  birthPlace: string | null;
  deathIso: string | null;
  fams: string[];
  famc: string[];
}

interface GedcomFam {
  xref: string;
  husb: string | null;
  wife: string | null;
  children: string[];
  marriageIso: string | null;
}

/**
 * Parse GEDCOM 5.5.1 dasar menjadi payload impor.
 * Mendukung INDI (NAME/SEX/BIRT/DEAT/FAMS/FAMC), FAM (HUSB/WIFE/CHIL/MARR).
 */
export function gedcomToPayload(text: string, issues: ImportIssue[]): ImportPayload {
  const lines = text.split(/\r\n|\r|\n/).map((l) => l.replace(/\t/g, ' '));
  const indis: GedcomIndi[] = [];
  const fams: GedcomFam[] = [];

  let curType: 'INDI' | 'FAM' | null = null;
  let curIndi: GedcomIndi | null = null;
  let curFam: GedcomFam | null = null;
  let inBirt = false;
  let inDeat = false;
  let inMarr = false;

  const parseXref = (v: string) => {
    const m = /^@([^@]+)@$/.exec(v.trim());
    return m ? m[1] : v.trim();
  };

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const m = /^(\d+)\s+(.+)$/.exec(rawLine.trim());
    if (!m) continue;
    const level = parseInt(m[1], 10);
    const rest = m[2].trim();

    if (level === 0) {
      inBirt = inDeat = inMarr = false;
      const rec = /^@([^@]+)@\s+(INDI|FAM)$/.exec(rest);
      if (rec) {
        if (rec[2] === 'INDI') {
          curIndi = { xref: rec[1], nama: '', marga: '', sex: 'L', birthIso: null, birthPlace: null, deathIso: null, fams: [], famc: [] };
          indis.push(curIndi);
          curType = 'INDI';
          curFam = null;
        } else {
          curFam = { xref: rec[1], husb: null, wife: null, children: [], marriageIso: null };
          fams.push(curFam);
          curType = 'FAM';
          curIndi = null;
        }
      } else {
        curType = null;
        curIndi = null;
        curFam = null;
      }
      continue;
    }

    // level >= 1: tag + value
    const tagMatch = /^([A-Za-z0-9_]+)\s*(.*)$/.exec(rest);
    if (!tagMatch) continue;
    const tag = tagMatch[1].toUpperCase();
    const value = tagMatch[2].trim();

    if (curType === 'INDI' && curIndi) {
      switch (tag) {
        case 'NAME': {
          const nm = /^([^/]*)\s*\/([^/]*)\/\s*(.*)$/.exec(value);
          if (nm) {
            curIndi.nama = `${nm[1].trim()} ${nm[2].trim()}`.trim();
            curIndi.marga = nm[2].trim();
          } else {
            curIndi.nama = value;
          }
          break;
        }
        case 'SEX':
          curIndi.sex = value.toUpperCase().startsWith('F') ? 'P' : 'L';
          break;
        case 'BIRT': inBirt = true; inDeat = false; break;
        case 'DEAT': inDeat = true; inBirt = false; if (!value) break; break;
        case 'FAMS': curIndi.fams.push(parseXref(value)); break;
        case 'FAMC': curIndi.famc.push(parseXref(value)); break;
        case 'DATE':
          if (inBirt) { curIndi.birthIso = gedcomDateToIso(value).iso; }
          else if (inDeat) { curIndi.deathIso = gedcomDateToIso(value).iso; }
          break;
        case 'PLAC':
          if (inBirt) curIndi.birthPlace = value;
          break;
        default:
          if (level === 1) { inBirt = false; inDeat = false; }
          break;
      }
    } else if (curType === 'FAM' && curFam) {
      switch (tag) {
        case 'HUSB': curFam.husb = parseXref(value); break;
        case 'WIFE': curFam.wife = parseXref(value); break;
        case 'CHIL': curFam.children.push(parseXref(value)); break;
        case 'MARR': inMarr = true; break;
        case 'DATE':
          if (inMarr) curFam.marriageIso = gedcomDateToIso(value).iso;
          break;
        default:
          if (level === 1) inMarr = false;
          break;
      }
    }
  }

  if (indis.length === 0) {
    issues.push({ index: 0, entity: 'gedcom', message: 'Tidak ada record INDI yang ditemukan di file GEDCOM', severity: 'error' });
    return { persons: [], partnerships: [], parent_child: [], oral_histories: [], pusaka_items: [] };
  }

  const xrefToId = new Map<string, string>();
  const persons: ImportPersonRow[] = indis.map((indi) => {
    const id = `g_${indi.xref.replace(/[^A-Za-z0-9_.-]/g, '_')}`;
    xrefToId.set(indi.xref, id);
    return {
      id,
      nama: indi.nama || `(Tanpa Nama) @${indi.xref}@`,
      jenis_kelamin: indi.sex,
      tanggal_lahir: indi.birthIso,
      tanggal_kematian: indi.deathIso,
      tempat_lahir: indi.birthPlace ?? null,
      marga_asal: indi.marga || null,
      status_pernikahan: 'belum_menikah',
    };
  });

  const partnerships: ImportPartnershipRow[] = [];
  const parent_child: ImportParentChildRow[] = [];
  for (const fam of fams) {
    const husbId = fam.husb ? xrefToId.get(fam.husb) : null;
    const wifeId = fam.wife ? xrefToId.get(fam.wife) : null;
    if (husbId && wifeId) {
      partnerships.push({ person1_id: husbId, person2_id: wifeId, marriage_date: fam.marriageIso ?? null });
    } else if (fam.husb || fam.wife) {
      issues.push({
        index: fams.indexOf(fam), entity: 'gedcom',
        message: `FAM @${fam.xref}@ hanya memiliki satu orang tua — data anak tetap diimpor`,
        severity: 'warning',
      });
    }
    for (const ch of fam.children) {
      const childId = xrefToId.get(ch);
      if (!childId) {
        issues.push({ index: fams.indexOf(fam), entity: 'gedcom', message: `Anak @${ch}@ pada FAM @${fam.xref}@ tidak memiliki record INDI`, severity: 'warning' });
        continue;
      }
      if (husbId) parent_child.push({ parent_id: husbId, child_id: childId });
      if (wifeId) parent_child.push({ parent_id: wifeId, child_id: childId });
    }
  }

  return { persons, partnerships, parent_child, oral_histories: [], pusaka_items: [] };
}

// ============================================================================
// NORMALISASI PAYLOAD JSON (TR-2)
// ============================================================================

/** Normalisasi payload dari ekspor JSON Tarombo (v2) atau struktur serupa */
export function normalizeJsonPayload(raw: unknown, issues: ImportIssue[]): ImportPayload {
  const empty: ImportPayload = { persons: [], partnerships: [], parent_child: [], oral_histories: [], pusaka_items: [] };
  if (typeof raw !== 'object' || raw === null) {
    issues.push({ index: 0, entity: 'json', message: 'Struktur JSON tidak valid (bukan objek)', severity: 'error' });
    return empty;
  }
  const obj = raw as unknown as Record<string, unknown>;

  if (obj.format === 'tarombo-export' && obj.version !== 2) {
    issues.push({ index: 0, entity: 'json', message: `Versi file ekspor ${String(obj.version)} tidak didukung (harus 2)`, severity: 'error' });
    return empty;
  }

  const asArray = (key: string): unknown[] => {
    const v = obj[key];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) {
      issues.push({ index: 0, entity: 'json', field: key, message: `Field "${key}" harus berupa array`, severity: 'error' });
      return [];
    }
    return v;
  };

  return {
    persons: asArray('persons') as unknown as ImportPersonRow[],
    partnerships: asArray('partnerships') as unknown as ImportPartnershipRow[],
    parent_child: asArray('parent_child') as unknown as ImportParentChildRow[],
    oral_histories: asArray('oral_histories') as unknown as ImportOralHistoryRow[],
    pusaka_items: asArray('pusaka_items') as unknown as ImportPusakaRow[],
  };
}

// ============================================================================
// VALIDASI IMPOR (TR-6) — ketat, lintas DB + payload
// ============================================================================

/** Data kerja hasil resolusi referensi (dipakai validate & apply) */
interface ResolvedPayload {
  persons: (ImportPersonRow & { _resolved_id: string; _father_id: string | null; _mother_id: string | null })[];
  partnerships: ImportPartnershipRow[];
  parent_child: ImportParentChildRow[];
  oral_histories: ImportOralHistoryRow[];
  pusaka_items: ImportPusakaRow[];
  idSet: Set<string>;        // semua id efektif (DB + payload)
  knownIds: Set<string>;     // id yang sudah ada di DB
  nameIndex: Map<string, string[]>; // nama (lowercase) → id efektif
}

function strField(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (v === undefined || v === null) return null;
  return String(v);
}

/** Validasi format & resolusi seluruh referensi payload */
function resolvePayload(db: Database, payload: ImportPayload, issues: ImportIssue[]): ResolvedPayload | null {
  const persons = payload.persons;
  const partnerships = payload.partnerships;
  const parent_child = payload.parent_child;
  const oral_histories = payload.oral_histories;
  const pusaka_items = payload.pusaka_items;

  // --- Batas jumlah entitas ---
  if (persons.length > MAX_IMPORT_ENTITIES || partnerships.length > MAX_IMPORT_ENTITIES) {
    issues.push({ index: 0, entity: 'payload', message: `Jumlah entitas melebihi batas ${MAX_IMPORT_ENTITIES}`, severity: 'error' });
    return null;
  }

  const knownIds = new Set<string>();
  const nameIndex = new Map<string, string[]>();
  for (const p of getPersons(db)) {
    knownIds.add(p.id);
    const key = (p.nama || '').trim().toLowerCase();
    if (key) nameIndex.set(key, [...(nameIndex.get(key) || []), p.id]);
  }

  // --- Validasi dasar persons & kumpulkan id payload ---
  const idSet = new Set(knownIds);
  const seenIds = new Set<string>();
  const validPersons: ResolvedPayload['persons'] = [];

  persons.forEach((raw, i) => {
    const row: ResolvedPayload['persons'][number] = {
      ...raw,
      _resolved_id: '',
      _father_id: null,
      _mother_id: null,
    };
    let ok = true;

    // nama
    const nama = (strField(row.nama) || '').trim();
    if (!nama) {
      issues.push({ index: i, entity: 'person', field: 'nama', message: `Person #${i + 1}: nama wajib diisi`, severity: 'error' });
      ok = false;
    }
    row.nama = nama;

    // id
    if (row.id != null) {
      const id = String(row.id).trim();
      if (!ID_PATTERN.test(id)) {
        issues.push({ index: i, entity: 'person', field: 'id', message: `Person #${i + 1}: id "${id.slice(0, 20)}" tidak valid (maks 64 karakter alfanumerik)`, severity: 'error' });
        ok = false;
      } else if (seenIds.has(id)) {
        issues.push({ index: i, entity: 'person', field: 'id', message: `Person #${i + 1}: id duplikat dalam file ("${id}")`, severity: 'error' });
        ok = false;
      }
      row.id = id;
    }
    row._resolved_id = (row.id as string) || crypto.randomUUID();

    // jenis kelamin
    const jk = String(row.jenis_kelamin ?? '').toUpperCase();
    if (jk !== 'L' && jk !== 'P') {
      issues.push({ index: i, entity: 'person', field: 'jenis_kelamin', message: `Person #${i + 1} (${nama}): jenis kelamin harus L atau P`, severity: 'error' });
      ok = false;
    }
    row.jenis_kelamin = jk || 'L';

    // status pernikahan
    const st = (strField(row.status_pernikahan) || 'belum_menikah').toLowerCase();
    if (!MARITAL_STATUSES.includes(st)) {
      issues.push({ index: i, entity: 'person', field: 'status_pernikahan', message: `Person #${i + 1} (${nama}): status pernikahan "${st}" tidak dikenali`, severity: 'warning' });
      row.status_pernikahan = 'belum_menikah';
    } else {
      row.status_pernikahan = st as MaritalStatus;
    }

    // tanggal
    const tglLahir = strField(row.tanggal_lahir);
    if (tglLahir) {
      if (!parseDate(tglLahir)) {
        issues.push({ index: i, entity: 'person', field: 'tanggal_lahir', message: `Person #${i + 1} (${nama}): format tanggal lahir harus YYYY-MM-DD`, severity: 'error' });
        ok = false;
      } else {
        row.tanggal_lahir = tglLahir.slice(0, 10);
        const err = validateNotFuture(row.tanggal_lahir, 'Tanggal lahir');
        if (err) { issues.push({ index: i, entity: 'person', field: 'tanggal_lahir', message: `Person #${i + 1} (${nama}): ${err}`, severity: 'error' }); ok = false; }
      }
    }
    const tglWafat = strField(row.tanggal_kematian);
    if (tglWafat) {
      if (!parseDate(tglWafat)) {
        issues.push({ index: i, entity: 'person', field: 'tanggal_kematian', message: `Person #${i + 1} (${nama}): format tanggal kematian harus YYYY-MM-DD`, severity: 'error' });
        ok = false;
      } else {
        row.tanggal_kematian = tglWafat.slice(0, 10);
        const err = validateDeathAfterBirth(row.tanggal_lahir, row.tanggal_kematian);
        if (err) { issues.push({ index: i, entity: 'person', field: 'tanggal_kematian', message: `Person #${i + 1} (${nama}): ${err}`, severity: 'error' }); ok = false; }
      }
    }

    // angka bulat
    for (const [field, label] of [['nomor_generasi', 'Nomor generasi'], ['nomor_urut_lahir', 'Nomor urut lahir']] as const) {
      const v = (row as unknown as Record<string, unknown>)[field];
      if (v != null && v !== '') {
        const n = typeof v === 'number' ? v : parseInt(String(v), 10);
        if (!Number.isInteger(n) || n < 1) {
          issues.push({ index: i, entity: 'person', field, message: `Person #${i + 1} (${nama}): ${label} harus bilangan bulat positif`, severity: 'error' });
          ok = false;
        } else {
          (row as unknown as Record<string, unknown>)[field] = n;
        }
      } else if (v === '') {
        (row as unknown as Record<string, unknown>)[field] = null;
      }
    }

    // panjang field teks
    for (const field of ['nama', 'nama_panggilan', 'tempat_lahir', 'alamat', 'agama', 'nomor_telepon', 'marga_asal', 'tempat_asal', 'pendidikan', 'pekerjaan', 'keterangan'] as const) {
      const err = validateFieldLength(field, strField((row as unknown as Record<string, unknown>)[field]));
      if (err) { issues.push({ index: i, entity: 'person', field, message: `Person #${i + 1} (${nama}): ${err}`, severity: 'error' }); ok = false; }
    }

    // koordinat makam
    const lat = (row as unknown as Record<string, unknown>).burial_latitude;
    if (lat != null && (typeof lat !== 'number' || lat < -90 || lat > 90)) {
      issues.push({ index: i, entity: 'person', field: 'burial_latitude', message: `Person #${i + 1} (${nama}): garis lintang harus antara -90 dan 90`, severity: 'error' });
      ok = false;
    }
    const lng = (row as unknown as Record<string, unknown>).burial_longitude;
    if (lng != null && (typeof lng !== 'number' || lng < -180 || lng > 180)) {
      issues.push({ index: i, entity: 'person', field: 'burial_longitude', message: `Person #${i + 1} (${nama}): garis bujur harus antara -180 dan 180`, severity: 'error' });
      ok = false;
    }

    if (ok) {
      seenIds.add(row._resolved_id);
      idSet.add(row._resolved_id);
      if (nama) nameIndex.set(nama.toLowerCase(), [...(nameIndex.get(nama.toLowerCase()) || []), row._resolved_id]);
      validPersons.push(row);
    }
  });

  // --- Resolusi orang tua: id langsung atau nama (CSV) ---
  const genderOfEffective = (id: string): 'L' | 'P' | null => {
    const inDb = getPersonById(db, id);
    if (inDb) return inDb.jenis_kelamin;
    const inPayload = validPersons.find((p) => p._resolved_id === id);
    return inPayload ? (String(inPayload.jenis_kelamin ?? 'L').toUpperCase() as 'L' | 'P') : null;
  };

  const resolveParent = (
    row: ImportPersonRow & { _resolved_id: string },
    rowIndex: number,
    key: 'father_id' | 'mother_id',
    namaKey: 'father_nama' | 'mother_nama',
    expectedGender: 'L' | 'P',
    label: string,
  ): string | null => {
    const direct = strField((row as unknown as Record<string, unknown>)[key]);
    if (direct) {
      if (!idSet.has(direct)) {
        issues.push({
          index: rowIndex, entity: 'person', field: key,
          message: `Person #${rowIndex + 1} (${row.nama}): ${label} dengan id "${direct.slice(0, 24)}" tidak ditemukan`,
          severity: 'error',
        });
        return null;
      }
      const g = genderOfEffective(direct);
      if (g && g !== expectedGender) {
        issues.push({
          index: rowIndex, entity: 'person', field: key,
          message: `Person #${rowIndex + 1} (${row.nama}): ${label} harus berjenis kelamin ${expectedGender === 'L' ? 'laki-laki' : 'perempuan'}`,
          severity: 'error',
        });
        return null;
      }
      return direct;
    }
    // Resolusi berdasarkan nama (CSV)
    const byName = (strField((row as unknown as Record<string, unknown>)[namaKey]) || '').trim();
    if (!byName) return null;
    const matches = nameIndex.get(byName.toLowerCase()) || [];
    if (matches.length === 0) {
      issues.push({
        index: rowIndex, entity: 'person', field: namaKey,
        message: `Person #${rowIndex + 1} (${row.nama}): ${label} bernama "${byName}" tidak ditemukan — hubungan orang tua dilewati`,
        severity: 'warning',
      });
      return null;
    }
    if (matches.length > 1) {
      issues.push({
        index: rowIndex, entity: 'person', field: namaKey,
        message: `Person #${rowIndex + 1} (${row.nama}): nama ${label} "${byName}" ambigu (${matches.length} orang) — hubungan orang tua dilewati`,
        severity: 'warning',
      });
      return null;
    }
    const id = matches[0];
    const g = genderOfEffective(id);
    if (g && g !== expectedGender) {
      issues.push({
        index: rowIndex, entity: 'person', field: namaKey,
        message: `Person #${rowIndex + 1} (${row.nama}): "${byName}" ditemukan tetapi bukan ${expectedGender === 'L' ? 'laki-laki' : 'perempuan'}`,
        severity: 'warning',
      });
      return null;
    }
    return id;
  };

  validPersons.forEach((row, vi) => {
    row._father_id = resolveParent(row, vi, 'father_id', 'father_nama', 'L', 'Ayah');
    row._mother_id = resolveParent(row, vi, 'mother_id', 'mother_nama', 'P', 'Ibu');

    // Tanggal anak vs orang tua
    if (row.tanggal_lahir) {
      const refs: [string | null, string][] = [
        [row._father_id, 'ayah'],
        [row._mother_id, 'ibu'],
      ];
      for (const [pid, label] of refs) {
        if (!pid) continue;
        const parent = getPersonById(db, pid) ?? validPersons.find((p) => p._resolved_id === pid);
        const pb = parent?.tanggal_lahir ?? null;
        const err = validateChildAfterParent(pb, row.tanggal_lahir);
        if (err) {
          issues.push({ index: vi, entity: 'person', message: `Person #${vi + 1} (${row.nama}): ${err} (${label})`, severity: 'error' });
        }
      }
    }
  });

  // --- Partnerships ---
  const validPartnerships: ImportPartnershipRow[] = [];
  partnerships.forEach((raw, i) => {
    const p1 = strField(raw.person1_id) || '';
    const p2 = strField(raw.person2_id) || '';
    if (!idSet.has(p1) || !idSet.has(p2)) {
      issues.push({ index: i, entity: 'partnership', message: `Pernikahan #${i + 1}: salah satu id tidak ditemukan (p1=${p1.slice(0, 12)}, p2=${p2.slice(0, 12)})`, severity: 'error' });
      return;
    }
    if (p1 === p2) {
      issues.push({ index: i, entity: 'partnership', message: `Pernikahan #${i + 1}: kedua id sama-sama "${p1.slice(0, 12)}"`, severity: 'error' });
      return;
    }
    if (raw.marriage_date) {
      if (!parseDate(raw.marriage_date)) {
        issues.push({ index: i, entity: 'partnership', field: 'marriage_date', message: `Pernikahan #${i + 1}: format tanggal pernikahan harus YYYY-MM-DD`, severity: 'error' });
        return;
      }
      const err = validateNotFuture(raw.marriage_date, 'Tanggal pernikahan');
      if (err) { issues.push({ index: i, entity: 'partnership', message: `Pernikahan #${i + 1}: ${err}`, severity: 'error' }); return; }
    }

    // Adat: eksogami marga
    const mOf = (id: string): string => {
      const dbp = getPersonById(db, id);
      if (dbp) return dbp.marga_asal || '';
      const plp = persons.find((p) => (p.id ?? '') === id);
      return (strField(plp?.marga_asal) || '').trim();
    };
    const m1 = mOf(p1);
    const m2 = mOf(p2);
    if (m1 && m2 && isSameMarga(m1, m2)) {
      issues.push({
        index: i, entity: 'partnership',
        message: `Pernikahan #${i + 1}: melanggar adat eksogami marga — kedua pasangan bermarga ${m1}`,
        severity: 'error',
      });
      return;
    } else if (!m1 || !m2) {
      issues.push({
        index: i, entity: 'partnership',
        message: `Pernikahan #${i + 1}: data marga belum lengkap — aturan eksogami belum dapat diverifikasi`,
        severity: 'warning',
      });
    }

    validPartnerships.push({ ...raw, person1_id: p1, person2_id: p2 });
  });

  // --- Monogami lintas DB + payload (pernikahan aktif) ---
  // Pernikahan pada payload yang id-nya sudah ada di DB adalah duplikat impor
  // (sudah dihitung dari DB) — jangan dihitung dua kali.
  const knownPartnershipIds = new Set(getPartnerships(db).map((p) => p.id));
  const activeCount = new Map<string, number>();
  for (const ps of getPartnerships(db)) {
    if (ps.divorce_date) continue;
    activeCount.set(ps.person1_id, (activeCount.get(ps.person1_id) || 0) + 1);
    activeCount.set(ps.person2_id, (activeCount.get(ps.person2_id) || 0) + 1);
  }
  validPartnerships.forEach((ps, i) => {
    if (ps.divorce_date) return; // pernikahan berakhir tidak dihitung aktif
    if (ps.id && knownPartnershipIds.has(ps.id)) return; // duplikat impor — sudah dihitung dari DB
    const c1 = (activeCount.get(ps.person1_id) || 0) + 1;
    const c2 = (activeCount.get(ps.person2_id) || 0) + 1;
    activeCount.set(ps.person1_id, c1);
    activeCount.set(ps.person2_id, c2);
    if (c1 > 1) {
      issues.push({ index: i, entity: 'partnership', message: `Pernikahan #${i + 1}: orang 1 sudah memiliki pasangan aktif lain (monogami)`, severity: 'error' });
    }
    if (c2 > 1) {
      issues.push({ index: i, entity: 'partnership', message: `Pernikahan #${i + 1}: orang 2 sudah memiliki pasangan aktif lain (monogami)`, severity: 'error' });
    }
  });

  // --- parent_child: eksistensi & siklus (gabungan DB + payload) ---
  const validParentChild: ImportParentChildRow[] = [];
  const combinedParents = new Map<string, Set<string>>();
  for (const pc of db.prepare('SELECT parent_id, child_id FROM parent_child').all() as { parent_id: string; child_id: string }[]) {
    if (!combinedParents.has(pc.child_id)) combinedParents.set(pc.child_id, new Set());
    combinedParents.get(pc.child_id)!.add(pc.parent_id);
  }
  parent_child.forEach((raw, i) => {
    const pid = strField(raw.parent_id) || '';
    const cid = strField(raw.child_id) || '';
    if (!idSet.has(pid) || !idSet.has(cid)) {
      issues.push({ index: i, entity: 'parent_child', message: `Relasi #${i + 1}: id orang tua/anak tidak ditemukan`, severity: 'error' });
      return;
    }
    if (pid === cid) {
      issues.push({ index: i, entity: 'parent_child', message: `Relasi #${i + 1}: orang tua dan anak tidak boleh orang yang sama`, severity: 'error' });
      return;
    }
    // Cegah siklus: berjalan ke ATAS dari pid; siklus terjadi hanya jika
    // kita MENCAPAI cid (calon anak) — kunjungan ulang node lain pada DAG
    // (banyak jalur ke leluhur yang sama) bukanlah siklus.
    const stack = [pid];
    const expanded = new Set<string>();
    let cycle = false;
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (cur === cid) { cycle = true; break; }
      if (expanded.has(cur)) continue;
      expanded.add(cur);
      for (const up of combinedParents.get(cur) || []) stack.push(up);
      // orang tua cur dalam payload (relasi father_id/mother_id yang valid)
      const inPayload = validPersons.find((p) => p._resolved_id === cur);
      if (inPayload) {
        for (const ref of [inPayload._father_id, inPayload._mother_id]) {
          if (ref && idSet.has(ref)) stack.push(ref);
        }
      }
    }
    if (cycle) {
      issues.push({ index: i, entity: 'parent_child', message: `Relasi #${i + 1}: akan membentuk lingkaran silsilah (siklus)`, severity: 'error' });
      return;
    }
    if (!combinedParents.has(cid)) combinedParents.set(cid, new Set());
    combinedParents.get(cid)!.add(pid);
    validParentChild.push({ parent_id: pid, child_id: cid });
  });

  // --- oral histories ---
  const validOral: ImportOralHistoryRow[] = [];
  oral_histories.forEach((raw, i) => {
    const pid = strField(raw.person_id) || '';
    if (!idSet.has(pid)) {
      issues.push({ index: i, entity: 'oral_history', message: `Turian #${i + 1}: person_id tidak ditemukan`, severity: 'error' });
      return;
    }
    const title = (strField(raw.title) || '').trim();
    if (!title) {
      issues.push({ index: i, entity: 'oral_history', field: 'title', message: `Turian #${i + 1}: judul wajib diisi`, severity: 'error' });
      return;
    }
    const category = (strField(raw.category) || 'turian_umum').toLowerCase();
    if (!ORAL_CATEGORIES.includes(category)) {
      issues.push({ index: i, entity: 'oral_history', field: 'category', message: `Turian #${i + 1}: kategori "${category.slice(0, 30)}" tidak dikenali`, severity: 'error' });
      return;
    }
    validOral.push({ ...raw, person_id: pid, title, category });
  });

  // --- pusaka ---
  const validPusaka: ImportPusakaRow[] = [];
  pusaka_items.forEach((raw, i) => {
    const pid = strField(raw.person_id) || '';
    if (!idSet.has(pid)) {
      issues.push({ index: i, entity: 'pusaka', message: `Pusaka #${i + 1}: person_id tidak ditemukan`, severity: 'error' });
      return;
    }
    const name = (strField(raw.name) || '').trim();
    if (!name) {
      issues.push({ index: i, entity: 'pusaka', field: 'name', message: `Pusaka #${i + 1}: nama wajib diisi`, severity: 'error' });
      return;
    }
    const type = (strField(raw.type) || 'lainnya').toLowerCase();
    if (!PUSAKA_TYPES.includes(type)) {
      issues.push({ index: i, entity: 'pusaka', field: 'type', message: `Pusaka #${i + 1}: jenis "${type.slice(0, 30)}" tidak dikenali`, severity: 'error' });
      return;
    }
    const year = strField(raw.year_acquired);
    if (year && !/^\d{4}$/.test(year.trim())) {
      issues.push({ index: i, entity: 'pusaka', field: 'year_acquired', message: `Pusaka #${i + 1}: tahun perolehan harus 4 digit`, severity: 'warning' });
      raw.year_acquired = null;
    }
    const pf = strField(raw.passed_from_person_id);
    if (pf && !idSet.has(pf)) {
      issues.push({ index: i, entity: 'pusaka', field: 'passed_from_person_id', message: `Pusaka #${i + 1}: asal pewarisan tidak ditemukan — kolom diabaikan`, severity: 'warning' });
      raw.passed_from_person_id = null;
    }
    validPusaka.push({ ...raw, person_id: pid, name, type });
  });

  return {
    persons: validPersons as ResolvedPayload['persons'],
    partnerships: validPartnerships,
    parent_child: validParentChild,
    oral_histories: validOral,
    pusaka_items: validPusaka,
    idSet,
    knownIds,
    nameIndex,
  };
}

/** Validasi impor tanpa menulis apa pun (mode dry-run / "validate") */
export function validateImport(db: Database, payload: ImportPayload): ImportReport {
  const issues: ImportIssue[] = [];
  const resolved = resolvePayload(db, payload, issues);
  const persons = resolved?.persons ?? [];
  const dup = persons.filter((p) => resolved?.knownIds.has(p._resolved_id)).length;

  // Adat patrilineal: anak dengan marga berbeda dari ayah → peringatan
  if (resolved) {
    for (const p of persons) {
      if (p._father_id && (strField(p.marga_asal) || '').trim()) {
        const father = getPersonById(db, p._father_id) ?? persons.find((x) => x._resolved_id === p._father_id);
        const fm = (strField((father as unknown as Record<string, unknown>)?.marga_asal) || '').trim();
        const cm = (strField(p.marga_asal) || '').trim();
        if (fm && cm && !isSameMarga(fm, cm)) {
          issues.push({
            index: persons.indexOf(p), entity: 'person', field: 'marga_asal',
            message: `Person #${persons.indexOf(p) + 1} (${p.nama}): marga "${cm}" berbeda dari marga ayah "${fm}" — menurut adat marga mengikuti ayah (patrilineal)`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return {
    ok: !issues.some((x) => x.severity === 'error'),
    summary: {
      persons: payload.persons.length,
      partnerships: payload.partnerships.length,
      parent_child: payload.parent_child.length,
      oral_histories: payload.oral_histories.length,
      pusaka_items: payload.pusaka_items.length,
      persons_baru: persons.length - dup,
      persons_duplikat: dup,
    },
    issues,
  };
}

// ============================================================================
// PENERAPAN IMPOR (TR-2) — satu transaksi atomik
// ============================================================================

export function applyImport(db: Database, payload: ImportPayload, strategy: ImportStrategy): ImportResult {
  const issues: ImportIssue[] = [];
  const resolved = resolvePayload(db, payload, issues);
  if (!resolved || issues.some((x) => x.severity === 'error')) {
    return {
      ok: false,
      applied: false,
      inserted: { persons: 0, partnerships: 0, parent_child: 0, oral_histories: 0, pusaka_items: 0 },
      updated: { persons: 0 },
      skipped: { persons: 0, partnerships: 0, parent_child: 0, oral_histories: 0, pusaka_items: 0 },
      summary: {
        persons: payload.persons.length,
        partnerships: payload.partnerships.length,
        parent_child: payload.parent_child.length,
        oral_histories: payload.oral_histories.length,
        pusaka_items: payload.pusaka_items.length,
        persons_baru: 0,
        persons_duplikat: 0,
      },
      issues,
    };
  }

  const inserted = { persons: 0, partnerships: 0, parent_child: 0, oral_histories: 0, pusaka_items: 0 };
  const updated = { persons: 0 };
  const skipped = { persons: 0, partnerships: 0, parent_child: 0, oral_histories: 0, pusaka_items: 0 };

  const tx = db.transaction(() => {
    // --- persons ---
    for (const row of resolved.persons) {
      const id = row._resolved_id;
      const exists = resolved.knownIds.has(id);

      // Adat patrilineal: marga kosong → ikut marga ayah
      let marga = strField(row.marga_asal) || '';
      if (!marga.trim() && row._father_id) {
        const father = getPersonById(db, row._father_id);
        if (father?.marga_asal) marga = father.marga_asal;
      }

      // Generasi: dari file bila valid, selain itu dari ayah + 1
      const genRaw = (row as unknown as Record<string, unknown>).nomor_generasi;
      let generasi: number | null = null;
      if (typeof genRaw === 'number' && Number.isInteger(genRaw) && genRaw >= 1) generasi = genRaw;
      if (generasi == null && row._father_id) {
        const father = getPersonById(db, row._father_id);
        if (father) generasi = father.nomor_generasi + 1;
      }

      const fields = {
        nama: row.nama,
        nama_panggilan: strField(row.nama_panggilan) ?? '',
        tempat_lahir: strField(row.tempat_lahir) ?? '',
        tanggal_lahir: row.tanggal_lahir ?? null,
        tanggal_kematian: row.tanggal_kematian ?? null,
        nomor_urut_lahir: (row as unknown as Record<string, unknown>).nomor_urut_lahir as number | null ?? null,
        jenis_kelamin: row.jenis_kelamin as Gender,
        alamat: strField(row.alamat) ?? '',
        agama: strField(row.agama) ?? '',
        nomor_telepon: strField(row.nomor_telepon) ?? '',
        photo: strField(row.photo) ?? null,
        status_pernikahan: (row.status_pernikahan ?? 'belum_menikah') as MaritalStatus,
        nomor_generasi: generasi ?? 1,
        burial_nama: strField(row.burial_nama) ?? null,
        burial_alamat: strField(row.burial_alamat) ?? null,
        burial_latitude: (row as unknown as Record<string, unknown>).burial_latitude as number | null ?? null,
        burial_longitude: (row as unknown as Record<string, unknown>).burial_longitude as number | null ?? null,
        marga_asal: marga,
        tempat_asal: strField(row.tempat_asal) ?? '',
        pendidikan: strField(row.pendidikan) ?? '',
        pekerjaan: strField(row.pekerjaan) ?? '',
        keterangan: strField(row.keterangan) ?? '',
        father_id: row._father_id || undefined,
        mother_id: row._mother_id || undefined,
      };

      if (exists) {
        if (strategy === 'skip') {
          skipped.persons++;
        } else {
          updatePerson(db, id, fields);
          updated.persons++;
        }
      } else {
        createPerson(db, { ...fields, id });
        inserted.persons++;
      }
    }

    // --- partnerships ---
    for (const ps of resolved.partnerships) {
      if (ps.id && ID_PATTERN.test(ps.id)) {
        const exists = db.prepare('SELECT id FROM partnerships WHERE id = ?').get(ps.id);
        if (exists) {
          if (strategy === 'skip') { skipped.partnerships++; continue; }
          const sets: string[] = [];
          const vals: (string | null)[] = [];
          if (ps.marriage_date != null) { sets.push('marriage_date = ?'); vals.push(ps.marriage_date); }
          if (ps.divorce_date != null) { sets.push('divorce_date = ?'); vals.push(ps.divorce_date); }
          if (sets.length > 0) {
            db.prepare(`UPDATE partnerships SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`)
              .run(...vals, ps.id);
          }
          continue;
        }
      }
      try {
        const newId = ps.id && ID_PATTERN.test(ps.id) ? ps.id : crypto.randomUUID();
        createPartnership(db, {
          id: newId,
          person1_id: ps.person1_id,
          person2_id: ps.person2_id,
          marriage_date: ps.marriage_date ?? null,
        });
        // Pernikahan berakhir (cerai): kembalikan status pasangan via updatePartnership
        if (ps.divorce_date) {
          updatePartnership(db, newId, { divorce_date: ps.divorce_date });
        }
        inserted.partnerships++;
      } catch (err) {
        throw new Error(`Pernikahan ${ps.person1_id} ↔ ${ps.person2_id}: ${err instanceof Error ? err.message : 'gagal'}`);
      }
    }

    // --- parent_child ---
    const insPc = db.prepare('INSERT OR IGNORE INTO parent_child (id, parent_id, child_id) VALUES (?, ?, ?)');
    for (const pc of resolved.parent_child) {
      const existing = db.prepare('SELECT id FROM parent_child WHERE parent_id = ? AND child_id = ?').get(pc.parent_id, pc.child_id);
      if (existing) { skipped.parent_child++; continue; }
      insPc.run(crypto.randomUUID(), pc.parent_id, pc.child_id);
      inserted.parent_child++;
    }

    // --- oral histories ---
    for (const oh of resolved.oral_histories) {
      if (oh.id && ID_PATTERN.test(oh.id)) {
        const exists = db.prepare('SELECT id FROM oral_histories WHERE id = ?').get(oh.id);
        if (exists) {
          if (strategy === 'skip') { skipped.oral_histories++; continue; }
          db.prepare(`UPDATE oral_histories SET person_id = ?, category = ?, title = ?, content = ?, source_person_name = ?, recorded_date = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(oh.person_id, oh.category, oh.title, strField(oh.content) ?? '', strField(oh.source_person_name) ?? '', oh.recorded_date ?? null, oh.id);
          continue;
        }
        createOralHistory(db, {
          id: oh.id,
          person_id: oh.person_id,
          category: oh.category as OralHistory['category'],
          title: oh.title,
          content: strField(oh.content) ?? '',
          source_person_name: strField(oh.source_person_name) ?? '',
          recorded_date: oh.recorded_date ?? null,
          is_verified: !!oh.is_verified,
        });
        inserted.oral_histories++;
      } else {
        createOralHistory(db, {
          id: crypto.randomUUID(),
          person_id: oh.person_id,
          category: oh.category as OralHistory['category'],
          title: oh.title,
          content: strField(oh.content) ?? '',
          source_person_name: strField(oh.source_person_name) ?? '',
          recorded_date: oh.recorded_date ?? null,
          is_verified: !!oh.is_verified,
        });
        inserted.oral_histories++;
      }
    }

    // --- pusaka ---
    for (const pu of resolved.pusaka_items) {
      if (pu.id && ID_PATTERN.test(pu.id)) {
        const exists = db.prepare('SELECT id FROM pusaka_items WHERE id = ?').get(pu.id);
        if (exists) {
          if (strategy === 'skip') { skipped.pusaka_items++; continue; }
          db.prepare(`UPDATE pusaka_items SET person_id = ?, name = ?, type = ?, description = ?, origin = ?, year_acquired = ?, is_sacred = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(pu.person_id, pu.name, pu.type, strField(pu.description) ?? '', strField(pu.origin) ?? '', pu.year_acquired?.trim() || null, pu.is_sacred ? 1 : 0, pu.id);
          continue;
        }
        createPusakaItem(db, {
          id: pu.id,
          person_id: pu.person_id,
          name: pu.name,
          type: pu.type as PusakaItem['type'],
          description: strField(pu.description) ?? '',
          origin: strField(pu.origin) ?? '',
          image: strField(pu.image) ?? null,
          passed_from_person_id: pu.passed_from_person_id ?? null,
          year_acquired: pu.year_acquired?.trim() || null,
          is_sacred: !!pu.is_sacred,
        });
        inserted.pusaka_items++;
      } else {
        createPusakaItem(db, {
          id: crypto.randomUUID(),
          person_id: pu.person_id,
          name: pu.name,
          type: pu.type as PusakaItem['type'],
          description: strField(pu.description) ?? '',
          origin: strField(pu.origin) ?? '',
          image: strField(pu.image) ?? null,
          passed_from_person_id: pu.passed_from_person_id ?? null,
          year_acquired: pu.year_acquired?.trim() || null,
          is_sacred: !!pu.is_sacred,
        });
        inserted.pusaka_items++;
      }
    }
  });
  tx();

  return {
    ok: true,
    applied: true,
    inserted,
    updated,
    skipped,
    summary: {
      persons: payload.persons.length,
      partnerships: payload.partnerships.length,
      parent_child: payload.parent_child.length,
      oral_histories: payload.oral_histories.length,
      pusaka_items: payload.pusaka_items.length,
      persons_baru: inserted.persons,
      persons_duplikat: skipped.persons + updated.persons,
    },
    issues,
  };
}
