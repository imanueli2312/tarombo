# Tarombo Marga Hariandja

> Sistem Pohon Keluarga Digital Marga Hariandja — Digital Family Tree System for the Hariandja Clan

Tarombo Marga Hariandja adalah aplikasi web fullstack untuk mengelola dan memvisualisasikan silsilah keluarga (tarombo) marga Hariandja secara digital. Aplikasi ini dibangun dengan tema tradisional Batak Toba, menghadirkan nuansa ukiran gorga, kain ulos, dan warna khas budaya Batak dalam setiap tampilannya.

---

## Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | SQLite via Prisma ORM |
| Styling | Tailwind CSS 4 + shadcn/ui (New York style) |
| Tree Visualization | D3.js (zoom, pan, search, SVG export) |
| Authentication | NextAuth.js v4 (JWT sessions) |
| State Management | Zustand (client), TanStack Query (server) |
| UI Components | shadcn/ui + Lucide icons |
| Charts | Recharts |
| Form Validation | Zod + React Hook Form |
| Password Hashing | bcryptjs |
| Photo Processing | Sharp (auto-compress) |
| Runtime | Bun |

---

## Design Theme

Aplikasi menggunakan palet warna tradisional Batak Toba yang diterapkan secara konsisten di seluruh komponen:

| Warna | Kode | Kegunaan |
|---|---|---|
| ![#7F1D1D](https://via.placeholder.com/16/7F1D1D/7F1D1D) Maroon | `#7F1D1D` | Primary — tombol, heading, border laki-laki |
| ![#DAA520](https://via.placeholder.com/16/DAA520/DAA520) Gold | `#DAA520` | Accent — aksen, sidebar, highlight, badge generasi |
| ![#1C1410](https://via.placeholder.com/16/1C1410/1C1410) Dark Wood | `#1C1410` | Sidebar, footer — nuansa kayu ukiran |
| ![#FDF6E3](https://via.placeholder.com/16/FDF6E3/FDF6E3) Cream | `#FDF6E3` | Background utama, kartu |
| ![#3E2723](https://via.placeholder.com/16/3E2723/3E2723) Dark Brown | `#3E2723` | Teks utama |
| ![#D4A574](https://via.placeholder.com/16/D4A574/D4A574) Tan | `#D4A574` | Border, link, garis pohon keluarga |

Elemen dekoratif Batak:
- **Pola Gorga** — border dan header dengan motif ukiran tradisional
- **Kain Ulos** — pola garis tenun sebagai elemen visual
- **Rumah Bolon** — aset visual rumah adat Batak

---

## Key Features

### Pohon Tarombo (Family Tree Visualization)
- Visualisasi pohon keluarga interaktif menggunakan D3.js
- Zoom, pan, dan navigasi keyboard
- Pencarian anggota keluarga dengan highlight dan zoom otomatis
- Label generasi menggunakan angka Romawi (Gen I–X)
- Penanda pasangan (spouse) di setiap node
- Indikator almarhum/almahrumah (✝)
- Simbol gender (♂/♀) dan kode warna node
- Export ke SVG — satu klik unduh pohon keluarga lengkap
- Toolbar kontrol zoom dan reset tampilan

### Manajemen Anggota (CRUD)
- Tambah, lihat, edit, dan hapus anggota keluarga
- Upload foto dengan kompresi otomatis (max 800px, JPEG quality 80)
- Data lengkap: nama, panggilan, tempat/tanggal lahir, agama, alamat, telepon
- Link ke ayah, ibu, dan pasangan
- Urutan anak (birth order)

### Manajemen Pernikahan
- Pencatatan pernikahan dengan status AKTIF / TIDAK AKTIF / CERAI
- Mendukung skenario pernikahan ulang (re-activation)
- Validasi: maksimal 1 pasangan aktif per orang, tidak boleh menikah dengan diri sendiri

### Logika Bisnis Cerdas
- **Auto-Divorce on Death** — ketika seseorang ditandai meninggal, semua pernikahan aktif otomatis dinonaktifkan dan status pasangan diubah menjadi DUDA/JANDA
- **Circular Reference Prevention** — mencegah penentuan keturunan sebagai orang tua (deteksi siklus rekursif hingga kedalaman 50)
- **Validasi Tanggal** — logis: kematian setelah lahir, tidak ada tanggal di masa depan, perceraian setelah pernikahan
- **Cycle Protection** — `buildTree()` dilindungi dari infinite recursion dengan `visited` Set dan `depth` counter

### Keamanan & Akses
- **RBAC** — 3 peran: `ADMIN` (akses penuh), `EDITOR` (buat/edit), `VIEWER` (baca saja)
- **Rate Limiting** — proteksi brute force login (5 percobaan / 15 menit)
- **Audit Logging** — semua mutasi data dicatat (pengguna, aksi, resource, IP, timestamp)
- **Session Management** — JWT dengan masa berlaku 24 jam
- **Password Strength** — minimal 8 karakter, 1 huruf besar, 1 angka

### Dashboard Statistik
- 6 kartu statistik: Total Anggota, Laki-laki, Perempuan, Generasi, Rata-rata Umur, Pernikahan Aktif
- Pie chart distribusi gender
- Bar chart status pernikahan
- Kartu anggota terbaru

### Backup & Restore
- Export seluruh data (person, marriage, audit log) ke JSON
- Import data dari JSON dengan validasi struktur dan ID remapping
- Transaksional — rollback otomatis jika gagal
- Tidak menyertakan data user/password

### Fitur Lainnya
- **Dark Mode** — toggle tema terang/gelap
- **i18n** — 3 bahasa: Bahasa Indonesia, English, Bahasa Batak Toba (bbc)
- **Responsive Design** — mobile-first dengan sidebar collapsible
- **Notifikasi** — polling 30 detik untuk mendeteksi perubahan dari pengguna lain
- **Error Boundary** — penanganan error dengan opsi pemulihan
- **Pagination** — server-side pagination untuk daftar anggota dan pernikahan

---

## Pages / Views

Aplikasi terdiri dari **13 tampilan** yang semuanya dapat diakses melalui sidebar:

| # | Tampilan | Deskripsi |
|---|---|---|
| 1 | Login | Halaman autentikasi |
| 2 | Register | Pendaftaran pengguna baru |
| 3 | Cari Keluarga | Pencarian anggota keluarga (halaman utama setelah login) |
| 4 | Dashboard | Statistik dan grafik keluarga |
| 5 | Pohon Tarombo | Visualisasi pohon keluarga interaktif (D3.js) |
| 6 | Data Anggota | Daftar anggota dengan paginasi, pencarian, dan filter |
| 7 | Detail Anggota | Profil lengkap dengan orang tua, anak, dan pasangan |
| 8 | Form Anggota | Tambah/edit anggota dengan validasi |
| 9 | Data Pernikahan | Daftar semua pernikahan |
| 10 | Kelola Pengguna | Manajemen pengguna (ADMIN only) |
| 11 | Pencadangan Data | Export/import backup (ADMIN only) |
| 12 | Log Audit | Riwayat aksi pengguna (ADMIN only) |
| 13 | Ganti Password | Ubah password dengan indikator kekuatan |

---

## Database Schema

```
User
├── id            (cuid, PK)
├── email         (unique)
├── name
├── password      (bcrypt hash)
├── role          (ADMIN | EDITOR | VIEWER)
├── isActive      (boolean)
├── createdAt
└── updatedAt

Person
├── id            (cuid, PK)
├── fullName
├── nickname
├── birthPlace
├── birthDate
├── deathPlace
├── deathDate
├── birthOrder    (integer)
├── gender        (MALE | FEMALE)
├── address
├── religion
├── phone
├── photoPath
├── maritalStatus (SINGLE | MARRIED | WIDOWED | DIVORCED)
├── isDeceased    (boolean)
├── fatherId      (FK → Person)
├── motherId      (FK → Person)
├── createdAt
└── updatedAt

Marriage
├── id            (cuid, PK)
├── husbandId     (FK → Person)
├── wifeId        (FK → Person)
├── marriageDate
├── divorceDate
├── isActive      (boolean)
├── createdAt
└── updatedAt

AuditLog
├── id            (cuid, PK)
├── userId        (FK → User)
├── userName
├── action        (CREATE_PERSON, UPDATE_PERSON, DELETE_PERSON, etc.)
├── resource
├── resourceId
├── details       (JSON string)
├── ipAddress
└── createdAt
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/register` | Registrasi pengguna baru |
| POST/GET | `/api/auth/[...nextauth]` | NextAuth login/callback/session |
| PUT | `/api/auth/password` | Ganti password |

### Persons
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET/POST | `/api/persons` | Daftar (paginated) / Tambah anggota |
| GET/PUT/DELETE | `/api/persons/[id]` | Detail / Update / Hapus anggota |
| GET | `/api/persons/[id]/eligible-parents` | Kandidat orang tua (exclude keturunan) |

### Marriages
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET/POST | `/api/marriages` | Daftar / Tambah pernikahan |
| PUT/DELETE | `/api/marriages/[id]` | Update / Hapus pernikahan |

### Tree & Search
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/tree` | Struktur pohon keluarga lengkap untuk D3.js |

### Admin
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET/POST | `/api/users` | Daftar / Tambah pengguna |
| GET/PUT/DELETE | `/api/users/[id]` | Detail / Update / Hapus pengguna |
| GET/POST | `/api/backup` | Export / Import data backup |
| GET | `/api/audit-logs` | Riwayat audit log (paginated) |

### Utility
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/stats` | Statistik dashboard |
| POST | `/api/upload` | Upload foto anggota |
| GET | `/api/notifications` | Cek perubahan data terbaru |
| GET | `/api/seed` | Seed database dengan data sampel |

---

## Getting Started

### Prasyarat
- [Bun](https://bun.sh/) (runtime & package manager)

### Instalasi

```bash
# Clone repository
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo

# Install dependencies
bun install

# Setup database (membuat SQLite & menjalankan Prisma)
bun run db:push

# Seed data awal (opsional)
# Buka browser ke http://localhost:3000/api/seed
# atau gunakan tombol "Seed Data Awal" di sidebar

# Jalankan development server
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Default Credentials

| Field | Value |
|---|---|
| Email | `admin@hariandja.id` |
| Password | `admin123` |
| Role | `ADMIN` |

---

## Screenshots

### Authentication
| Login | Pendaftaran |
|---|---|
| ![Halaman Login](docs/screenshots/01-login.png) | ![Halaman Pendaftaran](docs/screenshots/02-register.png) |

### Main Features
| Beranda & Pencarian | Dashboard Statistik |
|---|---|
| ![Beranda & Pencarian Keluarga](docs/screenshots/03-home-search.png) | ![Dashboard Statistik](docs/screenshots/04-dashboard.png) |

| Pohon Tarombo (D3.js) | Daftar Anggota |
|---|---|
| ![Visualisasi Pohon Tarombo](docs/screenshots/05-tree-visualization.png) | ![Daftar Anggota Keluarga](docs/screenshots/06-person-list.png) |

| Detail Anggota | Form Anggota |
|---|---|
| ![Detail Anggota](docs/screenshots/07-person-detail.png) | ![Form Tambah/Edit Anggota](docs/screenshots/08-person-form.png) |

| Daftar Pernikahan | Ganti Password |
|---|---|
| ![Daftar Pernikahan](docs/screenshots/09-marriage-list.png) | ![Ganti Password](docs/screenshots/13-password-change.png) |

### Admin Features
| Kelola Pengguna | Pencadangan Data | Log Audit |
|---|---|---|
| ![Kelola Pengguna](docs/screenshots/10-user-management.png) | ![Pencadangan & Pemulihan Data](docs/screenshots/11-backup-restore.png) | ![Log Audit Sistem](docs/screenshots/12-audit-logs.png) |

### Theme & Responsive
| Dashboard (Dark Mode) | Tampilan Mobile |
|---|---|
| ![Dashboard Mode Gelap](docs/screenshots/14-dashboard-dark-mode.png) | ![Tampilan Mobile](docs/screenshots/15-mobile-view.png) |

---

## Project Structure

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/               # Authentication (NextAuth, register, password)
│   │   ├── persons/            # Person CRUD + eligible-parents
│   │   ├── marriages/          # Marriage CRUD
│   │   ├── tree/               # Tree structure for D3.js
│   │   ├── users/              # User management (admin)
│   │   ├── backup/             # Data export/import (admin)
│   │   ├── audit-logs/         # Audit log viewer (admin)
│   │   ├── stats/              # Dashboard statistics
│   │   ├── upload/             # Photo upload
│   │   ├── notifications/      # Change notifications
│   │   └── seed/               # Database seeder
│   ├── globals.css             # Global styles + Batak Toba theme
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main SPA page with view routing
├── components/
│   ├── auth/                   # LoginForm, RegisterForm
│   ├── layout/                 # AppSidebar
│   ├── tarombo/                # Feature components
│   │   ├── TreeVisualization   # D3.js interactive tree
│   │   ├── FamilySearch        # Home search page
│   │   ├── DashboardStats      # Statistics dashboard
│   │   ├── PersonList          # Paginated person list
│   │   ├── PersonDetail        # Person profile view
│   │   ├── PersonForm          # Add/edit person form
│   │   ├── MarriageList        # Marriage list
│   │   ├── UserManagement      # User admin panel
│   │   ├── BackupRestore       # Data backup/restore
│   │   ├── AuditLogViewer      # Audit log table
│   │   └── PasswordChange      # Password change form
│   ├── ui/                     # shadcn/ui components
│   ├── providers.tsx           # ThemeProvider, QueryClientProvider, I18nProvider
│   ├── ThemeToggle.tsx         # Dark/light mode toggle
│   ├── LanguageToggle.tsx      # i18n language switcher
│   ├── NotificationBell.tsx    # Change notification bell
│   └── ErrorBoundary.tsx       # React error boundary
├── hooks/                      # Custom React hooks
├── lib/
│   ├── auth.ts                 # NextAuth configuration
│   ├── db.ts                   # Prisma client
│   ├── rbac.ts                 # Role-based access control
│   ├── audit-log.ts            # Audit logging helper
│   ├── rate-limit.ts           # Login rate limiter
│   ├── death-utils.ts          # Auto-divorce on death logic
│   ├── ancestor-utils.ts       # Circular reference detection
│   ├── utils.ts                # General utilities (cn, etc.)
│   └── i18n/                   # Internationalization
│       ├── context.tsx         # I18nProvider + useI18n hook
│       └── translations.ts     # Translation dictionaries (id/en/bbc)
└── store/
    └── app-store.ts            # Zustand global state
```

---

## Development History

Aplikasi ini dikembangkan melalui beberapa tahap iteratif:

1. **Initial Build** — Desain schema Prisma, NextAuth setup, RBAC, API routes lengkap, komponen frontend, D3.js tree visualization, seed data 4 generasi
2. **Integration Audit** — Perbaikan 3 bug (upload route, seed data, missing toast), verifikasi end-to-end via browser
3. **Backend Strengthening** — Circular reference prevention, eligible-parents API, cycle protection pada buildTree, re-marriage support, login rate limiting
4. **Frontend Strengthening** — Server-side pagination, ErrorBoundary, BackupRestore UI, AuditLogViewer
5. **Security & Utilities** — Date validation, password change API, Sharp image compression, session expiry, statistics API
6. **UX Features** — Dark mode, i18n (3 bahasa), change notifications, dashboard stats, tree search, generation labels, SVG export
7. **Batak Toba Theme** — Palet warna tradisional, pola gorga, ulos, restyling seluruh komponen
8. **Home Search Page** — Halaman "Cari Keluarga" sebagai default view setelah login

---

## License

Proyek ini bersifat **private** dan dikembangkan khusus untuk keluarga besar Marga Hariandja. Penggunaan dan distribusi di luar keluarga memerlukan izin tertulis.

---

<div align="center">

**Tarombo Marga Hariandja** — Menjaga silsilah, menghubungkan generasi.

*Dibangun dengan ❤️ untuk keluarga Marga Hariandja*

</div>