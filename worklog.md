---
Task ID: 1
Agent: Z.ai Code (main)
Task: Build a full-stack family tree website for the extended Hariandja clan (Marga Hariandja)

Work Log:
- Installed better-sqlite3, d3, jspdf, bcryptjs (+ types) as replacements for Prisma/AI/SaaS
- Copied tarombo-ikon02.png (logo/watermark) and tarombo-bg01.png (background) to /public
- Created SQLite schema (src/lib/database.ts): roles, users, persons, spouses tables with FK constraints
- Built RBAC types & permission system (src/lib/types.ts): Viewer/Editor/Admin with page+action permissions
- Seeded 40 persons across 8 generations of the Hariandja clan + 17 marriage records + 2 demo users (admin/editor)
- Implemented NextAuth credentials auth (src/lib/auth-options.ts, src/lib/auth.ts) with getServerSession(authOptions)
- Built API routes: /api/tree, /api/persons[/:id], /api/spouses[/:id], /api/birthdays, /api/weddings, /api/me, /api/users[/:id], /api/roles[/:id], /api/upload, /api/files/[...path]
- Implemented spouse constraints: max 1 active spouse per man/woman, auto-divorce-date on death
- Built D3.js vertical tree visualization (src/components/family-tree/d3-tree.tsx) with couple cards, pan/zoom, gender stripes
- Implemented export system (src/lib/export.ts): PDF (single A4), multiple PDFs (paginated), large-format PDF, PNG, JPG — all with centered tarombo-ikon02.png watermark sized to file dimensions
- Built all views: Family Tree, Family Chart (indented hierarchy), Birthdays, Weddings, Profile, Admin (users + RBAC roles)
- Created navigation with RBAC-aware menu, login dialog, mobile hamburger menu
- Soft warm minimalist light-mode palette (terracotta/cream), sticky footer, tarombo-bg01.png as subtle page background
- Fixed: getServerSession needed authOptions, signOut needed next-auth/react client, tree duplicate-spouse rendering (primary/attached spouse logic)

Stage Summary:
- Stack: Next.js 16 + TypeScript + better-sqlite3 + D3.js + jsPDF + NextAuth v4 (NO Prisma, NO AI, NO cloud)
- Single visible route / (all "pages" are client-side views gated by RBAC permissions)
- Viewers (no login) see only Family Tree; Editors/Admins see all 5 pages + Admin panel
- RBAC fully customizable: admin can create/edit roles with per-page and per-action permission toggles
- 40 seeded Hariandja clan members across 8 generations with full genealogy data
- All exports include centered watermark; lint passes clean; verified via Agent Browser + VLM
- Demo accounts: admin@hariandja.id/admin123, editor@hariandja.id/editor123

---
Task ID: 9
Agent: general-purpose (i18n views update)
Task: Update birthdays, weddings, and family-chart views with translation calls

Work Log:
- Updated birthdays-view.tsx with useLanguage() and t() calls
- Updated weddings-view.tsx with useLanguage() and t() calls
- Updated family-chart-view.tsx with useLanguage() and t() calls
- Changed locale strings from hardcoded "id-ID" to dynamic based on lang

Stage Summary:
- All 3 view components now support EN/ID language toggle
- Used shared translation keys from src/lib/translations.ts

---
Task ID: 10
Agent: general-purpose (i18n profile/admin views)
Task: Update profile-view.tsx and admin-view.tsx with translation calls

Work Log:
- Updated profile-view.tsx with useLanguage() and t() calls for all UI strings
- Updated admin-view.tsx with useLanguage() and t() calls for all UI strings
- Changed PAGE_LABELS and ACTION_LABELS to use translation keys, wrapped with t() in JSX
- Permission badges now use translated labels

Stage Summary:
- Profile and Admin views now support EN/ID language toggle
- All form labels, buttons, toasts, and table headers are translated

---
Task ID: 11
Agent: general-purpose (i18n dialogs update)
Task: Update person-dialog, spouse-dialog, and export-dialog with translation calls

Work Log:
- Updated person-dialog.tsx with useLanguage() and t() calls for all UI strings
- Updated spouse-dialog.tsx with useLanguage() and t() calls
- Updated export-dialog.tsx with useLanguage() and t() calls
- Changed OPTIONS array in export-dialog to use translation keys

Stage Summary:
- All 3 dialog components now support EN/ID language toggle
- All form labels, buttons, toasts, and descriptions are translated
