# Buku Marga & Transfer — Panduan Fitur

Dokumen ini merangkum hasil audit dan implementasi dua area fitur krusial:
**Buku Marga** (buku silsilah digital) dan **Transfer** (ekspor/impor data,
transfer pusaka, audit trail). Audit menemukan 11 area krusial (5 Buku Marga +
6 Transfer) — semuanya telah diimplementasikan dan diverifikasi.

---

## A. BUKU MARGA

Keluarga Batak secara tradisional menyimpan tarombo dalam bentuk **buku
silsilah cetak**: daftar anggota marga yang dikelompokkan per generasi dan
diberi nomor jalur keturunan. Fitur Buku Marga membawa format tersebut ke
dalam aplikasi.

### Temuan Audit & Penanganan

| Kode | Temuan | Penanganan |
|------|--------|------------|
| BM-1 | Tidak ada "Buku Marga" digital — hanya pohon visual | Tab **Buku Marga**: entri anggota garis marga per generasi dengan penomoran hierarkis ala buku tarombo (`1`, `1.1`, `1.1.2`, …), pasangan (boru/doli) ditampilkan sebagai info entri |
| BM-2 | Tidak ada direktori marga | Tab **Direktori Marga**: statistik seluruh marga dalam data (jumlah anggota, L/P, hidup/wafat, rentang generasi, sub-etnis, penanda marga utama) |
| BM-3 | `nomor_generasi` tak pernah divalidasi/direkomputasi | Tombol **Sinkronkan Generasi** (editor/admin): rekomputasi massal `generasi = 1 + max(generasi orang tua)` dalam satu transaksi, tercatat di log |
| BM-4 | Tidak ada statistik per marga | Kartu statistik buku (total anggota, generasi, L/P, wafat, rentang kelahiran) + direktori marga |
| BM-5 | Tidak ada ekspor/cetak buku | **Cetak / PDF** (HTML siap-cetak, `@media print`) dan **JSON** via `/api/marga-book/export` |

### Aturan Adat yang Diterapkan pada Buku

1. **Garis marga patrilineal** — entri buku hanya memuat anggota marga yang
   dipilih (marga mengikuti ayah, sesuai adat). Pasangan dari marga lain
   ditampilkan sebagai info, bukan anggota garis.
2. **Penomoran keturunan lewat ayah** — nomor `1.2` berarti anak kedua dari
   entri `1`; urutan anak mengikuti nomor urut kelahiran.
3. **Label generasi** — "Generasi I — Leluhur Marga …" dst. (angka Romawi).
4. Anggota marga tanpa ayah **atau** yang ayahnya bukan anggota marga tetap
   ditampilkan (menjadi akar buku baru) — tidak ada anggota yang hilang.

### Endpoint

| Endpoint | Metode | Izin | Fungsi |
|----------|--------|------|--------|
| `/api/marga-book` | GET | `view_marga_book` | Buku marga (default: marga utama/terbesar; `?marga=` untuk memilih) + direktori marga |
| `/api/marga-book` | POST | `edit_person` | Rekomputasi nomor generasi (rate limit 6/10 menit) |
| `/api/marga-book/export` | GET | `view_marga_book` | `?format=html` (siap cetak) / `?format=json` |

---

## B. TRANSFER

### Temuan Audit & Penanganan

| Kode | Temuan | Penanganan |
|------|--------|------------|
| TR-1 | Ekspor hanya gambar — tanpa backup data terstruktur | `/api/transfer/export?format=json`: backup lengkap v2 (persons, partnerships, parent_child, oral_histories, pusaka_items) |
| TR-2 | Tidak ada impor data sama sekali | `/api/transfer/import`: impor **JSON** (backup Tarombo), **CSV** (daftar orang dari Excel/Sheets), dan **GEDCOM** — dengan mode *validate* (dry-run) dan *apply* (transaksi atomik) |
| TR-3 | Tidak ada dukungan GEDCOM (standar genealogi) | Ekspor GEDCOM 5.5.1 (INDI/FAM: NAME, SEX, BIRT, DEAT, MARR, DIV, FAMS, FAMC, CHIL) + impor GEDCOM dasar (termasuk tanggal `ABT/EST/CAL` → perkiraan) |
| TR-4 | Transfer pusaka tanpa aksi eksplisit & riwayat | `POST /api/pusaka/[id]/transfer`: pindah pemegang, pemegang lama otomatis menjadi `passed_from`, tercatat di log |
| TR-5 | Tidak ada audit trail | Tabel `transfer_log`: semua operasi ekspor/impor/transfer pusaka/ekspor buku/rekomputasi tercatat (jenis, aktor, ringkasan, detail, waktu) — dapat dilihat admin |
| TR-6 | Tidak ada hardening impor | Lihat bagian Hardening di bawah |

### Endpoint

| Endpoint | Metode | Izin | Fungsi |
|----------|--------|------|--------|
| `/api/transfer/export` | GET | `transfer_data` | `?format=json` / `?format=gedcom` |
| `/api/transfer/import` | POST | `transfer_data` | Body: `{ format, mode: validate|apply, strategy: skip|overwrite, data }` |
| `/api/transfer/logs` | GET | `transfer_data` | Riwayat transfer (maks 200 entri) |
| `/api/pusaka/[id]/transfer` | POST | `edit_heritage` | Body: `{ to_person_id }` |

