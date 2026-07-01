# Tarombo API Documentation

Base URL: `http://localhost:3000/api`

## Table of Contents

- [Authentication & Authorization](#authentication--authorization)
- [Authentication](#authentication)
  - [POST /api/auth/register](#post-apiauthregister)
  - [GET /api/auth/register](#get-apiauthregister)
  - [POST /api/auth/\[...nextauth\]](#post-apiauthnextauth)
  - [PUT /api/auth/password](#put-apiauthpassword)
- [Persons](#persons)
  - [GET /api/persons](#get-apipersons)
  - [POST /api/persons](#post-apipersons)
  - [GET /api/persons/\[id\]](#get-apipersonsid)
  - [PUT /api/persons/\[id\]](#put-apipersonsid)
  - [DELETE /api/persons/\[id\]](#delete-apipersonsid)
  - [GET /api/persons/\[id\]/eligible-parents](#get-apipersonsideligible-parents)
- [Marriages](#marriages)
  - [GET /api/marriages](#get-apimarriages)
  - [POST /api/marriages](#post-apimarriages)
  - [GET /api/marriages/\[id\]](#get-apimarriagesid)
  - [PUT /api/marriages/\[id\]](#put-apimarriagesid)
  - [DELETE /api/marriages/\[id\]](#delete-apimarriagesid)
- [Tree](#tree)
  - [GET /api/tree](#get-apitree)
- [Users (Admin Only)](#users-admin-only)
  - [PUT /api/users/\[id\]](#put-apiusersid)
  - [DELETE /api/users/\[id\]](#delete-apiusersid)
- [Backup (Admin Only)](#backup-admin-only)
  - [GET /api/backup](#get-apibackup)
  - [POST /api/backup](#post-apibackup)
- [Upload](#upload)
  - [POST /api/upload](#post-apiupload)
- [Statistics](#statistics)
  - [GET /api/stats](#get-apistats)
- [Audit Logs (Admin Only)](#audit-logs-admin-only)
  - [GET /api/audit-logs](#get-apiaudit-logs)
- [Notifications](#notifications)
  - [GET /api/notifications](#get-apinotifications)
- [Seed](#seed)
  - [GET /api/seed](#get-apiseed)
- [Common Error Responses](#common-error-responses)

---

## Authentication & Authorization

All endpoints (except `/api/auth/[...nextauth]` and `/api/seed`) require an active session. Authentication is handled via [NextAuth.js](https://next-auth.js.org/).

### Session Header

The client must send a valid NextAuth session cookie. When using API clients programmatically:

```
Cookie: next-auth.session-token=<session_token>
```

### RBAC Role Hierarchy

The system uses three roles with a hierarchical permission model:

| Role | Level | Create | Update | Delete | Manage Users |
|------|-------|--------|--------|--------|--------------|
| `ADMIN` | 3 | Yes | Yes | Yes | Yes |
| `EDITOR` | 2 | Yes | Yes | No | No |
| `VIEWER` | 1 | No | No | No | No |

Higher-level roles inherit all permissions of lower-level roles.

---

## Authentication

### POST /api/auth/register

Register a new user. **Open (no auth) when no users exist** (first admin setup). Requires `ADMIN` role otherwise.

**RBAC:** `ADMIN` (or unauthenticated when user count is 0)

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | `string` | Yes | Valid email format |
| `name` | `string` | Yes | Minimum 2 characters |
| `password` | `string` | Yes | Minimum 6 characters |
| `role` | `"ADMIN"` \| `"EDITOR"` \| `"VIEWER"` | No | Only `ADMIN` can assign `ADMIN` or `EDITOR` roles; defaults to `VIEWER`. First registered user always gets `ADMIN`. |

#### Success Responses

- **201 Created** (new user created)
- **200 OK** (existing inactive marriage re-activated, see Marriages)

```json
// 201 Created
{
  "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "email": "editor@example.com",
  "name": "John Doe",
  "role": "VIEWER"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Validation error (invalid email, name too short, password too short) |
| 401 | Unauthorized when users already exist and no session is provided |
| 403 | Forbidden when non-ADMIN attempts to create a user |
| 409 | Email already registered |

```json
// 409 Conflict
{
  "error": "Email sudah terdaftar"
}
```

---

### GET /api/auth/register

List all registered users.

**RBAC:** `ADMIN`

#### Success Response (200)

```json
[
  {
    "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
    "email": "admin@hariandja.id",
    "name": "Administrator",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T08:00:00.000Z"
  }
]
```

---

### POST /api/auth/[...nextauth]

Sign in using NextAuth.js credentials provider.

**RBAC:** None (public)

#### Request Body

| Field | Type | Required |
|-------|------|----------|
| `email` | `string` | Yes |
| `password` | `string` | Yes |

#### Success Response (200)

```json
{
  "user": {
    "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
    "email": "admin@hariandja.id",
    "name": "Administrator",
    "role": "ADMIN"
  },
  "expires": "2024-01-16T08:00:00.000Z"
}
```

---

### PUT /api/auth/password

Change the currently authenticated user's own password.

**RBAC:** Any authenticated user

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `currentPassword` | `string` | Yes | Must match the user's current password |
| `newPassword` | `string` | Yes | Minimum 8 characters |

#### Success Response (200)

```json
{
  "message": "Password berhasil diubah"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Missing current or new password |
| 400 | New password is less than 8 characters |
| 400 | Current password does not match |
| 404 | User not found |

```json
// 400 Bad Request
{
  "error": "Password lama tidak sesuai"
}
```

---

## Persons

### GET /api/persons

Retrieve a list of persons with optional filtering, search, and pagination.

**RBAC:** Any authenticated user (`ADMIN`, `EDITOR`, `VIEWER`)

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | `string` | No | — | Filter by `fullName` or `nickname` (case-insensitive contains) |
| `gender` | `"MALE"` \| `"FEMALE"` | No | — | Filter by gender |
| `includeRelations` | `"true"` \| `"false"` | No | `"false"` | Include father, mother, and active marriage relations |
| `page` | `number` | No | `1` | Page number (triggers paginated response) |
| `limit` | `number` | No | `20` | Items per page (1–100, triggers paginated response) |

#### Response Formats

**Without pagination** (no `page`/`limit` params) — returns a plain array `Person[]`:

```json
[
  {
    "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
    "fullName": "Raja Hariandja",
    "nickname": "Ompu",
    "gender": "MALE",
    "birthPlace": "Samosir",
    "birthDate": "1850-01-01T00:00:00.000Z",
    "deathPlace": "Samosir",
    "deathDate": "1920-06-15T00:00:00.000Z",
    "birthOrder": 1,
    "address": null,
    "religion": "Kristen Protestan",
    "phone": null,
    "photoPath": null,
    "maritalStatus": "MARRIED",
    "isDeceased": true,
    "fatherId": null,
    "motherId": null,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T08:00:00.000Z"
  }
]
```

**With pagination** — returns paginated envelope:

```json
{
  "data": [ /* Person[] */ ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

When `includeRelations=true`, each person also includes:

```json
{
  "father": { "id": "...", "fullName": "...", "nickname": "...", "gender": "MALE" },
  "mother": { "id": "...", "fullName": "...", "nickname": "...", "gender": "FEMALE" },
  "marriagesAsHusband": [
    {
      "id": "...",
      "husbandId": "...",
      "wifeId": "...",
      "marriageDate": "...",
      "isActive": true,
      "wife": { "id": "...", "fullName": "...", "nickname": "...", "gender": "FEMALE" }
    }
  ],
  "marriagesAsWife": []
}
```

**Ordering:** Results are sorted by `birthOrder ASC`, then `fullName ASC`.

---

### POST /api/persons

Create a new person record.

**RBAC:** `ADMIN`, `EDITOR`

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `fullName` | `string` | Yes | Minimum 1 character |
| `gender` | `"MALE"` \| `"FEMALE"` | Yes | Must be one of the two enum values |
| `nickname` | `string` \| `null` | No | — |
| `birthPlace` | `string` \| `null` | No | — |
| `birthDate` | `string` \| `null` | No | ISO date string; must not be in the future |
| `deathPlace` | `string` \| `null` | No | — |
| `deathDate` | `string` \| `null` | No | ISO date string; must not be in the future or before `birthDate` |
| `birthOrder` | `number` \| `null` | No | Integer |
| `address` | `string` \| `null` | No | — |
| `religion` | `string` \| `null` | No | — |
| `phone` | `string` \| `null` | No | — |
| `maritalStatus` | `"SINGLE"` \| `"MARRIED"` \| `"DIVORCED"` \| `"WIDOWED"` | No | Defaults to `"SINGLE"` |
| `isDeceased` | `boolean` | No | Defaults to `false` |
| `fatherId` | `string` \| `null` | No | Must reference an existing `MALE` person |
| `motherId` | `string` \| `null` | No | Must reference an existing `FEMALE` person |

#### Success Response (201)

```json
{
  "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "fullName": "Raja Hariandja",
  "nickname": "Ompu",
  "gender": "MALE",
  "birthPlace": "Samosir",
  "birthDate": "1850-01-01T00:00:00.000Z",
  "deathPlace": null,
  "deathDate": null,
  "birthOrder": 1,
  "address": null,
  "religion": null,
  "phone": null,
  "photoPath": null,
  "maritalStatus": "SINGLE",
  "isDeceased": false,
  "fatherId": null,
  "motherId": null,
  "createdAt": "2024-06-01T12:00:00.000Z",
  "updatedAt": "2024-06-01T12:00:00.000Z"
}
```

#### Side Effects

- If `isDeceased` is `true`, any active marriages for this person are automatically deactivated (divorced).

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Zod validation error |
| 400 | Death date before birth date |
| 400 | Birth or death date in the future |
| 400 | Father must be `MALE` |
| 400 | Mother must be `FEMALE` |
| 404 | Referenced father or mother not found |

---

### GET /api/persons/[id]

Retrieve a single person with full relational data.

**RBAC:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Person UUID |

#### Success Response (200)

Returns the person with all relations included:

```json
{
  "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "fullName": "Raja Hariandja Jr. I",
  "nickname": "Aman I",
  "gender": "MALE",
  "birthDate": "1876-05-10T00:00:00.000Z",
  "deathDate": "1950-03-01T00:00:00.000Z",
  "isDeceased": true,
  "photoPath": null,
  "birthPlace": "Samosir",
  "maritalStatus": "MARRIED",
  "father": {
    "id": "...",
    "fullName": "Raja Hariandja",
    "nickname": "Ompu",
    "gender": "MALE"
  },
  "mother": {
    "id": "...",
    "fullName": "Boru Hariandja I",
    "nickname": "Ibu Boru",
    "gender": "FEMALE"
  },
  "childrenAsFather": [
    {
      "id": "...",
      "fullName": "Hariandja III",
      "nickname": "Opung III",
      "gender": "MALE",
      "birthOrder": 1,
      "birthDate": "1905-01-01T00:00:00.000Z",
      "isDeceased": true
    }
  ],
  "childrenAsMother": [],
  "marriagesAsHusband": [
    {
      "id": "...",
      "husbandId": "...",
      "wifeId": "...",
      "marriageDate": "1900-06-15T00:00:00.000Z",
      "divorceDate": null,
      "isActive": true,
      "wife": {
        "id": "...",
        "fullName": "Boru Sianturi",
        "nickname": "Ibu Sianturi",
        "gender": "FEMALE"
      }
    }
  ],
  "marriagesAsWife": [],
  "allChildren": [
    {
      "id": "...",
      "fullName": "Hariandja III",
      "nickname": "Opung III",
      "gender": "MALE",
      "birthOrder": 1,
      "birthDate": "1905-01-01T00:00:00.000Z",
      "isDeceased": true,
      "parentRelation": "father"
    }
  ]
}
```

> `allChildren` is a merged array of `childrenAsFather` and `childrenAsMother` with an additional `parentRelation` field (`"father"` or `"mother"`).

#### Error Responses

| Status | Condition |
|--------|-----------|
| 404 | Person not found |

---

### PUT /api/persons/[id]

Update an existing person. All fields in the request body are optional (partial update).

**RBAC:** `ADMIN`, `EDITOR`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Person UUID |

#### Request Body

All fields from the [create schema](#post-apipersons) are accepted as optional. Additionally:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `photoPath` | `string` \| `null` | No | Path returned from `/api/upload` |

Only the fields present in the request body are updated; omitted fields retain their current values.

#### Business Rules

- Date validation uses the **effective** value (new value if provided, existing value otherwise) for cross-field checks.
- Circular ancestor reference checks prevent setting a descendant as a parent.
- Father must be `MALE`; mother must be `FEMALE`.
- If `isDeceased` transitions from `false` to `true`, all active marriages are automatically deactivated.

#### Success Response (200)

Returns the updated person object (same shape as create).

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Zod validation error |
| 400 | Death date before birth date |
| 400 | Date in the future |
| 400 | Circular reference detected |
| 400 | Father must be `MALE` |
| 400 | Mother must be `FEMALE` |
| 404 | Person not found |

```json
// 400 Bad Request — circular reference
{
  "error": "Tidak dapat menetapkan — calon ayah sudah memiliki Anda dalam rantai keturunannya"
}
```

---

### DELETE /api/persons/[id]

Permanently delete a person. Their photo file is also removed from disk.

**RBAC:** `ADMIN` only

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Person UUID |

#### Success Response (200)

```json
{
  "message": "Data berhasil dihapus"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Person has children (must reassign or delete children first) |
| 404 | Person not found |

```json
// 400 Bad Request
{
  "error": "Tidak dapat menghapus orang yang masih memiliki anak. Hapus atau pindahkan anak terlebih dahulu."
}
```

---

### GET /api/persons/[id]/eligible-parents

Get a list of persons eligible to be set as parent for a given person. Excludes the person themselves and all their descendants (to prevent circular references).

**RBAC:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Person UUID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `role` | `"father"` \| `"mother"` | No | `"father"` | Filter candidates by gender |

#### Success Response (200)

```json
[
  {
    "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
    "fullName": "Raja Hariandja",
    "nickname": "Ompu",
    "gender": "MALE",
    "birthOrder": 1
  }
]
```

---

## Marriages

### GET /api/marriages

Retrieve a list of marriages with optional pagination.

**RBAC:** Any authenticated user

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | `number` | No | `1` | Page number (triggers paginated response) |
| `limit` | `number` | No | `20` | Items per page (1–100, triggers paginated response) |

#### Response Formats

**Without pagination** — returns a plain array:

```json
[
  {
    "id": "clx1m2n3o4p5q6r7s8t9u0v1w",
    "husbandId": "clx1a2b3c4d5e6f7g8h9i0j1k",
    "wifeId": "clx1d4e5f6g7h8i9j0k1l2m3n",
    "marriageDate": "1875-01-01T00:00:00.000Z",
    "divorceDate": null,
    "isActive": true,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T08:00:00.000Z",
    "husband": {
      "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
      "fullName": "Raja Hariandja",
      "nickname": "Ompu",
      "gender": "MALE"
    },
    "wife": {
      "id": "clx1d4e5f6g7h8i9j0k1l2m3n",
      "fullName": "Boru Hariandja I",
      "nickname": "Ibu Boru",
      "gender": "FEMALE"
    }
  }
]
```

**With pagination** — returns paginated envelope:

```json
{
  "data": [ /* Marriage[] */ ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

**Ordering:** Results are sorted by `createdAt DESC`.

---

### POST /api/marriages

Create a new marriage record.

**RBAC:** `ADMIN`, `EDITOR`

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `husbandId` | `string` | Yes | Minimum 1 character; must reference an existing `MALE` person |
| `wifeId` | `string` | Yes | Minimum 1 character; must reference an existing `FEMALE` person |
| `marriageDate` | `string` \| `null` | No | ISO date string; must not be in the future |

#### Business Rules

- `husbandId` and `wifeId` cannot be the same person.
- Each person can have at most **one active marriage** at a time.
- If a marriage record already exists for the same couple (inactive), it is **re-activated** instead of creating a duplicate.
- Creating or re-activating a marriage sets both persons' `maritalStatus` to `"MARRIED"`.

#### Success Responses

- **201 Created** (new marriage)
- **200 OK** (existing marriage re-activated)

```json
// 201 Created
{
  "id": "clx1m2n3o4p5q6r7s8t9u0v1w",
  "husbandId": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "wifeId": "clx1d4e5f6g7h8i9j0k1l2m3n",
  "marriageDate": "1875-01-01T00:00:00.000Z",
  "divorceDate": null,
  "isActive": true,
  "createdAt": "2024-06-01T12:00:00.000Z",
  "updatedAt": "2024-06-01T12:00:00.000Z"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Zod validation error |
| 400 | Marriage date in the future |
| 400 | Husband and wife are the same person |
| 400 | Husband already has an active marriage |
| 400 | Wife already has an active marriage |
| 404 | Husband or wife not found |
| 409 | Marriage already exists and is active |

---

### GET /api/marriages/[id]

Retrieve a single marriage by ID.

**RBAC:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Marriage UUID |

#### Success Response (200)

Same shape as a single marriage object in the list response (includes `husband` and `wife` relations).

#### Error Responses

| Status | Condition |
|--------|-----------|
| 404 | Marriage not found |

---

### PUT /api/marriages/[id]

Update a marriage (e.g., record a divorce). All fields are optional.

**RBAC:** `ADMIN`, `EDITOR`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Marriage UUID |

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `marriageDate` | `string` \| `null` | No | ISO date; must not be in the future |
| `divorceDate` | `string` \| `null` | No | ISO date; must not be before `marriageDate` |
| `isActive` | `boolean` | No | — |

#### Business Rules

- If `isActive` transitions from `true` to `false`, both persons' `maritalStatus` is set to `"DIVORCED"`.

#### Success Response (200)

Returns the updated marriage object.

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Marriage date in the future |
| 400 | Divorce date before marriage date |
| 404 | Marriage not found |

---

### DELETE /api/marriages/[id]

Permanently delete a marriage record.

**RBAC:** `ADMIN` only

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Marriage UUID |

#### Success Response (200)

```json
{
  "message": "Data pernikahan berhasil dihapus"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 404 | Marriage not found |

---

## Tree

### GET /api/tree

Returns the complete family tree as a hierarchical structure optimized for [D3.js](https://d3js.org/) tree layouts. Follows the male lineage (Batak tarombo convention).

**RBAC:** Any authenticated user

#### Success Response (200)

Returns a single `TreeNode` object (or `null` if no data exists):

```json
{
  "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "fullName": "Marga Hariandja",
  "nickname": "Turunan",
  "gender": "MALE",
  "birthDate": null,
  "deathDate": null,
  "isDeceased": false,
  "photoPath": null,
  "birthPlace": null,
  "maritalStatus": "SINGLE",
  "spouse": null,
  "children": [
    {
      "id": "...",
      "fullName": "Raja Hariandja",
      "nickname": "Ompu Hariandja",
      "gender": "MALE",
      "birthDate": "1850-01-01T00:00:00.000Z",
      "deathDate": "1920-06-15T00:00:00.000Z",
      "isDeceased": true,
      "photoPath": null,
      "birthPlace": "Samosir",
      "maritalStatus": "MARRIED",
      "birthOrder": 1,
      "spouse": {
        "id": "...",
        "fullName": "Boru Hariandja I",
        "nickname": "Ibu Boru",
        "gender": "FEMALE",
        "birthDate": "1855-03-15T00:00:00.000Z",
        "deathDate": "1925-09-20T00:00:00.000Z",
        "isDeceased": true,
        "photoPath": null,
        "maritalStatus": "MARRIED",
        "marriageStatus": "AKTIF"
      },
      "children": [ /* ...recursive... */ ]
    }
  ]
}
```

#### TreeNode Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Person UUID, or `"virtual-root"` if multiple root ancestors exist |
| `fullName` | `string` | Full name |
| `nickname` | `string` \| `null` | Nickname |
| `gender` | `"MALE"` \| `"FEMALE"` | Gender |
| `birthDate` | `string` \| `null` | ISO date string |
| `deathDate` | `string` \| `null` | ISO date string |
| `isDeceased` | `boolean` | Deceased status |
| `photoPath` | `string` \| `null` | Relative path to photo |
| `birthPlace` | `string` \| `null` | Place of birth |
| `maritalStatus` | `string` | One of `SINGLE`, `MARRIED`, `DIVORCED`, `WIDOWED` |
| `spouse` | `SpouseNode` \| `null` | Spouse information (see below) |
| `children` | `TreeNode[]` | Children sorted by `birthOrder ASC` |
| `birthOrder` | `number` \| `null` | Birth order among siblings |

#### SpouseNode Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Spouse's person UUID |
| `fullName` | `string` | Spouse's full name |
| `nickname` | `string` \| `null` | Spouse's nickname |
| `gender` | `"MALE"` \| `"FEMALE"` | Spouse's gender |
| `birthDate` | `string` \| `null` | ISO date string |
| `deathDate` | `string` \| `null` | ISO date string |
| `isDeceased` | `boolean` | Spouse's deceased status |
| `photoPath` | `string` \| `null` | Spouse's photo path |
| `maritalStatus` | `string` | Spouse's marital status |
| `marriageStatus` | `"AKTIF"` \| `"DUDA/JANDA"` | `"AKTIF"` if marriage is active; `"DUDA/JANDA"` (widowed) if the most recent marriage is inactive |

#### Tree Construction Logic

1. **Roots** are identified as `MALE` persons with no `fatherId`.
2. If there is exactly one root, it is returned directly.
3. If there are multiple roots, a **virtual root node** (`id: "virtual-root"`) is created as a common parent.
4. Children are traced through the `fatherId` field (patrilineal lineage).
5. Circular references and excessive depth (>100 levels) are handled with placeholder nodes to prevent infinite recursion.
6. If no male roots exist, falls back to any person with no parents.

---

## Users (Admin Only)

### PUT /api/users/[id]

Update a user's role, active status, or name.

**RBAC:** `ADMIN` only

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | User UUID |

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `role` | `"ADMIN"` \| `"EDITOR"` \| `"VIEWER"` | No | Must be one of the three values |
| `isActive` | `boolean` | No | — |
| `name` | `string` | No | — |

#### Business Rules

- An admin cannot deactivate their own account.

#### Success Response (200)

```json
{
  "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "email": "user@example.com",
  "name": "Updated Name",
  "role": "EDITOR",
  "isActive": true,
  "createdAt": "2024-01-15T08:00:00.000Z",
  "updatedAt": "2024-06-01T12:00:00.000Z"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Admin attempts to deactivate themselves |

```json
{
  "error": "Anda tidak dapat menonaktifkan akun sendiri"
}
```

---

### DELETE /api/users/[id]

Permanently delete a user account.

**RBAC:** `ADMIN` only

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | User UUID |

#### Business Rules

- An admin cannot delete their own account.
- The last remaining user cannot be deleted.

#### Success Response (200)

```json
{
  "message": "Pengguna berhasil dihapus"
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Self-deletion attempted |
| 400 | Attempting to delete the last user |

```json
{
  "error": "Anda tidak dapat menghapus akun sendiri"
}
```

---

## Backup (Admin Only)

### GET /api/backup

Export all persons and marriages as a JSON backup file.

**RBAC:** `ADMIN` only

#### Success Response (200)

```json
{
  "exportedAt": "2024-06-01T12:00:00.000Z",
  "version": "1.0",
  "persons": [
    {
      "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
      "fullName": "Raja Hariandja",
      "nickname": "Ompu Hariandja",
      "birthPlace": "Samosir",
      "birthDate": "1850-01-01T00:00:00.000Z",
      "deathPlace": "Samosir",
      "deathDate": "1920-06-15T00:00:00.000Z",
      "birthOrder": 1,
      "gender": "MALE",
      "address": null,
      "religion": "Kristen Protestan",
      "phone": null,
      "photoPath": null,
      "maritalStatus": "MARRIED",
      "isDeceased": true,
      "fatherId": null,
      "motherId": null,
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-15T08:00:00.000Z"
    }
  ],
  "marriages": [
    {
      "id": "clx1m2n3o4p5q6r7s8t9u0v1w",
      "husbandId": "clx1a2b3c4d5e6f7g8h9i0j1k",
      "wifeId": "clx1d4e5f6g7h8i9j0k1l2m3n",
      "marriageDate": "1875-01-01T00:00:00.000Z",
      "divorceDate": null,
      "isActive": true,
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-15T08:00:00.000Z"
    }
  ]
}
```

---

### POST /api/backup

Import persons and marriages from a JSON backup. **This is a destructive operation** — all existing persons and marriages are deleted before import.

**RBAC:** `ADMIN` only

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `persons` | `ImportPerson[]` | Yes | Must be an array |
| `marriages` | `ImportMarriage[]` | Yes | Must be an array |

Each `ImportPerson` must have:

| Field | Type | Required |
|-------|------|----------|
| `fullName` | `string` | Yes |
| `gender` | `"MALE"` \| `"FEMALE"` | Yes |

Optional person fields: `nickname`, `birthPlace`, `birthDate`, `deathPlace`, `deathDate`, `birthOrder`, `address`, `religion`, `phone`, `photoPath`, `maritalStatus`, `isDeceased`, `fatherId`, `motherId`, `id`.

Each `ImportMarriage` must have:

| Field | Type | Required |
|-------|------|----------|
| `husbandId` | `string` | Yes |
| `wifeId` | `string` | Yes |

Optional marriage fields: `marriageDate`, `divorceDate`, `isActive`, `id`.

#### Import Behavior

1. All existing marriages and persons are deleted (in that order, within a transaction).
2. Persons are created with new IDs. An ID mapping from old to new IDs is maintained.
3. Parent references (`fatherId`, `motherId`) are remapped to the new IDs.
4. Marriages are created with remapped spouse IDs.
5. If no users remain after the import, a default admin user is seeded (`admin@hariandja.id` / `admin123`).
6. The entire operation is wrapped in a database transaction — if any step fails, all changes are rolled back.

#### Success Response (200)

```json
{
  "message": "Data berhasil diimpor",
  "personCount": 150,
  "marriageCount": 42
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Request body is not an object |
| 400 | `persons` is not an array |
| 400 | `marriages` is not an array |
| 400 | A person is missing `fullName` or has invalid `gender` |
| 400 | A marriage is missing `husbandId` or `wifeId` |

---

## Upload

### POST /api/upload

Upload a photo image. The image is automatically compressed and resized for web display.

**RBAC:** `ADMIN`, `EDITOR`

#### Request Body

`multipart/form-data` with a single field:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `photo` | `File` | Yes | JPEG, PNG, WebP, or GIF; maximum 5 MB |

#### Processing

- The uploaded file is always converted to **JPEG** format.
- Images are resized to fit within **800x800 pixels** (aspect ratio preserved, no upscaling).
- JPEG quality is set to **80**.
- A random 32-character hex filename is generated.

#### Success Response (201)

```json
{
  "photoPath": "/uploads/persons/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.jpg"
}
```

The `photoPath` value should be stored in the person's `photoPath` field via `PUT /api/persons/[id]`.

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | No file provided in the `photo` field |
| 400 | Unsupported file type (must be JPEG, PNG, WebP, or GIF) |
| 400 | File exceeds 5 MB |

```json
// 400 Bad Request
{
  "error": "Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF."
}
```

---

## Statistics

### GET /api/stats

Retrieve aggregated family statistics for the dashboard.

**RBAC:** Any authenticated user

#### Success Response (200)

```json
{
  "totalPersons": 150,
  "males": 80,
  "females": 70,
  "generations": 5,
  "avgAge": 58,
  "activeMarriages": 42,
  "latestPerson": {
    "id": "clx1a2b3c4d5e6f7g8h9i0j1k",
    "fullName": "Hariandja V",
    "nickname": "Aman V",
    "gender": "MALE",
    "createdAt": "2024-06-01T12:00:00.000Z"
  },
  "maritalStatus": [
    { "status": "SINGLE", "count": 30 },
    { "status": "MARRIED", "count": 80 },
    { "status": "DIVORCED", "count": 10 },
    { "status": "WIDOWED", "count": 30 }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalPersons` | `number` | Total count of all persons |
| `males` | `number` | Count of male persons |
| `females` | `number` | Count of female persons |
| `generations` | `number` | Maximum tree depth (number of generations from root) |
| `avgAge` | `number` | Average age of all persons with a known birth date (rounded). Uses death date for deceased persons. |
| `activeMarriages` | `number` | Count of marriages where `isActive` is `true` |
| `latestPerson` | `object` \| `null` | Most recently created person |
| `maritalStatus` | `array` | Breakdown of persons by marital status |

---

## Audit Logs (Admin Only)

### GET /api/audit-logs

Retrieve paginated audit logs. Supports filtering by action type.

**RBAC:** `ADMIN` only

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | `number` | No | `1` | Page number (minimum 1) |
| `limit` | `number` | No | `20` | Items per page (1–100) |
| `action` | `string` | No | — | Filter by action type (e.g., `CREATE_PERSON`, `UPDATE_PERSON`, `DELETE_PERSON`, `CREATE_MARRIAGE`, `UPDATE_MARRIAGE`, `DELETE_MARRIAGE`, `UPDATE_USER`, `DELETE_USER`, `EXPORT_BACKUP`, `IMPORT_BACKUP`) |

#### Success Response (200)

```json
{
  "data": [
    {
      "id": "clx1log1log2log3log4log5log",
      "userId": "clx1a2b3c4d5e6f7g8h9i0j1k",
      "userName": "Administrator",
      "action": "CREATE_PERSON",
      "resource": "person",
      "resourceId": "clx1d4e5f6g7h8i9j0k1l2m3n",
      "details": {
        "fullName": "Hariandja V",
        "gender": "MALE"
      },
      "createdAt": "2024-06-01T12:00:00.000Z"
    }
  ],
  "total": 250,
  "page": 1,
  "limit": 20,
  "totalPages": 13
}
```

**Ordering:** Results are sorted by `createdAt DESC` (newest first).

---

## Notifications

### GET /api/notifications

Check for data changes since a given timestamp. Used for real-time collaboration / polling.

**RBAC:** Any authenticated user

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `since` | `string` | No | — | ISO date string; if omitted, returns all counts |

#### Success Response (200)

```json
{
  "hasChanges": true,
  "changedPersons": 3,
  "changedMarriages": 1,
  "timestamp": "2024-06-01T12:00:05.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `hasChanges` | `boolean` | `true` if any persons or marriages were updated since the `since` timestamp |
| `changedPersons` | `number` | Count of persons with `updatedAt > since` |
| `changedMarriages` | `number` | Count of marriages with `updatedAt > since` |
| `timestamp` | `string` | Current server time (ISO) — use as the next `since` value |

> On error, this endpoint gracefully returns `{ hasChanges: false, changedPersons: 0, changedMarriages: 0, timestamp: "..." }` instead of an error response.

---

## Seed

### GET /api/seed

Seed the database with an initial admin user and sample Batak family tree data. Only runs when no users exist in the database.

**RBAC:** None (public, but idempotent)

#### Success Responses

**When database is empty** (200):

```json
{
  "message": "Database berhasil di-seed dengan data awal",
  "admin": {
    "email": "admin@hariandja.id",
    "password": "admin123",
    "role": "ADMIN"
  }
}
```

**When database already has users** (200):

```json
{
  "message": "Database sudah memiliki data pengguna",
  "userCount": 5
}
```

---

## Common Error Responses

All endpoints may return these standard error responses:

### 401 Unauthorized

The request lacks a valid session.

```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden

The authenticated user does not have the required role/permission.

```json
{
  "error": "Forbidden"
}
```

Some endpoints include a more descriptive message:

```json
{
  "error": "Forbidden - Anda tidak memiliki izin untuk menambahkan data"
}
```

### 400 Validation Error

The request body or parameters failed validation (Zod schema).

```json
{
  "error": "Nama lengkap wajib diisi"
}
```

### 404 Not Found

The requested resource does not exist.

```json
{
  "error": "Data orang tidak ditemukan"
}
```

### 409 Conflict

The operation conflicts with existing data.

```json
{
  "error": "Email sudah terdaftar"
}
```

### 500 Internal Server Error

An unexpected server error occurred.

```json
{
  "error": "Terjadi kesalahan server"
}
```