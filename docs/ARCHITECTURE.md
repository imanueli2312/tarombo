# Arsitektur Sistem — Tarombo Marga Hariandja

Dokumen ini menjelaskan arsitektur lengkap dari aplikasi **Tarombo Marga Hariandja**, yaitu sistem informasi pohon keluarga digital (tarombo) untuk marga Hariandja yang dibangun menggunakan Next.js App Router.

---

## 1. System Architecture Overview

Tarombo menggunakan arsitektur **Single-Page Application (SPA)** di atas Next.js App Router. Secara konsep:

- **Hanya satu route** (`/`) yang digunakan — seluruh navigasi antar halaman ditangani melalui **Zustand state** (`activeView`), bukan melalui URL routing bawaan Next.js.
- **Semua view di-render client-side**. Komponen `page.tsx` berfungsi sebagai SPA router yang memetakan nilai `activeView` ke komponen React yang sesuai.
- **API Routes** (`/api/*`) berfungsi sebagai backend endpoint yang menangani seluruh operasi CRUD, autentikasi, otorisasi, dan logika bisnis.
- **Prisma ORM** sebagai lapisan akses data ke **SQLite** (file-based database).

```
┌─────────────────────────────────────────────────────┐
│                  Browser (Client)                    │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Zustand   │  │ TanStack Query│  │  NextAuth    │  │
│  │ (UI State) │  │ (Server State)│  │  (Session)   │  │
│  └─────┬─────┘  └──────┬───────┘  └──────┬───────┘  │
│        └────────┬──────┘                  │          │
│                 ▼                         │          │
│  ┌──────────────────────────────────────────────┐   │
│  │           page.tsx (SPA Router)               │   │
│  │   activeView → Component Rendering            │   │
│  └──────────────────────┬───────────────────────┘   │
└─────────────────────────┼───────────────────────────┘
                          │ HTTP (fetch)
                          ▼
┌─────────────────────────────────────────────────────┐
│              Next.js Server (API Routes)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ /api/auth│  │/api/persons│  │ /api/marriages  │   │
│  └────┬─────┘  └────┬─────┘  └───────┬──────────┘   │
│       └──────────────┼────────────────┘              │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  Business Logic (RBAC, Validation, Utils)     │   │
│  └──────────────────────┬───────────────────────┘   │
│                         ▼                            │
│  ┌──────────────────────────────────────────────┐   │
│  │            Prisma Client (Singleton)           │   │
│  └──────────────────────┬───────────────────────┘   │
└─────────────────────────┼───────────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │     SQLite      │
                │ (tarombo.db)    │
                └─────────────────┘
```

---

## 2. Directory Structure

Struktur direktori proyek secara lengkap:

```
src/
├── app/
│   ├── api/              # Backend API routes
│   │   ├── auth/         # Endpoint autentikasi (login, register)
│   │   ├── persons/      # Endpoint CRUD Person
│   │   ├── marriages/    # Endpoint CRUD Marriage
│   │   ├── users/        # Endpoint manajemen User
│   │   ├── tree/         # Endpoint data pohon keluarga
│   │   ├── backup/       # Endpoint backup & restore database
│   │   ├── upload/       # Endpoint upload foto
│   │   ├── audit-logs/   # Endpoint log audit
│   │   ├── stats/        # Endpoint statistik dashboard
│   │   ├── seed/         # Endpoint seeding database
│   │   └── notifications/ # Endpoint notifikasi
│   ├── globals.css       # Global styles dengan tema Batak
│   ├── layout.tsx        # Root layout dengan Providers
│   └── page.tsx          # Halaman utama (SPA router)
├── components/
│   ├── auth/             # LoginForm, RegisterForm
│   ├── layout/           # AppSidebar (navigasi utama)
│   ├── tarombo/          # Komponen fitur (tree, persons, marriages, dll.)
│   ├── ui/               # Komponen shadcn/ui (New York style)
│   ├── ErrorBoundary.tsx # Error boundary untuk menangani crash
│   ├── ThemeToggle.tsx   # Toggle dark/light mode
│   ├── LanguageToggle.tsx # Toggle bahasa (id, en, bbc)
│   └── NotificationBell.tsx # Ikon lonceng notifikasi
├── hooks/                # Custom React hooks
├── lib/                  # Utilitas dan konfigurasi
│   ├── auth.ts           # Konfigurasi NextAuth
│   ├── rbac.ts           # Role-based access control
│   ├── db.ts             # Prisma client singleton
│   ├── rate-limit.ts     # Rate limiter untuk login
│   ├── death-utils.ts    # Logika auto-divorce saat meninggal
│   ├── ancestor-utils.ts # Pencegahan circular reference
│   ├── audit-log.ts      # Pencatatan log audit
│   ├── utils.ts          # Utilitas umum (cn, formatTanggal, dll.)
│   └── i18n/             # Internasionalisasi
│       ├── context.tsx   # I18nProvider & useI18n hook
│       └── translations.ts # File terjemahan (id, en, bbc)
├── store/
│   └── app-store.ts      # Zustand store (state UI global)
prisma/
├── schema.prisma         # Skema database (Prisma)
├── seed.ts               # Script seeding data awal
└── migrations/           # File migrasi database
public/
├── batak-assets/         # Gambar dekoratif bertema Batak
└── uploads/
    └── persons/          # Penyimpanan foto person
docs/
├── ARCHITECTURE.md       # Dokumen ini
└── screenshots/          # Screenshot fitur aplikasi
```

