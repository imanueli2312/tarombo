import { z } from 'zod/v4';

/**
 * Skema validasi zod server-side untuk seluruh endpoint tulis (audit S-01,
 * S-02, R-01). Menggantikan `as` cast mentah dan validasi manual yang tidak
 * merata: setiap field teks kini punya batas panjang, setiap enum divalidasi,
 * dan bentuk body yang salah ditolak 400 dengan pesan Indonesia.
 *
 * Zod default MENGHAPUS field yang tidak dikenal — mass-assignment tertutup
 * di lapisan validasi, sejalan dengan allow-list kolom di db.ts.
 */

const GENDER = ['L', 'P'] as const;
const MARITAL = ['belum_menikah', 'menikah', 'cerai', 'duda', 'janda'] as const;
const ROLES = ['viewer', 'editor', 'admin'] as const;

export const ORAL_CATEGORIES = [
  'turian_asal_usul',
  'turian_migrasi',
  'turian_peristiwa',
  'gondang',
  'mangalahat',
  'saur_matua',
  'pesta_pernikahan',
  'turian_umum',
] as const;

export const PUSAKA_TYPES = [
  'tombak',
  'ulos',
  'tunggal_panaluan',
  'gorga',
  'gabe',
  'hasangapon',
  'rattan_box',
  'kalung_bulan',
  'gutar_guar',
  'tali_tiga',
  'porhala',
  'jamita',
  'sial_solam_sial_sao',
  'lainnya',
] as const;

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

const nullableDate = dateStr.nullable();

/** String opsional dengan batas panjang (audit S-02 — field tak berbatas). */
const text = (max: number, label: string) =>
  z.string().max(max, `${label} maksimal ${max} karakter`);

