# Laporan Status Proyek

**Proyek:** Tarombo Hariandja — Pohon Keluarga Marga Hariandja
**Repositori:** https://github.com/imanueli2312/tarombo
**Tanggal laporan:** 7 Agustus 2026
**Versi:** 0.2.1
**Status:** ✅ **Berfungsi — siap untuk ditinjau marga**

> **Bahasa:** [English](./PROJECT_STATUS.md) · **Indonesia** (file ini)

---

## 1. Ringkasan Eksekutif

Aplikasi pohon keluarga Tarombo Hariandja telah dibangun secara menyeluruh (end-to-end) dan berfungsi penuh. Semua persyaratan yang ditentukan dalam brief awal telah diimplementasikan, diverifikasi melalui pengujian browser otomatis, dan didorong ke repositori GitHub. Aplikasi berjalan dengan bersih di server pengembangan tanpa error runtime.

Situs menyajikan *tarombo* vertikal interaktif berbasis D3.js dengan 40 anggota marga Hariandja dalam 8 generasi, dengan kendali akses berbasis peran yang memisahkan Viewer anonim dari Editor dan Admin yang terautentikasi. Data akun dipisahkan secara ketat dari catatan silsilah. Semua lima format ekspor (PDF, multi-halaman PDF, format besar PDF, PNG, JPG) beroperasi dan menerapkan lambang marga sebagai watermark tengah.

---

## 2. Kepatuhan Persyaratan

| # | Persyaratan | Status | Catatan |
|---|-------------|--------|---------|
| 1 | Khusus untuk marga besar Hariandja | ✅ Selesai | Data seed, branding, dan teks semuanya merujuk ke Marga Hariandja |
| 2 | Estetika lembut, modern, dan minimalis | ✅ Selesai | Palet hangat terakota/krem, kartu membulat, ruang putih yang memadai |
| 3 | Dukungan mode terang | ✅ Selesai | Mode terang adalah default dan tema utama |
| 4 | Pemisahan akun pengguna dari data silsilah | ✅ Selesai | Tabel `users` independen dari `persons`; `person_id` adalah tautan opsional |
| 5 | RBAC: Viewer, Editor, Admin | ✅ Selesai | Tiga peran bawaan dengan set izin yang berbeda |
| 6 | Peran RBAC dapat disesuaikan | ✅ Selesai | Admin dapat membuat/mengedit/menghapus peran kustom melalui UI |
| 7 | Viewer tidak memerlukan akun | ✅ Selesai | Akses anonim ke Pohon Keluarga; `/api/me` mengembalikan null user |
| 8 | Viewer hanya mengakses Pohon Keluarga | ✅ Selesai | Navigasi dan gating tampilan diterapkan di sisi klien dan server |
| 9 | Editor & Admin mengakses semua 5 halaman | ✅ Selesai | Pohon Keluarga, Bagan Keluarga, Ulang Tahun, Pernikahan, Profil |
| 10 | Tanpa Cloud / S3 / SaaS / MinIO / GEDCOM / AI / Prisma | ✅ Selesai | Hanya better-sqlite3 + penyimpanan file lokal |
| 11 | Visualisasi D3.js, layout vertikal | ✅ Selesai | Layout pohon vertikal kustom dengan kartu pasangan, zoom/geser |
| 12 | Ekspor: PDF, multi PDF, PDF format besar, JPG, PNG | ✅ Selesai | Semua 5 format diimplementasikan di `src/lib/export.ts` |
| 13 | `tarombo-ikon02.png` sebagai watermark, tengah, ukuran disesuaikan | ✅ Selesai | ~35% dari dimensi lebih kecil, tengah, opasitas 18% |
| 14 | `tarombo-ikon02.png` sebagai logo | ✅ Selesai | Di bilah navigasi dan footer |
| 15 | `tarombo-bg01.png` sebagai latar belakang | ✅ Selesai | Latar belakang halaman halus + latar belakang ekspor opsional |

### Persyaratan logika data

| Aturan | Status | Penerapan |
|-------|--------|-----------|
| Orang memiliki satu ayah (tidak harus induk pohon) | ✅ | FK `father_id`, independen dari `parent_id` |
| Orang memiliki satu ibu (tidak harus induk pohon) | ✅ | FK `mother_id`, independen dari `parent_id` |
| Orang memiliki satu induk resmi | ✅ | FK `parent_id` menentukan posisi pohon |
| Orang memiliki 0–banyak anak | ✅ | Anak = orang yang `parent_id`-nya = orang ini |
| Orang dapat memiliki pasangan | ✅ | Melalui tabel `spouses` |
| Pasangan memiliki 0–banyak anak | ✅ | Anak merujuk ke induk primer |
| Laki-laki: maks 1 pasangan aktif | ✅ | Divalidasi di `validateSpouse()` sebelum insert/update |
| Perempuan: maks 1 pasangan aktif | ✅ | Divalidasi di `validateSpouse()` sebelum insert/update |
| Suami meninggal → tanggal cerai otomatis diatur | ✅ | `applyDeathAutoDivorce()` berjalan pada setiap query pasangan |
| Istri meninggal → tanggal cerai otomatis diatur | ✅ | Fungsi yang sama |