---

## 3. Data Flow

### 3.1 Navigasi Client-Side

Seluruh navigasi antar halaman ditangani oleh Zustand store, bukan oleh URL routing Next.js:

1. User mengklik item navigasi di `AppSidebar`
2. `AppSidebar` memanggil `setActiveView("persons")` dari Zustand store
3. Komponen `AppContent` di `page.tsx` membaca `activeView` dan merender komponen yang sesuai
4. Tidak ada perubahan URL — seluruhnya berada di route `/`

```
AppSidebar → setActiveView() → Zustand Store → AppContent (page.tsx) → Komponen View
```

### 3.2 Pengambilan Data (Data Fetching)

Data diambil dari server menggunakan **TanStack Query (React Query)**:

1. Komponen memanggil custom hook yang membungkus TanStack Query
2. TanStack Query mengirim HTTP request ke API route (`/api/persons`, dll.)
3. API route melakukan validasi, otorisasi (RBAC), lalu mengakses database via Prisma
4. Response dikembalikan sebagai JSON, di-cache oleh TanStack Query

```
Komponen → useQuery/useMutation → fetch("/api/...") → API Route → Prisma → SQLite
                                                              ↓
                        TanStack Cache ← JSON Response ←──────┘
```

### 3.3 Alur Autentikasi

1. User mengisi form login → dikirim ke `/api/auth/signin`
2. NextAuth `authorize()` memvalidasi kredensial (rate limit → bcrypt compare → DB lookup)
3. JWT token dibuat dengan `role` dan `userId` di-embed
4. `useSessionSync()` hook mensinkronkan session ke Zustand store (`userRole`)
5. Setiap API request menyertakan session cookie, divalidasi ulang di server

```
LoginForm → NextAuth Credentials → JWT (role, userId) → Session → useSessionSync → Zustand userRole
```

---

## 4. State Management

Aplikasi menggunakan tiga lapisan state management yang masing-masing memiliki tanggung jawab berbeda:

### 4.1 Zustand Store (`store/app-store.ts`)

Menangani **UI state global** — state yang menentukan tampilan dan interaksi:

| State | Tipe | Keterangan |
|---|---|---|
| `activeView` | `"login" \| "register" \| "home" \| "tree" \| "persons" \| "person-detail" \| "person-form" \| "marriages" \| "users" \| "backup" \| "audit-logs" \| "dashboard" \| "password"` | Menentukan view aktif (SPA routing) |
| `selectedPersonId` | `string \| null` | ID person yang sedang dilihat detailnya |
| `editingPersonId` | `string \| null` | ID person yang sedang diedit |
| `userRole` | `"ADMIN" \| "EDITOR" \| "VIEWER" \| null` | Role user yang sedang login |

Zustand juga menyediakan **helper methods** untuk pengecekan permission:

- `canCreate()` — mengembalikan `true` jika role ≥ EDITOR (level 2)
- `canUpdate()` — mengembalikan `true` jika role ≥ EDITOR (level 2)
- `canDelete()` — mengembalikan `true` jika role ≥ ADMIN (level 3)
- `canManageUsers()` — mengembalikan `true` jika role ≥ ADMIN (level 3)

### 4.2 TanStack Query (React Query)

Menangani **server state caching** — data yang berasal dari API:

- Menyediakan caching otomatis dengan `staleTime` dan `gcTime`
- Mendukung `useQuery` untuk pembacaan data dan `useMutation` untuk mutasi data
- Invalidasi cache otomatis setelah create/update/delete
- Menampilkan loading state dan error handling terintegrasi

