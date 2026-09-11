# 📡 API Reference — Tarombo

Dokumentasi lengkap semua API endpoints aplikasi Tarombo.

- **Base URL**: `http://localhost:3000`
- **Format**: JSON (kecuali export & backup = binary file)
- **Auth**: Cookie-based (`tarombo_active_user`, httpOnly)
- **RBAC**: Setiap endpoint butuh permission tertentu (403 bila tidak berhak)

---

## 📑 Daftar Isi

- [Autentikasi](#autentikasi)
- [Persons (Orang)](#persons-orang)
- [Partnerships (Pasangan)](#partnerships-pasangan)
- [Users (Pengguna)](#users-pengguna)
- [Roles (RBAC)](#roles-rbac)
- [Tree (Pohon Silsilah)](#tree-pohon-silsilah)
- [Stats (Statistik)](#stats-statistik)
- [Export](#export)
- [Backup & Restore](#backup--restore)
- [Photo Upload](#photo-upload)
- [Activity Log](#activity-log)
- [Trash (Tempat Sampah)](#trash-tempat-sampah)
- [Seed (Data Contoh)](#seed-data-contoh)
- [Tipe Data](#tipe-data)
- [Error Handling](#error-handling)

---

## Autentikasi

Sistem autentikasi pakai cookie httpOnly. Guest (tanpa cookie) otomatis dapat role Viewer dengan permission read-only.

### Permission Matrix

| Permission | Viewer | Editor | Administrator |
|-----------|--------|--------|---------------|
| `person:view` | ✅ | ✅ | ✅ |
| `person:create` | ❌ | ✅ | ✅ |
| `person:edit` | ❌ | ✅ | ✅ |
| `person:delete` | ❌ | ❌ | ✅ |
| `partnership:create` | ❌ | ✅ | ✅ |
| `partnership:edit` | ❌ | ✅ | ✅ |
| `partnership:delete` | ❌ | ❌ | ✅ |
| `user:view` | ❌ | ❌ | ✅ |
| `user:manage` | ❌ | ❌ | ✅ |
| `role:manage` | ❌ | ❌ | ✅ |
| `export:view` | ✅ | ✅ | ✅ |
| `data:seed` | ❌ | ❌ | ✅ |
| `data:reset` | ❌ | ❌ | ✅ |

---

## Users (Pengguna)

### GET /api/users/active

Ambil user aktif. Bila tidak ada cookie → return guest Viewer.

```http
GET /api/users/active
```

**Permission**: Publik (tidak butuh login)

**Response 200**:
```json
{
  "data": {
    "id": "a4338c4e-df49-4978-a49a-b28c4ee9e1eb",
    "email": "admin@tarombo.id",
    "name": "Administrator Tarombo",
    "photo": null,
    "phone": null,
    "linkedPersonId": null,
    "linkedPersonName": null,
    "lastLoginAt": "2026-09-09T10:11:19.000Z",
    "roleId": "abc123",
    "roleName": "Administrator",
    "roleColor": "#7a1f1f",
    "roleIsSystem": true,
    "permissions": ["person:view", "person:create", "person:edit", ...]
  },
  "hasUsers": true
}
```

**Guest response** (no cookie):
```json
{
  "data": {
    "id": "guest",
    "email": "",
    "name": "Tamu",
    "roleName": "Viewer",
    "roleColor": "#78716c",
    "permissions": ["person:view", "export:view"]
  },
  "hasUsers": true
}
```

---

### POST /api/users/active — Login

Login dengan password (bcrypt verification).

```http
POST /api/users/active
Content-Type: application/json

{
  "userId": "a4338c4e-df49-4978-a49a-b28c4ee9e1eb",
  "password": "admin123"
}
```

**Permission**: Publik

**Response 200** (login sukses): return `ActiveUserPublic` + set cookie `tarombo_active_user`

**Response 403** (password salah):
```json
{ "error": "Password salah. Login ditolak." }
```

**Response 404** (user tidak ditemukan):
```json
{ "error": "Pengguna tidak ditemukan" }
```

---

### DELETE /api/users/active — Logout

```http
DELETE /api/users/active
Cookie: tarombo_active_user=<value>
```

**Permission**: Publik

**Response 200**:
```json
{ "success": true }
```

Menghapus cookie → user kembali ke guest Viewer.

---

### GET /api/users/list-public

Daftar user minimal (id, name, roleName) — untuk dropdown login guest. Tidak ada data sensitif.

```http
GET /api/users/list-public
```

**Permission**: Publik

**Response 200**:
```json
{
  "data": [
    {
      "id": "a4338c4e-...",
      "name": "Administrator Tarombo",
      "roleName": "Administrator",
      "roleColor": "#7a1f1f"
    },
    {
      "id": "162d0101-...",
      "name": "Robby Adithama Sianipar",
      "roleName": "Editor",
      "roleColor": "#d97706"
    }
  ]
}
```

---

### GET /api/users

Daftar semua pengguna lengkap.

```http
GET /api/users
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `user:view`

**Response 200**:
```json
{
  "data": [
    {
      "id": "a4338c4e-...",
      "email": "admin@tarombo.id",
      "name": "Administrator Tarombo",
      "photo": null,
      "phone": null,
      "roleId": "abc123",
      "roleName": "Administrator",
      "roleColor": "#7a1f1f",
      "roleIsSystem": true,
      "linkedPersonId": null,
      "linkedPersonName": null,
      "lastLoginAt": "2026-09-09T...",
      "createdAt": "2026-09-09T..."
    }
  ]
}
```

---

### POST /api/users

Buat pengguna baru.

```http
POST /api/users
Content-Type: application/json
Cookie: tarombo_active_user=<admin-cookie>

{
  "email": "newuser@tarombo.id",
  "name": "User Baru",
  "password": "password123",
  "photo": null,
  "phone": "08123456789",
  "roleId": "<role-id>",
  "linkedPersonId": null
}
```

**Permission**: `user:manage`

**Response 201**: return `UserPublic`

**Response 400** (email duplikat):
```json
{ "error": "Email sudah terdaftar" }
```

---

### GET /api/users/[id]

Detail satu pengguna.

```http
GET /api/users/<id>
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `user:view`

---

### PATCH /api/users/[id]

Update pengguna. Password kosong = tidak diubah.

```http
PATCH /api/users/<id>
Content-Type: application/json
Cookie: tarombo_active_user=<admin-cookie>

{
  "name": "Nama Baru",
  "roleId": "<role-id>"
}
```

**Permission**: `user:manage`

---

### DELETE /api/users/[id]

Hapus pengguna.

```http
DELETE /api/users/<id>
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `user:manage`

Tidak bisa hapus user yang sedang aktif.

---

## Roles (RBAC)

### GET /api/roles

Daftar semua role + katalog permission.

```http
GET /api/roles
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `user:view` (atau `role:manage`)

**Response 200**:
```json
{
  "data": [
    {
      "id": "abc123",
      "name": "Administrator",
      "description": "Akses penuh ke seluruh fitur aplikasi.",
      "color": "#7a1f1f",
      "icon": "shield",
      "permissions": ["person:view", "person:create", ...],
      "isSystem": true,
      "sortOrder": 0,
      "userCount": 1,
      "createdAt": "2026-09-09T..."
    },
    {
      "id": "def456",
      "name": "Editor",
      "permissions": ["person:view", "person:create", "person:edit", ...],
      "isSystem": true,
      "userCount": 1
    },
    {
      "id": "ghi789",
      "name": "Viewer",
      "permissions": ["person:view", "export:view"],
      "isSystem": true,
      "userCount": 0
    }
  ],
  "catalog": [
    {
      "key": "person:view",
      "label": "Lihat Orang",
      "group": "Orang",
      "description": "Melihat daftar & detail orang di pohon tarombo."
    }
  ]
}
```

---

### POST /api/roles

Buat role custom baru.

```http
POST /api/roles
Content-Type: application/json
Cookie: tarombo_active_user=<admin-cookie>

{
  "name": "Curator",
  "description": "Bisa edit tapi tidak hapus",
  "color": "#059669",
  "icon": "pencil",
  "permissions": ["person:view", "person:edit", "export:view"],
  "sortOrder": 3
}
```

**Permission**: `role:manage`

**Response 201**: return `RolePublic`

---

### PATCH /api/roles/[id]

Update role (permission, color, description). Role sistem tidak bisa ganti nama.

```http
PATCH /api/roles/<id>
Content-Type: application/json
Cookie: tarombo_active_user=<admin-cookie>

{
  "permissions": ["person:view", "person:create", "export:view"],
  "color": "#d97706"
}
```

**Permission**: `role:manage`

---

### DELETE /api/roles/[id]

Hapus role custom. Role sistem tidak bisa dihapus. Role yang masih dipakai user tidak bisa dihapus.

```http
DELETE /api/roles/<id>
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `role:manage`

**Response 400** (role sistem):
```json
{ "error": "Role sistem tidak dapat dihapus" }
```

**Response 400** (masih dipakai):
```json
{ "error": "Role masih dipakai oleh 2 pengguna. Ubah role pengguna tersebut terlebih dahulu." }
```

---

## Persons (Orang)

### GET /api/persons

Daftar orang dengan filter opsional.

```http
GET /api/persons?q=iman&gender=MALE&alive=true&root=true
Cookie: tarombo_active_user=<cookie>
```

**Permission**: `person:view`

**Query Params**:
| Param | Tipe | Deskripsi |
|-------|------|-----------|
| `q` | string | Cari berdasarkan nama / nama panggilan |
| `gender` | `MALE` \| `FEMALE` | Filter jenis kelamin |
| `alive` | `true` | Hanya yang masih hidup |
| `root` | `true` | Hanya leluhur (tanpa ayah/ibu) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "e48bbd0d-...",
      "fullName": "Raja Mangatur Sianipar",
      "nickname": "Tuan Mangatur",
      "birthPlace": "Balige, Toba Samosir",
      "birthDate": "1920-03-15T00:00:00.000Z",
      "deathDate": "1995-08-22T00:00:00.000Z",
      "birthOrder": 1,
      "gender": "MALE",
      "address": "Jl. Lumban Dolok, Balige",
      "religion": "Kristen Protestan",
      "phone": null,
      "photo": null,
      "maritalStatus": "MARRIED",
      "generationNumber": 1,
      "burialName": "TPU Lumban Dolok",
      "burialAddress": "Balige, Toba Samosir",
      "burialLat": 2.3359,
      "burialLng": 99.0687,
      "fatherId": null,
      "motherId": null,
      "alive": false
    }
  ]
}
```

---

### POST /api/persons

Tambah orang baru.

```http
POST /api/persons
Content-Type: application/json
Cookie: tarombo_active_user=<cookie>

{
  "fullName": "Raja Horas Tamba",
  "nickname": "Om Horas",
  "birthPlace": "Tarutung",
  "birthDate": "1985-06-15",
  "deathDate": null,
  "birthOrder": 2,
  "gender": "MALE",
  "address": "Jl. Merdeka, Medan",
  "religion": "Kristen Protestan",
  "phone": "08123456789",
  "photo": null,
  "maritalStatus": "SINGLE",
  "generationNumber": 2,
  "fatherId": "<father-person-id>",
  "motherId": "<mother-person-id>"
}
```

**Permission**: `person:create`

**Response 201**: return `TreeNodePerson`

**Response 400** (validation error):
```json
{ "error": "Tanggal wafat tidak boleh sebelum tanggal lahir." }
```

```json
{ "error": "Cycle terdeteksi: orang tua yang dipilih adalah keturunan dari orang ini." }
```

---

### GET /api/persons/[id]

Detail orang + relasi (orang tua, pasangan, anak).

```http
GET /api/persons/<id>
Cookie: tarombo_active_user=<cookie>
```

**Permission**: `person:view`

**Response 200**:
```json
{
  "data": { "id": "...", "fullName": "...", ... },
  "relations": {
    "father": { "id": "...", "fullName": "..." },
    "mother": { "id": "...", "fullName": "..." },
    "partnerships": [
      {
        "id": "...",
        "status": "ACTIVE",
        "marriageDate": "2005-09-10T...",
        "partner": { "id": "...", "fullName": "Lina Simanjuntak" }
      }
    ],
    "children": [
      { "id": "...", "fullName": "Kezia Sianipar", "birthOrder": 1 }
    ]
  }
}
```

---

### PATCH /api/persons/[id]

Update orang. Bila `deathDate` baru diset (sebelumnya null), partnership AKTIF otomatis jadi WIDOWED dengan `divorceDate = deathDate`.

```http
PATCH /api/persons/<id>
Content-Type: application/json
Cookie: tarombo_active_user=<cookie>

{
  "fullName": "Nama Baru",
  "deathDate": "2024-05-15",
  "address": "Alamat baru"
}
```

**Permission**: `person:edit`

---

### DELETE /api/persons/[id]

**Soft delete** — pindah ke trash (tidak hapus fisik).

```http
DELETE /api/persons/<id>
Cookie: tarombo_active_user=<cookie>
```

**Permission**: `person:delete`

**Response 200**:
```json
{ "success": true, "message": "Dipindahkan ke trash." }
```

Partnership yang melibatkan orang ini juga di-soft-delete.

---

## Partnerships (Pasangan)

### GET /api/partnerships

```http
GET /api/partnerships?status=ACTIVE&personId=<id>
Cookie: tarombo_active_user=<cookie>
```

**Permission**: `person:view`

**Query Params**:
| Param | Deskripsi |
|-------|-----------|
| `status` | `ACTIVE` \| `DIVORCED` \| `WIDOWED` |
| `personId` | Filter pasangan involving person ini |

---

### POST /api/partnerships

Buat pasangan baru. Validasi:
- Husband harus MALE, wife harus FEMALE
- husbandId ≠ wifeId
- Maksimal 1 pasangan AKTIF per orang

```http
POST /api/partnerships
Content-Type: application/json
Cookie: tarombo_active_user=<cookie>

{
  "husbandId": "<person-id>",
  "wifeId": "<person-id>",
  "marriageDate": "2005-09-10",
  "status": "ACTIVE"
}
```

**Permission**: `partnership:create`

**Response 400** (maks 1 aktif):
```json
{ "error": "Orang ini sudah memiliki pasangan aktif. Satu orang hanya boleh memiliki maksimal 1 pasangan aktif." }
```

---

### PATCH /api/partnerships/[id]

```http
PATCH /api/partnerships/<id>
Content-Type: application/json
Cookie: tarombo_active_user=<cookie>

{
  "status": "DIVORCED",
  "divorceDate": "2024-01-15"
}
```

**Permission**: `partnership:edit`

---

### DELETE /api/partnerships/[id]

Soft delete partnership.

**Permission**: `partnership:delete`

---

## Tree (Pohon Silsilah)

### GET /api/tree

Ambil pohon silsilah rekursif (person + spouse + children).

```http
GET /api/tree?rootId=<id>
Cookie: tarombo_active_user=<cookie>
```

**Permission**: `person:view`

**Query Params**:
| Param | Deskripsi |
|-------|-----------|
| `rootId` | Opsional. Bila kosong → semua leluhur root |

**Response 200** (tanpa rootId):
```json
{
  "data": [
    {
      "person": { "id": "...", "fullName": "Raja Mangatur", ... },
      "spouse": { "id": "...", "fullName": "Boru Lumban", ... },
      "partnership": { "id": "...", "status": "WIDOWED", ... },
      "children": [
        {
          "person": { "fullName": "Dompu Arvin", ... },
          "spouse": { "fullName": "Siti Rohana", ... },
          "children": [ ... ]
        }
      ]
    }
  ],
  "roots": [
    { "id": "...", "fullName": "Raja Mangatur Sianipar", ... }
  ]
}
```

---

## Stats (Statistik)

### GET /api/stats

Ringkasan statistik dashboard.

```http
GET /api/stats
```

**Permission**: Publik

**Response 200**:
```json
{
  "totalPersons": 13,
  "alive": 8,
  "deceased": 5,
  "males": 7,
  "females": 6,
  "totalPartnerships": 4,
  "activePartnerships": 2,
  "widowed": 2,
  "divorced": 0,
  "generations": [
    { "generation": 1, "count": 2 },
    { "generation": 2, "count": 4 },
    { "generation": 3, "count": 4 },
    { "generation": 4, "count": 2 }
  ]
}
```

---

## Export

### GET /api/export

Export pohon ke PDF/PNG/JPG dengan watermark.

```http
GET /api/export?format=pdf&scope=all&size=A3&aliveOnly=true&maxGeneration=3&subtreeFrom=<id>
Cookie: tarombo_active_user=<cookie>
```

**Permission**: `export:view`

**Query Params**:
| Param | Tipe | Deskripsi |
|-------|------|-----------|
| `format` | `pdf` \| `png` \| `jpg` | Format output (default: `pdf`) |
| `scope` | `all` \| `current` | Ruang lingkup (default: `all`) |
| `size` | `A4` \| `A3` \| `A2` \| `A1` \| `LARGE` | Ukuran PDF (default: `A3`) |
| `rootId` | string | Root pohon (bila `scope=current`) |
| `aliveOnly` | `true` | Hanya orang yang masih hidup |
| `maxGeneration` | number | Batasi kedalaman generasi (mis. 3 = Gen 1-3) |
| `subtreeFrom` | string | Export hanya subtree dari orang ini |

**Response 200**: Binary file
- PDF: `Content-Type: application/pdf`
- PNG: `Content-Type: image/png`
- JPG: `Content-Type: image/jpeg`
- Header: `Content-Disposition: attachment; filename="tarombo-xxx.pdf"`

**Dokumen HTML** (yang dirender ke PDF/image) berisi:
- Header: judul, info export, legenda
- Pohon tarombo dengan kartu orang + connector lines
- Watermark: logo `tarombo-bg02.png` di tengah (opacity 10%)
- Footer: timestamp

---

## Backup & Restore

### GET /api/backup — Download Backup

Download seluruh data sebagai JSON.

```http
GET /api/backup
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `data:reset`

**Response 200**: JSON file
```json
{
  "version": 1,
  "exportedAt": "2026-09-09T10:00:00.000Z",
  "exportedBy": "Administrator Tarombo",
  "data": {
    "persons": [ { "id": "...", "full_name": "...", ... } ],
    "partnerships": [ ... ],
    "users": [ ... ],
    "roles": [ ... ],
    "activityLog": [ ... ]
  }
}
```

---

### POST /api/backup — Restore

Restore dari file JSON. Mode merge: `INSERT OR IGNORE` (tidak timpa data existing).

```http
POST /api/backup
Content-Type: application/json
Cookie: tarombo_active_user=<admin-cookie>

<JSON backup content>
```

**Permission**: `data:reset`

**Response 200**:
```json
{
  "success": true,
  "message": "Backup berhasil dipulihkan.",
  "stats": {
    "persons": 13,
    "partnerships": 4,
    "users": 2,
    "roles": 3,
    "skipped": 0
  }
}
```

---

## Photo Upload

### POST /api/photo-upload

Upload gambar, auto-resize 400×400 ke WebP.

```http
POST /api/photo-upload
Content-Type: multipart/form-data
Cookie: tarombo_active_user=<cookie>

file: <binary image data>
```

**Permission**: `person:edit` atau `person:create`

**Validasi**:
- File harus gambar (`image/*`)
- Max 10MB

**Response 201**:
```json
{ "url": "/uploads/photo-1789091427565-u3ieul.webp" }
```

File disimpan di `public/uploads/` (lokal, tanpa Cloud).

---

## Activity Log

### GET /api/activity-log

Daftar aktivitas (audit trail).

```http
GET /api/activity-log?limit=100&entityType=person&action=create
Cookie: tarombo_active_user=<cookie>
```

**Permission**: `user:view`

**Query Params**:
| Param | Deskripsi |
|-------|-----------|
| `limit` | Max 500 (default: 100) |
| `entityType` | `person` \| `partnership` \| `user` \| `role` \| `data` |
| `action` | `create` \| `update` \| `delete` \| `restore` \| `login` \| `logout` \| `seed` \| `reset` \| `export` \| `backup_restore` |

**Response 200**:
```json
{
  "data": [
    {
      "id": "...",
      "user_id": "a4338c4e-...",
      "user_name": "Administrator Tarombo",
      "action": "create",
      "entity_type": "person",
      "entity_id": "e48bbd0d-...",
      "entity_name": "Raja Horas Tamba",
      "details": null,
      "created_at": "2026-09-09T10:15:00.000Z"
    }
  ]
}
```

---

## Trash (Tempat Sampah)

### GET /api/trash

Daftar item yang di-soft-delete.

```http
GET /api/trash?type=person
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `person:delete`

**Query Params**:
| Param | Deskripsi |
|-------|-----------|
| `type` | `all` \| `person` \| `partnership` (default: `all`) |

**Response 200**:
```json
{
  "data": {
    "persons": [
      { "id": "...", "fullName": "Jamahir Sianipar", ... }
    ],
    "partnerships": []
  }
}
```

---

### POST /api/trash/[id]/restore

Restore item dari trash.

```http
POST /api/trash/<id>/restore
Content-Type: application/json
Cookie: tarombo_active_user=<admin-cookie>

{ "type": "person" }
```

**Permission**: `person:delete`

---

### DELETE /api/trash/[id]/permanent

Hapus permanen (hard delete).

```http
DELETE /api/trash/<id>/permanent
Content-Type: application/json
Cookie: tarombo_active_user=<admin-cookie>

{ "type": "person" }
```

**Permission**: `person:delete`

---

### DELETE /api/trash

Kosongkan trash (hapus semua permanen).

```http
DELETE /api/trash
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `person:delete`

**Response 200**:
```json
{
  "success": true,
  "message": "Trash dikosongkan (1 orang, 0 pasangan dihapus permanen)."
}
```

---

## Seed (Data Contoh)

### POST /api/seed

Muat data keluarga contoh (13 orang, 4 pasangan, 2 user, 3 role).

```http
POST /api/seed
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `data:seed` (kecuali first-run tanpa user)

**Response 200**:
```json
{
  "seeded": true,
  "message": "Data keluarga contoh berhasil dimuat.",
  "persons": 13,
  "partnerships": 4,
  "users": 2,
  "roles": 3
}
```

---

### DELETE /api/seed

Reset semua data (hapus persons, partnerships, users, roles, activity_log).

```http
DELETE /api/seed
Cookie: tarombo_active_user=<admin-cookie>
```

**Permission**: `data:reset`

---

## Tipe Data

### TreeNodePerson
```typescript
{
  id: string;
  fullName: string;
  nickname: string | null;
  birthPlace: string | null;
  birthDate: string | null;       // ISO 8601
  deathDate: string | null;
  birthOrder: number | null;
  gender: "MALE" | "FEMALE";
  address: string | null;
  religion: string | null;
  phone: string | null;
  photo: string | null;           // URL
  maritalStatus: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  generationNumber: number | null;
  burialName: string | null;
  burialAddress: string | null;
  burialLat: number | null;
  burialLng: number | null;
  fatherId: string | null;
  motherId: string | null;
  alive: boolean;                 // derived: deathDate === null
}
```

### FamilyNode
```typescript
{
  person: TreeNodePerson;
  spouse: TreeNodePerson | null;
  partnership: TreePartnership | null;
  children: FamilyNode[];
}
```

### TreePartnership
```typescript
{
  id: string;
  husbandId: string;
  wifeId: string;
  husband: TreeNodePerson | null;
  wife: TreeNodePerson | null;
  marriageDate: string | null;
  divorceDate: string | null;
  status: "ACTIVE" | "DIVORCED" | "WIDOWED";
}
```

### ActiveUserPublic
```typescript
{
  id: string;                     // "guest" bila tidak login
  email: string;
  name: string;
  photo: string | null;
  phone: string | null;
  linkedPersonId: string | null;
  linkedPersonName: string | null;
  lastLoginAt: string | null;
  roleId: string | null;
  roleName: string | null;
  roleColor: string | null;
  roleIsSystem: boolean;
  permissions: string[];
}
```

### RolePublic
```typescript
{
  id: string;
  name: string;
  description: string | null;
  color: string;                  // hex
  icon: string | null;
  permissions: string[];
  isSystem: boolean;
  sortOrder: number;
  userCount: number;
  createdAt: string;
}
```

---

## Error Handling

### Format Error Response
```json
{ "error": "Pesan error dalam bahasa Indonesia" }
```

### HTTP Status Codes

| Status | Deskripsi |
|--------|-----------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation error, format invalid) |
| 403 | Forbidden (permission denied / password salah) |
| 404 | Not Found |
| 500 | Internal Server Error |

### Common Errors

**403 Permission Denied**:
```json
{ "error": "Akses ditolak. Permission \"person:delete\" diperlukan." }
```

**400 Validation Error**:
```json
{ "error": "Tanggal wafat tidak boleh sebelum tanggal lahir." }
```

```json
{ "error": "Cycle terdeteksi: orang tua yang dipilih adalah keturunan dari orang ini." }
```

```json
{ "error": "Orang ini sudah memiliki pasangan aktif. Satu orang hanya boleh memiliki maksimal 1 pasangan aktif." }
```

---

## Contoh Penggunaan (curl)

### Login sebagai admin
```bash
curl -X POST http://localhost:3000/api/users/active \
  -H "Content-Type: application/json" \
  -d '{"userId":"<admin-id>","password":"admin123"}' \
  -c /tmp/admin.cookie
```

### Ambil pohon silsilah
```bash
curl http://localhost:3000/api/tree \
  -b /tmp/admin.cookie
```

### Tambah orang baru
```bash
curl -X POST http://localhost:3000/api/persons \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Person","gender":"MALE"}' \
  -b /tmp/admin.cookie
```

### Export PDF
```bash
curl -o tarombo.pdf \
  "http://localhost:3000/api/export?format=pdf&scope=all&size=A3" \
  -b /tmp/admin.cookie
```

### Backup download
```bash
curl -o backup.json \
  http://localhost:3000/api/backup \
  -b /tmp/admin.cookie
```

---

**Versi Dokumen**: 1.0 | **Update**: 2026-09-09
