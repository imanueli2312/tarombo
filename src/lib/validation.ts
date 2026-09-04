/**
 * Shared validation helpers for Data Quality
 */

/** Parse a date string (YYYY-MM-DD) and return a Date object, or null if invalid */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  // Reject invalid dates (NaN) and dates that don't match the input
  if (isNaN(d.getTime())) return null;
  // Ensure the date string is a valid ISO-like date (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return d;
}

/** Validate that tanggal_kematian >= tanggal_lahir */
export function validateDeathAfterBirth(tanggal_lahir: string | null | undefined, tanggal_kematian: string | null | undefined): string | null {
  if (!tanggal_lahir || !tanggal_kematian) return null;
  const birth = parseDate(tanggal_lahir);
  const death = parseDate(tanggal_kematian);
  if (!birth || !death) return null; // let other validators handle format
  if (death < birth) return 'Tanggal kematian tidak boleh sebelum tanggal lahir';
  return null;
}

/** Validate that marriage_date <= divorce_date */
export function validateDivorceAfterMarriage(marriage_date: string | null | undefined, divorce_date: string | null | undefined): string | null {
  if (!marriage_date || !divorce_date) return null;
  const marriage = parseDate(marriage_date);
  const divorce = parseDate(divorce_date);
  if (!marriage || !divorce) return null;
  if (divorce < marriage) return 'Tanggal cerai tidak boleh sebelum tanggal pernikahan';
  return null;
}

/** Validate that a date is not in the future */
export function validateNotFuture(value: string | null | undefined, fieldName: string): string | null {
  if (!value) return null;
  const d = parseDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d > today) return `${fieldName} tidak boleh di masa depan`;
  return null;
}

/** Validate burial latitude is within [-90, 90] */
export function validateLatitude(value: number | null | undefined): string | null {
  if (value == null) return null;
  if (value < -90 || value > 90) return 'Garis lintang harus antara -90 dan 90';
  return null;
}

/** Validate burial longitude is within [-180, 180] */
export function validateLongitude(value: number | null | undefined): string | null {
  if (value == null) return null;
  if (value < -180 || value > 180) return 'Garis bujur harus antara -180 dan 180';
  return null;
}

/** Validate that a child's birth date is after parent's birth date (min ~12 years gap) */
export function validateChildAfterParent(parentBirth: string | null | undefined, childBirth: string | null | undefined): string | null {
  if (!parentBirth || !childBirth) return null;
  const parent = parseDate(parentBirth);
  const child = parseDate(childBirth);
  if (!parent || !child) return null;
  // Child must be born at least 10 years after parent (biological minimum)
  const minChildAge = new Date(parent);
  minChildAge.setFullYear(minChildAge.getFullYear() + 10);
  if (child < minChildAge) return 'Tanggal lahir anak tidak wajar (terlalu dekat dengan tanggal lahir orang tua)';
  return null;
}

/** Sanitize a string for use in SQL LIKE patterns (escape % and _) */
export function sanitizeLikePattern(q: string): string {
  // Catatan: '\\%' (backslash literal) — BUKAN '\%' yang di JS dievaluasi
  // menjadi '%' polos. Bentuk lama secara diam-diam tidak meng-escape apa pun
  // (pencarian '%'/'_' cocok dengan semua baris); ditemukan oleh unit test
  // saat audit mendalam dan kini benar-benar di-escape.
  return q
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/** Field length limits */
export const FIELD_LIMITS: Record<string, { max: number; label: string }> = {
  nama: { max: 200, label: 'Nama' },
  nama_panggilan: { max: 100, label: 'Nama panggilan' },
  tempat_lahir: { max: 200, label: 'Tempat lahir' },
  alamat: { max: 1000, label: 'Alamat' },
  agama: { max: 50, label: 'Agama' },
  nomor_telepon: { max: 20, label: 'Nomor telepon' },
  photo: { max: 500, label: 'Foto' },
  burial_nama: { max: 200, label: 'Nama tempat pemakaman' },
  burial_alamat: { max: 500, label: 'Alamat pemakaman' },
  marga_asal: { max: 100, label: 'Marga asal' },
  tempat_asal: { max: 200, label: 'Tempat asal' },
  pendidikan: { max: 200, label: 'Pendidikan' },
  pekerjaan: { max: 200, label: 'Pekerjaan' },
  keterangan: { max: 2000, label: 'Keterangan' },
};

/** Validate a text field's length */
export function validateFieldLength(field: string, value: string | null | undefined): string | null {
  if (value == null) return null;
  const limit = FIELD_LIMITS[field];
  if (!limit) return null;
  if (value.length > limit.max) {
    return `${limit.label} tidak boleh lebih dari ${limit.max} karakter`;
  }
  return null;
}