### 4.3 NextAuth Session

Menangani **authentication state**:

- Menggunakan strategi **JWT** (token disimpan di cookie)
- Session berlaku **24 jam** (`maxAge: 86400`)
- Role dan userId di-embed langsung di JWT token
- `useSessionSync()` hook mensinkronkan session ke Zustand store secara real-time

---

## 5. Authentication & Authorization

### 5.1 Autentikasi (NextAuth.js v4)

| Aspek | Detail |
|---|---|
| Provider | Credentials (email + password) |
| Strategi Session | JWT |
| Masa Berlaku | 24 jam |
| Hashing Password | bcryptjs (12 rounds) |
| Sign-in Page | `/` (route tunggal) |
| Secret | `NEXTAUTH_SECRET` env variable (fallback: hardcoded) |

**Alur login:**

1. Cek **rate limit** — 5 percobaan per 15 menit per email
2. Cari user di database berdasarkan email
3. Validasi user `isActive === true`
4. Bandingkan password menggunakan `bcrypt.compare()`
5. Jika berhasil: reset rate limit, buat JWT dengan `role` dan `userId`
6. Jika gagal: increment rate limit counter, return `null`

### 5.2 Otorisasi (RBAC — Role-Based Access Control)

Hierarki role berdasarkan level numerik:

```
ADMIN (level 3) — Hak penuh: create, read, update, delete, manajemen user
  ↑
EDITOR (level 2) — Hak terbatas: create, read, update (tanpa delete & manajemen user)
  ↑
VIEWER (level 1) — Hak minimal: read only
```

| Operasi | VIEWER | EDITOR | ADMIN |
|---|---|---|---|
| Lihat data (Read) | ✅ | ✅ | ✅ |
| Buat data (Create) | ❌ | ✅ | ✅ |
| Ubah data (Update) | ❌ | ✅ | ✅ |
| Hapus data (Delete) | ❌ | ❌ | ✅ |
| Manajemen User | ❌ | ❌ | ✅ |
| Backup/Restore | ❌ | ❌ | ✅ |
| Lihat Audit Log | ❌ | ❌ | ✅ |

RBAC diterapkan di **dua lapis**:
- **Client-side**: Zustand store (`canCreate()`, `canUpdate()`, `canDelete()`, `canManageUsers()`) untuk menyembunyikan/menonaktifkan UI
- **Server-side**: Fungsi `hasPermission()` di `lib/rbac.ts` di setiap API route sebagai keamanan utama

### 5.3 Rate Limiting

Konfigurasi rate limiting untuk endpoint login:

| Parameter | Nilai |
|---|---|
| Maks. Percobaan | 5 kali |
| Window Waktu | 15 menit |
| Granularitas | Per alamat email |
| Storage | In-memory (Map) |

---

## 6. Database Schema

Database menggunakan **SQLite** yang diakses melalui **Prisma ORM**. Terdapat 4 model utama:

### 6.1 User — Pengguna Sistem

Tabel untuk autentikasi dan RBAC, terpisah dari data pohon keluarga.

| Field | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `email` | `String` | `@unique` | Alamat email unik |
| `name` | `String` | — | Nama lengkap pengguna |
| `password` | `String` | — | Hash password (bcrypt) |
| `role` | `Role` | `@default(VIEWER)` | Role: ADMIN, EDITOR, VIEWER |
| `isActive` | `Boolean` | `@default(true)` | Status akun aktif |
| `createdAt` | `DateTime` | `@default(now())` | Waktu pembuatan |
| `updatedAt` | `DateTime` | `@updatedAt` | Waktu pembaruan otomatis |

### 6.2 Person — Anggota Keluarga

Tabel utama yang menyimpan data individu yang ditampilkan di pohon keluarga (tarombo).

| Field | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `fullName` | `String` | — | Nama lengkap |
| `nickname` | `String?` | — | Nama panggilan (opsional) |
| `birthPlace` | `String?` | — | Tempat lahir |
| `birthDate` | `DateTime?` | — | Tanggal lahir |
| `deathPlace` | `String?` | — | Tempat meninggal |
| `deathDate` | `DateTime?` | — | Tanggal meninggal |
| `birthOrder` | `Int?` | — | Urutan kelahiran (anak ke-berapa) |
| `gender` | `Gender` | — | Jenis kelamin: MALE, FEMALE |
| `address` | `String?` | — | Alamat tempat tinggal |
| `religion` | `String?` | — | Agama |
| `phone` | `String?` | — | Nomor telepon |
| `photoPath` | `String?` | — | Path foto |
| `maritalStatus` | `MaritalStatus` | `@default(SINGLE)` | Status: SINGLE, MARRIED, DIVORCED, WIDOWED |
| `isDeceased` | `Boolean` | `@default(false)` | Status meninggal dunia |
| `fatherId` | `String?` | Foreign key → Person | Referensi ayah |
| `motherId` | `String?` | Foreign key → Person | Referensi ibu |
| `createdAt` | `DateTime` | `@default(now())` | Waktu pembuatan |
| `updatedAt` | `DateTime` | `@updatedAt` | Waktu pembaruan otomatis |

