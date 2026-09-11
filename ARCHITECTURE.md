# 📐 Dokumentasi Arsitektur — Tarombo

Dokumen ini menjelaskan arsitektur teknis, alur data, dan keputusan desain aplikasi Tarombo.

---

## 🏗 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  React UI   │  │ React Query  │  │  useActiveUser()   │ │
│  │ (shadcn/ui) │←→│ (TanStack)   │←→│  RBAC hook         │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘ │
│         │                  │                    │            │
│         │    Cookie: tarombo_active_user        │            │
└─────────┼──────────────────┼────────────────────┼────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTES                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ persons  │ │partnership│ │  users   │ │  roles (RBAC)  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬─────────┘ │
│       │            │            │              │            │
│  ┌────▼────────────▼────────────▼──────────────▼─────────┐ │
│  │              requirePermission(perm)                   │ │
│  │         auth.ts — RBAC enforcement                     │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                   │
│  ┌───────────┐ ┌─────────┴──────┐ ┌──────────────────────┐  │
│  │ export    │ │ backup/restore │ │ photo-upload         │  │
│  │ (Playwright)│ │ (JSON)       │ │ (sharp → webp)       │  │
│  └───────────┘ └────────────────┘ └──────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────────┐ │
│  │              security.ts                               │ │
│  │  • bcrypt hash/verify  • logActivity()                │ │
│  │  • validatePersonDates • validateParentRelation       │ │
│  │  • wouldCreateCycle    • findDuplicatePerson          │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────────┐ │
│  │              queries.ts                                │ │
│  │  • buildFamilyTree()  • findRootAncestors()            │ │
│  │  • handleDeathSideEffects() • serializePerson()        │ │
│  └───────────────────────┬────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              SQLite (better-sqlite3)                          │
│  ┌────────┐ ┌────────────┐ ┌──────┐ ┌──────┐ ┌────────────┐ │
│  │ person │ │ partnership │ │ user │ │ role │ │activity_log│ │
│  └────────┘ └────────────┘ └──────┘ └──────┘ └────────────┘ │
│  File: db/custom.db (WAL mode, foreign keys ON)              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Alur Data Utama

### 1. Render Pohon Tarombo

```
Client (page.tsx)
  │
  │  useQuery(["tree", rootFilterId])
  ▼
GET /api/tree?rootId=
  │
  │  requirePermission("person:view")
  │  getActiveUserWithPermissions() — baca cookie
  ▼
buildFamilyTree(rootId)
  │
  │  SELECT * FROM person WHERE id=? AND deleted_at IS NULL
  │  rekursif: partnership → spouse → children
  ▼
FamilyNode { person, spouse, partnership, children[] }
  │
  ▼
JSON response → React Query cache → D3.js render SVG
```

### 2. Login Flow

```
Guest (no cookie)
  │
  │  Klik user di dropdown → LoginDialog
  ▼
POST /api/users/active { userId, password }
  │
  │  Cari user di DB
  │  isBcryptHash(password)?
  │    ├─ Ya: verifyPassword(plain, hash)
  │    └─ Tidak (legacy): plain === password? → auto-upgrade ke bcrypt
  ▼
  Password benar?
  ├─ Tidak: 403 "Password salah"
  └─ Ya:
      │  Set cookie tarombo_active_user (httpOnly, 30 hari)
      │  logActivity("login")
      ▼
  Response: ActiveUserPublic { permissions[] }
      │
      ▼
  Client: invalidateQueries(["active-user"])
      │
      ▼
  UI re-render: header ganti, tombol muncul sesuai permission
```

### 3. RBAC Enforcement

```
Request masuk (mis. POST /api/persons)
  │
  ▼
requirePermission("person:create")
  │
  │  getActiveUserWithPermissions()
  │    ├─ Cookie ada? → SELECT user + role → return ActiveUser
  │    └─ Cookie kosong? → return GUEST { permissions: [person:view, export:view] }
  ▼
  user.permissions.includes("person:create")?
  ├─ Tidak: throw PermissionDeniedError → 403
  └─ Ya: lanjut eksekusi handler
```

### 4. Soft Delete & Restore

```
DELETE /api/persons/[id]
  │
  ▼
UPDATE person SET deleted_at=now() WHERE id=?
UPDATE partnership SET deleted_at=now() WHERE (husband_id=? OR wife_id=?)
  │
  ▼
logActivity("delete", softDelete: true)
  │
  ▼
Response: "Dipindahkan ke trash."

--- Restore ---

POST /api/trash/[id]/restore { type: "person" }
  │
  ▼
UPDATE person SET deleted_at=NULL WHERE id=? AND deleted_at IS NOT NULL
  │
  ▼
logActivity("restore")
```

### 5. Export dengan Watermark

