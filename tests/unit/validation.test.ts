import { describe, test, expect } from 'bun:test';
import {
  parseDate,
  validateDeathAfterBirth,
  validateDivorceAfterMarriage,
  validateNotFuture,
  validateLatitude,
  validateLongitude,
  validateChildAfterParent,
  sanitizeLikePattern,
  validateFieldLength,
  FIELD_LIMITS,
} from '@/lib/validation';

describe('parseDate', () => {
  test('menerima format YYYY-MM-DD valid', () => {
    expect(parseDate('1990-05-17')).toBeInstanceOf(Date);
    expect(parseDate('1990-05-17')?.getFullYear()).toBe(1990);
  });

  test('menolak format lain dan nilai kosong', () => {
    expect(parseDate('17-05-1990')).toBeNull();
    expect(parseDate('1990/05/17')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate('1990-13-45')).toBeNull(); // tanggal tidak valid
  });
});

describe('validateDeathAfterBirth', () => {
  test('kematian sebelum lahir ditolak', () => {
    expect(validateDeathAfterBirth('1990-01-01', '1989-01-01')).not.toBeNull();
  });

  test('kematian setelah lahir lolos', () => {
    expect(validateDeathAfterBirth('1990-01-01', '2020-01-01')).toBeNull();
  });

  test('tanpa salah satu tanggal → lolos (biarkan validator lain)', () => {
    expect(validateDeathAfterBirth('1990-01-01', null)).toBeNull();
    expect(validateDeathAfterBirth(null, '2020-01-01')).toBeNull();
  });
});

describe('validateDivorceAfterMarriage', () => {
  test('cerai sebelum menikah ditolak', () => {
    expect(validateDivorceAfterMarriage('2000-01-01', '1999-12-31')).not.toBeNull();
  });
  test('cerai setelah menikah lolos', () => {
    expect(validateDivorceAfterMarriage('2000-01-01', '2005-06-01')).toBeNull();
  });
});

describe('validateNotFuture', () => {
  test('tanggal masa depan ditolak', () => {
    expect(validateNotFuture('2999-01-01', 'Tanggal lahir')).not.toBeNull();
  });
  test('tanggal lampau lolos', () => {
    expect(validateNotFuture('1990-01-01', 'Tanggal lahir')).toBeNull();
  });
});

describe('koordinat pemakaman', () => {
  test('lintang di luar [-90, 90] ditolak', () => {
    expect(validateLatitude(91)).not.toBeNull();
    expect(validateLatitude(-91)).not.toBeNull();
    expect(validateLatitude(0)).toBeNull();
  });
  test('bujur di luar [-180, 180] ditolak', () => {
    expect(validateLongitude(181)).not.toBeNull();
    expect(validateLongitude(-181)).not.toBeNull();
    expect(validateLongitude(120)).toBeNull();
  });
});

describe('validateChildAfterParent', () => {
  test('anak lahir < 10 tahun setelah orang tua ditolak', () => {
    expect(validateChildAfterParent('1990-01-01', '1995-01-01')).not.toBeNull();
  });
  test('jarak wajar (>= 10 tahun) lolos', () => {
    expect(validateChildAfterParent('1990-01-01', '2005-01-01')).toBeNull();
  });
});

describe('sanitizeLikePattern', () => {
  test('escape % dan _', () => {
    expect(sanitizeLikePattern('a%b_c')).toBe('a\\%b\\_c');
  });
});

describe('validateFieldLength / FIELD_LIMITS', () => {
  test('nama melebihi 200 karakter ditolak', () => {
    expect(validateFieldLength('nama', 'a'.repeat(201))).not.toBeNull();
    expect(validateFieldLength('nama', 'a'.repeat(200))).toBeNull();
  });
  test('photo dibatasi 500 karakter (audit S-02 — kini benar-benar dipakai zod)', () => {
    expect(FIELD_LIMITS.photo?.max).toBe(500);
    expect(validateFieldLength('photo', 'a'.repeat(501))).not.toBeNull();
  });
  test('keterangan dibatasi 2000 karakter', () => {
    expect(FIELD_LIMITS.keterangan?.max).toBe(2000);
  });
  test('nilai null/undefined lolos (field opsional)', () => {
    expect(validateFieldLength('nama', null)).toBeNull();
    expect(validateFieldLength('nama', undefined)).toBeNull();
  });
});
