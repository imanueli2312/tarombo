# 📋 Changelog — Tarombo

Semua perubahan penting di proyek ini akan didokumentasikan di file ini.

Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

---

## [Unreleased]

### Planned
- Relationship Finder (temukan hubungan antar 2 orang)
- Pengingat Ulang Tahun & Peringatan
- Pencarian Canggih (multi-kriteria + quick palette Ctrl+K)
- Catatan/Biografi per Orang (markdown)
- Multiple Photo Gallery per orang
- Rate limiting di API
- Unit testing (Vitest)
- E2E testing (Playwright test)
- Internationalization (i18n — id/en)
- Offline mode (PWA)

---

## [1.3.0] — 2026-09-09

### Added — 10 Fitur Rekomendasi

#### Prioritas Tinggi
- **Backup & Restore JSON**: API `/api/backup` (GET download, POST restore merge mode).
  Format: `{version, exportedAt, data: {persons, partnerships, users, roles}}`.
  BackupDialog UI dengan tombol unduh + file picker.
- **Password Hashing (bcrypt)**: `hashPassword()`/`verifyPassword()` di `security.ts`
  (bcryptjs, 10 rounds). Seed password di-hash. Login verify bcrypt + auto-upgrade
  legacy plain-text → bcrypt.
- **Validasi Integritas Data**:
  - Temporal: `deathDate > birthDate`, `childBirth > parentBirth`, `marriage > birth`, `divorce > marriage`
  - Cycle detection: `wouldCreateCycle()` traverse ancestors
  - Duplikat: `findDuplicatePerson()` by fullName + birthDate
  - ValidationError class, terapkan di persons POST/PATCH
- **Photo Upload Lokal**: API `/api/photo-upload` (FormData, sharp resize 400×400 → webp).
  PhotoUploadButton di PersonFormSheet.

#### Prioritas Menengah
- **Activity Log / Audit Trail**: tabel `activity_log`, helper `logActivity()`.
  Terapkan di: persons CRUD, partnerships CRUD, users login/logout, seed, reset, export.
  ActivityLogSheet UI dengan icon per action + filter.
- **Collapse/Expand Subtree** di D3 tree — toggle ▼/▶, badge "N anak",
  filter children dari d3.tree saat collapsed.
- **Export Subset**: param `aliveOnly`, `maxGeneration`, `subtreeFrom`.
  ExportFilters di `export-html.ts`, UI di ExportDialog.
- **Minimap**: overview 150×100px bottom-left, viewport rect, click to navigate.

#### Prioritas Rendah
- **Keyboard Navigation** di pohon — Arrow keys (up/down/left/right), Enter select,
  Escape clear. Focused ring (dashed) vs selected ring (solid).
- **Soft Delete & Trash**: `deleted_at` column, DELETE jadi soft delete.
  API `/api/trash` (list, empty), `/api/trash/[id]/restore`, `/api/trash/[id]/permanent`.
  TrashSheet UI dengan tabs Orang/Pasangan, restore + permanent delete.

### Changed
- Schema database: tambah `deleted_at` ke person & partnership, tabel `activity_log` baru
- Semua query read exclude `WHERE deleted_at IS NULL`
- Export API support filter subset (`aliveOnly`, `maxGeneration`, `subtreeFrom`)
- Person POST/PATCH: validasi integritas data (temporal, cycle, duplikat)
- Logout handler: ganti `useMutation` → langsung fetch + invalidateQueries (fix bug)

### Security
- Password disimpan sebagai bcrypt hash (sebelumnya plain-text)
- Auto-upgrade legacy plain-text password saat login pertama
- Activity log mencatat semua aksi sensitif (login, delete, export, dll)

---

## [1.2.0] — 2026-09-09

### Added
- **RBAC 3 role default**: Viewer (publik, tanpa login), Editor (login), Administrator (login)
- **Viewer publik tanpa login**: guest otomatis dapat role Viewer (read-only)
  saat tidak ada cookie. Pohon bisa dilihat publik.
- **Login wajib** untuk Administrator & Editor (password verification)
- **LoginDialog**: input password + show/hide toggle + hint password demo
- **Endpoint `/api/users/list-public`**: daftar user minimal (id, name, roleName)
  untuk dropdown login guest — tanpa data sensitif
- Ganti role "Anggota" → "Editor" dengan permission berbeda
- Tombol "Keluar (kembali ke Viewer)" di user menu

