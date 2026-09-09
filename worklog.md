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

---
Task ID: 6
Agent: frontend-styling-expert (RoleManagementSheet)
Task: Membuat komponen `RoleManagementSheet` (Sheet right-side, sm:max-w-2xl) untuk admin mengustomisasi role & permission RBAC — daftar role (kiri) + matriks permission editor (kanan) dengan gating `role:manage`, color picker, save dirty-state, dan delete dengan ConfirmDialog.

Work Log:
- Membaca worklog.md + referensi pola dari `user-management-sheet.tsx`, `permissions.ts`, `types.ts`, `api-client.ts`, `use-permissions.ts`, `confirm-dialog.tsx`, dan komponen UI (sheet/card/switch/tooltip/scroll-area) untuk konsistensi tema hangat.
- Menulis file baru `/home/z/my-project/src/components/tarombo/role-management-sheet.tsx` (client component, TypeScript strict, tanpa `any`):
  - React Query `fetchRoles` (key `["roles"]`, enabled saat `open`).
  - Mutations `createRole` / `updateRole` / `deleteRole` dengan invalidation `["roles"]` + sonner toast.
  - Layout 2 kolom: LEFT `w-[240px]` daftar role (dot warna, nama, badge "Sistem", count permission & user, ring aktif), RIGHT editor permission matrix (header Card dengan nama editable/deskripsi/color swatches/save, Card matriks permission dengan ScrollArea `max-h-[60vh]`).
  - Permission grouped by `permissionGroup(key)` via `PERMISSION_GROUPS`; tiap permission: Switch + label + tooltip berisi description.
  - Color swatches: marun/amber/emerald/rose/stone + current color (dedupe).
  - Gating: `useActiveUser().can("role:manage")` — sheet tetap terbuka untuk viewer (`user:view`), kontrol edit hanya muncul untuk admin.
  - State dirty check via derived `edits` map per-role.id (tanpa `useEffect`, bebas dari rule `react-hooks/set-state-in-effect`), preserve unsaved edits saat berganti role.
  - Delete button di-bottom-right dengan ConfirmDialog — disabled untuk `isSystem` atau `userCount > 0` + hint text.
  - Empty state ketika belum ada role, dengan tombol "Tambah Role" inline.
- Refactor pertama men-trigger lint error `react-hooks/set-state-in-effect` (setState di useEffect). Diperbaiki dengan derived-state pattern (`effectiveSelectedId` + `edits` map + `draft` via `useMemo`), menghilangkan kedua useEffect sepenuhnya.
- Memperbaiki satu error TS pada `onConfirm` ConfirmDialog (return type `null | void` → dibungkus block statement untuk return `void` eksplisit).
- Verifikasi: `bun run lint` → 0 error/0 warning. `bun run tsc --noEmit` → 0 error untuk file ini (error pre-existing di file lain tidak disentuh sesuai constraint).

Stage Summary:
- Artifact: `src/components/tarombo/role-management-sheet.tsx` (~598 baris) — komponen siap pakai dengan signature `{ open, onOpenChange }`.
- Fitur lengkap sesuai spec: daftar role + editor matriks permission per-group + color picker + dirty-save + delete ConfirmDialog + gating `role:manage`.
- Lint bersih (0 error/warning) untuk file baru; TypeScript strict pass untuk file ini.
- Tema hangat Tarombo (marun/amber/krem) konsisten dengan `user-management-sheet.tsx`; tidak menggunakan biru/indigo.

---
Task ID: phase-3
Agent: main (Z.ai Code) + frontend-styling-expert (RoleManagementSheet)
Task: RBAC (Role-Based Access Control) yang dapat dikustomisasi oleh admin.

Work Log:
- Update Prisma schema: tambah model `Role` (id, name, description, color, icon, permissions JSON-string, isSystem, sortOrder). Ubah `User.role` (string) → `User.roleId` (relasi ke Role, onDelete SetNull).
- Buat katalog permission `src/lib/tarombo/permissions.ts` (13 permission dalam 6 grup: Orang, Pasangan, Pengguna, Role, Export, Data) + helper parse/serialize + default permissions untuk Administrator & Anggota.
- Buat helper auth `src/lib/tarombo/auth.ts`: `getActiveUserWithPermissions` (baca cookie + fallback ke admin), `hasPermission`, `requirePermission` (lempar PermissionDeniedError), `requireAllPermissions`.
- API routes baru: `/api/roles` (GET butuh user:view, POST butuh role:manage), `/api/roles/[id]` (GET/PATCH/DELETE). Role sistem tidak bisa dihapus; role dengan user tidak bisa dihapus; nama role sistem tidak bisa diubah tapi permission bisa diubah.
- Terapkan permission check di SEMUA API routes: persons (view/create/edit/delete), partnerships (view/create/edit/delete), users (view/manage), tree (view), export (view), seed (data:seed/data:reset, kecuali first-run tanpa user).
- Update seed: buat role default Administrator (13 perm, isSystem) & Anggota (3 perm, isSystem). Assign user admin ke Administrator, member Robby ke Anggota. Self-heal: permission admin selalu lengkap saat seed.
- Update tipe: `UserInput.role` → `roleId`; `UserPublic` + `roleName/roleColor/roleIsSystem`; baru `RolePublic`, `ActiveUserPublic` (dengan permissions array).
- Update API client: `fetchRoles`/`createRole`/`updateRole`/`deleteRole`; `fetchActiveUser`/`setActiveUser` kembalikan `ActiveUserPublic` (dengan permissions).
- Buat hook `useActiveUser()` (`src/lib/tarombo/use-permissions.ts`): `user`, `can(perm)`, `canAny`, `canAll`, `refresh`.
- Update UserManagementSheet: Select role dari daftar (bukan enum hardcoded), tampilkan role badge dengan warna, gate tombol edit/hapus/tambah dengan permission.
- Update UserMenuButton: tampilkan roleName (bukan roleLabel string), menu "Kelola Role & Permission" hanya muncul bila can("role:manage").
- Bangun RoleManagementSheet (delegasi ke subagent frontend-styling-expert, Task ID 6): sheet 2 kolom — kiri daftar role dengan warna & badge sistem, kanan editor matrix permission (group by, switch toggle, color swatches, Simpan saat dirty, hapus dengan ConfirmDialog).
- Update AppHeader: gate tombol Export/Pasangan/Tambah Orang/Seed/Reset berdasarkan permission; kirim onManageRoles ke UserMenuButton.
- Update PersonDetailPanel: gate tombol Edit/Tambah Anak/Pasangan/Hapus berdasarkan permission.
- Update page.tsx: integrasi RoleManagementSheet, gate tombol Pasangan di sidebar.

Stage Summary:
- RBAC lengkap & dikustomisasi admin: admin bisa membuat role baru, mengubah permission per role (termasuk role sistem), menghapus role custom, menetapkan user ke role.
- 13 permission dalam 6 grup: Orang (view/create/edit/delete), Pasangan (create/edit/delete), Pengguna (view/manage), Role (manage), Export (view), Data (seed/reset).
- Enforcement dua lapis: API (403 bila tidak punya permission) + UI (tombol disembunyikan).
- Verifikasi via Agent Browser: admin melihat semua tombol; Anggota hanya melihat yang sesuai permission; toggle permission di matrix → simpan → langsung diterapkan; switch user → UI update sesuai role baru.
- Lint bersih (0 error/warning), dev server 200 tanpa runtime error.