```
GET /api/export?format=pdf&size=A3&aliveOnly=true
  │
  ▼
requirePermission("export:view")
  │
  ▼
buildExportDocument({ filters: { aliveOnly: true } })
  │
  │  buildFamilyTree() → filterTree() (rekursif apply filters)
  │  getWatermarkDataUrl() — baca tarombo-bg02.png as base64
  ▼
HTML document (self-contained, dengan <img class="watermark">)
  │
  ▼
Playwright renderPdf({ html, format: "A3", landscape: true })
  │
  │  chromium.launch() → page.setContent(html) → page.pdf()
  ▼
PDF buffer → Response (Content-Disposition: attachment)
```

---

## 🗄 Skema Database

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    role     │     │    user     │     │   person    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │←────│ role_id (FK)│     │ id (PK)     │
│ name        │     │ id (PK)     │────→│ father_id   │←─┐
│ permissions │     │ email       │     │ mother_id   │←─┤ (self-ref)
│ is_system   │     │ password    │     │ deleted_at  │  │
└─────────────┘     │ linked_     │────→│ full_name   │  │
                    │ person_id   │     │ birth_date  │  │
                    └─────────────┘     │ death_date  │  │
                                        │ gender      │  │
                                        └──────┬──────┘  │
                                               │         │
                                               │         │
                    ┌───────────────┐         │         │
                    │ partnership   │         │         │
                    ├───────────────┤         │         │
                    │ id (PK)       │         │         │
                    │ husband_id ───┼─────────┼─────────┘
                    │ wife_id ──────┼─────────┘
                    │ status       │
                    │ marriage_date│
                    │ divorce_date │
                    │ deleted_at   │
                    └───────────────┘

                    ┌───────────────┐
                    │ activity_log  │
                    ├───────────────┤
                    │ id (PK)       │
                    │ user_id       │
                    │ action        │
                    │ entity_type   │
                    │ entity_id     │
                    │ details (JSON)│
                    │ created_at    │
                    └───────────────┘
```

### Indeks

```sql
-- Performance indexes
CREATE INDEX idx_person_father ON person(father_id);
CREATE INDEX idx_person_mother ON person(mother_id);
CREATE INDEX idx_person_gender ON person(gender);
CREATE INDEX idx_person_deleted ON person(deleted_at);        -- soft delete
CREATE INDEX idx_partnership_husband ON partnership(husband_id);
CREATE INDEX idx_partnership_wife ON partnership(wife_id);
CREATE INDEX idx_partnership_status ON partnership(status);
CREATE INDEX idx_partnership_deleted ON partnership(deleted_at);
CREATE INDEX idx_user_role ON user(role_id);
CREATE INDEX idx_user_linked ON user(linked_person_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);  -- sort desc
```

---

## 🔐 Keputusan Desain

### Mengapa better-sqlite3 (bukan Prisma)?

| Aspek | better-sqlite3 | Prisma |
|-------|---------------|--------|
| Dependencies | 1 package + native binary | Banyak package + client generator |
| Ukuran | ~5MB | ~50MB+ |
| Startup | Instant | Perlu generate client |
| Query control | Full SQL | Abstraksi (kadang tidak optimal) |
| Migration | Manual SQL | Otomatis (tapi rumit) |
| Constraint proyek | ✅ Tanpa ORM eksternal | ❌ ORM berat |

**Keputusan**: Pakai better-sqlite3 untuk kontrol penuh & sesuai constraint "tanpa Prisma".

### Mengapa Cookie (bukan JWT)?

| Aspek | Cookie | JWT |
|-------|--------|-----|
| State | Server-side (DB) | Stateless (token) |
| Revocation | Hapus cookie/logout | Sulit (perlu blacklist) |
| Complexity | Sederhana | Signing, expiry, refresh |
| Storage | httpOnly cookie (aman) | LocalStorage (XSS risk) |

**Keputusan**: Cookie httpOnly — sederhana, aman, cukup untuk app single-instance.

### Mengapa Guest Viewer Tanpa Login?

- **Use case**: Pohon keluarga sering dibagikan ke kerabat (read-only)
- **UX**: Tamu bisa langsung lihat tanpa registrasi
- **Keamanan**: Permission Viewer terbatas (view + export only)
- **Fallback**: `getActiveUserWithPermissions()` return guest sintetis bila no cookie

### Mengapa Soft Delete?

- **Mencegah kehilangan data** akibat salah klik
- **Audit trail**: tetap ada record di activity_log
- **Restore**: bisa kembalikan dari Trash
- **Permanent delete**: terpisah, perlu konfirmasi

### Mengapa D3.js (bukan CSS connectors)?

| Aspek | D3.js | CSS connectors |
|-------|-------|----------------|
| Layout otomatis | ✅ d3.tree() | Manual positioning |
| Zoom/pan | Native d3.zoom() | Sulit |
| Minimap | Mudah (clone SVG) | Tidak mungkin |
| Keyboard nav | Focus management | Sulit |
| Collapse/expand | Filter hierarchy | Manual DOM toggle |
| Complex trees | Skalabel | Berantakan untuk pohon besar |

**Keputusan**: D3.js untuk pohon besar & interaktivitas tinggi.

---

## 📊 Performance

### Optimasi yang Diterapkan

1. **SQLite WAL mode** — concurrent read + write tanpa lock
2. **Prepared statements** — query plan di-cache
3. **Indexes** — pada kolom yang sering di-filter (father_id, mother_id, deleted_at, dll)
4. **React Query** — cache client-side, staleTime 30s
5. **useMemo** — layout D3 di-cache, hanya recompute saat data/tree berubah
6. **Photo resize** — sharp 400×400 webp (dari ~1MB → ~30KB)
7. **Watermark base64 cache** — baca file sekali, cache di memory

### Batasan yang Diketahui

1. **Pohon sangat besar** (1000+ orang) — D3 layout bisa lambat. Mitigasi: collapse subtree.
2. **Concurrent write** — SQLite WAL handle read concurrent, tapi write serial. Cukup untuk app single-user.
3. **Playwright startup** — export pertama lambat (~2-3s) karena browser launch. Mitigasi: singleton browser instance.

---

## 🔒 Keamanan

### Yang Diterapkan

1. **Password hashing** — bcrypt (10 rounds)
2. **Cookie httpOnly** — JavaScript tidak bisa akses cookie
3. **SameSite=lax** — proteksi CSRF
4. **RBAC enforcement** — server-side `requirePermission()` di setiap route
5. **SQL injection** — prepared statements (parameterized queries)
6. **File upload** — validasi tipe (image/*) + ukuran (max 10MB)
7. **Photo resize** — sharp strip metadata, convert webp

### Yang Perlu Diperhatikan

- **Password demo** (`admin123`, `robby123`) — ganti di produksi via "Kelola Pengguna"
- **SQLite file** — backup berkala via "Backup & Restore"
- **uploads/** — folder publik, pastikan hanya gambar (sudah divalidasi)
- **Activity log** — menyimpan info user & aksi, pastikan comply dengan privasi

---

## 🧪 Testing

### Test Manual (yang sudah dilakukan)

1. **RBAC**: Viewer/Editor/Admin permission enforcement (API 403 + UI hide)
2. **Login**: password benar/salah, bcrypt verify, legacy upgrade
3. **Validation**: temporal, cycle, self-parent, duplikat
4. **Soft delete**: delete → trash → restore → permanent delete
5. **Backup**: download JSON → restore merge
6. **Photo upload**: upload → resize → webp
7. **Export**: 6 format + 3 subset filter + watermark
8. **D3**: collapse/expand, minimap, keyboard nav, dark mode
9. **Theme**: toggle dark/light, re-render D3

### Test API (via curl)

```bash
# Login sebagai admin
curl -X POST http://localhost:3000/api/users/active \
  -H "Content-Type: application/json" \
  -d '{"userId":"<admin-id>","password":"admin123"}' \
  -c /tmp/admin.cookie

