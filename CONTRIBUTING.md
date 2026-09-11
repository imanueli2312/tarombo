# 🤝 Contributing Guide — Tarombo

Terima kasih tertarik berkontribusi pada Tarombo! Dokumen ini menjelaskan cara berkontribusi ke proyek.

---

## 📋 Daftar Isi

- [Code of Conduct](#code-of-conduct)
- [Cara Berkontribusi](#cara-berkontribusi)
- [Setup Development Environment](#setup-development-environment)
- [Struktur Kode](#struktur-kode)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

---

## Code of Conduct

Kami berkomitmen pada lingkungan yang ramah dan inklusif. Saat berkontribusi:

- ✅ **Saling menghargai** — hargai perbedaan pendapat dan latar belakang
- ✅ **Konstruktif** — beri feedback yang membangun, bukan kritik destruktif
- ✅ **Kolaboratif** — bantu sesama kontributor
- ❌ **Toleransi nol** untuk harassment, diskriminasi, atau toxic behavior

---

## Cara Berkontribusi

### Jenis Kontribusi yang Diterima

| Jenis | Deskripsi |
|-------|-----------|
| 🐛 **Bug fix** | Perbaiki bug yang dilaporkan/ditemukan |
| ✨ **Feature baru** | Tambah fitur sesuai roadmap atau request |
| 📚 **Dokumentasi** | Perbaiki/tambah dokumentasi |
| 🎨 **UI/UX improvement** | Tingkatkan tampilan atau pengalaman pengguna |
| ⚡ **Performance** | Optimasi performa |
| 🔒 **Security** | Perbaikan vulnerability |
| 🌐 **Translation** | Terjemahkan UI ke bahasa lain |
| ♿ **Accessibility** | Tingkatkan aksesibilitas |

### Sebelum Mulai

1. Cek [GitHub Issues](https://github.com/imanueli2312/tarombo/issues) — apakah sudah ada issue serupa?
2. Buka issue baru untuk diskusi (untuk fitur besar) sebelum mulai coding
3. Fork repository & buat branch baru

---

## Setup Development Environment

### Prasyarat

- **Node.js** 18+ atau **Bun** 1.0+
- **npm** / **bun**
- **Git**
- Editor: VS Code (recommended) dengan extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (untuk TS)

### Langkah Setup

```bash
# 1. Fork & clone
git clone https://github.com/<your-username>/tarombo.git
cd tarombo

# 2. Tambahkan upstream
git remote add upstream https://github.com/imanueli2312/tarombo.git

# 3. Install dependencies
npm install

# 4. Inisialisasi database
npm run db:init

# 5. Jalankan dev server
npm run dev
```

### Verifikasi Setup

```bash
# Server jalan di http://localhost:3000
# Cek lint
npm run lint

# Seed data contoh (via UI: menu ⋮ → "Muat Data Contoh")
# Atau via API:
curl -X POST http://localhost:3000/api/seed
```

### Akun Demo untuk Testing

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@tarombo.id | `admin123` |
| Editor | robby@tarombo.id | `robby123` |
| Viewer | (publik, tanpa login) | — |

---

## Struktur Kode

```
src/
├── app/
│   ├── api/              # API Routes (Next.js App Router)
│   │   ├── persons/      # CRUD orang
│   │   ├── partnerships/ # CRUD pasangan
│   │   ├── users/        # CRUD pengguna + auth
│   │   ├── roles/        # CRUD role (RBAC)
│   │   ├── tree/         # Pohon silsilah
│   │   ├── export/       # Export PDF/PNG/JPG
│   │   ├── backup/       # Backup & restore JSON
│   │   ├── photo-upload/ # Upload foto
│   │   ├── activity-log/ # Audit trail
│   │   ├── trash/        # Soft delete management
│   │   ├── seed/         # Data contoh
│   │   └── stats/        # Statistik
│   ├── globals.css       # Tema + CSS kustom
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Halaman utama
├── components/
│   ├── providers.tsx     # React Query provider
│   ├── theme-*.tsx       # Tema gelap/terang
│   ├── tarombo/          # Komponen spesifik Tarombo
│   └── ui/               # shadcn/ui components
└── lib/
    ├── db.ts             # Koneksi better-sqlite3
    ├── utils.ts          # Helper (cn, dll)
    └── tarombo/
        ├── types.ts      # Tipe & Zod validator
        ├── queries.ts    # Fungsi akses data
        ├── auth.ts       # RBAC (requirePermission)
        ├── permissions.ts # Katalog permission
        ├── security.ts    # bcrypt, activity log, validation
        ├── export-html.ts # HTML renderer untuk export
        ├── playwright-service.ts # Headless browser
        ├── api-client.ts # Client-side fetch wrapper
        └── use-permissions.ts # useActiveUser() hook
```

### Konvensi Penamaan

| Tipe | Konvensi | Contoh |
|------|----------|--------|
| **File komponen** | `kebab-case.tsx` | `person-form-sheet.tsx` |
| **File lib** | `kebab-case.ts` | `use-permissions.ts` |
| **API route** | `route.ts` di folder | `src/app/api/persons/route.ts` |
| **Component** | PascalCase | `PersonFormSheet` |
| **Function** | camelCase | `buildFamilyTree()` |
| **Type/Interface** | PascalCase | `TreeNodePerson` |
| **Constant** | UPPER_SNAKE | `GUEST_PERMISSIONS` |
| **CSS class** | kebab-case | `tarombo-scroll` |

---

## Coding Standards

### TypeScript

- **Strict mode** aktif (`"strict": true` di `tsconfig.json`)
- **No `any`** — gunakan `unknown` bila perlu, lalu type guard
- **Explicit return types** untuk public functions
- **Zod** untuk validasi input API

```typescript
// ✅ Good
export function buildFamilyTree(rootPersonId: string): FamilyNode | null {
  // ...
}

// ❌ Bad
export function buildFamilyTree(rootPersonId: any): any {
  // ...
}
```

### React Components

- **Functional components** only (no class components)
- **`"use client"`** untuk komponen yang pakai hooks/state
- **Props interface** di-define explicitly
- **Jangan** inline styles kecuali untuk dynamic values

```tsx
// ✅ Good
interface Props {
  person: TreeNodePerson;
  onSelect?: (id: string) => void;
}

export function PersonCard({ person, onSelect }: Props) {
  return <div onClick={() => onSelect?.(person.id)}>...</div>;
}

// ❌ Bad
export function PersonCard({ person, onSelect }: any) {
  return <div style={{ color: 'red' }}>...</div>;
}
```

### API Routes

- **Validasi input** dengan Zod
- **Permission check** di awal (`requirePermission`)
- **Error handling** dengan try-catch, return proper HTTP status
- **Activity log** untuk mutations (create/update/delete)

```typescript
export async function POST(req: NextRequest) {
  try {
    const me = await requirePermission("person:create");

    const body = await req.json();
    const parsed = personSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // ... business logic ...

    logActivity({
      userId: me.id,
      userName: me.name,
      action: "create",
      entityType: "person",
      entityId: id,
      entityName: created.full_name,
    });

    return NextResponse.json({ data: serializePerson(created) }, { status: 201 });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

### Database Queries

- **Prepared statements** (selalu, untuk security)
- **Exclude soft-deleted** (`WHERE deleted_at IS NULL`)
- **Transaction** untuk multi-table operations

```typescript
// ✅ Good (prepared statement, exclude deleted)
const person = sqlite
  .prepare("SELECT * FROM person WHERE id = ? AND deleted_at IS NULL")
  .get(id) as PersonRow | undefined;

// ❌ Bad (SQL injection risk)
const person = sqlite.exec(`SELECT * FROM person WHERE id = '${id}'`);
```

### Styling (Tailwind CSS)

- **Pakai existing shadcn/ui** — jangan buat dari scratch
- **Warm theme** — marun/amber/krem, **TIDAK boleh** blue/indigo
- **Responsive** — mobile-first (`sm:`, `md:`, `lg:`)
- **Dark mode** — selalu cek dengan `.dark` class

```tsx
// ✅ Good
<div className="bg-background text-foreground p-4 rounded-lg">
  <p className="text-sm text-muted-foreground">...</p>
</div>

// ❌ Bad (hardcoded blue)
<div className="bg-blue-500 text-white p-4">
```

### File Naming

- Komponen baru: `src/components/tarombo/<nama-komponen>.tsx`
- API route baru: `src/app/api/<resource>/route.ts`
- Lib baru: `src/lib/tarombo/<nama-lib>.ts`

---

## Git Workflow

### Branch Naming

| Tipe | Format | Contoh |
|------|--------|---------|
| Feature | `feat/<deskripsi>` | `feat/add-search-filter` |
| Bug fix | `fix/<deskripsi>` | `fix/logout-not-working` |
| Refactor | `refactor/<deskripsi>` | `refactor/d3-tree-layout` |
| Docs | `docs/<deskripsi>` | `docs/update-readme` |
| Chore | `chore/<deskripsi>` | `chore/update-deps` |

### Commit Convention

Pakai [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <deskripsi>

<body opsional>

<footer opsional>
```

**Tipe**:
| Tipe | Untuk |
|------|-------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `refactor` | Refactor (tidak mengubah behavior) |
| `docs` | Dokumentasi |
| `style` | Formatting (tidak mengubah logic) |
| `test` | Testing |
| `chore` | Maintenance (deps, config) |
| `perf` | Performance improvement |
| `security` | Security fix |

**Contoh**:
```
feat(export): tambah filter aliveOnly untuk export PDF

fix(auth): logout tidak bekerja karena dropdown auto-close

refactor(queries): ganti Prisma ke better-sqlite3

docs(api): tambah contoh curl di API.md
```

### Workflow

```bash
# 1. Sync dengan upstream
git checkout main
git pull upstream main

# 2. Buat branch baru
git checkout -b feat/my-feature

# 3. Code & commit
git add .
git commit -m "feat(scope): deskripsi perubahan"

# 4. Push ke fork
git push origin feat/my-feature

# 5. Buat Pull Request di GitHub
```

---

## Testing

### Test Manual (Minimum)

Sebelum submit PR, pastikan test skenario berikut:

#### Smoke Test

```bash
# 1. Fresh start
rm -f db/custom.db db/custom.db-wal db/custom.db-shm
npm run db:init
npm run dev

# 2. Seed data
curl -X POST http://localhost:3000/api/seed

# 3. Cek UI
# - Buka http://localhost:3000
# - Pohon tarombo terender
# - Guest mode (Tamu Viewer)

# 4. Login admin
# - Klik "Tamu" → "Administrator" → password: admin123
# - Cek tombol "Tambah Orang" muncul

# 5. Test RBAC
# - Logout → cek tombol hilang
# - Login editor → cek tombol ada, tapi tidak ada "Hapus"
```

#### Lint Check

```bash
# Harus 0 error
npm run lint
```

#### Test API

```bash
# Login admin
curl -X POST http://localhost:3000/api/users/active \
  -H "Content-Type: application/json" \
  -d '{"userId":"<admin-id>","password":"admin123"}' \
  -c /tmp/admin.cookie

# Test endpoint
curl http://localhost:3000/api/persons -b /tmp/admin.cookie | jq .
curl http://localhost:3000/api/tree -b /tmp/admin.cookie | jq .
curl http://localhost:3000/api/stats -b /tmp/admin.cookie | jq .
```

### Test RBAC

Pastikan permission enforcement bekerja:

```bash
# Guest (no cookie) tidak bisa create
curl -X POST http://localhost:3000/api/persons \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","gender":"MALE"}'
# Expected: 403

# Editor tidak bisa delete
curl -X DELETE http://localhost:3000/api/persons/<id> \
  -b /tmp/editor.cookie
# Expected: 403
```

### Test Validation

```bash
# Tanggal wafat sebelum lahir → 400
curl -X PATCH http://localhost:3000/api/persons/<id> \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1900-01-01","deathDate":"1899-01-01"}' \
  -b /tmp/admin.cookie
# Expected: 400 "Tanggal wafat tidak boleh sebelum tanggal lahir"
```

---

## Pull Request Process

### Sebelum Submit PR

- [ ] Code mengikuti **coding standards**
- [ ] **Lint bersih** (`npm run lint` → 0 error)
- [ ] **Manual test** lulus (smoke test di atas)
- [ ] **RBAC enforcement** teruji (bila menyentuh API)
- [ ] **Tidak ada file sensitif** ter-commit (`.env`, `db/custom.db`, `uploads/`)
- [ ] **Commit message** mengikuti conventional commits
- [ ] **Dokumentasi** diupdate (bila perlu)

### PR Template

```markdown
## Deskripsi

<!-- Jelaskan apa yang diubah dan mengapa -->

## Tipe Perubahan

- [ ] Bug fix (non-breaking)
- [ ] Feature baru (non-breaking)
- [ ] Breaking change (perlu migration)
- [ ] Dokumentasi
- [ ] Refactor
- [ ] Performance

## Testing

- [ ] Lint bersih
- [ ] Manual test lulus
- [ ] RBAC teruji (bila relevan)

## Checklist

- [ ] Kode mengikuti coding standards
- [ ] Tidak ada file sensitif ter-commit
- [ ] Commit message konvensional
- [ ] Dokumentasi diupdate (bila perlu)
```

### Review Process

1. **Self-review** — cek code sendiri sebelum assign reviewer
2. **Automated check** — CI akan jalankan lint (bila ada)
3. **Peer review** — maintainer akan review
4. **Approval** — minimal 1 approval untuk merge
5. **Squash & merge** — commit akan di-squash

### Setelah Merge

- Hapus branch lokal: `git branch -d feat/my-feature`
- Sync fork: `git pull upstream main`
- Push ke fork: `git push origin main`

---

## Reporting Bugs

### Sebelum Report

1. Cek [existing issues](https://github.com/imanueli2312/tarombo/issues) — mungkin sudah dilaporkan
2. Update ke versi terbaru (`git pull`) — mungkin sudah di-fix
3. Reproduce dengan data contoh (seed)

### Bug Report Template

```markdown
**Deskripsi Bug**
<!-- Jelaskan bug dengan jelas -->

**Langkah Reproduksi**
1. ...
2. ...
3. ...

**Expected Behavior**
<!-- Apa yang seharusnya terjadi -->

**Actual Behavior**
<!-- Apa yang terjadi -->

**Screenshots**
<!-- Bila ada -->

**Environment**
- OS: [e.g., Windows 11, Ubuntu 22.04]
- Browser: [e.g., Chrome 120, Firefox 121]
- Node.js version: [e.g., 18.17]
- Tarombo version: [commit hash atau tag]
```

---

## Feature Requests

### Sebelum Request

1. Cek apakah sudah ada issue serupa
2. Pertimbangkan apakah fitur sesuai dengan **scope proyek** (genealogy app, bukan social media)

### Feature Request Template

```markdown
**Fitur yang Diminta**
<!-- Jelaskan fitur -->

**Use Case**
<!-- Mengapa fitur ini dibutuhkan? Skenario penggunaan -->

**Alternatif yang Dipertimbangkan**
<!-- Apakah ada cara lain achieve tujuan ini? -->

**Additional Context**
<!-- Screenshot, mockup, referensi -->
```

---

## Areas Needing Contribution

### Roadmap (Butuh Kontribusi)

- [ ] **Relationship Finder** — temukan hubungan antar 2 orang
- [ ] **Pengingat Ulang Tahun** — dashboard dengan ulang tahun bulan ini
- [ ] **Pencarian Canggih** — filter multi-kriteria + quick palette (Ctrl+K)
- [ ] **Catatan/Biografi** — field notes per orang (markdown)
- [ ] **Multiple Photo Gallery** — galeri foto per orang
- [ ] **Rate limiting** di API
- [ ] **Unit testing** (Jest/Vitest)
- [ ] **E2E testing** (Playwright test)
- [ ] **Internationalization** (i18n — id/en)
- [ ] **Offline mode** (PWA)

### Documentation Needs

- [ ] Video tutorial
- [ ] Screenshot gallery
- [ ] FAQ
- [ ] Migration guide (bila ada breaking change)

---

## Pertanyaan?

- **GitHub Issues** — untuk bug & feature request
- **GitHub Discussions** — untuk Q&A & diskusi umum
- **Email** — maintainer@tarombo.app (untuk private/security)

---

Terima kasih telah berkontribusi! 🙏

---

**Versi Dokumen**: 1.0 | **Update**: 2026-09-09