Izin `transfer_data` default hanya **admin** (data keluarga sensitif).
`view_marga_book` diberikan ke semua role. Semua permission baru otomatis
ditambahkan ke database lama melalui migrasi `INSERT OR IGNORE` — penyesuaian
admin sebelumnya tidak tertimpa.

### Format CSV (impor orang)

Baris pertama = header. Nama kolom fleksibel (huruf besar/kecil diabaikan):

```
nama,jenis_kelamin,tanggal_lahir,tanggal_lahir_tempat,marga,nama_ayah,nama_ibu
Johannes Hariandja,L,10/03/1958,Balige,Hariandja,Raja Hariandja,
```

- `nama` wajib. `jenis_kelamin`: `L/P/laki-laki/perempuan/M/F/…`.
- Tanggal: `YYYY-MM-DD`, `DD/MM/YYYY`, atau `YYYY/MM/DD`.
- `nama_ayah`/`nama_ibu` diresolusi berdasarkan pencocokan nama (best-effort;
  ambigu atau tidak ditemukan → peringatan, hubungan dilewati).
- Alias umum dikenali (`panggilan`, `marga`, `tempat lahir`, `ayah`, `wafat`,
  `status`, `alamat`, `agama`, `telepon`, `pendidikan`, `pekerjaan`,
  `keterangan`, dst.).

### Validasi Impor (semua format)

Validasi berjalan identik untuk JSON/CSV/GEDCOM:

1. **Format dasar** — enum (jenis kelamin, status pernikahan, kategori turian,
   jenis pusaka), tanggal `YYYY-MM-DD`, panjang field, koordinat makam,
   angka bulat positif.
2. **Kewajaran tanggal** — kematian ≥ lahir, tidak di masa depan, anak lahir
   ≥ 10 tahun setelah orang tua.
3. **Referensi** — id orang tua/pasangan harus ada (di DB atau di payload),
   jenis kelamin ayah/ibu sesuai.
4. **Siklus** — relasi orang tua–anak baru tidak boleh membentuk lingkaran
   silsilah (diperiksa atas gabungan DB + payload; DAG dengan banyak jalur
   tetap diperbolehkan).
5. **Monogami** — pasangan aktif tidak boleh ganda (lintas DB + payload;
   duplikat impor tidak dihitung dua kali).
6. **Adat eksogami marga** — pernikahan semarga **ditolak** (menyelaraskan
   dengan `Panduan Adat`); marga tidak lengkap → peringatan.
7. **Adat patrilineal** — marga anak kosong otomatis mengikuti marga ayah;
   marga anak berbeda dari ayah → peringatan.

### Hardening (TR-6)

- Izin `transfer_data` + rate limit (impor 6/10 menit, ekspor 20/10 menit,
  transfer pusaka 15/10 menit, rekomputasi 6/10 menit).
- Batas ukuran payload **5 MB** (Content-Length + panjang data) → `413`.
- Batas **10.000 entitas** per impor.
- Mode `validate` (dry-run) memeriksa seluruh data **tanpa menulis apa pun**.
- Mode `apply` menulis dalam **satu transaksi atomik** — kegagalan di tengah
  jalan tidak meninggalkan data setengah-impor.
- Laporan terperinci: ringkasan jumlah + daftar masalah (error/peringatan)
  per entri.
- Strategi konflik ID: `skip` (lewati data lama — aman) atau `overwrite`
  (perbarui).

### Bug laten yang ikut diperbaiki saat audit

1. **`parseDate()` di `lib/validation.ts` selalu mengembalikan `null`** karena
   regex korup berisi karakter backspace (0x08) — akibatnya seluruh validasi
   tanggal aplikasi diam-diam tidak berfungsi. Sudah diperbaiki dan
   diverifikasi.
2. **`FIELD_LIMITS`** belum memuat batas untuk `marga_asal`, `tempat_asal`,
   `pendidikan`, `pekerjaan`, `keterangan` — route persons sudah memanggil
   validasi namun tanpa efek. Batas kini ditambahkan (100/200/200/200/2000).
3. **`createOralHistory` / `createPusakaItem` / route pusaka** meneruskan
   field `undefined` ke binding SQLite yang dapat menyebabkan error 500 —
   dinormalisasi ke `''`/`null`/`false`.
4. **`seedDefaultData`** memakai `ALL_PERMISSIONS` tanpa mengimpornya —
   menyebabkan kegagalan seeding permission pada database baru. Sudah
   diperbaiki; sekaligus diubah menjadi `INSERT OR IGNORE` agar permission
   baru otomatis ditambahkan ke database lama tanpa menimpa penyesuaian admin.

---

## Alur Pemakaian yang Dianjurkan

1. **Backup rutin** — Transfer → Ekspor → Unduh Backup JSON (simpan di tempat
   aman; data keluarga sensitif).
2. **Migrasi data lama** — siapkan CSV di Excel/Google Sheets → Transfer →
   Impor → pilih file → **Validasi Dulu** → periksa laporan → **Terapkan**.
3. **Berbagi dengan aplikasi genealogi lain** — unduh GEDCOM; data dapat
   dibuka di FamilySearch, MyHeritage, Gramps, dll.
4. **Cetak buku keluarga** — Buku Marga → Cetak / PDF → cetak langsung atau
   simpan sebagai PDF dari browser.
5. **Wariskan pusaka** — Transfer → Transfer Pusaka → pilih pusaka dan
   pemegang baru; riwayat pewarisan tersimpan otomatis.
