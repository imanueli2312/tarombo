# Worklog — Tarombo (Silsilah Keluarga Batak)

---
Task ID: all
Agent: main (Z.ai Code)
Task: Membangun full-stack aplikasi Tarombo (pohon silsilah keluarga) dengan logika bisnis lengkap sesuai permintaan.

Work Log:
- Mendefinisikan Prisma schema `Person` & `Partnership` dengan semua field bisnis (nama, nama panggilan, tempat/tanggal lahir & wafat, nomor urut kelahiran, jenis kelamin, alamat, agama, telepon, photo, status pernikahan, nomor generasi, lokasi pemakaman lengkap dgn lat/lng).
- Relasi: Person.fatherId & Person.motherId (referensi langsung, opsional — "belum sebagai tentu orang tua"). Partnership untuk hubungan suami-istri.
- Membuat API routes: `/api/persons` (GET/POST), `/api/persons/[id]` (GET/PATCH/DELETE), `/api/partnerships` (GET/POST), `/api/partnerships/[id]` (GET/PATCH/DELETE), `/api/tree` (GET), `/api/seed` (POST/DELETE), `/api/stats` (GET).
- Implementasi logika bisnis inti di `src/lib/tarombo/queries.ts`:
  - `handleDeathSideEffects`: saat Person meninggal (deathDate diset), partnership AKTIF-nya otomatis di-set WIDOWED dgn divorceDate = tanggal kematian, dan maritalStatus pasangan yang hidup → WIDOWED.
  - `assertNoActivePartner`: validasi maks 1 pasangan aktif per orang (laki-laki & perempuan).
  - `deriveMaritalStatus`: sinkronisasi maritalStatus dari partnership.
  - `buildFamilyTree`: rekursif membangun FamilyNode (person + spouse + children).
  - `findRootAncestors`: menentukan root leluhur tanpa duplikasi (menangani pasangan menikah-masuk & pasangan pendiri).
- Frontend: tema hangat budaya Batak (marun/emas/krem, tanpa biru/indigo) di globals.css.
- Komponen UI: AppHeader, StatsCards, FamilyTree (zoom/pan + CSS connectors), TreeNode (rekursif), PersonNodeCard, PersonSearchList, PersonDetailPanel, PersonFormSheet (Sheet multi-section), PartnershipFormDialog, ConfirmDialog, EmptyState.
- Halaman utama `src/app/page.tsx`: layout dashboard (header + tree + sidebar tabs + footer sticky), React Query untuk data fetching, dialog CRUD lengkap.
- Seed data keluarga contoh 4 generasi (13 orang, 4 pasangan) dengan kasus: leluhur wafat, pasangan janda/duda, dll.

Stage Summary:
- Aplikasi Tarombo full-stack berfungsi end-to-end, terverifikasi via Agent Browser & API.
- Logika bisnis terbukti bekerja: auto-cerai saat pasangan meninggal (divorceDate = deathDate, status → WIDOWED), validasi maks 1 pasangan aktif, pohon silsilah rekursif tanpa duplikasi.
- Lint bersih (0 error/warning), dev server 200 tanpa runtime error, footer sticky di bottom viewport (docHeight = viewport).
- VLM mengkonfirmasi UI berkualitas tinggi (tree jelas dgn connector, kartu terbaca, palet hangat kohesif).

---
Task ID: phase-2
Agent: main (Z.ai Code)
Task: Pemisahan data User (akun) dari Person (pohon tarombo) + fungsi export PDF (A4/A3/Multiple/Large), JPG, PNG.

Work Log:
- Menambah model `User` di Prisma schema, terpisah dari `Person`:
  - User = akun pengguna aplikasi (email, password, name, photo, phone, role ADMIN/MEMBER).
  - linkedPersonId opsional: menautkan User ke satu Person (dirinya di pohon tarombo).
  - Relasi balik Person.linkedUsers.
- API routes baru: `/api/users` (GET/POST), `/api/users/[id]` (GET/PATCH/DELETE), `/api/users/active` (GET/POST/DELETE via cookie `tarombo_active_user`).
- Update seed: membuat 2 user contoh — admin (admin@tarombo.id) + member Robby yang ter-link ke Person Robby di pohon.
- Tipe & API client: `userSchema`, `UserPublic`, `roleLabel`, fetchUsers, fetchActiveUser, setActiveUser, createUser, updateUser, deleteUser.
- UI pemisahan:
  - `UserManagementSheet`: sheet CRUD user lengkap (tambah/edit/hapus, tautkan ke Person, switch active).
  - `UserMenuButton` di header: dropdown menampilkan user aktif + switch cepat + link "Kelola Pengguna".
  - Indikator badge "Aktif" + label role (Administrator/Anggota) + nama Person tertaut.
- Sistem Export:
  - `export-html.ts`: render dokumen HTML mandiri pohon tarombo (header, legenda, tree rekursif dengan connector CSS, footer). Tema hangat konsisten.
  - `playwright-service.ts`: singleton browser Chromium untuk render HTML → PDF / image. Mendukung PDF format A4/A3/A2/A1, landscape, single-page (large), serta screenshot PNG/JPG skala 2x.
  - `/api/export` route (GET): parameter format=pdf|png|jpg, scope=current|all, size=A4|A3|A2|A1|LARGE, rootId. Mengembalikan file dengan Content-Disposition attachment.
  - `ExportDialog`: 6 opsi (PDF A3, PDF A4, Multiple PDF per leluhur, PDF Ukuran Besar single-page, PNG, JPG) + pilihan ruang lingkup (semua / leluhur terpilih).
- Install dependency: `playwright` + chromium browser binary.
- Verifikasi: semua 6 format export terunduh via UI (PNG 127KB, PDF Large 149KB, dll); VLM mengkonfirmasi PNG export berkualitas tinggi (tree + connector + legenda + kartu terbaca).

Stage Summary:
- Pemisahan User vs Person tuntas: User adalah akun aplikasi (login, role, opsional link ke Person); Person murni anggota pohon tarombo. Satu Person bisa ditautkan banyak User; satu User maksimal 1 Person.
- Export berfungsi penuh: PDF (A4/A3/Multiple/Large), JPG, PNG — diproses server via headless Chromium, download otomatis di browser.
- Lint bersih (0 error/warning), dev server 200 tanpa runtime error, responsif mobile & footer sticky.