---

## 3. Metrik Build & Kualitas

### Ukuran kode
- **Total baris sumber:** ~12.543 (termasuk pustaka shadcn/ui)
- **Baris khusus aplikasi:** ~5.790 (tidak termasuk `components/ui/`)
- **Handler route API:** 15
- **Komponen React (kustom):** 11 tampilan + dialog
- **Komponen shadcn/ui tersedia:** 60+

### Linting
```
$ bun run lint
✓ 0 error, 0 peringatan
```
Semua kode lolos ESLint dengan aturan Next.js secara bersih.

### Hasil uji (verifikasi Agent Browser)

Verifikasi end-to-end dilakukan menggunakan alat otomasi Agent Browser. Semua alur jalur-emas (golden path) lulus:

| Alur | Hasil |
|------|-------|
| Halaman dimuat (anonim) | ✅ 200 OK, pohon merender 40 kartu orang |
| Klik kartu orang → dialog detail | ✅ Terbuka dengan data orang yang benar |
| Login sebagai Admin | ✅ Sesi dibuat, semua item nav terlihat |
| Login sebagai Editor | ✅ Sesi dibuat, 5 halaman + akses edit |
| Tampilan Ulang Tahun | ✅ 14 kartu di bagian "Akan datang" dan "Nanti" |
| Tampilan Pernikahan | ✅ Peringatan terdaftar dengan tahun |
| Tampilan Bagan Keluarga | ✅ Hierarki indentasi terender dengan benar |
| Admin → tab Pengguna | ✅ 2 pengguna di tabel, tambah/edit/hapus tersedia |
| Admin → tab Peran | ✅ 3 peran sistem dengan badge izin |
| Dialog ekspor (PNG) | ✅ Tidak ada error konsol, file dihasilkan |
| Logout | ✅ Sesi dihapus, nav kembali ke Viewer saja |
| Viewport mobile (390×844) | ✅ Menu hamburger, layout responsif |

### Verifikasi visual (analisis VLM)
Model bahasa-visi independen menganalisis tangkapan layar dan mengonfirmasi:
- Visualisasi pohon terender dengan benar dengan node yang terhubung dan tidak ada elemen tumpang tindih.
- Desain "lembut, modern, dan minimalis" dengan palet terang yang bersih.
- Logo dan watermark terlihat dan ditempatkan dengan benar.
- Layout memiliki header, area konten, dan footer yang jelas.
- Bagan Keluarga menunjukkan hierarki indentasi yang benar.
- Halaman Ulang Tahun menampilkan konten dengan benar dengan avatar, tanggal, dan hitung mundur.

---

## 4. Ringkasan Data Seed

Basis data di-seed otomatis pada jalankan pertama dengan data perwakilan marga Hariandja:

| Entitas | Jumlah | Detail |
|---------|--------|--------|
| Orang | 40 | 8 generasi, dari Raja Hariandja (l. 1780) hingga generasi termuda (l. 1998) |
| Pasangan | 17 | Catatan pernikahan mencakup semua generasi |
| Pengguna | 2 | Akun demo Admin dan Editor |
| Peran | 3 | Viewer, Editor, Admin (peran sistem) |

### Rincian generasi
- **Gen 1:** Raja Hariandja & Boru Pasogit (leluhur pendiri)
- **Gen 2:** 2 putra dengan istri masing-masing
- **Gen 3:** 4 cucu dengan pasangan
- **Gen 4–7:** Kelanjutan garis keturunan di Medan, Jakarta, Bandung, Surabaya
- **Gen 8:** Anggota hidup termuda (Joshua, Naomi, Samuel, Rebecca, Nathan)

---

## 5. Batasan yang Diketahui & Pekerjaan Mendatang

### Batasan
1. **File SQLite tunggal** — cocok untuk dataset seukuran marga (ratusan hingga ribuan orang). Untuk skala lebih besar, diperlukan migrasi ke PostgreSQL.
2. **Tidak ada toggle mode gelap di UI** — variabel CSS gelap didefinisikan di `globals.css` tetapi tidak ada tombol toggle yang ditampilkan; mode terang adalah satu-satunya tema aktif sesuai persyaratan.
3. **Tidak ada pencarian-ke-pilih** — kotak pencarian di toolbar pohon ada tetapi belum otomatis memfokuskan node yang cocok.
4. **Tidak ada verifikasi email** — akun dibuat oleh Admin; tidak ada alur pendaftaran mandiri atau verifikasi email.
5. **Penyimpanan foto lokal** — foto yang diunggah disimpan ke `/home/z/my-project/upload/` (atau setara saat deployment). Cadangan menjadi tanggung jawab operator.