# Test permission denied (guest)
curl -X POST http://localhost:3000/api/persons \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","gender":"MALE"}'
# → 403

# Test validation
curl -X PATCH http://localhost:3000/api/persons/<id> \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1900-01-01","deathDate":"1899-01-01"}' \
  -b /tmp/admin.cookie
# → 400 "Tanggal wafat tidak boleh sebelum tanggal lahir"
```

---

## 📈 Monitoring

### Activity Log

Semua aksi penting tercatat di tabel `activity_log`:
- `create`, `update`, `delete`, `restore` (entity: person/partnership/user/role)
- `login`, `logout` (success/failure)
- `seed`, `reset` (data management)
- `export` (format, filters)
- `backup_restore` (import stats)

Akses via: Header → ⋮ → "Riwayat Aktivitas"

### Query Performance

```sql
-- Cek query lambat
EXPLAIN QUERY PLAN SELECT * FROM person WHERE father_id = ?;

-- Cek ukuran tabel
SELECT 'person' as t, COUNT(*) as c FROM person WHERE deleted_at IS NULL
UNION ALL
SELECT 'partnership', COUNT(*) FROM partnership WHERE deleted_at IS NULL
UNION ALL
SELECT 'user', COUNT(*) FROM user
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log;
```

---

## 🚀 Deployment

### Produksi (Self-hosted)

```bash
# 1. Build
npm run build

# 2. Jalankan production server
npm start

# 3. Atau pakai PM2
pm2 start "npm start" --name tarombo

# 4. Reverse proxy (Nginx/Caddy)
# Forward port 3000 → domain
```

### Environment Variables

```env
# .env (opsional, default sudah ada)
DATABASE_URL=file:./db/custom.db
```

### Backup Berkala

```bash
# Cron job — backup harian
0 2 * * * curl -o /backups/tarombo-$(date +\%Y\%m\%d).json \
  http://localhost:3000/api/backup \
  -H "Cookie: tarombo_active_user=<admin-cookie>"
```

---

## 📚 Referensi

- [Next.js 16 Docs](https://nextjs.org/docs)
- [D3.js Hierarchy](https://d3js.org/d3-hierarchy)
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3)
- [shadcn/ui](https://ui.shadcn.com)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- [Playwright](https://playwright.dev)
- [sharp](https://sharp.pixelplumbing.com)

---

**Dokumentasi versi**: 1.0 | **Update**: 2026-09-09
