# 🌳 Tarombo — Sistem Silsilah Keluarga Batak

Aplikasi full-stack manajemen pohon silsilah keluarga (Tarombo) dengan visualisasi D3.js, RBAC yang dapat dikustomisasi, export PDF/gambar dengan watermark, dan database SQLite lokal.

![Tarombo](public/tarombo-bg02.png)

## 📚 Dokumentasi

| Dokumen | Deskripsi |
|---------|-----------|
| **[README.md](README.md)** | Dokumen utama (ini) — fitur, instalasi, penggunaan |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Arsitektur sistem, alur data, keputusan desain |
| **[API.md](API.md)** | Referensi API lengkap (21 endpoints) dengan contoh |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Panduan deployment produksi (PM2, Docker, Nginx) |
| **[SECURITY.md](SECURITY.md)** | Kebijakan keamanan & pelaporan vulnerability |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Panduan kontribusi untuk developer |
| **[CHANGELOG.md](CHANGELOG.md)** | Riwayat versi & perubahan |

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Instalasi Cepat](#-instalasi-cepat)
- [Panduan Penggunaan](#-panduan-penggunaan)
- [RBAC & Permission](#-rbac--permission)
- [API Reference](#-api-reference)
- [Struktur Proyek](#-struktur-proyek)
- [Database Schema](#-database-schema)
- [Fitur Lengkap](#-fitur-lengkap)
- [Troubleshooting](#-troubleshooting)
- [Lisensi](#-lisensi)

---

## 🚀 Fitur Utama

### Manajemen Silsilah Keluarga
- ✅ **Pohon tarombo visual** dengan D3.js (layout vertikal, root di atas)
- ✅ **CRUD lengkap** untuk orang (Person) & pasangan (Partnership)
- ✅ **Logika bisnis otomatis**: pasangan aktif maksimal 1, auto-cerai saat pasangan meninggal
- ✅ **Validasi integritas data**: tanggal (lahir < wafat, anak > ortu), deteksi siklus, deteksi duplikat
- ✅ **Lokasi pemakaman** dengan koordinat GPS (lat/lng) + link peta

### RBAC (Role-Based Access Control)
- ✅ **3 role default**: Viewer (publik, tanpa login), Editor (login), Administrator (login)
- ✅ **13 permission** dalam 6 grup, dapat dikustomisasi admin
- ✅ **Viewer publik** — bisa lihat pohon & export tanpa akun
- ✅ **Login wajib** untuk Editor & Administrator (password bcrypt hashing)
- ✅ **Audit trail** — semua aksi tercatat di activity log

### Export & Backup
- ✅ **Export PDF** (A4/A3/Multiple/Large), PNG, JPG dengan watermark logo
- ✅ **Export subset**: hanya yang hidup, batasi generasi, atau per cabang
- ✅ **Backup & Restore** JSON (download/upload seluruh data)

### UX & Visual
- ✅ **Tema gelap & terang** dengan toggle
- ✅ **Logo & background** tarombo-bg02.png
- ✅ **Watermark** di setiap file export (tengah, proporsional)
- ✅ **Zoom & pan** pohon, minimap, collapse/expand subtree
- ✅ **Keyboard navigation** (arrow keys)
- ✅ **Soft delete & Trash** (restore data terhapus)
- ✅ **Photo upload** lokal (resize sharp → webp)
- ✅ **Responsif** mobile & desktop

---

## 🛠 Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| **Framework** | Next.js 16 (App Router) + TypeScript 5 |
| **Database** | SQLite (better-sqlite3) — **tanpa Cloud/SaaS/Prisma** |
| **Visualisasi** | D3.js (vertical tree layout, SVG) |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) |
| **State** | React Query (TanStack) + Zustand |
| **Auth** | Cookie-based + bcrypt password hashing |
| **Export** | Playwright (headless Chromium) + sharp |
| **Icons** | lucide-react |
| **Tema** | next-themes (dark/light) |

### Yang TIDAK digunakan (sesuai constraint)
- ❌ Cloud / S3 / MinIO — murni file lokal
- ❌ Prisma ORM — raw SQLite via better-sqlite3
- ❌ AI / GEDCOM
- ❌ Layanan eksternal apapun

---

## ⚡ Instalasi Cepat

### Prasyarat
- **Node.js** 18+ (atau Bun)
- **npm** / **bun** package manager

### Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo

# 2. Install dependencies
npm install
# atau: bun install

# 3. Inisialisasi database SQLite
npm run db:init
# atau: node -e "const s=require('better-sqlite3')('./db/custom.db');s.exec(require('fs').readFileSync('./db/schema.sql','utf-8'));s.close()"

# 4. Jalankan dev server
npm run dev
```

Buka http://localhost:3000 → klik menu **⋮** → **"Muat Data Contoh"** untuk mengisi data keluarga contoh.

### Konfigurasi Windows

Script `dev` default pakai `tee` (Unix-only). Edit `package.json`:

```json
"dev": "next dev -p 3000",
```

Lalu jalankan `npm run dev`.

---

## 📖 Panduan Penggunaan

### Sebagai Viewer (Tanpa Login)

1. Buka aplikasi — otomatis masuk sebagai "Tamu" (Viewer)
2. Bisa **melihat pohon tarombo** dan **export** PDF/PNG/JPG
3. **Tidak bisa** edit/tambah/hapus data
4. Klik tombol **"Login"** di header untuk akses lebih

### Login sebagai Administrator

1. Klik avatar "Tamu" → pilih **"Administrator Tarombo"**
2. Masukkan password: `admin123`
3. Akses penuh: tambah/edit/hapus, kelola user & role, backup, reset data

### Login sebagai Editor

1. Klik avatar "Tamu" → pilih **"Robby Adithama Sianipar"**
2. Masukkan password: `robby123`
3. Bisa tambah/edit orang & pasangan, export
4. **Tidak bisa** hapus, kelola user/role, reset data

### Akun Demo

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@tarombo.id | `admin123` |
| Editor | robby@tarombo.id | `robby123` |
| Viewer | (publik, tanpa akun) | — |

### Operasi Umum

**Tambah Orang**: Header → "Tambah Orang" → isi form → "Simpan"

**Edit Orang**: Klik kartu di pohon → "Edit" → ubah → "Simpan Perubahan"

**Tambah Pasangan**: Header → "Pasangan" → pilih suami & istri → "Simpan"

**Export Pohon**: Header → "Export" → pilih format (PDF A3/A4/Large/Multiple, PNG, JPG) → "Export Sekarang"

**Backup Data**: Header → ⋮ → "Backup & Restore" → "Unduh Backup JSON"

**Kelola Role**: Header → avatar → "Kelola Role & Permission" → toggle permission per role

**Lihat Activity Log**: Header → ⋮ → "Riwayat Aktivitas"

**Restore Data Terhapus**: Header → ⋮ → "Tempat Sampah" → "Pulihkan"

---

## 🔐 RBAC & Permission

### 3 Role Default

| Role | Permission | Akses |
|------|-----------|-------|
| **Viewer** | `person:view`, `export:view` | Read-only, **tanpa login** (publik) |
| **Editor** | view + create + edit (person & partnership) + export | Login wajib, tidak bisa hapus/manage |
| **Administrator** | semua 13 permission | Login wajib, akses penuh |

### Katalog Permission (13 permission, 6 grup)

| Grup | Permission | Deskripsi |
|------|-----------|-----------|
| **Orang** | `person:view` | Lihat daftar & detail orang |
| | `person:create` | Tambah orang baru |
| | `person:edit` | Ubah data orang |
| | `person:delete` | Hapus orang (soft delete) |
| **Pasangan** | `partnership:create` | Tambah pasangan |
| | `partnership:edit` | Ubah data pasangan |
| | `partnership:delete` | Hapus pasangan |
| **Pengguna** | `user:view` | Lihat daftar pengguna |
| | `user:manage` | Kelola pengguna (CRUD) |
| **Role** | `role:manage` | Kelola role & permission (admin only) |
| **Export** | `export:view` | Export pohon ke PDF/gambar |
| **Data** | `data:seed` | Muat data contoh |
| | `data:reset` | Reset semua data |

### Kustomisasi RBAC

Administrator bisa:
1. **Buat role baru** dengan permission apa saja
2. **Edit permission** role (toggle on/off per permission)
3. **Hapus role custom** (role sistem tidak bisa dihapus)
4. **Tetapkan user ke role** mana saja

Akses via: Header → avatar → "Kelola Role & Permission"

### Enforcement Dua Lapis

- **API (server-side)**: setiap route cek `requirePermission(perm)` → 403 bila tidak berhak
- **UI (client-side)**: tombol/menu disembunyikan via `useActiveUser().can(perm)`

---

## 📡 API Reference

### Persons
| Method | Endpoint | Permission | Deskripsi |
|--------|----------|-----------|-----------|
| GET | `/api/persons?q=&gender=&alive=&root=` | `person:view` | Daftar orang (filter opsional) |
| POST | `/api/persons` | `person:create` | Tambah orang baru |
| GET | `/api/persons/[id]` | `person:view` | Detail orang + relasi |
| PATCH | `/api/persons/[id]` | `person:edit` | Update orang |
| DELETE | `/api/persons/[id]` | `person:delete` | Soft delete → trash |

### Partnerships
| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/api/partnerships?status=&personId=` | `person:view` |
| POST | `/api/partnerships` | `partnership:create` |
| GET | `/api/partnerships/[id]` | `person:view` |
| PATCH | `/api/partnerships/[id]` | `partnership:edit` |
| DELETE | `/api/partnerships/[id]` | `partnership:delete` |

### Users & Auth
| Method | Endpoint | Permission | Deskripsi |
|--------|----------|-----------|-----------|
| GET | `/api/users` | `user:view` | Daftar pengguna |
| POST | `/api/users` | `user:manage` | Tambah pengguna |
| GET | `/api/users/[id]` | `user:view` | Detail pengguna |
| PATCH | `/api/users/[id]` | `user:manage` | Update pengguna |
| DELETE | `/api/users/[id]` | `user:manage` | Hapus pengguna |
| GET | `/api/users/active` | publik | User aktif (guest bila no cookie) |
| POST | `/api/users/active` | publik | Login (verify bcrypt) |
| DELETE | `/api/users/active` | publik | Logout |
| GET | `/api/users/list-public` | publik | Daftar user minimal (untuk login dropdown) |

### Roles
| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/api/roles` | `user:view` |
| POST | `/api/roles` | `role:manage` |
| GET | `/api/roles/[id]` | `user:view` |
| PATCH | `/api/roles/[id]` | `role:manage` |
| DELETE | `/api/roles/[id]` | `role:manage` |

### Tree & Stats
| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/api/tree?rootId=` | `person:view` |
| GET | `/api/stats` | publik |

### Export
| Method | Endpoint | Permission | Params |
|--------|----------|-----------|--------|
| GET | `/api/export` | `export:view` | `format=pdf\|png\|jpg`, `scope=all\|current`, `size=A4\|A3\|A2\|A1\|LARGE`, `rootId=`, `aliveOnly=true`, `maxGeneration=N`, `subtreeFrom=` |

### Backup & Restore
| Method | Endpoint | Permission | Deskripsi |
|--------|----------|-----------|-----------|
| GET | `/api/backup` | `data:reset` | Download JSON backup |
| POST | `/api/backup` | `data:reset` | Restore dari JSON (merge mode) |

### Photo Upload
| Method | Endpoint | Permission | Deskripsi |
|--------|----------|-----------|-----------|
| POST | `/api/photo-upload` | `person:edit` atau `person:create` | Upload gambar (FormData) → resize 400x400 webp |

### Activity Log
| Method | Endpoint | Permission | Params |
|--------|----------|-----------|--------|
| GET | `/api/activity-log` | `user:view` | `limit=`, `entityType=`, `action=` |

### Trash (Soft Delete)
| Method | Endpoint | Permission | Deskripsi |
|--------|----------|-----------|-----------|
| GET | `/api/trash?type=` | `person:delete` | Daftar item di trash |
| DELETE | `/api/trash` | `person:delete` | Kosongkan trash (permanent) |
| POST | `/api/trash/[id]/restore` | `person:delete` | Restore item |
| DELETE | `/api/trash/[id]/permanent` | `person:delete` | Hapus permanen |

### Seed
| Method | Endpoint | Permission | Deskripsi |
|--------|----------|-----------|-----------|
| POST | `/api/seed` | `data:seed` (kecuali first-run) | Muat data contoh |
| DELETE | `/api/seed` | `data:reset` | Reset semua data |

---

## 📁 Struktur Proyek

```
tarombo/
├── db/
│   ├── schema.sql              # Skema SQLite (4 tabel + indexes)
│   └── custom.db               # Database (auto-generated, gitignored)
├── public/
│   ├── tarombo-bg02.png        # Logo + background + watermark
│   └── uploads/                # Photo upload (gitignored)
├── src/
│   ├── app/
│   │   ├── api/                # 21 API routes (lihat API Reference)
│   │   ├── globals.css         # Tema hangat + scrollbar + watermark CSS
│   │   ├── layout.tsx          # Root layout (ThemeProvider, Providers)
│   │   └── page.tsx            # Halaman utama (orchestrator)
│   ├── components/
│   │   ├── providers.tsx       # React Query provider
│   │   ├── theme-provider.tsx  # next-themes wrapper
│   │   ├── theme-toggle.tsx    # Tombol dark/light
│   │   ├── tarombo/
│   │   │   ├── app-header.tsx          # Header (logo, tombol, user menu)
│   │   │   ├── family-tree.tsx         # D3.js vertical tree + zoom/minimap/keyboard
│   │   │   ├── person-form-sheet.tsx   # Form tambah/edit orang + photo upload
│   │   │   ├── person-detail-panel.tsx # Panel detail orang
│   │   │   ├── person-search-list.tsx # Daftar orang + search
│   │   │   ├── partnership-form-dialog.tsx
│   │   │   ├── export-dialog.tsx       # Export dengan subset filter
│   │   │   ├── backup-dialog.tsx       # Backup & restore JSON
│   │   │   ├── activity-log-sheet.tsx  # Riwayat aktivitas
│   │   │   ├── trash-sheet.tsx         # Tempat sampah + restore
│   │   │   ├── role-management-sheet.tsx # Kelola role & permission
│   │   │   ├── user-management-sheet.tsx # Kelola pengguna
│   │   │   ├── login-dialog.tsx        # Login dengan password
│   │   │   ├── photo-upload-button.tsx  # Upload photo
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── stats-cards.tsx
│   │   │   ├── person-node-card.tsx
│   │   │   └── tree-node.tsx
│   │   └── ui/                 # shadcn/ui components
│   └── lib/
│       ├── db.ts               # Koneksi better-sqlite3 + auto-init schema
│       ├── utils.ts            # cn() helper
│       └── tarombo/
│           ├── types.ts        # Tipe & validator Zod (person, user, role, dll)
│           ├── queries.ts      # Fungsi akses data (buildFamilyTree, dll)
│           ├── auth.ts         # getActiveUser, requirePermission, RBAC
│           ├── permissions.ts  # Katalog 13 permission + default roles
│           ├── security.ts     # bcrypt, activity log, validasi integritas
│           ├── export-html.ts  # HTML renderer untuk export + watermark
│           ├── playwright-service.ts # Headless browser untuk PDF/image
│           ├── api-client.ts   # Fetch wrapper (client-side)
│           └── use-permissions.ts # useActiveUser() hook
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

---

## 🗄 Database Schema

### Tabel `person` (anggota keluarga)
```sql
id, full_name, nickname, birth_place, birth_date, death_date,
birth_order, gender (MALE/FEMALE), address, religion, phone, photo,
marital_status (SINGLE/MARRIED/DIVORCED/WIDOWED), generation_number,
burial_name, burial_address, burial_lat, burial_lng,
father_id (→person), mother_id (→person),
deleted_at (soft delete), created_at, updated_at
```

### Tabel `partnership` (pasangan suami-istri)
```sql
id, husband_id (→person), wife_id (→person),
marriage_date, divorce_date, status (ACTIVE/DIVORCED/WIDOWED),
deleted_at (soft delete), created_at, updated_at
```

### Tabel `user` (akun pengguna)
```sql
id, email (unique), name, password (bcrypt hash),
photo, phone, role_id (→role), linked_person_id (→person),
last_login_at, created_at, updated_at
```

### Tabel `role` (RBAC)
```sql
id, name (unique), description, color, icon,
permissions (JSON string array), is_system (0/1),
sort_order, created_at, updated_at
```

### Tabel `activity_log` (audit trail)
```sql
id, user_id, user_name, action (create/update/delete/restore/login/logout/seed/reset/export/backup_restore),
entity_type (person/partnership/user/role/data), entity_id, entity_name,
details (JSON), created_at
```

### Logika Bisnis

1. **Auto-cerai saat pasangan meninggal**: saat `death_date` diset, partnership AKTIF → `WIDOWED`, `divorce_date = death_date`
2. **Maks 1 pasangan aktif**: validasi `assertNoActivePartner()` sebelum create/activate
3. **Validasi temporal**: `death > birth`, `child_birth > parent_birth`, `marriage > birth`, `divorce > marriage`
4. **Cycle detection**: `wouldCreateCycle()` traverse ancestors sebelum set parent
5. **Soft delete**: DELETE → set `deleted_at`, tidak hapus fisik. Restore dari Trash.

---

## 🎨 Fitur Lengkap

### Visualisasi Pohon (D3.js)
- Layout vertikal (root atas, anak bawah)
- SVG dengan kartu orang (avatar, nama, tanggal, gender strip)
- Pasangan di sisi kanan dengan badge status
- **Zoom & pan** (mouse wheel + drag)
- **Collapse/expand** subtree (toggle ▼/▶)
- **Minimap** (overview pojok kiri bawah)
- **Keyboard navigation** (arrow keys, Enter, Escape)
- **Dark mode aware** (re-render saat tema ganti)

### Export
- **6 format**: PDF A3, PDF A4, Multiple PDF, PDF Large (single page), PNG, JPG
- **Watermark**: logo tarombo-bg02.png di tengah (opacity 10%, proporsional)
- **Subset filter**: `aliveOnly`, `maxGeneration`, `subtreeFrom`
- **Header dokumen**: judul, info export, legenda warna

### Backup & Restore
- **Backup**: download JSON (`{version, exportedAt, data: {persons, partnerships, users, roles}}`)
- **Restore**: upload JSON, merge mode (`INSERT OR IGNORE` — tidak timpa data existing)

### Photo Upload
- Upload file gambar dari komputer
- Auto-resize 400×400 dengan sharp
- Convert ke WebP (efisiensi ukuran)
- Disimpan di `public/uploads/` (lokal, tanpa Cloud)

### Activity Log
- Mencatat: create, update, delete, restore, login, logout, seed, reset, export, backup_restore
- Filter by `entityType` & `action`
- Tampilan: icon per action, timestamp, detail

### Soft Delete & Trash
- DELETE person → soft delete (set `deleted_at`)
- Trash sheet: daftar item terhapus
- Restore: kembalikan ke pohon
- Permanent delete: hapus fisik
- Empty trash: hapus semua permanen

### Validasi Integritas Data
- **Temporal**: tanggal wafat harus setelah lahir, anak harus lahir setelah ortu
- **Cycle**: tidak boleh menjadikan keturunan sebagai leluhur
- **Self-parent**: tidak boleh jadi ayah/ibu diri sendiri
- **Duplikat**: deteksi nama + tanggal lahir sama

### Tema & Visual
- **Tema gelap/terang** dengan toggle (next-themes)
- **Logo** tarombo-bg02.png di header
- **Background** tarombo-bg02.png di body (subtle, overlay semi-transparan)
- **Palet hangat** budaya Batak (marun, emas, krem — tanpa blue/indigo)

---

## 🔧 Troubleshooting

### Server tidak jalan
```bash
# Cek Node.js version (harus 18+)
node --version

# Hapus .next cache
rm -rf .next

# Restart
npm run dev
```

### Database error / schema berubah
```bash
# Hapus database lama
rm db/custom.db db/custom.db-wal db/custom.db-shm

# Re-init
npm run db:init

# Re-seed data
# (via UI: menu ⋮ → "Muat Data Contoh")
```

### Windows: `tee` not recognized
Edit `package.json`, ubah:
```json
"dev": "next dev -p 3000",
```

### Export PDF/PNG error (Playwright)
```bash
# Install browser binary
npx playwright install chromium
```

### Login gagal
- Pastikan sudah seed data (menu ⋮ → "Muat Data Contoh")
- Password default: `admin123` (admin), `robby123` (editor)
- Password disimpan sebagai bcrypt hash — cek di DB: `SELECT password FROM user` (harus dimulai `$2a$` atau `$2b$`)

### Permission denied (403)
- Viewer (guest) tidak bisa edit — login sebagai Editor/Admin
- Editor tidak bisa hapus/manage — login sebagai Admin
- Cek permission di "Kelola Role & Permission"

### Git pull conflict (package.json)
```bash
git stash
git pull origin main
git stash drop  # buang edit lokal
```

---

## 📜 Lisensi

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan.

---

## 🤝 Kontribusi

Untuk kontribusi, silakan buat pull request. Pastikan:
1. Lint bersih (`npm run lint`)
2. Tidak ada file sensitif ter-commit (db, .env, uploads)
3. Test manual fitur yang diubah

---

## 📞 Dukungan

Untuk pertanyaan atau masalah, buat issue di [GitHub Issues](https://github.com/imanueli2312/tarombo/issues).

---

**Tarombo** — Dibangun dengan Next.js, D3.js, better-sqlite3, dan Tailwind CSS.
