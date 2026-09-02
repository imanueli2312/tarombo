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
  if (!/^\\d{4}-\d{2}-\d{2}\b$/.test(value)) return null;
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

/** Sanitize a string for use in SQL LIKE patterns (escape % and _) */
export function sanitizeLikePattern(q: string): string {
  return q
    .replace(/%/g, '\%')
    .replace(/_/g, '\_');
}
