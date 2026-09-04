# Tarombo — Pohon Keluarga Digital Marga Batak

Aplikasi silsilah (tarombo) digital untuk keluarga Marga Hariandja dengan
validasi **Panduan Adat Batak** (Dalihan Na Tolu, eksogami marga, pariban)
dan pengelolaan warisan budaya (Turian & Pusaka).

Dibangun dengan Next.js 16, React 19, SQLite (better-sqlite3), Tailwind CSS 4,
dan shadcn/ui. Autentikasi JWT + RBAC tiga peran (viewer/editor/admin).

## Fitur Utama

- **Pohon keluarga interaktif** (D3) dengan pasangan & generasi otomatis.
- **Buku Marga** — buku silsilah digital ala tarombo tradisional: anggota
  garis marga per generasi dengan penomoran hierarkis keturunan, direktori
  marga beserta statistik, sinkronisasi generasi, serta ekspor siap-cetak
  (HTML/PDF) dan JSON.
- **Transfer data** — backup JSON lengkap, impor JSON/CSV/GEDCOM 5.5.1
  dengan validasi ketat & mode dry-run, serta kompatibel dengan aplikasi
  genealogi dunia. Lihat
  [docs/BUKU_MARGA_TRANSFER.md](docs/BUKU_MARGA_TRANSFER.md).
- **Transfer pusaka + audit trail** — pemindahan kepemilikan pusaka dengan
  riwayat pewarisan otomatis dan log seluruh operasi transfer.
- **Validasi Panduan Adat** — pernikahan semarga, saudara kandung, sepupu
  sejajar (dongan sabutuha), dan garis leluhur ditolak; pernikahan pariban
  ditandai (juga diberlakukan pada impor data). Lihat
  [docs/PANDUAN_ADAT.md](docs/PANDUAN_ADAT.md).
- **Pewarisan marga patrilineal** — marga anak otomatis mengikuti marga ayah.
- **Dalihan Na Tolu hidup** — relasi Hula-hula/Boru/Dongan Sabutuha dihitung
  dari data silsilah dan tampil di detail setiap anggota.
- **Warisan budaya** — pencatatan Turian (sejarah lisan) dan Pusaka benda
  warisan, termasuk penanda sakral dan rantai pewaris.
- **Statistik keluarga** — distribusi generasi, usia, status pernikahan, marga.
- **RBAC lengkap** — manajemen pengguna dan hak akses per peran (termasuk izin
  baru `view_marga_book` & `transfer_data`, dimigrasikan otomatis ke basis
  data lama tanpa menimpa penyesuaian admin).
- **PWA** — dapat dipasang di perangkat; aset statis di-cache, **data API
  tidak pernah di-cache**.
- **Ekspor** — PDF/PNG pohon keluarga, JSON backup, GEDCOM, dan Buku Marga
  siap cetak.

## Setup Cepat

```bash
# 1. Install dependensi
bun install

# 2. Salin dan lengkapi environment
cp .env.example .env.local
#    WAJIB: isi JWT_SECRET (openssl rand -hex 32)

# 3. Jalankan
bun run dev
```

Buka `http://localhost:3000`. Saat pertama kali dimuat, admin awal dan leluhur
akar (Raja Hariandja) dibuat otomatis.

## Environment

| Variabel | Wajib | Keterangan |
|---|---|---|
| `JWT_SECRET` | **Ya (produksi)** | Minimal 32 karakter acak. Produksi menolak jalan tanpa ini. `openssl rand -hex 32` |
| `SEED_ADMIN_PASSWORD` | Ya (produksi) | Password admin pertama (min 8 karakter). Di dev, default `admin123` + peringatan |
| `SEED_ADMIN_EMAIL` | Tidak | Email admin pertama (default `admin@tarombo.local`) |
| `DATABASE_PATH` | Tidak | Lokasi file SQLite (default `db/tarombo.db`) |
| `NEXT_PUBLIC_MARGA_UTAMA` | Tidak | Marga garis utama aplikasi (default `Hariandja`) |

## Keamanan (Hardening)

Ringkasan yang diterapkan di versi ini:

- **Semua endpoint data wajib autentikasi + izin RBAC** (sebelumnya GET terbuka).
- **Login**: rate limiting (5 percobaan/15 menit per IP+email), proteksi
  timing-attack, normalisasi email, pesan error generik.
- **Sesi**: token JWT hanya via cookie `httpOnly` (+issuer/audience), logout
  server-side `/api/auth/logout`; token tidak lagi dikirim di body respons.
- **JWT secret**: fail-fast di produksi, random ephemeral di development.
- **Security headers**: CSP, X-Frame-Options DENY, nosniff, HSTS,
  Referrer-Policy, Permissions-Policy.
- **Service worker**: respons API tidak di-cache (data keluarga tidak
  meninggalkan jejak di Cache Storage setelah logout).
- **Manajemen pengguna**: validasi email/password (min 8, huruf+angka),
  proteksi admin terakhir, email unik case-insensitive.
- **Impor data (transfer)**: izin khusus + rate limit, batas ukuran 5 MB &
  10.000 entitas, mode dry-run, transaksi atomik, validasi lintas-referensi
  (termasuk siklus, monogami, dan adat eksogami marga).
- **Kebersihan repo**: database SQLite, `.env*`, dan berkas kerja tidak
  lagi dilacak git.
- **Error handling**: detail internal tidak dibocorkan ke klien (log sisi server).

> **PENTING — rotasi kredensial lama**: versi sebelumnya pernah menyertakan
> `db/tarombo.db` (berisi hash password admin default `admin123`) di dalam
> riwayat git. Setelah deploy versi ini: ganti password admin, dan jika
> riwayat itu dianggap sensitif, lakukan rotasi riwayat
> (`git filter-repo`) atau ganti kredensial semua pengguna.

## Struktur Proyek

```
src/
  app/api/            # Route handlers (persons, partnerships, heritage, auth,
                      # rbac, marga-book, transfer, pusaka transfer)
  components/features # UI per fitur (tree, search, heritage, adat, marga-book,
                      # transfer, admin, ...)
  lib/                # batak-culture, adat-rules, auth, db, validation,
                      # rate-limit, marga-book, transfer
  types/              # Tipe bersama + matriks RBAC default
docs/PANDUAN_ADAT.md           # Panduan Adat lengkap (rujukan aturan yang divalidasi)
docs/BUKU_MARGA_TRANSFER.md    # Dokumentasi fitur Buku Marga & Transfer
```

## Skrip

```bash
bun run dev     # Development
bun run build   # Build produksi (standalone)
bun run start   # Jalankan hasil build
bun run lint    # ESLint
```

## Semboyan

**Hasangapon · Hagabeon · Hamoraon** — kehormatan, kesejahteraan, kemakmuran.
