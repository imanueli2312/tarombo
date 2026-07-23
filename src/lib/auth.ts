// Client-safe auth utilities (no server-only imports)
import { createHash } from 'crypto';

// Password hashing
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return createHash('sha256').update(password).digest('hex') === hash;
}

// Compute derived fields
export function getGender(genderId: number, locale: string = 'en'): string {
  if (locale === 'ur') return genderId === 1 ? 'م' : 'ع';
  if (locale === 'id') return genderId === 1 ? 'L' : 'P';
  return genderId === 1 ? 'M' : 'F';
}

export function getGenderFull(genderId: number): string {
  return genderId === 1 ? 'Laki-laki' : 'Perempuan';
}

export function computeAge(user: { dob?: string | null; dod?: string | null; yob?: string | null; yod?: string | null }): { years: number; detail: string } | null {
  const dob = user.dob ? new Date(user.dob) : user.yob ? new Date(`${user.yob}-06-01`) : null;
  if (!dob) return null;

  const dod = user.dod ? new Date(user.dod) : user.yod ? new Date(`${user.yod}-06-01`) : null;
  const end = dod || new Date();

  const years = end.getFullYear() - dob.getFullYear();
  const months = end.getMonth() - dob.getMonth();
  const days = end.getDate() - dob.getDate();

  let y = years;
  let m = months;
  if (days < 0) m--;
  if (m < 0) { y--; m += 12; }

  return {
    years: y,
    detail: `${y}y ${m < 0 ? 0 : m}m`,
  };
}