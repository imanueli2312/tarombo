# Panduan Adat Batak — Tarombo

Dokumen ini menjadi rujukan resmi adat Batak yang **diterapkan dan divalidasi langsung
oleh aplikasi Tarombo**. Setiap aturan di bawah ini dipakai oleh modul
`src/lib/batak-culture.ts`, `src/lib/adat-rules.ts`, dan API `/api/partnerships`.

> Versi ringkas (in-app) tersedia melalui tombol **Panduan Adat** di header aplikasi.

---

## 1. Dalihan Na Tolu

Dalihan Na Tolu — harfiah "tungku yang tiga batu" — adalah sistem sosial Batak yang
menjaga keseimbangan hubungan kekerabatan. Aplikasi menghitung ketiga pilar ini
**secara otomatis dari data silsilah** untuk setiap anggota (lihat detail anggota,
bagian "Dalihan Na Tolu"):

| Pilar | Siapa | Posisi Adat |
|---|---|---|
| **Hula-hula / Tulang** | Keluarga pemberi istri: orang tua pasangan, saudara laki-laki ibu | Dihormati dan dimintai restu; pihak yang memberi *boru* |
| **Boru** | Pihak penerima istri: suami anak perempuan (*tunggane*), suami saudara perempuan | Melaksanakan kewajiban adat kepada hula-hula |
| **Dongan Sabutuha** | Sesama marga (satu tulang punggung) | Sederajat; tolong-menolong, berbagi *hasangapon* |

Prinsip yang dipegang: *"Raja ni hula-hula, jala boru ni dongan"* — posisi setiap
orang bergantung pada dari mana dan ke mana pernikahan mengalir dalam silsilah.

---

## 2. Aturan Adat Pernikahan yang Divalidasi Aplikasi

Setiap pencatatan pernikahan (`POST /api/partnerships`) melewati validasi adat.
Jika **dilarang**, API menolak dengan kode `422` beserta daftar pelanggaran.

### 2.1 Eksogami Marga — *dilarang semarga*
Marga Batak bersifat **patrilineal** dan seseorang **dilarang menikah dengan
seseorang yang semarga** dengannya. Perbandingan marga dilakukan setelah
normalisasi (huruf besar/kecil, spasi, tanda hubung diabaikan) sehingga
"Lumban Tobing" dan "Lumbantobing" dianggap sama.
Jika data marga salah satu calon pasangan kosong, aplikasi memberi peringatan
(data belum bisa diverifikasi), bukan penolakan.

### 2.2 Saudara Kandung — *dilarang*
Dua orang yang berbagi ayah dan/atau ibu (data `parent_child`) tidak boleh
menikah. Berlaku juga untuk saudara tiri seayah/seibu.

### 2.3 Sepupu Sejajar (Dongan Sabutuha) — *dilarang*
Anak dari saudara **sejenis** dianggap saudara sendiri:
- anak kakak/adik **ayah** dengan anak kakak/adik **ayah**;
- anak kakak/adik **ibu** dengan anak kakak/adik **ibu**.

Mereka disebut *dongan sabutuha* dan tidak boleh menikah walaupun bermarga
berbeda (mis. sepupu se-pihak-ibu).

### 2.4 Garis Leluhur — *dilarang*
Pernikahan antara seseorang dengan leluhur atau keturunannya langsung
(diatas/di bawah garis silsilah) ditolak.

### 2.5 Pariban — *dianjurkan*
Pernikahan dengan **sepupu silang** (anak saudara perempuan ayah, atau anak
saudara laki-laki ibu) adalah pola adat yang dianjurkan karena memperkokoh
Dalihan Na Tolu dan menjaga hubungan tulang–boru tetap terjalin lintas
generasi. Aplikasi menandai pernikahan pariban sebagai catatan (bukan
pelanggaran).

---

## 3. Pewarisan Marga (Patrilineal)

- **Anak mengikuti marga ayah.** Saat menambah/edit anggota, jika kolom marga
  dikosongkan dan ayah diketahui, aplikasi **mengisi marga otomatis dari marga
  ayah**.
- Marga garis utama aplikasi dapat dikonfigurasi lewat env
  `NEXT_PUBLIC_MARGA_UTAMA` (default: `Hariandja`) sehingga aplikasi dapat
  dipakai keluarga marga lain.