const nullableText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} maksimal ${max} karakter`)
    .nullable();

const positiveInt = (label: string) =>
  z
    .number()
    .int(`${label} harus bilangan bulat`)
    .positive(`${label} harus bilangan bulat positif`);

const idStr = z.string().min(1, 'ID tidak boleh kosong').max(100);

// ---------------------------------------------------------------------------
// Persons
// ---------------------------------------------------------------------------

export const personCreateSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').max(200, 'Nama maksimal 200 karakter'),
  nama_panggilan: text(100, 'Nama panggilan').optional(),
  tempat_lahir: text(200, 'Tempat lahir').optional(),
  tanggal_lahir: nullableDate.optional(),
  tanggal_kematian: nullableDate.optional(),
  nomor_urut_lahir: positiveInt('Nomor urut kelahiran').nullable().optional(),
  jenis_kelamin: z.enum(GENDER, 'Jenis kelamin tidak valid'),
  alamat: text(1000, 'Alamat').optional(),
  agama: text(50, 'Agama').optional(),
  nomor_telepon: text(20, 'Nomor telepon').optional(),
  // Audit S-02: photo dulunya tak pernah divalidasi (FIELD_LIMITS.photo mati)
  photo: z
    .string()
    .max(500, 'Foto maksimal 500 karakter')
    .nullable()
    .optional(),
  status_pernikahan: z.enum(MARITAL, 'Status pernikahan tidak valid').optional(),
  nomor_generasi: positiveInt('Nomor generasi').optional(),
  burial_nama: nullableText(200, 'Nama tempat pemakaman').optional(),
  burial_alamat: nullableText(500, 'Alamat pemakaman').optional(),
  burial_latitude: z
    .number()
    .min(-90, 'Garis lintang harus antara -90 dan 90')
    .max(90, 'Garis lintang harus antara -90 dan 90')
    .nullable()
    .optional(),
  burial_longitude: z
    .number()
    .min(-180, 'Garis bujur harus antara -180 dan 180')
    .max(180, 'Garis bujur harus antara -180 dan 180')
    .nullable()
    .optional(),
  marga_asal: nullableText(100, 'Marga asal').optional(),
  tempat_asal: nullableText(200, 'Tempat asal').optional(),
  pendidikan: nullableText(200, 'Pendidikan').optional(),
  pekerjaan: nullableText(200, 'Pekerjaan').optional(),
  keterangan: nullableText(2000, 'Keterangan').optional(),
  father_id: idStr.nullable().optional(),
  mother_id: idStr.nullable().optional(),
});

export const personUpdateSchema = personCreateSchema.partial();

// ---------------------------------------------------------------------------
// Partnerships
// ---------------------------------------------------------------------------

export const partnershipCreateSchema = z.object({
  person1_id: idStr,
  person2_id: idStr,
  marriage_date: nullableDate.optional(),
});

export const partnershipUpdateSchema = z.object({
  marriage_date: nullableDate.optional(),
  divorce_date: nullableDate.optional(),
});

// ---------------------------------------------------------------------------
// Oral histories (Turian)
// ---------------------------------------------------------------------------

export const oralHistoryCreateSchema = z.object({
  person_id: idStr,
  category: z.enum(ORAL_CATEGORIES, 'category tidak valid'),
  title: z.string().min(1, 'title minimal 1 karakter').max(200, 'title maksimal 200 karakter'),
  // Audit S-02: content dulunya bebas sepanjang apa pun
  content: text(20000, 'Content turian').optional(),
  source_person_name: text(200, 'Nama sumber').optional(),
  recorded_date: nullableDate.optional(),
  // Audit S-15: hanya admin boleh menandai terverifikasi — dihapus di lapis
  // route untuk editor, di sini cukup bentuk boolean.
  is_verified: z.boolean().optional(),
});

export const oralHistoryUpdateSchema = oralHistoryCreateSchema.partial().omit({ person_id: true }).extend({
  person_id: idStr.optional(),
});

// ---------------------------------------------------------------------------
// Pusaka (heirloom)
// ---------------------------------------------------------------------------

export const pusakaCreateSchema = z.object({
  person_id: idStr,
  name: z.string().min(1, 'name minimal 1 karakter').max(200, 'name maksimal 200 karakter'),
  type: z.enum(PUSAKA_TYPES, 'type tidak valid'),
  // Audit S-02: description/origin/image dulunya bebas sepanjang apa pun
  description: text(2000, 'Description').optional(),
  origin: text(1000, 'Origin').optional(),
  image: z
    .string()
    .max(500, 'Image maksimal 500 karakter')
    .nullable()
    .optional(),
  passed_from_person_id: idStr.nullable().optional(),
  year_acquired: nullableText(20, 'Year acquired').optional(),
  is_sacred: z.boolean().optional(),
});

export const pusakaUpdateSchema = pusakaCreateSchema.partial();

// ---------------------------------------------------------------------------
// RBAC users & permissions
// ---------------------------------------------------------------------------

export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Nama harus 1-100 karakter').max(100, 'Nama harus 1-100 karakter').optional(),
  role: z.enum(ROLES, 'Role tidak valid').optional(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(200, 'Password maksimal 200 karakter')
    .refine((pw) => /[A-Za-z]/.test(pw) && /[0-9]/.test(pw), {
      message: 'Password harus mengandung huruf dan angka',
    })
    .optional(),
});

export const userCreateSchema = z.object({
  email: z.email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(200, 'Password maksimal 200 karakter')
    .refine((pw) => /[A-Za-z]/.test(pw) && /[0-9]/.test(pw), {
      message: 'Password harus mengandung huruf dan angka',
    }),
  name: z.string().min(1, 'Nama harus 1-100 karakter').max(100, 'Nama harus 1-100 karakter'),
  role: z.enum(ROLES, 'Role tidak valid'),
});

export const permissionUpdateSchema = z.object({
  id: idStr,
  allowed: z.boolean(),
});

/** Ambil pesan error pertama dari hasil safeParse (untuk respons 400). */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Data tidak valid';
}
