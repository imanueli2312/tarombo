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
  spouse?: {
    id: string;
    nama: string;
    nama_panggilan: string;
    jenis_kelamin: Gender;
    tanggal_lahir: string | null;
    tanggal_kematian: string | null;
    status_pernikahan: MaritalStatus;
    photo: string | null;
  } | null;
  children: TreeNode[];
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  viewer: ['view_tree', 'search'],
  editor: ['view_tree', 'search', 'view_profile', 'view_bagans', 'view_marriages', 'create_person', 'edit_person', 'delete_person', 'create_marriage', 'edit_marriage', 'delete_marriage', 'export'],
  admin: ['view_tree', 'search', 'view_profile', 'view_bagans', 'view_marriages', 'create_person', 'edit_person', 'delete_person', 'create_marriage', 'edit_marriage', 'delete_marriage', 'export', 'manage_users', 'manage_permissions', 'view_admin'],
};

export const ALL_PERMISSIONS = [
  'view_tree', 'search', 'view_profile', 'view_bagans', 'view_marriages',
  'create_person', 'edit_person', 'delete_person',
  'create_marriage', 'edit_marriage', 'delete_marriage',
  'export', 'manage_users', 'manage_permissions', 'view_admin',
];

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
};
