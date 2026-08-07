# Technical Documentation

**Project:** Tarombo Hariandja — Marga Hariandja Family Tree
**Audience:** Developers and maintainers
**Last updated:** 7 August 2026

> **Language:** **English** (this file) · [Indonesia](./TECHNICAL_DOC.id.md)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Request Lifecycle](#2-request-lifecycle)
3. [Database Schema](#3-database-schema)
4. [Authentication & Sessions](#4-authentication--sessions)
5. [RBAC Implementation](#5-rbac-implementation)
6. [Tree-Building Logic](#6-tree-building-logic)
7. [D3.js Visualization](#7-d3js-visualization)
8. [Export Pipeline](#8-export-pipeline)
9. [API Reference](#9-api-reference)
10. [File Storage](#10-file-storage)
11. [Key Design Decisions](#11-key-design-decisions)

---

## 1. Architecture Overview

The application follows a **single-route App Router** architecture. Only the `/` route is user-visible; all "pages" (Family Tree, Family Chart, Birthdays, Weddings, Profile, Admin) are client-side views toggled by state, gated by RBAC permissions fetched from `/api/me`.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  NavBar     │  │  View Switch  │  │  Dialogs       │ │
│  │  (RBAC nav) │  │  (state-based)│  │  (person/spouse│ │
│  └──────┬──────┘  └───────┬───────┘  │  /export)      │ │
│         │                 │          └────────────────┘ │
│         └────────┬────────┘                              │
│                  ▼                                       │
│         ┌────────────────┐                              │
│         │  useAuth hook  │ ← fetch /api/me              │
│         │  (permissions) │                              │
│         └────────┬───────┘                              │
│                  │                                      │
└──────────────────┼──────────────────────────────────────┘
                   │ fetch (relative paths)
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js 16 Server (App Router)              │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              /api/* Route Handlers                │   │
│  │  tree · persons · spouses · birthdays · weddings │   │
│  │  me · users · roles · upload · files · auth      │   │
│  └────────────────────┬────────────────────────────┘   │
│                       │                                  │
│         ┌─────────────┴──────────────┐                  │
│         ▼                            ▼                   │
│  ┌─────────────┐          ┌──────────────────┐         │
│  │ auth.ts     │          │ database.ts      │         │
│  │ (NextAuth + │          │ (better-sqlite3) │         │
│  │  RBAC)      │          │  SQLite file     │         │
│  └─────────────┘          └──────────────────┘         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key architectural choices

- **No external state library** — React's built-in `useState`/`useEffect` suffice because all views share the same single-route page.
- **Server-side RBAC enforcement** — every API route calls `getRequestContext()` which resolves the session and permissions; `assertPageAccess()` / `assertAction()` throw `HTTPError(403)` on violations.
- **Client-side nav gating** — the nav bar reads permissions from `useAuth()` and only renders accessible items; a derived `effectiveView` falls back to "familyTree" if the current view becomes inaccessible (e.g., after logout).
- **SQLite as the sole persistence layer** — no ORM, no cloud DB. The schema is defined inline in `src/lib/database.ts` and created on first import.

---

## 2. Request Lifecycle

A typical authenticated request flows as follows:

```
1. Browser sends request with session cookie
       ↓
2. Next.js routes to the API handler (e.g., /api/persons)
       ↓
3. Handler calls getRequestContext()
       │
       ├─ getCurrentSession()
       │    └─ getServerSession(authOptions)  ← NextAuth verifies JWT
       │    └─ Loads user + role from SQLite
       │    └─ Returns SessionUser or null
       │
       └─ getEffectivePermissions(session)
            └─ If session: role.permissions
            └─ If null: Viewer role permissions
       ↓
4. Handler asserts permission (assertPageAccess / assertAction)
       └─ Throws HTTPError(403) if denied
       ↓
5. Handler executes business logic (SQLite query/mutation)
       ↓
6. handleApi() wrapper catches errors → JSON response
```

### Error handling pattern

All API handlers are wrapped in `handleApi()`:

```typescript
export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertPageAccess(permissions, "familyTree");
    return json(getTreeData());
  });
}
```

`handleApi` catches `HTTPError` (returns the appropriate status) and unexpected errors (returns 500).

---

## 3. Database Schema

Defined in `src/lib/database.ts`. SQLite with WAL journaling and foreign keys enabled.

### `roles`
```sql
CREATE TABLE roles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '{}',   -- JSON
  is_system   INTEGER NOT NULL DEFAULT 0,    -- 1 = undeletable
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `users`
```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,               -- bcrypt
  name          TEXT NOT NULL,
  role_id       TEXT NOT NULL REFERENCES roles(id),
  person_id     TEXT REFERENCES persons(id) ON DELETE SET NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `persons`
```sql
CREATE TABLE persons (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  nickname             TEXT,
  place_of_birth       TEXT,
  date_of_birth        TEXT,          -- ISO date
  date_of_death        TEXT,
  birth_order          INTEGER DEFAULT 0,
  gender               TEXT NOT NULL CHECK(gender IN ('male','female')),
  residential_address  TEXT,
  religion             TEXT,
  phone_number         TEXT,
  photo                TEXT,          -- URL to /api/files/...
  marital_status       TEXT,          -- single|married|widowed|divorced
  generation           INTEGER DEFAULT 1,
  father_id            TEXT REFERENCES persons(id) ON DELETE SET NULL,
  mother_id            TEXT REFERENCES persons(id) ON DELETE SET NULL,
  parent_id            TEXT REFERENCES persons(id) ON DELETE SET NULL,
  burial_name          TEXT,
  burial_address       TEXT,
  burial_lat           REAL,
  burial_lng           REAL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_persons_father ON persons(father_id);
CREATE INDEX idx_persons_mother ON persons(mother_id);
CREATE INDEX idx_persons_parent ON persons(parent_id);
```

### `spouses`
```sql
CREATE TABLE spouses (
  id             TEXT PRIMARY KEY,
  husband_id     TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  wife_id        TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  marriage_date  TEXT,
  divorce_date   TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_spouses_husband ON spouses(husband_id);
CREATE INDEX idx_spouses_wife    ON spouses(wife_id);
```

### Seeding

`src/lib/seed.ts` runs on every server start (idempotent — checks if roles exist first). It inserts:
- 3 system roles with hardcoded permission JSON
- 40 persons (Hariandja clan, 8 generations)
- 17 spouse records
- 2 demo users (bcrypt-hashed passwords)

---

## 4. Authentication & Sessions

### Configuration (`src/lib/auth-options.ts`)

- **Provider:** Credentials (email + password)
- **Strategy:** JWT (7-day expiry)
- **Secret:** `NEXTAUTH_SECRET` env var (dev fallback provided)
- **Password hashing:** bcryptjs (10 rounds)

### Session resolution

```typescript
// src/lib/auth.ts
export async function getCurrentSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = getUserById(session.user.id);
  if (!user || !user.is_active) return null;
  const role = getRoleById(user.role_id);
  if (!role) return null;
  return { id, email, name, role_id, person_id, permissions, role_name };
}
```

### Client-side (`src/hooks/use-auth.ts`)

The `useAuth()` hook:
1. Fetches `/api/me` on mount.
2. Returns `{ user, permissions, loading, isLoggedIn, can(page), canDo(action) }`.
3. Exposes `refresh()` (re-fetch after login) and `logout()` (calls `signOut()` then refreshes).

### Anonymous access

If `/api/me` returns `{ user: null }`, the client falls back to hardcoded Viewer permissions. No cookie or session is required to view the Family Tree.

---

## 5. RBAC Implementation

### Permission structure (`src/lib/types.ts`)

```typescript
interface Permissions {
  pages: {
    familyTree: boolean;
    familyChart: boolean;
    birthdays: boolean;
    weddings: boolean;
    profile: boolean;
  };
  actions: {
    managePersons: boolean;
    manageSpouses: boolean;
    manageUsers: boolean;
    manageRoles: boolean;
    exportData: boolean;
  };
}
```

### Default permission sets

| Role | Pages | Actions |
|------|-------|---------|
| Viewer | `familyTree` only | none |
| Editor | all 5 pages | managePersons, manageSpouses, exportData |
| Admin | all 5 pages | all 5 actions |

### Enforcement layers

1. **Server-side (authoritative):** Every API route calls `assertPageAccess()` or `assertAction()` before executing logic.
2. **Client-side (UX):** The nav bar filters items by permission; views check `canEdit` / `canExport` props to show/hide action buttons.
3. **Derived view fallback:** If a user's permissions change (e.g., after logout) and their current view becomes inaccessible, `effectiveView` automatically falls back to `familyTree`.

### Custom roles

Admins create roles via `POST /api/roles`. The permission JSON is normalized server-side (`normalizePermissions()`) to ensure all keys exist as booleans. System roles (`is_system = 1`) cannot be deleted but can be edited.

---

## 6. Tree-Building Logic

Defined in `src/lib/tree.ts`. The `getTreeData()` function builds a nested tree from the flat `persons` + `spouses` tables.

### Primary vs. attached spouse

A key design challenge: a married couple has two persons, but only one should occupy a position in the tree (the other is rendered as an attached spouse card). The logic:

```
For each spouse record:
  husbandHasParent = husband.parent_id is set
  wifeHasParent    = wife.parent_id is set

  if (wifeHasParent && !husbandHasParent):
    wife is PRIMARY, husband is ATTACHED
  else:
    husband is PRIMARY, wife is ATTACHED   (default patrilineal)
```

This ensures:
- A woman who marries into the clan (no `parent_id`) is rendered as her husband's spouse card.
- A woman who is herself a clan descendant (has `parent_id`) remains the primary node in her branch, with her husband attached.

### Children grouping

Children are grouped under their `parent_id`. Only primary nodes (not attached spouses) appear as children. This prevents a person from appearing both as a spouse card and as a child node.

### Output structure

```typescript
interface TreeNode extends Person {
  father?: Person | null;
  mother?: Person | null;
  parent?: Person | null;
  spouse?: Person | null;
  spouse_relation?: Spouse | null;
  children: TreeNode[];
}

interface TreeData {
  roots: TreeNode[];      // persons with no parent_id (and not attached spouses)
  persons: Person[];      // flat list of all persons
  spouses: Spouse[];      // flat list of all marriage records
}
```

---

## 7. D3.js Visualization

Implemented in `src/components/family-tree/d3-tree.tsx`.

### Layout algorithm

A custom vertical tree layout (not using `d3.tree()` because couples need to be rendered side-by-side):

1. **Recursive width calculation:** Each node's width = max(own width, sum of children widths + gaps).
2. **Child positioning:** Children are centered under their parent, with 40px gaps between sibling subtrees.
3. **Root stacking:** Multiple roots (different ancestral lines) are laid out left-to-right with 80px gaps.
4. **Coordinate normalization:** The whole tree is shifted so `minX = 60`, `minY = 60`.

### Constants

```typescript
const NODE_W     = 200;   // card width
const NODE_H     = 76;    // card height
const SPOUSE_GAP = 16;    // gap between spouse cards
const LEVEL_GAP  = 120;   // vertical gap between generations
```

### Rendering

Each person is rendered as an SVG `<g>` containing:
- A rounded rectangle (card) with gender-colored border
- A colored stripe on the left (blue for male, pink for female; dimmed if deceased)
- A circular avatar (photo if available, else initials)
- Name, nickname, birth/death years
- A "✝" marker for deceased persons

### Links

- **Parent → child:** Bézier curve from the bottom-center of the parent unit to the top-center of the child.
- **Marriage:** A short horizontal line between spouse cards (solid if active, dashed if ended).

### Interaction

- **Pan & zoom:** `d3.zoom()` with scale extent [0.2, 3]. On first render, the tree is auto-fitted to the container.
- **Click:** Selecting a card opens the person detail dialog.
- **Resize:** A `ResizeObserver` on the container triggers re-layout on viewport changes.

---

## 8. Export Pipeline

Implemented in `src/lib/export.ts`.

### Watermark loading

The `tarombo-ikon02.png` emblem is loaded once (cached in a module-level variable) and drawn centered on every export at ~35% of the smaller canvas dimension, with 18% opacity.

### SVG → Canvas

The D3-rendered `<svg>` is serialized to a data URL, loaded as an `Image`, and drawn onto a `<canvas>` at 2× scale for crisp output.

### Export formats

| Format | Process |
|--------|---------|
| **PNG** | Canvas → `toBlob('image/png')` → download |
| **JPG** | Canvas → `toBlob('image/jpeg', 0.95)` → download |
| **PDF (single)** | Canvas → `jsPDF` A4 landscape, fit-to-page with title |
| **PDF (multi)** | Canvas is tiled into A4 pages; each tile is a separate PDF page with a "page X of Y" header |
| **PDF (large)** | Canvas dimensions become the PDF page size (in mm); one page fits the entire tree |

### Background

The `tarombo-bg01.png` texture can optionally be drawn as a subtle background (12% opacity, cover-fit) behind the tree content.

---

## 9. API Reference

All routes are under `/api/`. Unless noted, responses are JSON.

### Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handler (session, sign-in, sign-out, CSRF) | Public |

### Session

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/me` | Current user + permissions (returns `{ user: null, permissions: null }` if anonymous) | Public |

**Response (authenticated):**
```json
{
  "user": {
    "id": "u_...",
    "email": "admin@hariandja.id",
    "name": "Administrator",
    "role_id": "role_admin",
    "role_name": "Admin",
    "person_id": "p_0001",
    "person": { ...Person }
  },
  "permissions": { "pages": {...}, "actions": {...} }
}
```

### Tree

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/tree` | Full tree data (roots, persons, spouses) | `pages.familyTree` |

### Persons

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/persons` | List all persons | `pages.familyTree` |
| POST | `/api/persons` | Create a person | `actions.managePersons` |
| GET | `/api/persons/:id` | Get one person | `pages.familyTree` |
| PUT | `/api/persons/:id` | Update a person | `actions.managePersons` |
| DELETE | `/api/persons/:id` | Delete a person (clears references) | `actions.managePersons` |

**POST/PUT body:** A `Person` object (partial for POST, full for PUT). Parent assignments are validated for gender correctness and cycle prevention.

### Spouses

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/spouses` | List all marriage records (runs auto-divorce-on-death check) | `pages.familyTree` |
| POST | `/api/spouses` | Create a marriage record | `actions.manageSpouses` |
| PUT | `/api/spouses/:id` | Update a marriage record | `actions.manageSpouses` |
| DELETE | `/api/spouses/:id` | Delete a marriage record | `actions.manageSpouses` |

**Validation:** Husband must be male, wife must be female, they cannot be the same person, and each can have at most one active spouse.

### Birthdays

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/birthdays` | Upcoming birthdays (sorted by next occurrence, deceased excluded) | `pages.birthdays` |

**Query params:** `?limit=N` (default 100)

### Weddings

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/weddings` | Wedding anniversaries (sorted by next occurrence) | `pages.weddings` |

### Users

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/users` | List all users (with role + person names) | `actions.manageUsers` |
| POST | `/api/users` | Create a user | `actions.manageUsers` |
| PUT | `/api/users/:id` | Update a user (email, name, password, role, person link, active) | `actions.manageUsers` |
| DELETE | `/api/users/:id` | Delete a user (cannot delete self) | `actions.manageUsers` |

### Roles

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/roles` | List all roles | Public |
| POST | `/api/roles` | Create a custom role | `actions.manageRoles` |
| PUT | `/api/roles/:id` | Update a role (including system roles) | `actions.manageRoles` |
| DELETE | `/api/roles/:id` | Delete a role (system roles protected; non-empty roles blocked) | `actions.manageRoles` |

### File upload & serving

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/upload` | Upload a photo (multipart form, `file` field) | `actions.managePersons` |
| GET | `/api/files/:path` | Serve an uploaded file (cached 1 year) | Public |

**Upload constraints:** PNG/JPG/WebP/GIF only, max 8 MB. Returns `{ filename, url, size, mime }`.

### Error responses

All errors follow the format:

```json
{ "error": "Human-readable message" }
```

Common status codes: `400` (validation), `403` (permission denied), `404` (not found), `409` (conflict/duplicate), `500` (server error).

---

## 10. File Storage

Uploaded photos are saved to the local filesystem at `/home/z/my-project/upload/` (or the equivalent `process.cwd()/../upload/` in deployment). Filenames are generated as `f_<timestamp>_<random>.<ext>`.

Files are served via `/api/files/[...path]`, which:
- Validates the filename (no path traversal)
- Reads from the upload directory
- Sets the correct MIME type
- Returns with `Cache-Control: public, max-age=31536000, immutable`

The upload directory is gitignored except for the two seed images (`tarombo-ikon02.png`, `tarombo-bg01.png`).

---

## 11. Key Design Decisions

### Why better-sqlite3 instead of Prisma?

The requirements explicitly excluded Prisma ORM. `better-sqlite3` is a synchronous, fast, native SQLite binding for Node.js that requires no ORM layer. Prepared statements provide parameterized queries (SQL-injection-safe), and the single-file database is trivially portable and backup-friendly.

### Why a single visible route?

Next.js App Router routes create distinct URLs, but the family-tree app is fundamentally a single workspace with different "tabs." A single route with state-driven views:
- Avoids full page reloads when switching views (smoother UX)
- Keeps the tree state (zoom, pan, selection) alive across view switches
- Simplifies RBAC enforcement (one place to gate)

### Why store permissions as JSON in the roles table?

This allows custom roles to have arbitrary permission combinations without schema changes. The `normalizePermissions()` helper ensures all keys exist with boolean values, preventing undefined access.

### Why render spouses as attached cards, not separate tree nodes?

If both husband and wife were separate nodes, the tree would show duplicates (a wife appearing both as her father's child and as her husband's spouse card). The primary/attached-spouse logic ensures each person appears exactly once in the tree structure.

### Why run auto-divorce-on-death on every spouse query?

This is a lazy-evaluation approach: rather than needing triggers or a cron job, the `applyDeathAutoDivorce()` function runs whenever spouses are fetched or modified. It checks for active marriages where either spouse has a death date and no divorce date, then sets the divorce date to the death date. This keeps the data consistent without additional infrastructure.
