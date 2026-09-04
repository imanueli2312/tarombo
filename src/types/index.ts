export type Gender = 'L' | 'P';

export type MaritalStatus = 'belum_menikah' | 'menikah' | 'cerai' | 'duda' | 'janda';

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface Person {
  id: string;
  nama: string;
  nama_panggilan: string;
  tempat_lahir: string;
  tanggal_lahir: string | null;
  tanggal_kematian: string | null;
  nomor_urut_lahir: number | null;
  jenis_kelamin: Gender;
  alamat: string;
  agama: string;
  nomor_telepon: string;
  photo: string | null;
  status_pernikahan: MaritalStatus;
  nomor_generasi: number;
  burial_nama: string | null;
  burial_alamat: string | null;
  burial_latitude: number | null;
  burial_longitude: number | null;
  marga_asal: string;
  tempat_asal: string;
  pendidikan: string;
  pekerjaan: string;
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export interface PersonCreate {
  nama: string;
  nama_panggilan?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string | null;
  tanggal_kematian?: string | null;
  nomor_urut_lahir?: number | null;
  jenis_kelamin: Gender;
  alamat?: string;
  agama?: string;
  nomor_telepon?: string;
  photo?: string | null;
  status_pernikahan?: MaritalStatus;
  nomor_generasi?: number;
  burial_nama?: string | null;
  burial_alamat?: string | null;
  burial_latitude?: number | null;
  burial_longitude?: number | null;
  marga_asal?: string | null;
  tempat_asal?: string | null;
  pendidikan?: string | null;
  pekerjaan?: string | null;
  keterangan?: string | null;
  father_id?: string | null;
  mother_id?: string | null;
}

export type PersonUpdate = Partial<PersonCreate>;

export interface Partnership {
  id: string;
  person1_id: string;
  person2_id: string;
  marriage_date: string | null;
  divorce_date: string | null;
  created_at: string;
  updated_at: string;
  person1?: Person;
  person2?: Person;
}

export interface PartnershipCreate {
  person1_id: string;
  person2_id: string;
  marriage_date?: string | null;
}

export interface ParentChild {
  id: string;
  parent_id: string;
  child_id: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UserUpdate {
  name?: string;
  role?: UserRole;
  password?: string;
}

export interface RBACPermission {
  id: string;
  role: UserRole;
  permission: string;
  allowed: boolean;
  created_at: string;
}

export interface TreeNode {
  id: string;
  nama: string;
  nama_panggilan: string;
  jenis_kelamin: Gender;
  tanggal_lahir: string | null;
  tanggal_kematian: string | null;
  status_pernikahan: MaritalStatus;
  nomor_generasi: number;
  photo: string | null;
  marga_asal: string;
  spouse?: {
    id: string;
    nama: string;
    nama_panggilan: string;
    jenis_kelamin: Gender;
    tanggal_lahir: string | null;
    tanggal_kematian: string | null;
    status_pernikahan: MaritalStatus;
    photo: string | null;
    marga_asal: string;
  } | null;
  children: TreeNode[];
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

/** Relasi Dalihan Na Tolu dihitung dari data silsilah (lihat lib/db.ts) */
export interface DalihanRelationEntry {
  id: string;
  nama: string;
  marga: string;
  relation: string;
  relationBatak: string;
}

export interface DalihanRelations {
  hulahula: DalihanRelationEntry[];
  boru: DalihanRelationEntry[];
  donganSabutuha: { marga: string | null; total: number };
}

export interface PersonDetailResponse extends Person {
  parents?: { father?: Person; mother?: Person };
  children?: Person[];
  spouse?: Person | null;
  dalihan?: DalihanRelations;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  viewer: ['view_tree', 'search', 'view_marga_book'],
  editor: ['view_tree', 'search', 'view_profile', 'view_bagans', 'view_marriages', 'create_person', 'edit_person', 'delete_person', 'create_marriage', 'edit_marriage', 'delete_marriage', 'export', 'view_heritage', 'create_heritage', 'edit_heritage', 'delete_heritage', 'view_marga_book'],
  admin: ['view_tree', 'search', 'view_profile', 'view_bagans', 'view_marriages', 'create_person', 'edit_person', 'delete_person', 'create_marriage', 'edit_marriage', 'delete_marriage', 'export', 'manage_users', 'manage_permissions', 'view_admin', 'view_heritage', 'create_heritage', 'edit_heritage', 'delete_heritage', 'view_marga_book', 'transfer_data'],
};

export const ALL_PERMISSIONS = [
  'view_tree', 'search', 'view_profile', 'view_bagans', 'view_marriages',
  'create_person', 'edit_person', 'delete_person',
  'create_marriage', 'edit_marriage', 'delete_marriage',
  'export', 'manage_users', 'manage_permissions', 'view_admin',
  'view_heritage', 'create_heritage', 'edit_heritage', 'delete_heritage',
  'view_marga_book', 'transfer_data',
];

// ---- Oral History (Turian) ----

export type OralHistoryCategory =
  | 'turian_asal_usul'
  | 'turian_migrasi'
  | 'turian_peristiwa'
  | 'gondang'
  | 'mangalahat'
  | 'saur_matua'
  | 'pesta_pernikahan'
  | 'turian_umum';

export interface OralHistory {
  id: string;
  person_id: string;
  category: OralHistoryCategory;
  title: string;
  content: string;
  source_person_name: string;
  recorded_date: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface OralHistoryCreate {
  person_id: string;
  category: OralHistoryCategory;
  title: string;
  content?: string;
  source_person_name?: string;
  recorded_date?: string | null;
  is_verified?: boolean;
}

// ---- Pusaka (Heirloom) ----

export type PusakaType =
  | 'tombak'
  | 'ulos'
  | 'tunggal_panaluan'
  | 'gorga'
  | 'gabe'
  | 'hasangapon'
  | 'rattan_box'
  | 'kalung_bulan'
  | 'gutar_guar'
  | 'tali_tiga'
  | 'porhala'
  | 'jamita'
  | 'sial_solam_sial_sao'
  | 'lainnya';

export interface PusakaItem {
  id: string;
  person_id: string;
  name: string;
  type: PusakaType;
  description: string;
  origin: string;
  image: string | null;
  passed_from_person_id: string | null;
  year_acquired: string | null;
  is_sacred: boolean;
  created_at: string;
  updated_at: string;
}

export interface PusakaCreate {
  person_id: string;
  name: string;
  type: PusakaType;
  description?: string;
  origin?: string;
  image?: string | null;
  passed_from_person_id?: string | null;
  year_acquired?: string | null;
  is_sacred?: boolean;
}

export const PERMISSION_LABELS: Record<string, string> = {
  view_tree: 'Lihat Pohon Keluarga',
  search: 'Cari',
  view_profile: 'Lihat Profil',
  view_bagans: 'Lihat Bagan Keluarga',
  view_marriages: 'Lihat Pernikahan',
  create_person: 'Tambah Orang',
  edit_person: 'Edit Orang',
  delete_person: 'Hapus Orang',
  create_marriage: 'Tambah Pernikahan',
  edit_marriage: 'Edit Pernikahan',
  delete_marriage: 'Hapus Pernikahan',
  export: 'Export',
  manage_users: 'Kelola Pengguna',
  manage_permissions: 'Kelola Hak Akses',
  view_admin: 'Panel Admin',
  view_heritage: 'Lihat Warisan Budaya',
  create_heritage: 'Tambah Warisan Budaya',
  edit_heritage: 'Edit Warisan Budaya',
  delete_heritage: 'Hapus Warisan Budaya',
  view_marga_book: 'Lihat Buku Marga',
  transfer_data: 'Transfer Data (Ekspor/Impor)',
};

// ============================================================================
// BUKU MARGA — buku silsilah digital (format buku tarombo tradisional)
// ============================================================================

/** Satu entri dalam Buku Marga (anggota garis marga) */
export interface MargaBookEntry {
  id: string;
  /** Penomoran hierarkis ala buku tarombo, mis. "1.2.3" (jalur keturunan) */
  nomor_buku: string;
  nama: string;
  nama_panggilan: string;
  jenis_kelamin: Gender;
  marga: string;
  tanggal_lahir: string | null;
  tempat_lahir: string;
  tanggal_kematian: string | null;
  status_pernikahan: MaritalStatus;
  ayah_id: string | null;
  ayah_nama: string | null;
  /** Pasangan aktif (boru/doli dari marga lain) */
  pasangan: { id: string; nama: string; marga: string } | null;
  jumlah_anak: number;
}

/** Satu generasi dalam Buku Marga */
export interface MargaBookGeneration {
  generasi: number;
  /** Label generasi, mis. "Generasi I — Leluhur Marga" */
  label: string;
  jumlah: number;
  jumlah_laki: number;
  jumlah_perempuan: number;
  jumlah_wafat: number;
  entries: MargaBookEntry[];
}

/** Buku Marga lengkap untuk satu marga */
export interface MargaBook {
  marga: string;
  subetnis: string | null;
  total_anggota: number;
  jumlah_generasi: number;
  lahir_terawal: string | null;
  lahir_terakhir: string | null;
  generations: MargaBookGeneration[];
}

/** Entri direktori marga (statistik per marga dari data) */
export interface MargaDirectoryEntry {
  marga: string;
  jumlah: number;
  laki_laki: number;
  perempuan: number;
  hidup: number;
  wafat: number;
  generasi_min: number;
  generasi_max: number;
  subetnis: string | null;
  is_utama: boolean;
}

// ============================================================================
// TRANSFER — ekspor/impor data & transfer pusaka
// ============================================================================

/** Jenis operasi transfer yang tercatat di log */
export type TransferLogKind =
  | 'export_json'
  | 'export_gedcom'
  | 'import_json'
  | 'import_csv'
  | 'import_gedcom'
  | 'pusaka_transfer'
  | 'marga_book_export'
  | 'generasi_recompute';

/** Satu baris riwayat transfer (audit trail) */
export interface TransferLogEntry {
  id: string;
  kind: TransferLogKind;
  actor_email: string;
  summary: string;
  details: string;
  created_at: string;
}

/** Payload ekspor lengkap (backup) — versi 2 */
export interface TransferExportData {
  format: 'tarombo-export';
  version: 2;
  exported_at: string;
  app: { nama: string; marga_utama: string };
  counts: {
    persons: number;
    partnerships: number;
    parent_child: number;
    oral_histories: number;
    pusaka_items: number;
  };
  persons: Person[];
  partnerships: Partnership[];
  parent_child: ParentChild[];
  oral_histories: OralHistory[];
  pusaka_items: PusakaItem[];
}

/** Satu masalah (error/peringatan) hasil validasi impor */
export interface ImportIssue {
  index: number;
  entity: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Laporan validasi/terapkan impor */
export interface ImportReport {
  ok: boolean;
  summary: {
    persons: number;
    partnerships: number;
    parent_child: number;
    oral_histories: number;
    pusaka_items: number;
    persons_baru: number;
    persons_duplikat: number;
  };
  issues: ImportIssue[];
}

/** Hasil penerapan impor (mode apply) */
export interface ImportResult extends ImportReport {
  applied: boolean;
  inserted: {
    persons: number;
    partnerships: number;
    parent_child: number;
    oral_histories: number;
    pusaka_items: number;
  };
  updated: { persons: number };
  skipped: { persons: number; partnerships: number; parent_child: number; oral_histories: number; pusaka_items: number };
}

/** Strategi penanganan konflik ID saat impor */
export type ImportStrategy = 'skip' | 'overwrite';