### Changed
- `getActiveUserWithPermissions()`: return guest Viewer (bukan null/fallback admin)
  saat tidak ada cookie. Return type non-null.
- `UserMenuButton`: 2 mode tampilan (guest vs login)
- Seed: buat 3 role sistem (Administrator, Editor, Viewer) + user Robby sebagai Editor

### Removed
- Role "Anggota" (diganti Editor + Viewer)

---

## [1.1.0] — 2026-09-09

### Added — Refactor Besar

#### Database
- **Hapus Prisma ORM** → ganti dengan **better-sqlite3** (raw SQLite, tanpa Cloud/SaaS)
- Schema SQLite di `db/schema.sql` (4 tabel: person, partnership, user, role)
- Koneksi better-sqlite3 dengan auto-init skema (WAL mode, foreign keys ON)
- Semua API routes dimigrasi ke prepared statements

#### Visualisasi
- **D3.js vertical layout** menggantikan CSS connectors
  - `d3.hierarchy` + `d3.tree().nodeSize([420, 180])`
  - SVG rendering dengan kartu orang (avatar, gender strip, dates)
  - Curved links antar generasi
  - Zoom & pan (d3.zoom, wheel + drag)
  - Multiple roots side-by-side
  - Dark mode aware (MutationObserver)

#### Tema & Visual
- **Tema gelap & terang** dengan next-themes + toggle button
- **Logo tarombo-bg02.png** di header (menggantikan icon Users)
- **Background image** tarombo-bg02.png di body (subtle, overlay semi-transparan)
- **Watermark** tarombo-bg02.png di setiap export (tengah, proporsional, opacity 10%)

### Changed
- `package.json`: hapus script prisma, tambah `db:init`
- `lib/db.ts`: rewrite untuk better-sqlite3
- `lib/tarombo/queries.ts`: rewrite tanpa Prisma (prepared statements)
- `lib/tarombo/auth.ts`: rewrite untuk SQLite
- Semua API routes: migrasi dari Prisma ke better-sqlite3

### Removed
- Prisma ORM (schema.prisma, dependensi prisma & @prisma/client)
- CSS connectors di family-tree.tsx (diganti D3.js)

### Constraints
- Tanpa Cloud, S3, SaaS, MinIO
- Tanpa AI, GEDCOM
- Tanpa layanan eksternal apapun

---

## [1.0.4] — 2026-09-09

### Added
- **Scrollbar** di sheet Kelola Role & Kelola Pengguna (`overflow-y-scroll`)
- **Scrollbar** di tab Daftar (daftar orang)
- **Scrollbar** di panel profil orang & form Edit/Tambah Orang

### Changed
- Ganti `ScrollArea` (Radix, sembunyikan scrollbar native) dengan div native
  `overflow-y-scroll` + class `tarombo-scroll` agar scrollbar kustom terlihat
- Tambah dukungan Firefox (`scrollbar-width`, `scrollbar-color`) di globals.css

---

## [1.0.3] — 2026-09-09

### Added
- **Export PDF (Multiple)**: PDF dengan tiap leluhur pada halaman terpisah
- **Export PDF Ukuran Besar**: PDF single-page tanpa pagination (untuk plotter)
- **Export JPG**: gambar JPG dengan kompresi
- **Watermark** di setiap file export (tengah, proporsional)
- **Pemisahan data User vs Person**: User = akun aplikasi, Person = anggota pohon

### Changed
- `buildExportDocument()`: inject watermark base64 di tengah dokumen
- Export route: tambah parameter `size` (A4/A3/A2/A1/LARGE)
- `userSchema`: ganti `role` (string enum) → `roleId` (relasi ke Role)

---

## [1.0.2] — 2026-09-09

### Added
- **RBAC kustomisasi admin**: model Role, 13 permission dalam 6 grup
- **RoleManagementSheet**: admin bisa kelola role & matrix permission
- **Enforcement dua lapis**: API (403) + UI (gating tombol)
- **Permission catalog**: `person:view`, `person:create`, `person:edit`, `person:delete`,
  `partnership:create`, `partnership:edit`, `partnership:delete`, `user:view`, `user:manage`,
  `role:manage`, `export:view`, `data:seed`, `data:reset`
- **Hook `useActiveUser()`**: `{ user, can, canAny, canAll }` untuk gating UI
- **User Management**: CRUD user, tautkan ke Person, set role

