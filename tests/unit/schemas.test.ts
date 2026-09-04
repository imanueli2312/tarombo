import { describe, test, expect } from 'bun:test';
import {
  personCreateSchema,
  personUpdateSchema,
  partnershipCreateSchema,
  oralHistoryCreateSchema,
  oralHistoryUpdateSchema,
  pusakaCreateSchema,
  pusakaUpdateSchema,
  userUpdateSchema,
  permissionUpdateSchema,
  firstIssueMessage,
  ORAL_CATEGORIES,
  PUSAKA_TYPES,
} from '@/lib/schemas';

describe('personCreateSchema (audit S-02/R-01)', () => {
  const valid = { nama: 'Raja Hariandja', jenis_kelamin: 'L' };

  test('payload minimal valid', () => {
    const r = personCreateSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  test('jenis_kelamin di luar enum ditolak', () => {
    expect(personCreateSchema.safeParse({ ...valid, jenis_kelamin: 'X' }).success).toBe(false);
  });

  test('status_pernikahan di luar enum ditolak', () => {
    expect(personCreateSchema.safeParse({ ...valid, status_pernikahan: 'jomblo' }).success).toBe(false);
  });

  test('photo melebihi 500 karakter ditolak (S-02 — duluan tak divalidasi)', () => {
    const r = personCreateSchema.safeParse({ ...valid, photo: 'x'.repeat(501) });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstIssueMessage(r.error)).toContain('Foto');
  });

  test('nomor_generasi non-bulat / < 1 ditolak', () => {
    expect(personCreateSchema.safeParse({ ...valid, nomor_generasi: 1.5 }).success).toBe(false);
    expect(personCreateSchema.safeParse({ ...valid, nomor_generasi: 0 }).success).toBe(false);
    expect(personCreateSchema.safeParse({ ...valid, nomor_generasi: 2 }).success).toBe(true);
  });

  test('burial_latitude di luar rentang ditolak', () => {
    expect(personCreateSchema.safeParse({ ...valid, burial_latitude: 99 }).success).toBe(false);
    expect(personCreateSchema.safeParse({ ...valid, burial_latitude: -12.5 }).success).toBe(true);
  });

  test('tanggal dengan format salah ditolak', () => {
    expect(personCreateSchema.safeParse({ ...valid, tanggal_lahir: '17-05-1990' }).success).toBe(false);
    expect(personCreateSchema.safeParse({ ...valid, tanggal_lahir: '1990-05-17' }).success).toBe(true);
  });

  test('field tak dikenal dibuang (anti mass-assignment)', () => {
    const r = personCreateSchema.safeParse({ ...valid, role: 'admin', is_admin: true });
    expect(r.success).toBe(true);
    if (r.success) {
      expect('role' in r.data).toBe(false);
      expect('is_admin' in r.data).toBe(false);
    }
  });

  test('personUpdateSchema: semua field opsional', () => {
    expect(personUpdateSchema.safeParse({}).success).toBe(true);
    expect(personUpdateSchema.safeParse({ nama: 'X' }).success).toBe(true);
    expect(personUpdateSchema.safeParse({ nama: '' }).success).toBe(false); // min 1
  });
});

describe('partnershipCreateSchema', () => {
  test('dua id + tanggal valid', () => {
    expect(
      partnershipCreateSchema.safeParse({ person1_id: 'a', person2_id: 'b', marriage_date: '2000-01-01' }).success,
    ).toBe(true);
  });
  test('id kosong ditolak', () => {
    expect(partnershipCreateSchema.safeParse({ person1_id: '', person2_id: 'b' }).success).toBe(false);
  });
});

describe('oralHistoryCreateSchema (audit S-01)', () => {
  const valid = { person_id: 'p1', category: 'gondang', title: 'Turian gondang' };

  test('payload valid', () => {
    expect(oralHistoryCreateSchema.safeParse(valid).success).toBe(true);
  });
  test('category di luar enum ditolak', () => {
    expect(oralHistoryCreateSchema.safeParse({ ...valid, category: 'mitos' }).success).toBe(false);
  });
  test('content dibatasi 20000 karakter (S-02)', () => {
    expect(oralHistoryCreateSchema.safeParse({ ...valid, content: 'x'.repeat(20001) }).success).toBe(false);
    expect(oralHistoryCreateSchema.safeParse({ ...valid, content: 'x'.repeat(20000) }).success).toBe(true);
  });
  test('title kosong ditolak', () => {
    expect(oralHistoryCreateSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });
  test('enum kategori lengkap 8 nilai', () => {
    expect(ORAL_CATEGORIES.length).toBe(8);
  });

  test('oralHistoryUpdateSchema: partial + person_id opsional', () => {
    expect(oralHistoryUpdateSchema.safeParse({ title: 'Revisi' }).success).toBe(true);
    expect(oralHistoryUpdateSchema.safeParse({ person_id: 'p2' }).success).toBe(true);
    expect(oralHistoryUpdateSchema.safeParse({ is_verified: 'yes' }).success).toBe(false);
  });
});

describe('pusakaCreateSchema (audit S-01/S-02)', () => {
  const valid = { person_id: 'p1', name: 'Ulos Ragidup', type: 'ulos' };

  test('payload valid', () => {
    expect(pusakaCreateSchema.safeParse(valid).success).toBe(true);
  });
  test('type di luar enum ditolak', () => {
    expect(pusakaCreateSchema.safeParse({ ...valid, type: 'keris' }).success).toBe(false);
  });
  test('description dibatasi 2000 karakter (S-02)', () => {
    expect(pusakaCreateSchema.safeParse({ ...valid, description: 'x'.repeat(2001) }).success).toBe(false);
  });
  test('origin dibatasi 1000 karakter (S-02)', () => {
    expect(pusakaCreateSchema.safeParse({ ...valid, origin: 'x'.repeat(1001) }).success).toBe(false);
  });
  test('image dibatasi 500 karakter (S-02)', () => {
    expect(pusakaCreateSchema.safeParse({ ...valid, image: 'x'.repeat(501) }).success).toBe(false);
  });
  test('is_sacred harus boolean', () => {
    expect(pusakaCreateSchema.safeParse({ ...valid, is_sacred: 1 }).success).toBe(false);
  });
  test('pusakaUpdateSchema partial', () => {
    expect(pusakaUpdateSchema.safeParse({ name: 'Baru' }).success).toBe(true);
    expect(pusakaUpdateSchema.safeParse({ type: 'salah' }).success).toBe(false);
  });
  test('enum pusaka lengkap 14 nilai', () => {
    expect(PUSAKA_TYPES.length).toBe(14);
  });
});

describe('userUpdateSchema', () => {
  test('password < 8 karakter ditolak', () => {
    expect(userUpdateSchema.safeParse({ password: 'abc123' }).success).toBe(false);
  });
  test('password tanpa angka ditolak', () => {
    expect(userUpdateSchema.safeParse({ password: 'abcdefghij' }).success).toBe(false);
  });
  test('password tanpa huruf ditolak', () => {
    expect(userUpdateSchema.safeParse({ password: '12345678' }).success).toBe(false);
  });
  test('password valid lolos', () => {
    expect(userUpdateSchema.safeParse({ password: 'raja1920' }).success).toBe(true);
  });
  test('role di luar enum ditolak', () => {
    expect(userUpdateSchema.safeParse({ role: 'superadmin' }).success).toBe(false);
  });
  test('name 101 karakter ditolak', () => {
    expect(userUpdateSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('permissionUpdateSchema', () => {
  test('id + boolean valid', () => {
    expect(permissionUpdateSchema.safeParse({ id: 'perm-1', allowed: true }).success).toBe(true);
  });
  test('allowed non-boolean ditolak', () => {
    expect(permissionUpdateSchema.safeParse({ id: 'perm-1', allowed: 'ya' }).success).toBe(false);
  });
});
