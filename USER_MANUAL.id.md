# Panduan Pengguna

**Tarombo Hariandja — Pohon Keluarga Marga Hariandja**

*Horas!* Selamat datang di aplikasi pohon keluarga marga Hariandja. Panduan ini menjelaskan cara menggunakan situs sebagai Viewer, Editor, atau Admin.

> **Bahasa:** [English](./USER_MANUAL.md) · **Indonesia** (file ini)

---

## Daftar Isi

1. [Memulai](#1-memulai)
2. [Pohon Keluarga (untuk semua orang)](#2-pohon-keluarga-untuk-semua-orang)
3. [Masuk (Login)](#3-masuk-login)
4. [Bagan Keluarga](#4-bagan-keluarga)
5. [Ulang Tahun](#5-ulan-tahun)
6. [Pernikahan](#6-pernikahan)
7. [Profil Anda](#7-profil-anda)
8. [Mengekspor Pohon](#8-mengekspor-pohon)
9. [Mengedit Orang & Pernikahan (Editor)](#9-mengedit-orang--pernikahan-editor)
10. [Mengelola Pengguna & Peran (Admin)](#10-mengelola-pengguna--peran-admin)
11. [Tanya Jawab (FAQ)](#11-tanya-jawab-faq)

---

## 1. Memulai

### Apakah saya memerlukan akun?

**Tidak.** Siapa pun dapat melihat pohon keluarga tanpa login. Akun hanya diperlukan untuk Editor dan Admin yang mengelola catatan.

### Cara membuka situs

Situs tersedia melalui **Panel Pratinjau** di sisi kanan antarmuka Anda. Klik **"Buka di Tab Baru"** jika Anda ingin melihatnya di jendela browser terpisah.

### Apa yang akan Anda lihat

Saat pertama membuka situs, Anda akan melihat:
- **Bilah navigasi** di bagian atas dengan lambang marga Hariandja dan judul situs "Tarombo Hariandja"
- **Tampilan Pohon Keluarga** (halaman default) yang menunjukkan *tarombo* marga
- **Footer** di bagian bawah yang menunjukkan mode penayangan Anda saat ini

---

## 2. Pohon Keluarga (untuk semua orang)

Pohon Keluarga (*tarombo*) adalah inti dari aplikasi. Ini menampilkan garis keturunan marga Hariandja sebagai pohon vertikal, dengan leluhur di atas dan keturunan di bawah.

### Memahami kartu

Setiap orang ditampilkan sebagai kartu yang berisi:
- **Garis berwarna** di kiri: biru untuk laki-laki, pink untuk perempuan
- **Avatar lingkaran** (foto jika diunggah, jika tidak inisial nama)
- **Nama lengkap** orang
- **Nama panggilan** dalam tanda kutip (jika diatur)
- **Tahun lahir dan meninggal** (mis. `1990 - kini` berarti masih hidup)
- **Simbol "✝"** untuk orang almarhum

Saat seseorang menikah, **kartu pasangan** muncul tepat di sebelah kanan, dihubungkan oleh garis horizontal:
- **Garis padat** = pernikahan aktif
- **Garis putus-putus** = pernikahan berakhir (cerai atau meninggal)

### Menavigasi pohon

| Aksi | Cara |
|------|------|
| **Geser (Pan)** | Klik dan seret di mana saja pada pohon |
| **Perbesar** | Scroll ke atas, atau klik tombol **(+)** di toolbar |
| **Perkecil** | Scroll ke bawah, atau klik tombol **(−)** |
| **Pas ke layar** | Klik tombol **expand** di toolbar |

### Melihat detail seseorang

Klik kartu orang mana pun untuk membuka dialog detail yang menunjukkan:
- Foto dan info dasar (nama, nama panggilan, jenis kelamin, generasi)
- Detail kelahiran (tempat, tanggal)
- Detail kematian (jika berlaku)
- Status pernikahan dan hubungan keluarga (ayah, ibu, pasangan, anak)
- Alamat tempat tinggal, telepon, agama
- Lokasi pemakaman (nama, alamat, koordinat)

Klik **Tutup** atau tekan `Esc` untuk menutup dialog.

### Legenda

Di bagian bawah tampilan pohon, legenda menjelaskan kode warna:
- Garis biru = Laki-laki
- Garis pink = Perempuan
- Kartu abu-abu = Almarhum
- Garis padat = Pernikahan
- Garis putus-putus = Pernikahan tidak aktif/berakhir

---

## 3. Masuk (Login)

Hanya **Editor** dan **Admin** yang perlu masuk. Jika Anda hanya melihat pohon, lewati bagian ini.

### Langkah-langkah

1. Klik tombol **"Editor / Admin login"** di pojok kanan atas.
2. Masukkan **email** dan **kata sandi** Anda.
3. Klik **Sign in**.
4. Anda akan melihat notifikasi "Welcome back!" dan bilah navigasi akan diperbarui untuk menampilkan semua halaman yang dapat Anda akses.

### Akun demo (untuk pengujian)

| Peran | Email | Kata Sandi |
|-------|-------|------------|
| Admin | `admin@hariandja.id` | `admin123` |
| Editor | `editor@hariandja.id` | `editor123` |

> ⚠️ Ubah ini di deployment nyata melalui Admin → Pengguna.

### Keluar (Logout)

Klik nama/avatar Anda di pojok kanan atas, lalu pilih **Sign out** dari menu dropdown.

---

## 4. Bagan Keluarga

*Tersedia untuk: Editor dan Admin*

Bagan Keluarga adalah tampilan alternatif dari data yang sama, disajikan sebagai **hierarki indentasi** (seperti tree explorer file). Berguna untuk melihat struktur secara sekilas tanpa kompleksitas visual pohon penuh.

### Apa yang ditampilkan

- Setiap orang adalah baris dengan avatar, nama, nama panggilan, generasi, dan tahun lahir/meninggal
- Pasangan muncul dalam kotak yang lebih kecil di sebelah kanan pasangannya
- Anak diindentasi di bawah induknya, dihubungkan oleh garis vertikal
- Jumlah anak untuk setiap orang ditampilkan di sebelah kanan

### Tips

- **Scroll** secara vertikal untuk menavigasi melalui generasi
- Klik baris orang mana pun untuk membuka dialog detail mereka
- Bagan diurutkan berdasarkan urutan kelahiran dalam setiap keluarga

---

## 5. Ulang Tahun

*Tersedia untuk: Editor dan Admin*

Halaman Ulang Tahun menampilkan ulang tahun yang akan datang dari anggota marga yang masih hidup, diurutkan berdasarkan seberapa cepat terjadi.

### Bagian

- **Hari ini** — ulang tahun yang terjadi hari ini (disorot)
- **Akan datang (30 hari ke depan)** — ulang tahun dalam bulan depan
- **Nanti tahun ini** — sisa ulang tahun tahun ini

### Setiap kartu menampilkan

- Avatar dan nama (dengan nama panggilan)
- Nomor generasi
- Tanggal lahir (hari dan bulan)
- Tempat lahir
- **Hitung mundur** ("dalam 5 hari", "dalam 23 hari")
- **Usia** yang akan mereka capai
- Hari dalam seminggu dan tanggal ketika ulang tahun jatuh

---

## 6. Pernikahan

*Tersedia untuk: Editor dan Admin*

Halaman Pernikahan menampilkan peringatan pernikahan pasangan marga, diurutkan berdasarkan kejadian berikutnya.

### Bagian

- **Peringatan yang akan datang** — peringatan dalam 60 hari ke depan
- **Nanti tahun ini** — sisa peringatan

### Setiap kartu menampilkan

- Avatar pasangan (suami dan istri saling tumpang tindih)
- Kedua nama
- Tanggal pernikahan
- **Hitung mundur** ke peringatan berikutnya
- **Tahun** mereka telah menikah
- Badge "ended" jika pernikahan tidak lagi aktif

---

## 7. Profil Anda

*Tersedia untuk: Editor dan Admin*

Halaman Profil memungkinkan Anda mengelola akun Anda sendiri. **Data akun Anda terpisah dari catatan silsilah** — mengubah kata sandi tidak memengaruhi pohon keluarga.

### Apa yang dapat Anda lakukan

- **Melihat** ringkasan akun Anda (nama, email, peran, orang yang tertaut)
- **Mengedit** nama tampilan, email, dan kata sandi Anda
- **Melihat izin Anda** — halaman dan tindakan apa yang diizinkan oleh peran Anda

### Mengubah kata sandi

1. Buka **Profil**
2. Di kartu "Edit details", masukkan kata sandi baru di field "New password"
3. Biarkan kosong untuk mempertahankan kata sandi saat ini
4. Klik **Save changes**

### Menautkan ke catatan orang

Jika akun Anda ditautkan ke seseorang di pohon, nama orang yang tertaut muncul di ringkasan profil Anda. Tautan ini diatur oleh Admin (lihat [Mengelola Pengguna](#10-mengelola-pengguna--peran-admin)).

---

## 8. Mengekspor Pohon

*Tersedia untuk: Editor dan Admin (memerlukan izin `exportData`)*

Anda dapat mengekspor pohon keluarga dalam lima format. Setiap ekspor menyertakan lambang marga Hariandja sebagai **watermark tengah**.

### Langkah-langkah

1. Buka tampilan **Pohon Keluarga**
2. Klik tombol **Export** di toolbar
3. Opsional edit **Document title** (default "Tarombo Hariandja")
4. Aktifkan/nonaktifkan **Watermark** dan **Background texture**
5. Klik salah satu dari lima opsi ekspor:

| Opsi | Cocok untuk |
|------|-------------|
| **PDF (halaman tunggal)** | Gambaran umum cepat pada satu halaman A4 |
| **Multi PDF (berhalaman)** | Mencetak pohon besar pada kertas A4 standar |
| **PDF format besar** | Cetak poster atau mengarsipkan pohon penuh |
| **PNG image** | Berbagi digital berkualitas tinggi |
| **JPG image** | Email atau pesan (file lebih kecil) |

File diunduh otomatis ke folder unduhan browser Anda.

### Tips

- Untuk pohon yang sangat besar, pilih **Large-format PDF** (multi-halaman memiliki batas keamanan 60 halaman)
- PNG dan JPG dirender pada resolusi 2× untuk output yang tajam
- Watermark selalu di tengah dan berukuran proporsional terhadap file

---

## 9. Mengedit Orang & Pernikahan (Editor)

*Tersedia untuk: Editor dan Admin (memerlukan izin `managePersons` / `manageSpouses`)*

### Menambah orang baru

1. Buka **Pohon Keluarga**
2. Klik tombol **Add** di toolbar
3. Pilih **Person** dari dropdown
4. Dalam dialog, beralih ke tab **Edit**
5. Isi detail (lihat field di bawah)
6. Klik **Save**

### Mengedit orang yang ada

1. Klik kartu orang di pohon (atau baris di Bagan Keluarga)
2. Dalam dialog detail, beralih ke tab **Edit**
3. Modifikasi field
4. Klik **Save**

### Field orang

| Bagian | Field |
|--------|-------|
| **Identitas** | Nama lengkap, nama panggilan, jenis kelamin, generasi |
| **Kelahiran** | Tempat lahir, tanggal lahir, urutan kelahiran |
| **Kematian** | Tanggal meninggal (kosongkan jika masih hidup) |
| **Kontak** | Alamat tempat tinggal, nomor telepon, agama |
| **Status** | Status pernikahan (single/married/widowed/divorced) |
| **Foto** | Unggah foto (PNG/JPG/WebP/GIF, maks 8MB) |
| **Hubungan keluarga** | Ayah, Ibu, Induk resmi (posisi pohon) |
| **Pemakaman** | Nama pemakaman, alamat, lintang, bujur |

### Penting: Ayah, Ibu, vs. Induk Resmi

- **Ayah** dan **Ibu** adalah referensi biologis/garis keturunan — mereka tidak memengaruhi di mana orang muncul di pohon.
- **Induk resmi** menentukan posisi orang di pohon. Seseorang tanpa induk resmi menjadi root cabang baru.

### Menambah pernikahan

1. Buka **Pohon Keluarga**
2. Klik **Add** → **Marriage**
3. Pilih **suami** (harus laki-laki) dan **istri** (harus perempuan)
4. Masukkan **marriage date** (opsional)
5. Aktifkan/nonaktifkan **Active marriage** (seseorang hanya dapat memiliki satu pasangan aktif pada satu waktu)
6. Klik **Save**

### Aturan yang diterapkan

- Seorang **laki-laki** dapat memiliki paling banyak **satu pasangan aktif**
- Seorang **perempuan** dapat memiliki paling banyak **satu pasangan aktif**
- Jika pasangan meninggal (tanggal kematian diatur pada catatan orang mereka), **tanggal cerai diatur otomatis** ke tanggal kematian mereka saat catatan pernikahan dilihat atau diedit berikutnya
- Seseorang **tidak dapat menjadi induknya sendiri** (pencegahan siklus diterapkan)

### Menghapus orang

1. Buka dialog detail orang
2. Beralih ke tab **Edit**
3. Klik tombol **Delete** (merah, kiri-bawah)
4. Konfirmasi penghapusan

> ⚠️ Menghapus seseorang menghapus semua referensi ke mereka (field induk anak, catatan pasangan, tautan pengguna). Ini tidak dapat dibatalkan.

---

## 10. Mengelola Pengguna & Peran (Admin)

*Tersedia untuk: Admin saja (memerlukan izin `manageUsers` / `manageRoles`)*

Halaman Admin memiliki dua tab: **Users** dan **Roles**.

### Mengelola pengguna

1. Buka **Admin** → tab **Users**
2. Anda akan melihat tabel semua akun pengguna dengan nama, email, peran, orang tertaut, dan status mereka

#### Menambah pengguna
1. Klik **Add user**
2. Isi: nama, email, kata sandi, peran, orang tertaut opsional
3. Aktifkan/nonaktifkan **Active** (pengguna nonaktif tidak dapat login)
4. Klik **Save**

#### Mengedit pengguna
1. Klik **ikon pensil** di sebelah pengguna
2. Modifikasi field apa pun (biarkan kata sandi kosong untuk mempertahankan saat ini)
3. Klik **Save**

#### Menonaktifkan pengguna
- Aktifkan/nonaktifkan saklar **Active** di tabel — pengguna nonaktif tidak dapat login tetapi akun mereka dipertahankan

#### Menghapus pengguna
1. Klik **ikon tempat sampah** di sebelah pengguna
2. Konfirmasi
- Anda **tidak dapat menghapus akun Anda sendiri**

### Mengelola peran (RBAC)

1. Buka **Admin** → tab **Roles**
2. Anda akan melihat kartu untuk setiap peran yang menunjukkan izinnya

#### Peran bawaan
- **Viewer** — akses pohon keluarga hanya-baca (peran sistem, tidak dapat dihapus)
- **Editor** — semua halaman + manajemen orang/pernikahan (peran sistem, tidak dapat dihapus)
- **Admin** — akses penuh (peran sistem, tidak dapat dihapus)

> Anda **dapat mengedit** izin peran bawaan, tetapi **tidak dapat menghapus**nya.

#### Membuat peran kustom
1. Klik **Add role**
2. Masukkan **Role name** dan **Description**
3. Aktifkan/nonaktifkan **Pages** yang dapat diakses peran ini:
   - Family Tree, Family Chart, Birthdays, Weddings, Profile
4. Aktifkan/nonaktifkan **Actions** yang dapat dilakukan peran ini:
   - Manage persons, Manage marriages, Manage users, Manage roles, Export data
5. Klik **Save**

#### Mengedit peran
1. Klik **ikon pensil** pada kartu peran
2. Aktifkan/nonaktifkan izin sesuai kebutuhan
3. Klik **Save**

#### Menghapus peran kustom
1. Klik **ikon tempat sampah** pada kartu peran kustom
2. Konfirmasi
- Anda hanya dapat menghapus peran dengan **tidak ada pengguna yang ditetapkan**. Tetapkan ulang pengguna terlebih dahulu.

### Contoh: membuat peran "Kontributor"

Misalkan Anda ingin peran yang dapat mengedit orang tetapi tidak pernikahan, dan tidak dapat mengekspor:

1. Admin → Roles → **Add role**
2. Name: "Kontributor"
3. Pages: aktifkan Family Tree, Family Chart, Birthdays, Weddings, Profile
4. Actions: aktifkan hanya **Manage persons**
5. Save
6. Tetapkan peran ini ke pengguna melalui Admin → Users → Edit

---

## 11. Tanya Jawab (FAQ)

### Saya tidak dapat melihat halaman Birthdays/Weddings/Profile!

Halaman-halaman tersebut memerlukan akun. Jika Anda tidak login, Anda melihat sebagai **Viewer** dan hanya dapat melihat Pohon Keluarga. Minta akun kepada Admin.

### Saya sudah login tetapi masih tidak dapat melihat halaman tertentu.

Peran Anda mungkin tidak memiliki izin untuk halaman tersebut. Periksa **Profile → Your permissions**, atau minta Admin untuk menyesuaikan peran Anda.

### Pohon terlalu besar untuk dilihat semua sekaligus.

Gunakan tombol **zoom out** atau scroll untuk memperkecil, lalu **seret** untuk menggeser. Anda juga dapat menggunakan tombol **Fit to screen** untuk memas seluruh pohon secara otomatis. Untuk gambaran permanen, ekspor **PDF (single page)**.

### Bagaimana cara menambah orang yang menikah ke marga?

1. Tambahkan orang tersebut secara normal (tanpa induk resmi — mereka akan menjadi root)
2. Tambahkan **catatan pernikahan** yang menautkan mereka ke pasangan Hariandja mereka
3. Logika pembangunan pohon akan otomatis melampirkan mereka sebagai kartu pasangan di sebelah pasangannya

### Pasangan saya meninggal. Apakah saya perlu mengatur tanggal cerai secara manual?

**Tidak.** Saat Anda mengatur tanggal kematian pada catatan orang, sistem otomatis mengatur tanggal cerai pada catatan pernikahan aktif mereka saat data pernikahan dimuat berikutnya. Anda akan melihat garis pernikahan berubah dari padat ke putus-putus.

### Bisakah saya membatalkan penghapusan?

**Tidak.** Penghapusan bersifat permanen. Jika Anda tidak sengaja menghapus seseorang, Anda perlu membuatnya ulang dan menautkan kembali hubungan keluarga mereka. Selalu periksa dua kali sebelum mengonfirmasi penghapusan.

### Bagaimana cara mengubah kata sandi saya?

Buka **Profile → Edit details**, masukkan kata sandi baru, dan klik **Save changes**.

### Watermark/logo tidak muncul di ekspor saya.

Pastikan toggle **Watermark** aktif di dialog ekspor. Jika lambang masih tidak muncul, file gambar mungkin belum dimuat — coba ekspor lagi setelah beberapa saat.

### Bagaimana cara melaporkan data silsilah yang salah?

Hubungi Editor atau Admin. Mereka dapat mengoreksi detail orang mana pun melalui dialog edit. Jika Anda adalah Editor, navigasikan ke orang tersebut, buka kartunya, beralih ke tab Edit, dan buat koreksi.

---

*Untuk detail teknis, lihat [TECHNICAL_DOC.id.md](./TECHNICAL_DOC.id.md). Untuk status proyek, lihat [PROJECT_STATUS.id.md](./PROJECT_STATUS.id.md).*

*Horas! — Tuhan memberkati marga Hariandja.* 🙏