**Relasi self-referential:**

- `father` / `childrenAsFather` — relasi `FatherChild` (many-to-one)
- `mother` / `childrenAsMother` — relasi `MotherChild` (many-to-one)
- `marriagesAsHusband` / `marriagesAsWife` — relasi ke model Marriage

**Index:**
- `@@index([fatherId])` — untuk query cepat berdasarkan ayah
- `@@index([motherId])` — untuk query cepat berdasarkan ibu
- `@@index([gender])` — untuk filter berdasarkan jenis kelamin

**onDelete behavior:**
- Jika ayah/ibu dihapus → `fatherId`/`motherId` di-set `null` (`SetNull`)

### 6.3 Marriage — Pernikahan

Tabel yang menghubungkan pasangan suami-istri.

| Field | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `husbandId` | `String` | Foreign key → Person | Referensi suami |
| `wifeId` | `String` | Foreign key → Person | Referensi istri |
| `marriageDate` | `DateTime?` | — | Tanggal menikah |
| `divorceDate` | `DateTime?` | — | Tanggal cerai |
| `isActive` | `Boolean` | `@default(true)` | Status pernikahan aktif |
| `createdAt` | `DateTime` | `@default(now())` | Waktu pembuatan |
| `updatedAt` | `DateTime` | `@updatedAt` | Waktu pembaruan otomatis |

**Constraint & Index:**
- `@@unique([husbandId, wifeId])` — satu pasangan hanya boleh memiliki satu record pernikahan
- `@@index([husbandId])`, `@@index([wifeId])`, `@@index([isActive])`

**onDelete behavior:**
- Jika suami/istri dihapus → record pernikahan ikut terhapus (`Cascade`)

### 6.4 AuditLog — Log Audit

Tabel untuk mencatat seluruh aktivitas penting di sistem.

| Field | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String?` | — | ID user yang melakukan aksi |
| `userName` | `String?` | — | Nama user (denormalized untuk query cepat) |
| `action` | `String` | — | Jenis aksi (CREATE, UPDATE, DELETE, LOGIN, dll.) |
| `resource` | `String` | — | Sumber daya (PERSON, MARRIAGE, USER, dll.) |
| `resourceId` | `String?` | — | ID sumber daya yang terpengaruh |
| `details` | `String?` | — | Detail aksi (format JSON) |
| `ipAddress` | `String?` | — | Alamat IP pelaku |
| `createdAt` | `DateTime` | `@default(now())` | Waktu kejadian |

**Index:**
- `@@index([userId])`, `@@index([action])`, `@@index([createdAt])`

### 6.5 Enums

```prisma
enum Role {
  ADMIN
  EDITOR
  VIEWER
}

enum Gender {
  MALE
  FEMALE
}

enum MaritalStatus {
  SINGLE
  MARRIED
  DIVORCED
  WIDOWED
}
```

---

## 7. Business Logic

### 7.1 Auto-Divorce pada Kematian (`death-utils.ts`)

Ketika `isDeceased` sebuah Person di-set ke `true`:

1. Semua pernikahan aktif (`isActive === true`) yang melibatkan person tersebut akan di-deactivate (`isActive = false`)
2. `divorceDate` di-set ke tanggal saat ini
3. `maritalStatus` pasangan yang masih hidup diubah menjadi `WIDOWED`

```
Person.isDeceased = true
  → Update Marriage.isActive = false (untuk semua marriage aktif)
  → Update Marriage.divorceDate = now()
  → Update pasangan.maritalStatus = WIDOWED
```

### 7.2 Pencegahan Circular Reference (`ancestor-utils.ts`)

Untuk menghindari loop tak terbatas di pohon keluarga:

- Tidak boleh men-set **keturunan** (descendant) sebagai **orang tua** (parent)
- Sistem melakukan traversal naik ke atas pohon untuk memeriksa apakah calon parent adalah keturunan dari person yang sedang diedit
- Jika ditemukan circular reference, operasi ditolak dengan error message

```
Jika A adalah keturunan dari B:
  → B tidak boleh di-set sebagai parent A (akan membuat loop)
