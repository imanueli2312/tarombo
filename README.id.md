# Tarombo Hariandja

> Aplikasi silsilah keluarga (*tarombo*) resmi untuk marga besar **Hariandja** — sebuah *marga* Batak (Toba). Melestarikan, menjelajahi, dan merayakan garis keturunan kita, dari generasi ke generasi.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Database](https://img.shields.io/badge/SQLite-better--sqlite3-green) ![License](https://img.shields.io/badge/license-MIT-brightgreen)

> **Bahasa:** [English](./README.md) · **Indonesia** (file ini)

---

## Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Fitur](#fitur)
3. [Tumpukan Teknologi](#tumpukan-teknologi)
4. [Dependensi Proyek](#dependensi-proyek)
5. [Mulai Cepat](#mulai-cepat)
6. [Deployment di Windows 11](#deployment-di-windows-11)
7. [Akun Demo](#akun-demo)
8. [Struktur Proyek](#struktur-proyek)
9. [Model Data](#model-data)
10. [Kendali Akses Berbasis Peran (RBAC)](#kendali-akses-berbasis-peran-rbac)
11. [Ekspor](#ekspor)
12. [Pengembangan](#pengembangan)
13. [Dokumentasi](#dokumentasi)
14. [Lisensi](#lisensi)

---

## Gambaran Umum

**Tarombo Hariandja** adalah aplikasi web full-stack yang mencatat dan memvisualisasikan silsilah keluarga marga Hariandja. Dibangun di sekitar tampilan pohon keluarga (*tarombo*) vertikal, dengan halaman pendukung untuk ulang tahun, peringatan pernikahan, bagan keluarga, profil pengguna, dan panel administrasi penuh.

Aplikasi ini dirancang dengan tiga prinsip panduan:

- **Eksklusivitas** — situs ini dikhususkan untuk marga Hariandja saja.
- **Privasi melalui pemisahan** — data akun pengguna dipisahkan secara ketat dari catatan silsilah yang ditampilkan di pohon keluarga.
- **Baca terbuka, edit terbatas** — siapa pun dapat melihat pohon keluarga tanpa akun; hanya Editor dan Admin yang terautentikasi yang dapat mengubah catatan.

### Bahasa desain

Estetikanya **lembut, modern, dan minimalis**, menggunakan palet warna hangat bernu tanah (terakota, krem, amber) yang terinspirasi dari warisan Batak. Dua aset marga digunakan di seluruh aplikasi:

| Aset | File | Penggunaan |
|------|------|------------|
| Lambang marga | `tarombo-ikon02.png` | Logo di bilah navigasi & footer; watermark tengah pada setiap ekspor |
| Tekstur latar | `tarombo-bg01.png` | Latar belakang halaman yang halus di belakang konten |

Mode terang adalah tema utama dan default.

---

## Fitur

### Untuk semua orang (tanpa login)
- **Pohon Keluarga** — *tarombo* vertikal interaktif dengan D3.js, mendukung geser, perbesar/perkecil, dan klik untuk melihat detail orang.
- Penanda almarhum, garis warna jenis kelamin, garis pernikahan (padat = aktif, putus-putus = berakhir).

### Untuk Editor & Admin
- **Bagan Keluarga** — tampilan hierarki indentasi alternatif yang menunjukkan setiap pasangan dan anak-anak mereka.
- **Ulang Tahun** — ulang tahun yang akan datang di seluruh marga, diurutkan berdasarkan kejadian berikutnya, dengan usia dan tempat lahir.
- **Pernikahan** — peringatan pernikahan dengan jumlah tahun dirayakan.
- **Profil** — kelola akun Anda sendiri (nama, email, kata sandi) dan lihat catatan orang yang tertaut.
- **Tambah / edit / hapus** orang dan catatan pernikahan dengan validasi penuh.
- **Unggah foto** untuk setiap orang (disimpan secara lokal, tanpa cloud).
- **Ekspor** pohon dalam 5 format (lihat [Ekspor](#ekspor)).

### Khusus Admin
- **Manajemen pengguna** — buat, edit, nonaktifkan, dan hapus akun pengguna.
- **Manajemen peran** — buat peran khusus dengan izin halaman dan tindakan yang granular; edit peran bawaan (Viewer/Editor/Admin) tetapi tidak dapat menghapusnya.

---

## Tumpukan Teknologi

| Lapisan | Teknologi | Catatan |
|--------|-----------|--------|
| Framework | **Next.js 16** (App Router, Turbopack) | Satu rute terlihat `/`; tampilan adalah komponen sisi klien yang dikendalikan oleh RBAC |
| Bahasa | **TypeScript 5** | Pengetikan ketat di seluruh aplikasi |
| Gaya | **Tailwind CSS 4** + **shadcn/ui** (New York) | Palet hangat kustom; mode terang default |
| Basis Data | **SQLite** via **better-sqlite3** | File lokal `db/hariandja.db`; **tanpa Prisma, tanpa cloud DB** |
| Autentikasi | **NextAuth.js v4** (provider Credentials, sesi JWT) | hashing kata sandi bcrypt |
| Visualisasi | **D3.js 7** | Layout pohon vertikal kustom dengan zoom/geser |
| Ekspor PDF | **jsPDF 4** | PDF halaman tunggal, multi-halaman, dan format besar |
| State | React hooks + `next-auth/react` | Tidak diperlukan pustaka state eksternal untuk skala ini |

### Secara eksplisit dikecualikan (sesuai persyaratan)
Layanan cloud, S3, SaaS, MinIO, GEDCOM, AI, dan Prisma ORM **tidak** digunakan di mana pun dalam proyek ini.

---

## Dependensi Proyek

### Dependensi runtime

| Package | Version | Tujuan |
|---------|---------|--------|
| `next` | ^16.1.1 | Framework Next.js (App Router, Turbopack) |
| `react` / `react-dom` | ^19.0.0 | Pustaka UI |
| `better-sqlite3` | ^13.0.3 | Driver basis data SQLite (addon native C++) |
| `next-auth` | ^4.24.11 | Autentikasi (Credentials provider, JWT) |
| `bcryptjs` | ^3.0.3 | Hashing kata sandi |
| `d3` | ^7.9.0 | Visualisasi pohon keluarga |
| `jspdf` | ^4.2.1 | Ekspor PDF (tunggal, multi, format besar) |
| `sharp` | ^0.34.3 | Pemrosesan gambar (native) |
| `tailwindcss` / `tw-animate-css` | ^4 / ^1.3.5 | Framework CSS + animasi |
| `class-variance-authority` / `clsx` / `tailwind-merge` | various | Utilitas nama kelas |
| `lucide-react` | ^0.525.0 | Pustaka ikon |
| `sonner` | ^2.0.6 | Notifikasi toast |
| `zod` | ^4.0.2 | Validasi schema |
| `zustand` | ^5.0.6 | Manajemen state klien |
| `@tanstack/react-query` | ^5.82.0 | Manajemen state server |
| `@tanstack/react-table` | ^8.21.3 | Tabel data |
| `framer-motion` | ^12.23.2 | Animasi |
| `react-hook-form` / `@hookform/resolvers` | various | Penanganan form |
| `react-markdown` / `react-syntax-highlighter` | various | Rendering markdown |
| `uuid` | ^11.1.0 | Pembuatan UUID |
| `date-fns` | ^4.1.0 | Utilitas tanggal |
| `next-themes` | ^0.4.6 | Penggantian tema |
| `next-intl` | ^4.3.4 | Internasionalisasi |
| `recharts` | ^2.15.4 | Grafik |
| `vaul` | ^1.1.2 | Komponen drawer |
| `embla-carousel-react` | ^8.6.0 | Carousel |
| `react-day-picker` | ^9.8.0 | Pemilih tanggal |
| `react-resizable-panels` | ^3.0.3 | Panel yang dapat diubah ukurannya |
| `cmdk` | ^1.1.1 | Palet perintah |
| `input-otp` | ^1.4.2 | Input OTP |
| `@mdxeditor/editor` | ^3.39.1 | Editor MDX |
| `@dnd-kit/*` (core, sortable, utilities) | various | Seret-dan-lepas |
| `@reactuses/core` | ^6.0.5 | Utilitas React hooks |
| `@radix-ui/react-*` (30 packages) | various | Primitif UI headless untuk shadcn/ui |
| `z-ai-web-dev-sdk` | ^0.0.18 | SDK AI (scaffold, tidak digunakan dalam fitur inti) |
| `prisma` / `@prisma/client` | ^6.11.1 | ORM lama (terinstal tetapi **tidak digunakan** — DB via better-sqlite3) |

### Dependensi dev

| Package | Version | Tujuan |
|---------|---------|--------|
| `typescript` | ^5 | Kompilator TypeScript |
| `eslint` / `eslint-config-next` | ^9 / ^16.1.1 | Linting |
| `@tailwindcss/postcss` | ^4 | Plugin PostCSS Tailwind |
| `@types/react` / `@types/react-dom` | ^19 | Definisi tipe React |
| `@types/better-sqlite3` | ^9.6.0 | Tipe better-sqlite3 |
| `@types/d3` | ^7.4.3 | Tipe D3 |
| `@types/bcryptjs` | ^3.0.0 | Tipe bcrypt |
| `bun-types` | ^1.3.4 | Tipe runtime Bun |

### Persyaratan sistem

| Persyaratan | Detail |
|-------------|--------|
| **Node.js** | v20 LTS atau v22 LTS (diperlukan untuk kompilasi modul native) |
| **Bun** | v1.3+ (runtime yang disarankan, lebih cepat dari npm) |
| **C++ Build Tools** | Diperlukan untuk modul native `better-sqlite3` dan `sharp` |
| **Git** | Untuk kloning dan kontrol versi |

---

## Mulai Cepat

### Prasyarat
- **Node.js 18+** atau **Bun** (disarankan)
- Lingkungan POSIX (Linux / macOS / WSL)

### Instalasi

```bash
# kloning repositori
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo

# instal dependensi
bun install

# berikan kepercayaan pada modul native (better-sqlite3)
bun pm trust better-sqlite3
```

### Menjalankan server pengembangan

```bash
bun run dev
```

Server dimulai di **http://localhost:3000**. Pada jalankan pertama, basis data dibuat otomatis di `db/hariandja.db` dan diisi dengan:
- 40 anggota marga Hariandja dalam 8 generasi
- 17 catatan pernikahan
- 3 peran sistem (Viewer, Editor, Admin)
- 2 akun demo pengguna

### Build produksi

```bash
bun run build
bun run start
```

---

## Deployment di Windows 11

Panduan deployment lengkap untuk **Windows 11 menggunakan Visual Studio Code** tersedia:

| Bahasa | Dokumen |
|--------|---------|
| Inggris | [DEPLOYMENT_WINDOWS.md](./DEPLOYMENT_WINDOWS.md) |
| Indonesia | [DEPLOYMENT_WINDOWS.id.md](./DEPLOYMENT_WINDOWS.id.md) |

Panduan ini mencakup:

- **Persyaratan sistem** — Windows 11 64-bit, RAM, ruang disk
- **Instalasi prasyarat** — Git, Node.js LTS, Bun, Visual Studio Build Tools 2022 (untuk modul native C++), VS Code dengan ekstensi yang direkomendasikan
- **Daftar dependensi lengkap** — setiap paket npm dengan versi dan tujuan
- **Pengaturan langkah demi langkah** — kloning, instal, konfigurasi `.env`, jalankan server dev
- **Kompilasi modul native** — cara mengkompilasi `better-sqlite3` dan `sharp` di Windows
- **Build produksi** — skrip build yang kompatibel dengan Windows (menggantikan perintah Unix `cp`/`tee`)
- **Manajemen basis data** — lihat, cadangkan, pulihkan basis data SQLite
- **Penyelesaian masalah** — masalah umum Windows (panjang path, akhir baris, konflik port, basis data terkunci, error build)
- **Daftar periksa deployment** — daftar periksa pre-deployment dan pengerasan keamanan

### Pengaturan cepat Windows

```powershell
# 1. Kloning
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo

# 2. Instal dependensi
bun install

# 3. Berikan kepercayaan pada modul native
bun pm trust better-sqlite3

# 4. Buat file .env
# (lihat DEPLOYMENT_WINDOWS.id.md untuk detail)

# 5. Jalankan server dev
bun run dev
```

> ⚠️ Di Windows, `| tee dev.log` pada skrip `dev` mungkin tidak berfungsi di PowerShell. Gunakan **Git Bash** atau hapus bagian `| tee dev.log` dari skrip `dev` di `package.json`.

---

## Akun Demo

Data seed mencakup dua akun demo untuk menguji pengalaman Editor dan Admin:

| Peran | Email | Kata Sandi |
|-------|-------|------------|
| **Admin** | `admin@hariandja.id` | `admin123` |
| **Editor** | `editor@hariandja.id` | `editor123` |

> ⚠️ **Ubah kredensial ini segera** jika menerapkan ke lingkungan non-lokal. Kata sandi dapat dirotasi oleh Admin melalui panel **Admin → Pengguna**, atau langsung di basis data.

---

## Struktur Proyek

```
tarombo/
├── public/
│   ├── tarombo-ikon02.png      # lambang marga (logo + watermark)
│   ├── tarombo-bg01.png        # tekstur latar belakang
│   ├── logo.svg                # favicon cadangan
│   └── robots.txt
├── upload/                     # foto yang diunggah pengguna (gitignored kecuali gambar seed)
│   ├── tarombo-ikon02.png
│   └── tarombo-bg01.png
├── db/                         # basis data SQLite (gitignored, dihasilkan saat runtime)
│   └── hariandja.db
├── prisma/                     # schema lama (tidak digunakan — disimpan untuk referensi scaffold)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # layout root (font, provider, toaster)
│   │   ├── page.tsx            # halaman utama (satu-satunya rute terlihat)
│   │   ├── globals.css         # Tailwind + tema kustom
│   │   └── api/                # handler route API (15 endpoint)
│   │       ├── auth/[...nextauth]/
│   │       ├── tree/
│   │       ├── persons/[id]/
│   │       ├── spouses/[id]/
│   │       ├── birthdays/
│   │       ├── weddings/
│   │       ├── me/
│   │       ├── users/[id]/
│   │       ├── roles/[id]/
│   │       ├── upload/
│   │       └── files/[...path]/
│   ├── components/
│   │   ├── ui/                 # pustaka komponen shadcn/ui (60+ komponen)
│   │   ├── family-tree/        # pohon D3, dialog orang/pasangan/ekspor
│   │   ├── views/              # tampilan tingkat halaman (6 tampilan)
│   │   ├── nav-bar.tsx
│   │   ├── login-dialog.tsx
│   │   └── providers.tsx
│   ├── hooks/
│   │   ├── use-auth.ts         # hook autentikasi + izin sisi klien
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   └── lib/
│       ├── database.ts         # klien better-sqlite3 + inisialisasi schema
│       ├── seed.ts             # data seed marga Hariandja
│       ├── auth.ts             # helper sesi & RBAC sisi server
│       ├── auth-options.ts     # konfigurasi NextAuth
│       ├── types.ts            # tipe TypeScript bersama
│       ├── types-tree.ts       # tipe pohon aman-klien
│       ├── tree.ts             # logika pembangunan pohon (primer/pasangan terlampir)
│       ├── api.ts              # helper respons API
│       ├── export.ts           # ekspor PDF/PNG/JPG dengan watermark
│       └── utils.ts
├── Caddyfile                   # konfigurasi gateway (port 81 → 3000)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env                        # DATABASE_URL (gitignored)
```

---

## Model Data

### Orang (Person)

Setiap catatan individu berisi:

| Bidang | Tipe | Deskripsi |
|--------|------|-----------|
| `id` | TEXT | Primary key |
| `name` | TEXT | Nama lengkap |
| `nickname` | TEXT? | Nama panggilan |
| `place_of_birth` | TEXT? | Kota / desa kelahiran |
| `date_of_birth` | DATE? | Tanggal ISO |
| `date_of_death` | DATE? | Tanggal ISO (null jika masih hidup) |
| `birth_order` | INT | Urutan di antara saudara (0 = tidak ditentukan) |
| `gender` | ENUM | `male` / `female` |
| `residential_address` | TEXT? | Alamat saat ini atau terakhir diketahui |
| `religion` | TEXT? | mis. Kristen Protestan, Islam, Parmalim |
| `phone_number` | TEXT? | Nomor kontak |
| `photo` | TEXT? | URL ke foto yang diunggah (`/api/files/...`) |
| `marital_status` | ENUM? | single / married / widowed / divorced |
| `generation` | INT | Nomor generasi (1 = leluhur pendiri) |
| `father_id` | FK? | Ayah biologis (tidak harus induk di pohon) |
| `mother_id` | FK? | Ibu biologis (tidak harus induk di pohon) |
| `parent_id` | FK? | **Induk resmi** yang menentukan posisi di pohon |
| `burial_name` | TEXT? | Nama lokasi pemakaman |
| `burial_address` | TEXT? | Alamat lokasi pemakaman |
| `burial_lat` | REAL? | Garis lintang |
| `burial_lng` | REAL? | Garis bujur |

### Aturan hubungan

Seseorang memiliki:
- **Satu ayah** — tidak harus sama dengan induk pohon.
- **Satu ibu** — tidak harus sama dengan induk pohon.
- **Satu induk resmi** (`parent_id`) — menentukan di mana orang tersebut muncul di pohon.
- **Nol atau lebih anak** — orang yang `parent_id`-nya menunjuk ke orang ini.
- **Nol atau satu pasangan** (istri/suami) — melalui tabel `spouses`.

### Pasangan (Spouse — catatan pernikahan)

| Bidang | Tipe | Deskripsi |
|--------|------|-----------|
| `id` | TEXT | Primary key |
| `husband_id` | FK | Harus merujuk ke orang laki-laki |
| `wife_id` | FK | Harus merujuk ke orang perempuan |
| `marriage_date` | DATE? | Kapan pernikahan dimulai |
| `divorce_date` | DATE? | Kapan pernikahan berakhir |
| `is_active` | INT | 1 = aktif, 0 = berakhir |

### Batasan pernikahan (diterapkan)

- Seorang **laki-laki** dapat memiliki paling banyak **satu pasangan aktif** pada satu waktu.
- Seorang **perempuan** dapat memiliki paling banyak **satu pasangan aktif** pada satu waktu.
- Jika **suami dari seorang perempuan meninggal**, `divorce_date` diatur otomatis ke tanggal kematian suaminya.
- Jika **istri dari seorang laki-laki meninggal**, `divorce_date` diatur otomatis ke tanggal kematian istrinya.

### Pengguna (User — akun, terpisah dari silsilah)

| Bidang | Tipe | Deskripsi |
|--------|------|-----------|
| `id` | TEXT | Primary key |
| `email` | TEXT | Email login unik |
| `password_hash` | TEXT | hash bcrypt |
| `name` | TEXT | Nama tampilan |
| `role_id` | FK | Peran yang ditetapkan |
| `person_id` | FK? | Tautan opsional ke catatan orang |
| `is_active` | INT | 1 = aktif, 0 = dinonaktifkan |

### Peran (Role)

| Bidang | Tipe | Deskripsi |
|--------|------|-----------|
| `id` | TEXT | Primary key |
| `name` | TEXT | Nama peran unik |
| `description` | TEXT? | Deskripsi yang dapat dibaca manusia |
| `permissions` | JSON | Flag izin halaman + tindakan (lihat RBAC di bawah) |
| `is_system` | INT | 1 = bawaan (tidak dapat dihapus), 0 = kustom |

---

## Kendali Akses Berbasis Peran (RBAC)

Sistem RBAC **sepenuhnya dapat disesuaikan**. Setiap peran membawa objek JSON `permissions`:

```json
{
  "pages": {
    "familyTree": true,
    "familyChart": true,
    "birthdays": true,
    "weddings": true,
    "profile": true
  },
  "actions": {
    "managePersons": true,
    "manageSpouses": true,
    "manageUsers": false,
    "manageRoles": false,
    "exportData": true
  }
}
```

### Peran bawaan

| Peran | Halaman | Tindakan | Butuh akun? |
|-------|---------|----------|-------------|
| **Viewer** | Hanya Pohon Keluarga | tidak ada | ❌ Tanpa login |
| **Editor** | Semua 5 halaman | kelola orang, pasangan, ekspor | ✅ Login |
| **Admin** | Semua 5 halaman + Admin | semua tindakan | ✅ Login |

### Peran kustom

Admin dapat membuat peran baru melalui **Admin → Peran → Tambah peran**, dengan mengaktifkan/menonaktifkan kombinasi izin halaman dan tindakan apa pun. Peran bawaan dapat diedit tetapi tidak dapat dihapus. Peran kustom dapat dihapus hanya jika tidak ada pengguna yang ditetapkan ke peran tersebut.

---

## Ekspor

Pohon keluarga dapat diekspor dalam **lima format**. Setiap ekspor menyertakan lambang `tarombo-ikon02.png` sebagai **watermark tengah**, dengan ukuran proporsional terhadap dimensi file (~35% dari dimensi yang lebih kecil), ditambah tekstur latar belakang opsional.

| Format | Deskripsi | Kasus penggunaan |
|--------|-----------|-------------------|
| **PDF (halaman tunggal)** | Seluruh pohon dimuat pada satu halaman A4 lanskap | Gambaran umum cepat |
| **Multi PDF (berhalaman)** | Pohon diubin menjadi beberapa halaman A4 | Mencetak pohon besar pada kertas standar |
| **PDF format besar** | Satu halaman PDF berukuran besar sesuai dimensi penuh pohon | Cetak poster, arsip |
| **PNG** | Gambar raster resolusi tinggi (skala 2×) | Berbagi digital, penyematan |
| **JPG** | Gambar raster terkompresi | Email, pesan |

> Akses ekspor dikendalikan oleh izin tindakan `exportData`. Viewer tidak dapat mengekspor.

---

## Pengembangan

### Skrip

```bash
bun run dev      # jalankan server dev (port 3000, hot reload)
bun run lint     # jalankan ESLint
bun run build    # build produksi
bun run start    # jalankan server produksi
```

### Basis Data

Basis data adalah file SQLite tunggal di `db/hariandja.db`. Dibuat dan di-seed otomatis saat server pertama kali dijalankan. Untuk meresetnya, cukup hapus file-nya:

```bash
rm db/hariandja.db db/hariandja.db-shm db/hariandja.db-wal
bun run dev   # membuat ulang dan men-seed ulang
```

### Linting

Proyek ini menerapkan ESLint dengan aturan Next.js. Semua kode lolos `bun run lint` dengan bersih.

### Variabel lingkungan

Hanya satu variabel yang diperlukan, diatur di `.env` (gitignored):

```
DATABASE_URL=file:/home/z/my-project/db/hariandja.db
NEXTAUTH_SECRET=hariandja-tarombo-secret-dev-key-2024   # opsional; memiliki default dev
```

---

## Dokumentasi

Dokumen terperinci disediakan bersama kode:

| Dokumen | Inggris | Indonesia |
|---------|---------|------------|
| Gambaran umum proyek | [README.md](./README.md) | [README.id.md](./README.id.md) (file ini) |
| Laporan status | [PROJECT_STATUS.md](./PROJECT_STATUS.md) | [PROJECT_STATUS.id.md](./PROJECT_STATUS.id.md) |
| Dokumentasi teknis | [TECHNICAL_DOC.md](./TECHNICAL_DOC.md) | [TECHNICAL_DOC.id.md](./TECHNICAL_DOC.id.md) |
| Panduan pengguna | [USER_MANUAL.md](./USER_MANUAL.md) | [USER_MANUAL.id.md](./USER_MANUAL.id.md) |
| Deployment Windows | [DEPLOYMENT_WINDOWS.md](./DEPLOYMENT_WINDOWS.md) | [DEPLOYMENT_WINDOWS.id.md](./DEPLOYMENT_WINDOWS.id.md) |

---

## Lisensi

Lisensi MIT — © Marga Hariandja. Lihat [LICENSE](./LICENSE) untuk detail.

> Proyek ini didedikasikan untuk marga Hariandja. *Horas!*