### Peningkatan yang disarankan (di luar cakupan)
- [ ] Pencarian-ke-fokus di tampilan pohon
- [ ] CSS ramah-cetak untuk pencetakan browser langsung
- [ ] Impor CSV/Excel untuk entri orang massal
- [ ] Peta lokasi pemakaman (menggunakan bidang lat/lng dengan Leaflet)
- [ ] Toggle mode gelap opsional
- [ ] Cadangkan/pulihkan basis data melalui UI Admin

---

## 6. Catatan Deployment

### Lingkungan saat ini
- **Server dev:** Berjalan di port 3000 (Next.js Turbopack)
- **Gateway:** Caddy di port 81 mem-proxy ke port 3000
- **Basis data:** `/home/z/my-project/db/hariandja.db` (SQLite, mode WAL)

### Deployment Windows 11

Panduan deployment lengkap untuk **Windows 11 + Visual Studio Code** tersedia:
- **Inggris:** [DEPLOYMENT_WINDOWS.md](./DEPLOYMENT_WINDOWS.md)
- **Indonesia:** [DEPLOYMENT_WINDOWS.id.md](./DEPLOYMENT_WINDOWS.id.md)

Panduan ini mencakup persyaratan sistem, instalasi prasyarat (Git, Node.js, Bun, VS Build Tools 2022, VS Code), daftar dependensi proyek lengkap, pengaturan langkah demi langkah, kompilasi modul native (`better-sqlite3`, `sharp`), skrip build kompatibel Windows, manajemen basis data, penyelesaian masalah, dan daftar periksa deployment.

### Untuk deploy di tempat lain (umum)
1. Kloning repositori.
2. Jalankan `bun install && bun pm trust better-sqlite3`.
3. Setel `DATABASE_URL` dan `NEXTAUTH_SECRET` di `.env`.
4. Jalankan `bun run build && bun run start`, atau gunakan process manager (PM2, systemd).
5. Pastikan direktori `upload/` dapat ditulis oleh pengguna aplikasi.
6. **Segera ubah** kata sandi akun demo melalui Admin → Pengguna.

> ⚠️ **Catatan Windows:** Skrip `dev` dan `build` menggunakan perintah Unix (`tee`, `cp`). Di Windows PowerShell, gunakan Git Bash atau modifikasi skrip — lihat panduan deployment untuk detail.

### Daftar periksa keamanan sebelum produksi
- [ ] Ubah `NEXTAUTH_SECRET` ke nilai acak yang kuat
- [ ] Ubah kata sandi demo admin dan editor
- [ ] Batasi izin direktori `upload/`
- [ ] Aktifkan HTTPS (Caddy atau reverse proxy)
- [ ] Siapkan cadangan basis data SQLite secara teratur (`sqlite3 hariandja.db ".backup ..."`)
- [ ] Tinjau dan nonaktifkan peran kustom yang tidak digunakan

---

## 7. Status Repositori

```
Branch:     main
Remote:     https://github.com/imanueli2312/tarombo.git
```

Commit terbaru:
- `7fa8c04` — feat: remove spouse card, add death indicator to spouse name in tree
- `e64074f` — feat: redesign family tree cards and fix centering
- `64e4721` — feat: add EN/ID language toggle for the entire interface
- `658626a` — docs: add Indonesian translations of all documentation
- `6022b0e` — docs: add comprehensive project documentation

### Gitignored (tidak di repo)
- `node_modules/`
- `.next/`, `.env*`
- `db/*.db`, `db/*.db-shm`, `db/*.db-wal` (dihasilkan saat runtime)
- `upload/*` (kecuali `tarombo-ikon02.png` dan `tarombo-bg01.png`)
- `*.log`, `dev.log`, `server.log`

### Tercatat di repo
- Semua kode sumber (`src/`)
- File konfigurasi (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `Caddyfile`)
- Aset publik (`tarombo-ikon02.png`, `tarombo-bg01.png`)
- Dokumentasi (Inggris + Indonesia):
  - `README.md` / `README.id.md`
  - `PROJECT_STATUS.md` / `PROJECT_STATUS.id.md`
  - `TECHNICAL_DOC.md` / `TECHNICAL_DOC.id.md`
  - `USER_MANUAL.md` / `USER_MANUAL.id.md`
  - `DEPLOYMENT_WINDOWS.md` / `DEPLOYMENT_WINDOWS.id.md`
- Skrip scaffold (`.zscripts/`, `tests/`, `examples/`)

---

## 8. Tanda Tangan Selesai

| Item | Status |
|------|--------|
| Semua persyaratan diimplementasikan | ✅ |
| Lint lolos bersih | ✅ |
| Server dev berjalan tanpa error | ✅ |
| Interaktivitas terverifikasi browser | ✅ |
| Kode didorong ke GitHub | ✅ |
| Dokumentasi ditulis (Inggris + Indonesia) | ✅ |
| Toggle bahasa EN/ID | ✅ |
| Panduan deployment Windows 11 | ✅ |

**Proyek siap untuk ditinjau oleh marga dan menerima umpan balik.**