```

### 7.3 Maksimal 1 Pernikahan Aktif

- Ditegakkan oleh **unique constraint** `@@unique([husbandId, wifeId])` di level database
- Divalidasi tambahan di API route: sebelum membuat pernikahan baru, cek apakah suami/istri sudah memiliki pernikahan aktif
- Jika sudah ada, pernikahan lama harus di-deactivate terlebih dahulu

### 7.4 Validasi Gender

- **Ayah** (`fatherId`) harus memiliki `gender === MALE`
- **Ibu** (`motherId`) harus memiliki `gender === FEMALE`
- Validasi dilakukan di API route sebelum menyimpan ke database

### 7.5 Validasi Tanggal

- **Tanggal lahir** tidak boleh di masa depan
- **Tanggal meninggal** tidak boleh lebih awal dari tanggal lahir
- **Tanggal pernikahan** tidak boleh di masa depan
- **Tanggal cerai** tidak boleh lebih awal dari tanggal menikah

### 7.6 Kompresi Foto

- Foto di-upload melalui endpoint `/api/upload`
- Diproses menggunakan **Sharp** library:
  - Resize ke maksimal **800×800 pixel** (mempertahankan aspect ratio)
  - Kualitas kompresi **80%**
  - Format output: **JPEG**
- Disimpan di `public/uploads/persons/` sebagai file lokal

---

## 8. UI/UX Architecture

### 8.1 Tema Visual Batak Toba

Aplikasi menggunakan tema visual yang terinspirasi dari budaya Batak Toba:

| Elemen | Warna | Keterangan |
|---|---|---|
| Primary (Maroon) | `#7F1D1D` | Warna utama, merepresentasikan kain ulos |
| Accent (Gold) | `#DAA520` | Warna aksen, merepresentasikan ukiran gorga |
| Background (Cream) | `#FDF6E3` | Latar belakang hangat |
| Dark Wood | `#1C1410` | Warna gelap untuk sidebar & footer |
| Hover/Active | `#991B1B` | Warna saat elemen di-hover |

Elemen dekoratif **gorga** (ukiran tradisional Batak) digunakan sebagai pembatas visual (`gorga-divider`).

### 8.2 Komponen UI

- **shadcn/ui** (New York style) sebagai komponen library dasar
- Komponen yang digunakan: Button, Input, Card, Dialog, Sheet, Table, Badge, Select, Sonner (toast), dll.
- Komponen kustom: `AppSidebar`, `TreeVisualization`, `PersonForm`, `MarriageList`, dll.

### 8.3 Layout

- **Mobile-first responsive design** — aplikasi dioptimalkan untuk tampilan mobile terlebih dahulu
- **Sidebar** yang bisa di-toggle (Sheet pada mobile, permanen pada desktop)
- **Dark/light mode** — didukung melalui `next-themes` dengan toggle di sidebar
- **Footer** dengan warna dark wood dan teks gold

### 8.4 Hierarki Komponen

```
layout.tsx (RootLayout)
  └── Providers (SessionProvider, QueryClient, ThemeProvider, I18nProvider)
       └── page.tsx (HomePage)
            └── ErrorBoundary
                 └── AppContent (SPA Router)
                      ├── LoginForm / RegisterForm
                      ├── TreeView
                      │    ├── AppSidebar
                      │    └── TreeVisualization (D3.js)
                      └── MainLayout
                           ├── AppSidebar
                           ├── Content Area (PersonList, PersonDetail, dll.)
                           └── Footer
```

### 8.5 Navigasi dengan RBAC

Item navigasi di `AppSidebar` ditampilkan/disembunyikan berdasarkan role user:

| Menu Item | VIEWER | EDITOR | ADMIN |
|---|---|---|---|
| Beranda (Home) | ✅ | ✅ | ✅ |
| Pohon Keluarga (Tree) | ✅ | ✅ | ✅ |
| Daftar Anggota (Persons) | ✅ | ✅ | ✅ |
| Daftar Pernikahan (Marriages) | ✅ | ✅ | ✅ |
| Dashboard | ❌ | ❌ | ✅ |
| Manajemen User | ❌ | ❌ | ✅ |
| Backup/Restore | ❌ | ❌ | ✅ |
| Log Audit | ❌ | ❌ | ✅ |