- Formulir marga memberi saran daftar marga yang dikelompokkan per sub-etnis
  (Toba, Karo, Mandailing & Angkola, Simalungun, Pakpak) — daftar bersifat
  representatif, isian bebas tetap diperbolehkan.

---

## 4. Istilah Kekerabatan (Toba) yang Dipakai Aplikasi

| Istilah | Arti |
|---|---|
| Amang / Inang | Ayah / Ibu |
| Amang Tua / Amang Uda | Paman tertua / paman bungsu (pihak ayah) |
| Tulang | Paman dari pihak ibu (pihak pemberi istri) |
| Nantulang | Istri dari tulang |
| Bapa | Kakak laki-laki (sapaan adik) |
| Nanting | Kakak perempuan (sapaan adik) |
| Anggi | Adik (laki-laki/perempuan) |
| Sauri | Adik perempuan |
| Dongan Sabutuha | Saudara semarga / sepupu sejajar |
| Boru | Anak perempuan; istri (untuk ego laki-laki); juga "pihak penerima istri" |
| Doli | Anak laki-laki; suami (untuk ego perempuan) |
| Parumaen | Menantu perempuan (istri anak laki-laki) |
| Tunggane | Menantu laki-laki / suami saudara perempuan |
| Pariban | Sepupu silang (pasangan adat yang dianjurkan) |
| Hula-hula | Pihak pemberi istri |
| Ipar | Saudara sepasangan |

Catatan koreksi: **parumaen adalah menantu perempuan**, bukan "suami"
(kesalahan pada versi sebelumnya telah diperbaiki).

---

## 5. Status Pernikahan dalam Bahasa Batak

| Status | Batak |
|---|---|
| Belum menikah | Dope marbagas |
| Menikah | Marbagas |
| Cerai | Saur |
| Duda | Duda |
| Janda | Balo |

Catatan: *manjalo* ("menerima istri") hanya tepat untuk konteks laki-laki
yang mengambil istri, sehingga tidak lagi dipakai sebagai padanan umum
"menikah".

---

## 6. Warisan Budaya: Turian dan Pusaka

### 6.1 Turian (Sejarah Lisan)
Kategori yang didukung: asal-usul, migrasi, peristiwa bersejarah, gondang,
mangalahat, saur matua, pesta pernikahan, dan turian umum. Setiap turian
menyimpan sumber (narasumber), tanggal pencatatan, dan penanda verifikasi.

### 6.2 Pusaka (Benda Warisan)
Jenis yang didukung: tombak/piso, ulos, tunggal panaluan, gorga, gabe,
hasangapon, tempayan rotan, kalung bulan, gutar guar, tali tiga, porhala,
jamita, sial solam/sial sao, dan lainnya. Pusaka dapat ditandai **sakral**
dan mencatat rantai pewaris (*passed from*).

### 6.3 Peran dalam Upacara Adat
Parhata (pembicara adat), Habonaron do Bona (pemberi berkat), Namora Pungka,
Raja Panas (ketua pelaksana), Dongan Tubu, dan Boru.

---

## 7. Tiga Tujuan Hidup Orang Batak

**Hasangapon** (kehormatan), **Hagabeon** (kesejahteraan dan keturunan),
**Hamoraon** (kemakmuran) — semboyan aplikasi ini.

---

## 8. Rujukan Penerapan di Kode

| Aturan adat | Lokasi implementasi |
|---|---|
| Eksogami marga, saudara, sepupu sejajar, garis leluhur, pariban | `src/lib/adat-rules.ts` (`checkAdatMarriage`) |
| Normalisasi & pembandingan marga | `src/lib/batak-culture.ts` (`normalizeMarga`, `isSameMarga`) |
| Pewarisan marga patrilineal | `src/app/api/persons/route.ts` & `src/app/api/persons/[id]/route.ts` |
| Perhitungan Dalihan Na Tolu dari silsilah | `src/lib/db.ts` (`getDalihanRelations`) |
| Konstanta budaya (istilah, pusaka, turian, peran adat) | `src/lib/batak-culture.ts` |
| Dialog Panduan Adat in-app | `src/components/features/adat/adat-guide-dialog.tsx` |
