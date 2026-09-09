// ============================================================================
// Katalog Permission (RBAC) — dapat dikustomisasi admin
// ============================================================================

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
  description: string;
}

/** Semua permission yang tersedia di aplikasi Tarombo. */
export const PERMISSIONS: PermissionDef[] = [
  // --- Orang (Person) ---
  {
    key: "person:view",
    label: "Lihat Orang",
    group: "Orang",
    description: "Melihat daftar & detail orang di pohon tarombo.",
  },
  {
    key: "person:create",
    label: "Tambah Orang",
    group: "Orang",
    description: "Menambah orang baru ke silsilah keluarga.",
  },
  {
    key: "person:edit",
    label: "Edit Orang",
    group: "Orang",
    description: "Mengubah data orang yang sudah ada.",
  },
  {
    key: "person:delete",
    label: "Hapus Orang",
    group: "Orang",
    description: "Menghapus orang dari silsilah.",
  },
  // --- Pasangan (Partnership) ---
  {
    key: "partnership:create",
    label: "Tambah Pasangan",
    group: "Pasangan",
    description: "Menambah hubungan pasangan (suami-istri).",
  },
  {
    key: "partnership:edit",
    label: "Edit Pasangan",
    group: "Pasangan",
    description: "Mengubah data pasangan.",
  },
  {
    key: "partnership:delete",
    label: "Hapus Pasangan",
    group: "Pasangan",
    description: "Menghapus hubungan pasangan.",
  },
  // --- Pengguna (User) ---
  {
    key: "user:view",
    label: "Lihat Pengguna",
    group: "Pengguna",
    description: "Melihat daftar pengguna aplikasi.",
  },
  {
    key: "user:manage",
    label: "Kelola Pengguna",
    group: "Pengguna",
    description: "Menambah, mengubah, dan menghapus pengguna aplikasi.",
  },
  // --- Role & Permission ---
  {
    key: "role:manage",
    label: "Kelola Role & Permission",
    group: "Role",
    description: "Mengustomisasi role dan menetapkan permission. Khusus admin.",
  },
  // --- Export ---
  {
    key: "export:view",
    label: "Export Pohon",
    group: "Export",
    description: "Mengekspor pohon tarombo ke PDF / gambar.",
  },
  // --- Data ---
  {
    key: "data:seed",
    label: "Muat Data Contoh",
    group: "Data",
    description: "Memuat data keluarga contoh ke database.",
  },
  {
    key: "data:reset",
    label: "Reset Semua Data",
    group: "Data",
    description: "Menghapus seluruh data (person, partnership, user, role).",
  },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export const PERMISSION_GROUPS = Array.from(
  new Set(PERMISSIONS.map((p) => p.group)),
);

export function permissionLabel(key: string): string {
  return PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}

export function permissionGroup(key: string): string {
  return PERMISSIONS.find((p) => p.key === key)?.group ?? "Lainnya";
}

export function permissionDescription(key: string): string {
  return PERMISSIONS.find((p) => p.key === key)?.description ?? "";
}

/** Parse permissions dari string JSON di kolom Role.permissions. */
export function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === "string");
  } catch {
    return [];
  }
}

/** Serialize permissions ke string JSON untuk disimpan. */
export function serializePermissions(perms: string[]): string {
  return JSON.stringify(perms);
}

/** Daftar permission default untuk role Administrator (semua permission). */
export const ADMIN_DEFAULT_PERMISSIONS: string[] = [...PERMISSION_KEYS];

/** Daftar permission default untuk role Anggota (view + tambah + export). */
export const MEMBER_DEFAULT_PERMISSIONS: string[] = [
  "person:view",
  "partnership:create",
  "export:view",
];