---

## 9. Internationalization (i18n)

### 9.1 Arsitektur

Implementasi i18n menggunakan **custom context-based** (bukan `next-intl` atau library serupa):

- `I18nProvider` di-wrap di dalam `Providers`
- State locale disimpan menggunakan `useState` (client-side only)
- Fungsi `t(key)` melakukan lookup pada objek `translations`
- Fallback chain: `locale[key]` → `id[key]` → `key` (return key as-is jika tidak ditemukan)

### 9.2 Locale yang Didukung

| Kode | Bahasa | Label |
|---|---|---|
| `id` | Bahasa Indonesia | Indonesia |
| `en` | English | English |
| `bbc` | Bahasa Batak Toba | Batak |

Locale default: `id` (Bahasa Indonesia).

### 9.3 Organisasi Translation Keys

Translation keys diorganisasi berdasarkan fitur/modul:

- `nav.*` — Label navigasi sidebar
- `common.*` — Teks umum (simpan, batal, hapus, konfirmasi, dll.)
- `tree.*` — Pohon keluarga
- `person.*` — Form dan detail person
- `marriage.*` — Pernikahan
- `dashboard.*` — Statistik dashboard
- `auth.*` — Login dan registrasi
- `user.*` — Manajemen user
- `backup.*` — Backup dan restore
- `audit.*` — Log audit

---

## 10. Technology Decisions

Keputusan teknologi yang diambil beserta alasan di baliknya:

### 10.1 SQLite sebagai Database

**Keputusan:** Menggunakan SQLite (file-based) alih-alih PostgreSQL atau MySQL.

**Alasan:** Aplikasi ini dirancang untuk **self-hosted deployment** tanpa memerlukan database server terpisah. SQLite cukup untuk skala data pohon keluarga (ribuan person) dan memerlukan konfigurasi minimal — cukup satu file `tarombo.db`.

### 10.2 Local Filesystem untuk Foto

**Keputusan:** Menyimpan foto di `public/uploads/persons/` alih-alih menggunakan S3 atau cloud storage.

**Alasan:** Konsisten dengan prinsip self-hosted. Tidak ada dependensi ke layanan eksternal (AWS, GCS, dll.). Foto diakses langsung melalui path `/uploads/persons/{filename}`.

### 10.3 D3.js untuk Visualisasi Pohon

**Keputusan:** Menggunakan D3.js langsung (custom implementation) alih-alih library pohon keluarga yang sudah jadi.

**Alasan:** Kebutuhan visualisasi sangat spesifik (layout horizontal, node interaktif, zoom/pan, warna berdasarkan gender, dll.) yang sulit dicapai dengan library generik. D3.js memberikan kontrol penuh atas rendering SVG.

### 10.4 In-Memory Caching (Tanpa Redis)

**Keputusan:** Menggunakan in-memory caching via TanStack Query (client) dan Prisma query logging (server) tanpa Redis.

**Alasan:** Untuk skala pengguna kecil (satu keluarga), caching di level browser melalui TanStack Query sudah cukup. Tidak perlu infrastruktur tambahan.

### 10.5 SPA via State (Tanpa URL Routing)

**Keputusan:** Menggunakan satu route (`/`) dengan navigasi via Zustand state alih-alih menggunakan multiple routes Next.js.

**Alasan:** Menyederhanakan arsitektur — tidak perlu mengelola route guards, redirect, dan URL synchronization. Semua state navigasi terpusat di satu tempat (Zustand store). Hal ini juga menghindari kompleksitas client-side navigation di Next.js App Router.

### 10.6 Prisma Client Singleton

**Keputusan:** Menggunakan singleton pattern untuk Prisma Client di `lib/db.ts`.

**Alasan:** Mencegah pembuatan koneksi database berlebihan saat development (hot reload). Instance Prisma Client disimpan di `globalThis` agar bisa di-reuse antar hot reload.

### 10.7 Stack Teknologi Lengkap

| Kategori | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS 4 |
| Komponen UI | shadcn/ui (New York style) |
| State Management | Zustand |
| Server State | TanStack Query (React Query) |
| Autentikasi | NextAuth.js v4 |
| Database | SQLite via Prisma ORM |
| Visualisasi | D3.js |
| Tema | next-themes (dark/light mode) |
| Toast | Sonner |
| Validasi Form | React Hook Form + Zod |
| Upload Foto | Sharp (resize & compress) |
| Password Hashing | bcryptjs |
| Font | Geist Sans, Geist Mono |