# Dokumentasi Teknis

**Proyek:** Tarombo Hariandja — Pohon Keluarga Marga Hariandja
**Audiens:** Pengembang dan pemelihara
**Terakhir diperbarui:** 7 Agustus 2026

> **Bahasa:** [English](./TECHNICAL_DOC.md) · **Indonesia** (file ini)

---

## Daftar Isi

1. [Gambaran Arsitektur](#1-gambaran-arsitektur)
2. [Siklus Hidup Permintaan](#2-siklus-hidup-permintaan)
3. [Schema Basis Data](#3-schema-basis-data)
4. [Autentikasi & Sesi](#4-autentikasi--sesi)
5. [Implementasi RBAC](#5-implementasi-rbac)
6. [Logika Pembangunan Pohon](#6-logika-pembangunan-pohon)
7. [Visualisasi D3.js](#7-visualisasi-d3js)
8. [Pipeline Ekspor](#8-pipeline-ekspor)
9. [Referensi API](#9-referensi-api)
10. [Penyimpanan File](#10-penyimpanan-file)
11. [Keputusan Desain Kunci](#11-keputusan-desain-kunci)

---

## 1. Gambaran Arsitektur

Aplikasi mengikuti arsitektur **App Router rute-tunggal**. Hanya rute `/` yang terlihat oleh pengguna; semua "halaman" (Pohon Keluarga, Bagan Keluarga, Ulang Tahun, Pernikahan, Profil, Admin) adalah tampilan sisi klien yang diaktifkan oleh state, dikendalikan oleh izin RBAC yang diambil dari `/api/me`.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Klien)                       │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  NavBar     │  │  Switch View  │  │  Dialog        │ │
│  │  (nav RBAC) │  │  (berbasis    │  │  (orang/pasangan│ │
│  │             │  │   state)      │  │  /ekspor)      │ │
│  └──────┬──────┘  └───────┬───────┘  └────────────────┘ │
│         └────────┬────────┘                              │
│                  ▼                                       │
│         ┌────────────────┐                              │
│         │  hook useAuth  │ ← fetch /api/me              │
│         │  (izin)        │                              │
│         └────────┬───────┘                              │
│                  │                                      │
└──────────────────┼──────────────────────────────────────┘
                   │ fetch (path relatif)
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Server Next.js 16 (App Router)              │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Handler Route /api/*                 │   │
│  │  tree · persons · spouses · birthdays · weddings │   │
│  │  me · users · roles · upload · files · auth      │   │
│  └────────────────────┬────────────────────────────┘   │
│                       │                                  │
│         ┌─────────────┴──────────────┐                  │
│         ▼                            ▼                   │
│  ┌─────────────┐          ┌──────────────────┐         │
│  │ auth.ts     │          │ database.ts      │         │
│  │ (NextAuth + │          │ (better-sqlite3) │         │
│  │  RBAC)      │          │  file SQLite     │         │
│  └─────────────┘          └──────────────────┘         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Pilihan arsitektur kunci

- **Tanpa pustaka state eksternal** — `useState`/`useEffect` bawaan React cukup karena semua tampilan berbagi halaman rute-tunggal yang sama.
- **Penegakan RBAC sisi server** — setiap route API memanggil `getRequestContext()` yang menyelesaikan sesi dan izin; `assertPageAccess()` / `assertAction()` melempar `HTTPError(403)` saat pelanggaran.
- **Gating nav sisi klien** — bilah navigasi membaca izin dari `useAuth()` dan hanya merender item yang dapat diakses; `effectiveView` turunan kembali ke "familyTree" jika tampilan saat ini menjadi tidak dapat diakses (mis. setelah logout).
- **SQLite sebagai satu-satunya lapisan persistensi** — tanpa ORM, tanpa cloud DB. Schema didefinisikan inline di `src/lib/database.ts` dan dibuat saat impor pertama.

---

## 2. Siklus Hidup Permintaan

Permintaan terautentikasi tipikal mengalir sebagai berikut:

```
1. Browser mengirim permintaan dengan cookie sesi
       ↓
2. Next.js merutekan ke handler API (mis. /api/persons)
       ↓
3. Handler memanggil getRequestContext()
       │
       ├─ getCurrentSession()
       │    └─ getServerSession(authOptions)  ← NextAuth memverifikasi JWT
       │    └─ Muat user + role dari SQLite
       │    └─ Kembalikan SessionUser atau null
       │
       └─ getEffectivePermissions(session)
            └─ Jika sesi: role.permissions
            └─ Jika null: izin peran Viewer
       ↓
4. Handler menegaskan izin (assertPageAccess / assertAction)
       └─ Melempar HTTPError(403) jika ditolak
       ↓
5. Handler menjalankan logika bisnis (query/mutasi SQLite)
       ↓
6. Wrapper handleApi() menangkap error → respons JSON
```

### Pola penanganan error

Semua handler API dibungkus dalam `handleApi()`:

```typescript
export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertPageAccess(permissions, "familyTree");
    return json(getTreeData());
  });
}
```

`handleApi` menangkap `HTTPError` (mengembalikan status yang sesuai) dan error tak terduga (mengembalikan 500).

---

## 3. Schema Basis Data

Didefinisikan di `src/lib/database.ts`. SQLite dengan jurnal WAL dan foreign key diaktifkan.

### `roles`
```sql
CREATE TABLE roles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '{}',   -- JSON
  is_system   INTEGER NOT NULL DEFAULT 0,    -- 1 = tidak dapat dihapus
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `users`
```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,               -- bcrypt
  name          TEXT NOT NULL,
  role_id       TEXT NOT NULL REFERENCES roles(id),
  person_id     TEXT REFERENCES persons(id) ON DELETE SET NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `persons`
```sql
CREATE TABLE persons (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  nickname             TEXT,
  place_of_birth       TEXT,
  date_of_birth        TEXT,          -- tanggal ISO
  date_of_death        TEXT,
  birth_order          INTEGER DEFAULT 0,
  gender               TEXT NOT NULL CHECK(gender IN ('male','female')),
  residential_address  TEXT,
  religion             TEXT,
  phone_number         TEXT,
  photo                TEXT,          -- URL ke /api/files/...
  marital_status       TEXT,          -- single|married|widowed|divorced
  generation           INTEGER DEFAULT 1,
  father_id            TEXT REFERENCES persons(id) ON DELETE SET NULL,
  mother_id            TEXT REFERENCES persons(id) ON DELETE SET NULL,
  parent_id            TEXT REFERENCES persons(id) ON DELETE SET NULL,
  burial_name          TEXT,
  burial_address       TEXT,
  burial_lat           REAL,
  burial_lng           REAL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_persons_father ON persons(father_id);
CREATE INDEX idx_persons_mother ON persons(mother_id);
CREATE INDEX idx_persons_parent ON persons(parent_id);
```

### `spouses`
```sql
CREATE TABLE spouses (
  id             TEXT PRIMARY KEY,
  husband_id     TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  wife_id        TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  marriage_date  TEXT,
  divorce_date   TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_spouses_husband ON spouses(husband_id);
CREATE INDEX idx_spouses_wife    ON spouses(wife_id);
```

### Seeding

`src/lib/seed.ts` berjalan setiap server start (idempoten — memeriksa apakah roles ada terlebih dahulu). Menyisipkan:
- 3 peran sistem dengan JSON izin hardcoded
- 40 orang (marga Hariandja, 8 generasi)
- 17 catatan pasangan
- 2 pengguna demo (kata sandi di-hash bcrypt)

---

## 4. Autentikasi & Sesi

### Konfigurasi (`src/lib/auth-options.ts`)

- **Provider:** Credentials (email + kata sandi)
- **Strategi:** JWT (kedaluwarsa 7 hari)
- **Secret:** env var `NEXTAUTH_SECRET` (fallback dev disediakan)
- **Hashing kata sandi:** bcryptjs (10 putaran)

### Resolusi sesi

```typescript
// src/lib/auth.ts
export async function getCurrentSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = getUserById(session.user.id);
  if (!user || !user.is_active) return null;
  const role = getRoleById(user.role_id);
  if (!role) return null;
  return { id, email, name, role_id, person_id, permissions, role_name };
}
```

### Sisi klien (`src/hooks/use-auth.ts`)

Hook `useAuth()`:
1. Mengambil `/api/me` saat mount.
2. Mengembalikan `{ user, permissions, loading, isLoggedIn, can(page), canDo(action) }`.
3. Menyediakan `refresh()` (ambil ulang setelah login) dan `logout()` (memanggil `signOut()` lalu refresh).

### Akses anonim

Jika `/api/me` mengembalikan `{ user: null }`, klien kembali ke izin Viewer yang di-hardcode. Tidak diperlukan cookie atau sesi untuk melihat Pohon Keluarga.

---

## 5. Implementasi RBAC

### Struktur izin (`src/lib/types.ts`)

```typescript
interface Permissions {
  pages: {
    familyTree: boolean;
    familyChart: boolean;
    birthdays: boolean;
    weddings: boolean;
    profile: boolean;
  };
  actions: {
    managePersons: boolean;
    manageSpouses: boolean;
    manageUsers: boolean;
    manageRoles: boolean;
    exportData: boolean;
  };
}
```

### Set izin default

| Peran | Halaman | Tindakan |
|-------|---------|----------|
| Viewer | hanya `familyTree` | tidak ada |
| Editor | semua 5 halaman | managePersons, manageSpouses, exportData |
| Admin | semua 5 halaman | semua 5 tindakan |

### Lapisan penegakan

1. **Sisi server (otoritatif):** Setiap route API memanggil `assertPageAccess()` atau `assertAction()` sebelum menjalankan logika.
2. **Sisi klien (UX):** Bilah navigasi memfilter item berdasarkan izin; tampilan memeriksa prop `canEdit` / `canExport` untuk menampilkan/menyembunyikan tombol tindakan.
3. **Fallback tampilan turunan:** Jika izin pengguna berubah (mis. setelah logout) dan tampilan saat ini menjadi tidak dapat diakses, `effectiveView` otomatis kembali ke `familyTree`.

### Peran kustom

Admin membuat peran melalui `POST /api/roles`. JSON izin dinormalisasi sisi server (`normalizePermissions()`) untuk memastikan semua kunci ada sebagai boolean. Peran sistem (`is_system = 1`) tidak dapat dihapus tetapi dapat diedit.

---

## 6. Logika Pembangunan Pohon

Didefinisikan di `src/lib/tree.ts`. Fungsi `getTreeData()` membangun pohon bersarang dari tabel datar `persons` + `spouses`.

### Primer vs. pasangan terlampir

Tantangan desain kunci: pasangan yang menikah memiliki dua orang, tetapi hanya satu yang menempati posisi di pohon (yang lain dirender sebagai kartu pasangan terlampir). Logikanya:

```
Untuk setiap catatan pasangan:
  husbandHasParent = husband.parent_id diatur
  wifeHasParent    = wife.parent_id diatur

  if (wifeHasParent && !husbandHasParent):
    istri PRIMER, suami TERLAMPIR
  else:
    suami PRIMER, istri TERLAMPIR   (default patrilineal)
```

Ini memastikan:
- Perempuan yang menikah ke marga (tidak ada `parent_id`) dirender sebagai kartu pasangan suaminya.
- Perempuan yang merupakan keturunan marga sendiri (memiliki `parent_id`) tetap sebagai node primer di cabangnya, dengan suaminya terlampir.

### Pengelompokan anak

Anak dikelompokkan di bawah `parent_id` mereka. Hanya node primer (bukan pasangan terlampir) yang muncul sebagai anak. Ini mencegah seseorang muncul baik sebagai kartu pasangan maupun sebagai node anak.

### Struktur output

```typescript
interface TreeNode extends Person {
  father?: Person | null;
  mother?: Person | null;
  parent?: Person | null;
  spouse?: Person | null;
  spouse_relation?: Spouse | null;
  children: TreeNode[];
}

interface TreeData {
  roots: TreeNode[];      // orang tanpa parent_id (dan bukan pasangan terlampir)
  persons: Person[];      // daftar datar semua orang
  spouses: Spouse[];      // daftar datar semua catatan pernikahan
}
```

---

## 7. Visualisasi D3.js

Diimplementasikan di `src/components/family-tree/d3-tree.tsx`.

### Algoritma layout

Layout pohon vertikal kustom (tidak menggunakan `d3.tree()` karena pasangan perlu dirender berdampingan):

1. **Perhitungan lebar rekursif:** Lebar setiap node = max(lebar sendiri, jumlah lebar anak + jarak).
2. **Posisi anak:** Anak dipusatkan di bawah induknya, dengan jarak 40px antara sub-pohon saudara.
3. **Penumpukan root:** Multiple root (garis keturunan leluhur berbeda) disusun dari kiri ke kanan dengan jarak 80px.
4. **Normalisasi koordinat:** Seluruh pohon digeser sehingga `minX = 60`, `minY = 60`.

### Konstanta

```typescript
const NODE_W     = 200;   // lebar kartu
const NODE_H     = 76;    // tinggi kartu
const SPOUSE_GAP = 16;    // jarak antar kartu pasangan
const LEVEL_GAP  = 120;   // jarak vertikal antar generasi
```

### Rendering

Setiap orang dirender sebagai `<g>` SVG yang berisi:
- Persegi panjang membulat (kartu) dengan border berwarna jenis kelamin
- Garis berwarna di kiri (biru untuk laki-laki, pink untuk perempuan; redup jika almarhum)
- Avatar lingkaran (foto jika tersedia, jika tidak inisial)
- Nama, nama panggilan, tahun lahir/meninggal
- Penanda "✝" untuk orang almarhum

### Koneksi

- **Induk → anak:** Kurva Bézier dari tengah-bawah unit induk ke tengah-atas anak.
- **Pernikahan:** Garis horizontal pendek antara kartu pasangan (padat jika aktif, putus-putus jika berakhir).

### Interaksi

- **Geser & zoom:** `d3.zoom()` dengan skala [0.2, 3]. Saat render pertama, pohon otomatis dipas ke kontainer.
- **Klik:** Memilih kartu membuka dialog detail orang.
- **Resize:** `ResizeObserver` pada kontainer memicu layout ulang saat perubahan viewport.

---

## 8. Pipeline Ekspor

Diimplementasikan di `src/lib/export.ts`.

### Pemuatan watermark

Lambang `tarombo-ikon02.png` dimuat sekali (di-cache dalam variabel level modul) dan digambar di tengah setiap ekspor pada ~35% dari dimensi kanvas yang lebih kecil, dengan opasitas 18%.

### SVG → Canvas

`<svg>` yang dirender D3 diserialisasi ke data URL, dimuat sebagai `Image`, dan digambar ke `<canvas>` pada skala 2× untuk output yang tajam.

### Format ekspor

| Format | Proses |
|--------|--------|
| **PNG** | Canvas → `toBlob('image/png')` → unduh |
| **JPG** | Canvas → `toBlob('image/jpeg', 0.95)` → unduh |
| **PDF (tunggal)** | Canvas → `jsPDF` A4 lanskap, fit-to-page dengan judul |
| **PDF (multi)** | Canvas diubin menjadi halaman A4; setiap ubin adalah halaman PDF terpisah dengan header "halaman X dari Y" |
| **PDF (besar)** | Dimensi kanvas menjadi ukuran halaman PDF (dalam mm); satu halaman memuat seluruh pohon |

### Latar belakang

Tekstur `tarombo-bg01.png` secara opsional dapat digambar sebagai latar belakang halus (opasitas 12%, cover-fit) di belakang konten pohon.

---

## 9. Referensi API

Semua route berada di bawah `/api/`. Kecuali dinyatakan, respons adalah JSON.

### Autentikasi

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| GET/POST | `/api/auth/[...nextauth]` | Handler NextAuth (sesi, sign-in, sign-out, CSRF) | Publik |

### Sesi

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| GET | `/api/me` | Pengguna saat ini + izin (mengembalikan `{ user: null, permissions: null }` jika anonim) | Publik |

**Respons (terautentikasi):**
```json
{
  "user": {
    "id": "u_...",
    "email": "admin@hariandja.id",
    "name": "Administrator",
    "role_id": "role_admin",
    "role_name": "Admin",
    "person_id": "p_0001",
    "person": { ...Person }
  },
  "permissions": { "pages": {...}, "actions": {...} }
}
```

### Pohon

| Method | Path | Deskripsi | Izin |
|--------|------|-----------|------|
| GET | `/api/tree` | Data pohon lengkap (roots, persons, spouses) | `pages.familyTree` |

### Orang

| Method | Path | Deskripsi | Izin |
|--------|------|-----------|------|
| GET | `/api/persons` | Daftar semua orang | `pages.familyTree` |
| POST | `/api/persons` | Buat orang | `actions.managePersons` |
| GET | `/api/persons/:id` | Ambil satu orang | `pages.familyTree` |
| PUT | `/api/persons/:id` | Perbarui orang | `actions.managePersons` |
| DELETE | `/api/persons/:id` | Hapus orang (membersihkan referensi) | `actions.managePersons` |

**Body POST/PUT:** Objek `Person` (parsial untuk POST, penuh untuk PUT). Penugasan induk divalidasi untuk kebenaran jenis kelamin dan pencegahan siklus.

### Pasangan

| Method | Path | Deskripsi | Izin |
|--------|------|-----------|------|
| GET | `/api/spouses` | Daftar semua catatan pernikahan (menjalankan pemeriksaan auto-cerai-saat-meninggal) | `pages.familyTree` |
| POST | `/api/spouses` | Buat catatan pernikahan | `actions.manageSpouses` |
| PUT | `/api/spouses/:id` | Perbarui catatan pernikahan | `actions.manageSpouses` |
| DELETE | `/api/spouses/:id` | Hapus catatan pernikahan | `actions.manageSpouses` |

**Validasi:** Suami harus laki-laki, istri harus perempuan, tidak boleh orang yang sama, dan masing-masing dapat memiliki paling banyak satu pasangan aktif.

### Ulang Tahun

| Method | Path | Deskripsi | Izin |
|--------|------|-----------|------|
| GET | `/api/birthdays` | Ulang tahun yang akan datang (diurutkan berdasarkan kejadian berikutnya, almarhum dikecualikan) | `pages.birthdays` |

**Query params:** `?limit=N` (default 100)

### Pernikahan

| Method | Path | Deskripsi | Izin |
|--------|------|-----------|------|
| GET | `/api/weddings` | Peringatan pernikahan (diurutkan berdasarkan kejadian berikutnya) | `pages.weddings` |

### Pengguna

| Method | Path | Deskripsi | Izin |
|--------|------|-----------|------|
| GET | `/api/users` | Daftar semua pengguna (dengan nama role + person) | `actions.manageUsers` |
| POST | `/api/users` | Buat pengguna | `actions.manageUsers` |
| PUT | `/api/users/:id` | Perbarui pengguna (email, nama, kata sandi, role, link person, active) | `actions.manageUsers` |
| DELETE | `/api/users/:id` | Hapus pengguna (tidak dapat menghapus diri sendiri) | `actions.manageUsers` |

### Peran

| Method | Path | Deskripsi | Izin |
|--------|------|-----------|------|
| GET | `/api/roles` | Daftar semua peran | Publik |
| POST | `/api/roles` | Buat peran kustom | `actions.manageRoles` |
| PUT | `/api/roles/:id` | Perbarui peran (termasuk peran sistem) | `actions.manageRoles` |
| DELETE | `/api/roles/:id` | Hapus peran (peran sistem dilindungi; peran tidak-kosong diblokir) | `actions.manageRoles` |

### Unggah & penyajian file

| Method | Path | Deskripsi | Izin |
|--------|------|-----------|------|
| POST | `/api/upload` | Unggah foto (multipart form, field `file`) | `actions.managePersons` |
| GET | `/api/files/:path` | Sajikan file yang diunggah (cache 1 tahun) | Publik |

**Batasan unggah:** Hanya PNG/JPG/WebP/GIF, maks 8 MB. Mengembalikan `{ filename, url, size, mime }`.

### Respons error

Semua error mengikuti format:

```json
{ "error": "Pesan yang dapat dibaca manusia" }
```

Kode status umum: `400` (validasi), `403` (izin ditolak), `404` (tidak ditemukan), `409` (konflik/duplikat), `500` (server error).

---

## 10. Penyimpanan File

Foto yang diunggah disimpan ke sistem file lokal di `/home/z/my-project/upload/` (atau setara `process.cwd()/../upload/` saat deployment). Nama file dihasilkan sebagai `f_<timestamp>_<random>.<ext>`.

File disajikan melalui `/api/files/[...path]`, yang:
- Memvalidasi nama file (tanpa path traversal)
- Membaca dari direktori upload
- Menetapkan tipe MIME yang benar
- Mengembalikan dengan `Cache-Control: public, max-age=31536000, immutable`

Direktori upload di-gitignore kecuali dua gambar seed (`tarombo-ikon02.png`, `tarombo-bg01.png`).

---

## 11. Keputusan Desain Kunci

### Mengapa better-sqlite3 bukan Prisma?

Persyaratan secara eksplisit mengecualikan Prisma ORM. `better-sqlite3` adalah binding SQLite native yang sinkron, cepat, untuk Node.js yang tidak memerlukan lapisan ORM. Prepared statement menyediakan query berparameter (aman dari SQL injection), dan basis data file tunggal sangat portabel dan mudah dicadangkan.

### Mengapa satu rute yang terlihat?

Route App Router Next.js membuat URL berbeda, tetapi aplikasi pohon keluarga pada dasarnya adalah satu ruang kerja dengan "tab" berbeda. Rute tunggal dengan tampilan berbasis state:
- Menghindari reload halaman penuh saat beralih tampilan (UX lebih halus)
- Menjaga state pohon (zoom, geser, pilihan) tetap hidup di seluruh pergantian tampilan
- Menyederhanakan penegakan RBAC (satu tempat untuk gating)

### Mengapa menyimpan izin sebagai JSON di tabel roles?

Ini memungkinkan peran kustom memiliki kombinasi izin arbitrer tanpa perubahan schema. Helper `normalizePermissions()` memastikan semua kunci ada dengan nilai boolean, mencegah akses undefined.

### Mengapa merender pasangan sebagai kartu terlampir, bukan node pohon terpisah?

Jika baik suami maupun istri adalah node terpisah, pohon akan menunjukkan duplikat (istri muncul baik sebagai anak ayahnya maupun sebagai kartu pasangan suaminya). Logika primer/pasangan-terlampir memastikan setiap orang muncul tepat sekali di struktur pohon.

### Mengapa menjalankan auto-cerai-saat-meninggal pada setiap query pasangan?

Ini adalah pendekatan evaluasi-lambat (lazy): daripada memerlukan trigger atau cron job, fungsi `applyDeathAutoDivorce()` berjalan setiap kali pasangan diambil atau dimodifikasi. Ia memeriksa pernikahan aktif di mana salah satu pasangan memiliki tanggal kematian dan tidak ada tanggal cerai, lalu menetapkan tanggal cerai ke tanggal kematian. Ini menjaga data konsisten tanpa infrastruktur tambahan.

### Pertimbangan deployment Windows

Proyek ini menggunakan dua addon C++ native (`better-sqlite3` dan `sharp`) yang harus dikompilasi untuk platform target. Di Windows 11:

- **Visual Studio Build Tools 2022** dengan beban kerja "Desktop development with C++" diperlukan untuk kompilasi.
- Skrip `dev` dan `build` di `package.json` menggunakan perintah Unix (`tee`, `cp`) yang tidak tersedia di PowerShell. Gunakan Git Bash atau ganti dengan setara yang kompatibel dengan Windows.
- Path basis data menggunakan `path.join(process.cwd(), "db", "hariandja.db")` yang terselesaikan dengan benar di Windows tanpa modifikasi.
- Dukungan path panjang mungkin perlu diaktifkan di Registry Windows untuk path `node_modules` yang dalam.

Panduan deployment lengkap Windows 11 + VS Code tersedia di [DEPLOYMENT_WINDOWS.id.md](./DEPLOYMENT_WINDOWS.id.md) (Indonesia) dan [DEPLOYMENT_WINDOWS.md](./DEPLOYMENT_WINDOWS.md) (Inggris).

### Mengapa antarmuka bilingual (EN/ID)?

Marga Hariandja mencakup beberapa generasi dengan preferensi bahasa yang bervariasi. Toggle bahasa (hook `useLanguage()` dengan `useSyncExternalStore` untuk persistensi localStorage yang aman-SSR) memungkinkan setiap pengguna beralih antara Inggris dan Indonesia tanpa memuat ulang halaman. Semua string UI dieksternalisasi ke `src/lib/translations.ts` dengan ~250 kunci yang mencakup setiap komponen.
