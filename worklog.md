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
