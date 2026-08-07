# Tarombo Hariandja

> The official family tree (*tarombo*) application for the extended **Marga Hariandja** clan — a Batak (Toba) *marga*. Preserve, explore, and celebrate our lineage, generation to generation.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Database](https://img.shields.io/badge/SQLite-better--sqlite3-green) ![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Quick Start](#quick-start)
5. [Demo Accounts](#demo-accounts)
6. [Project Structure](#project-structure)
7. [Data Model](#data-model)
8. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
9. [Exports](#exports)
10. [Development](#development)
11. [Documentation](#documentation)
12. [License](#license)

---

## Overview

**Tarombo Hariandja** is a full-stack web application that records and visualises the genealogy of the extended Hariandja clan. It is built around a vertical family-tree (*tarombo*) view, with supporting pages for birthdays, wedding anniversaries, a hierarchical chart, user profiles, and a full administration panel.

The application is designed with three guiding principles:

- **Exclusivity** — the site is dedicated to the Hariandja clan only.
- **Privacy by separation** — user-account data is kept strictly separate from the genealogy records displayed on the tree.
- **Open reading, gated editing** — anyone may view the family tree without an account; only authenticated Editors and Admins may modify records.

### Design language

The aesthetic is **soft, modern, and minimalist**, using a warm earthy palette (terracotta, cream, amber) inspired by Batak heritage. Two clan assets are used throughout:

| Asset | File | Usage |
|-------|------|-------|
| Clan emblem | `tarombo-ikon02.png` | Logo in the navigation bar & footer; centered watermark on every export |
| Background texture | `tarombo-bg01.png` | Subtle page background behind content |

Light mode is the primary and default theme.

---

## Features

### For everyone (no login required)
- **Family Tree** — an interactive D3.js vertical *tarombo* with pan, zoom, and click-to-view person details.
- Deceased indicators, gender colour stripes, marriage lines (solid = active, dashed = ended).

### For Editors & Admins
- **Family Chart** — an alternative indented hierarchy view showing each couple and their children.
- **Birthdays** — upcoming birthdays across the clan, sorted by next occurrence, with ages and birthplaces.
- **Weddings** — wedding anniversaries with years celebrated.
- **Profile** — manage your own account (name, email, password) and view your linked person record.
- **Add / edit / delete** persons and marriage records with full validation.
- **Photo upload** for each person (stored locally, no cloud).
- **Export** the tree in 5 formats (see [Exports](#exports)).

### For Admins only
- **User management** — create, edit, disable, and delete user accounts.
- **Role management** — create custom roles with granular per-page and per-action permissions; edit built-in roles (Viewer / Editor / Admin) but not delete them.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js 16** (App Router, Turbopack) | Single visible route `/`; views are client-side components gated by RBAC |
| Language | **TypeScript 5** | Strict typing throughout |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) | Warm custom palette; light mode default |
| Database | **SQLite** via **better-sqlite3** | Local file `db/hariandja.db`; **no Prisma, no cloud DB** |
| Auth | **NextAuth.js v4** (Credentials provider, JWT sessions) | bcrypt password hashing |
| Visualisation | **D3.js 7** | Custom vertical tree layout with zoom/pan |
| PDF export | **jsPDF 4** | Single-page, multi-page, and large-format PDFs |
| State | React hooks + `next-auth/react` | No external state library needed for this scope |

### Explicitly excluded (per requirements)
Cloud services, S3, SaaS, MinIO, GEDCOM, AI, and Prisma ORM are **not** used anywhere in this project.

---

## Quick Start

### Prerequisites
- **Node.js 18+** or **Bun** (recommended)
- A POSIX environment (Linux / macOS / WSL)

### Installation

```bash
# clone the repository
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo

# install dependencies
bun install

# trust native modules (better-sqlite3)
bun pm trust better-sqlite3
```

### Running the development server

```bash
bun run dev
```

The server starts on **http://localhost:3000**. On first run, the database is created automatically at `db/hariandja.db` and seeded with:
- 40 Hariandja clan members across 8 generations
- 17 marriage records
- 3 system roles (Viewer, Editor, Admin)
- 2 demo user accounts

### Production build

```bash
bun run build
bun run start
```

---

## Demo Accounts

The seed data includes two demo accounts for testing the Editor and Admin experiences:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@hariandja.id` | `admin123` |
| **Editor** | `editor@hariandja.id` | `editor123` |

> ⚠️ **Change these credentials immediately** if deploying to any non-local environment. Passwords can be rotated by an Admin via the **Admin → Users** panel, or directly in the database.

---

## Project Structure

```
tarombo/
├── public/
│   ├── tarombo-ikon02.png      # clan emblem (logo + watermark)
│   ├── tarombo-bg01.png        # background texture
│   ├── logo.svg                # fallback favicon
│   └── robots.txt
├── upload/                     # user-uploaded photos (gitignored except seed images)
│   ├── tarombo-ikon02.png
│   └── tarombo-bg01.png
├── db/                         # SQLite database (gitignored, runtime-generated)
│   └── hariandja.db
├── prisma/                     # legacy schema (unused — kept for scaffold reference)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # root layout (fonts, providers, toaster)
│   │   ├── page.tsx            # main page (single visible route)
│   │   ├── globals.css         # Tailwind + custom theme
│   │   └── api/                # API route handlers (15 endpoints)
│   │       ├── auth/[...nextauth]/
│   │       ├── tree/
│   │       ├── persons/[id]/
│   │       ├── spouses/[id]/
│   │       ├── birthdays/
│   │       ├── weddings/
│   │       ├── me/
│   │       ├── users/[id]/
│   │       ├── roles/[id]/
│   │       ├── upload/
│   │       └── files/[...path]/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui component library (60+ components)
│   │   ├── family-tree/        # D3 tree, person/spouse/export dialogs
│   │   ├── views/              # page-level views (6 views)
│   │   ├── nav-bar.tsx
│   │   ├── login-dialog.tsx
│   │   └── providers.tsx
│   ├── hooks/
│   │   ├── use-auth.ts         # client-side auth + permissions hook
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   └── lib/
│       ├── database.ts         # better-sqlite3 client + schema init
│       ├── seed.ts             # Hariandja clan seed data
│       ├── auth.ts             # server-side session & RBAC helpers
│       ├── auth-options.ts     # NextAuth configuration
│       ├── types.ts            # shared TypeScript types
│       ├── types-tree.ts       # client-safe tree types
│       ├── tree.ts             # tree-building logic (primary/attached spouse)
│       ├── api.ts              # API response helpers
│       ├── export.ts           # PDF/PNG/JPG export with watermark
│       └── utils.ts
├── Caddyfile                   # gateway config (port 81 → 3000)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env                        # DATABASE_URL (gitignored)
```

---

## Data Model

### Person

Every individual record contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Primary key |
| `name` | TEXT | Full name |
| `nickname` | TEXT? | Familiar name |
| `place_of_birth` | TEXT? | City / village of birth |
| `date_of_birth` | DATE? | ISO date |
| `date_of_death` | DATE? | ISO date (null if living) |
| `birth_order` | INT | Order among siblings (0 = unspecified) |
| `gender` | ENUM | `male` / `female` |
| `residential_address` | TEXT? | Current or last known address |
| `religion` | TEXT? | e.g. Kristen Protestan, Islam, Parmalim |
| `phone_number` | TEXT? | Contact number |
| `photo` | TEXT? | URL to uploaded photo (`/api/files/...`) |
| `marital_status` | ENUM? | single / married / widowed / divorced |
| `generation` | INT | Generation number (1 = founding ancestor) |
| `father_id` | FK? | Biological father (need not be the tree parent) |
| `mother_id` | FK? | Biological mother (need not be the tree parent) |
| `parent_id` | FK? | **Official parent** determining tree position |
| `burial_name` | TEXT? | Name of burial site |
| `burial_address` | TEXT? | Address of burial site |
| `burial_lat` | REAL? | Latitude |
| `burial_lng` | REAL? | Longitude |

### Relationship rules

A person has:
- **One father** — not necessarily the same as the tree `parent`.
- **One mother** — not necessarily the same as the tree `parent`.
- **One official parent** (`parent_id`) — determines where the person appears in the tree.
- **Zero or more children** — persons whose `parent_id` points to this person.
- **Zero or one spouse** (wife/husband) — via the `spouses` table.

### Spouse (marriage record)

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Primary key |
| `husband_id` | FK | Must reference a male person |
| `wife_id` | FK | Must reference a female person |
| `marriage_date` | DATE? | When the marriage began |
| `divorce_date` | DATE? | When the marriage ended |
| `is_active` | INT | 1 = active, 0 = ended |

### Marriage constraints (enforced)

- A **man** can have at most **one active spouse** at a time.
- A **woman** can have at most **one active spouse** at a time.
- If a **woman's husband passes away**, the `divorce_date` is set automatically to his date of death.
- If a **man's wife passes away**, the `divorce_date` is set automatically to her date of death.

### User (account — separate from genealogy)

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Primary key |
| `email` | TEXT | Unique login email |
| `password_hash` | TEXT | bcrypt hash |
| `name` | TEXT | Display name |
| `role_id` | FK | Assigned role |
| `person_id` | FK? | Optional link to a person record |
| `is_active` | INT | 1 = active, 0 = disabled |

### Role

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Primary key |
| `name` | TEXT | Unique role name |
| `description` | TEXT? | Human-readable description |
| `permissions` | JSON | Page + action permission flags (see RBAC below) |
| `is_system` | INT | 1 = built-in (undeletable), 0 = custom |

---

## Role-Based Access Control (RBAC)

The RBAC system is **fully customisable**. Each role carries a `permissions` JSON object:

```json
{
  "pages": {
    "familyTree": true,
    "familyChart": true,
    "birthdays": true,
    "weddings": true,
    "profile": true
  },
  "actions": {
    "managePersons": true,
    "manageSpouses": true,
    "manageUsers": false,
    "manageRoles": false,
    "exportData": true
  }
}
```

### Built-in roles

| Role | Pages | Actions | Account required? |
|------|-------|---------|-------------------|
| **Viewer** | Family Tree only | none | ❌ No login |
| **Editor** | All 5 pages | manage persons, spouses, export | ✅ Login |
| **Admin** | All 5 pages + Admin | all actions | ✅ Login |

### Custom roles

Admins can create new roles via **Admin → Roles → Add role**, toggling any combination of page and action permissions. Built-in roles can be edited but not deleted. Custom roles can be deleted only if no users are assigned to them.

---

## Exports

The family tree can be exported in **five formats**. Every export includes the `tarombo-ikon02.png` emblem as a **centered watermark**, sized proportionally to the file dimensions (~35% of the smaller dimension), plus an optional background texture.

| Format | Description | Use case |
|--------|-------------|----------|
| **PDF (single page)** | Whole tree fitted onto one A4 landscape page | Quick overview |
| **Multiple PDFs (paginated)** | Tree tiled across several A4 pages | Printing large trees on standard paper |
| **Large-format PDF** | One oversized PDF page matching the tree's full dimensions | Poster printing, archive |
| **PNG** | High-resolution raster image (2× scale) | Digital sharing, embedding |
| **JPG** | Compressed raster image | Email, messaging |

> Export access is controlled by the `exportData` action permission. Viewers cannot export.

---

## Development

### Scripts

```bash
bun run dev      # start dev server (port 3000, hot reload)
bun run lint     # run ESLint
bun run build    # production build
bun run start    # start production server
```

### Database

The database is a single SQLite file at `db/hariandja.db`. It is created and seeded automatically on first server start. To reset it, simply delete the file:

```bash
rm db/hariandja.db db/hariandja.db-shm db/hariandja.db-wal
bun run dev   # re-creates and re-seeds
```

### Linting

The project enforces ESLint with Next.js rules. All code passes `bun run lint` cleanly.

### Environment variables

Only one variable is required, set in `.env` (gitignored):

```
DATABASE_URL=file:/home/z/my-project/db/hariandja.db
NEXTAUTH_SECRET= hariandja-tarombo-secret-dev-key-2024   # optional; has a dev default
```

---

## Documentation

Detailed documents are provided alongside the code:

| Document | Purpose |
|----------|---------|
| [`README.md`](./README.md) | This file — project overview |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | Current development status, test results, roadmap |
| [`TECHNICAL_DOC.md`](./TECHNICAL_DOC.md) | Architecture, API reference, data flow |
| [`USER_MANUAL.md`](./USER_MANUAL.md) | End-user guide for Viewers, Editors, and Admins |

---

## License

MIT License — © Marga Hariandja. See [LICENSE](./LICENSE) for details.

> This project is dedicated to the Hariandja clan. *Horas!*