### Changed
- `User.role` (string) → `User.roleId` (relasi ke Role)
- Semua API routes: tambah `requirePermission(perm)` check
- Header: gate tombol Export/Pasangan/Tambah Orang/Seed/Reset berdasarkan permission
- PersonDetailPanel: gate tombol Edit/Tambah Anak/Pasangan/Hapus

---

## [1.0.1] — 2026-09-09

### Added
- **Export PDF/PNG/JPG** via headless Chromium (Playwright)
  - 6 format: PDF A3, PDF A4, Multiple PDF, PDF Large, PNG, JPG
  - HTML renderer mandiri dengan header, legenda, tree, footer
  - Watermark logo di tengah dokumen
  - ExportDialog dengan pilihan format & ruang lingkup
- **Pemisahan data User vs Person**: User = akun pengguna, Person = anggota pohon
- **User Management Sheet**: CRUD pengguna, tautkan ke Person
- **UserMenuButton** di header: dropdown switch user
- **Endpoint `/api/users/active`**: ambil/set user aktif via cookie
- **Playwright singleton service**: satu instance browser dipakai ulang

### Changed
- Seed: buat 2 user default (admin + member Robby ter-link ke Person)

---

## [1.0.0] — 2026-09-09

### Added — Initial Release

#### Core
- **Next.js 16 App Router** + TypeScript 5
- **Prisma ORM** + SQLite database
- **Tailwind CSS 4** + shadcn/ui (New York style)
- **React Query** (TanStack) untuk server state
- **Tema hangat budaya Batak** (marun, emas, krem — tanpa blue/indigo)

#### Manajemen Silsilah
- **CRUD Person**: nama, nama panggilan, tempat/tanggal lahir & wafat, nomor urut
  kelahiran, jenis kelamin, alamat, agama, telepon, photo, status pernikahan,
  nomor generasi, lokasi pemakaman (nama, alamat, lat, lng)
- **CRUD Partnership**: suami-istri, tanggal menikah/cerai, status
- **Relasi orang tua**: fatherId & motherId (opsional — "belum sebagai tentu orang tua")
- **Pohon tarombo visual**: CSS connectors, zoom & pan, recursive tree

#### Logika Bisnis
- **Auto-cerai saat pasangan meninggal**: `deathDate` diset → partnership AKTIF
  otomatis WIDOWED dengan `divorceDate = deathDate`
- **Maks 1 pasangan aktif**: validasi `assertNoActivePartner()`
- **Sinkronisasi maritalStatus**: dari status partnership
- **Root detection**: `findRootAncestors()` tanpa duplikasi (handle pasangan menikah-masuk)

#### UI/UX
- **Dashboard layout**: header + tree + sidebar (Daftar/Detail tabs) + footer sticky
- **Stats cards**: total orang, pasangan aktif, janda/duda, hidup, wafat
- **PersonDetailPanel**: profil, orang tua, pasangan, anak, lokasi pemakaman + link peta
- **PersonFormSheet**: form multi-section (Identitas, Kontak, Orang Tua, Status, Pemakaman)
- **PartnershipFormDialog**: form tambah pasangan
- **Search & filter**: cari orang, filter root, gender, alive
- **Responsive**: mobile & desktop
- **Toast notifications** (sonner)

#### API
- `GET/POST /api/persons`, `GET/PATCH/DELETE /api/persons/[id]`
- `GET/POST /api/partnerships`, `GET/PATCH/DELETE /api/partnerships/[id]`
- `GET /api/tree` (pohon silsilah rekursif)
- `GET /api/stats` (statistik dashboard)
- `POST/DELETE /api/seed` (data contoh)

#### Seed Data
- 13 orang, 4 pasangan, 4 generasi (Batak-style)
- Kasus: leluhur wafat, pasangan janda/duda, dll

---

## Versioning

Proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/):

- **MAJOR** (X.0.0): breaking changes (incompatible API changes)
- **MINOR** (1.X.0): fitur baru backward-compatible
- **PATCH** (1.0.X): bug fix backward-compatible

---

## Links

- [Releases](https://github.com/imanueli2312/tarombo/releases)
- [Commits](https://github.com/imanueli2312/tarombo/commits/main)
- [Issues](https://github.com/imanueli2312/tarombo/issues)

---

**Format**: [Keep a Changelog](https://keepachangelog.com/id/1.0.0/)
