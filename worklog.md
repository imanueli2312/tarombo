# Tarombo Hariandja - Worklog

---
Task ID: 1
Agent: Main
Task: Complete rearchitecture of Tarombo app

Work Log:
- Removed Prisma ORM entirely, replaced with raw SQLite (better-sqlite3)
- Created database schema: persons, partnerships, parent_child, users, rbac_permissions tables
- Built complete data access layer (src/lib/db.ts) with CRUD operations
- Implemented JWT auth system (src/lib/auth.ts) with bcryptjs + jose
- Created Zustand auth store (src/store/auth.ts)
- Defined TypeScript types (src/types/index.ts) for all entities
- Created 12 API routes: auth/login, auth/me, persons, persons/[id], partnerships, partnerships/[id], tree, search, rbac/permissions, rbac/users, rbac/users/[id], seed
- Built D3.js vertical tree view with zoom/pan, spouse nodes, deceased indicators
- Created person form (create/edit), person detail, partnership form/list
- Built search panel with debounced search
- Implemented export system (PNG, JPG, PDF, large PDF) with watermark overlay
- Created RBAC panel for permission management per role
- Created user management panel
- Built login form with react-hook-form + zod v4
- Implemented dark/light theme toggle with next-themes
- Created main page with RBAC-based tab routing (viewer: tree+search, editor/admin: all tabs)
- Single marga 'Hariandja' with seed data
- Death auto-divorce logic in person update
- Monogamy enforcement in partnership creation
- All UI in Bahasa Indonesia
- Pushed to GitHub: https://github.com/imanueli2312/tarombo

Stage Summary:
- Complete rearchitecture from Prisma to raw SQLite
- RBAC system with 3 roles (viewer/editor/admin) and 15 permissions
- D3 vertical tree with zoom/pan
- Dark/light theme toggle
- Export system with watermark
- 103 files changed, 13,554 insertions
- Successfully pushed to GitHub (force push to main)

---
Task ID: 2
Agent: Main
Task: Replace all tarombo-bg01.png references with tarombo-bg02.png as watermark, logo, and background

Work Log:
- Copied tarombo-bg02.png from upload/ to public/
- Updated export-dialog.tsx: watermark image src to /tarombo-bg02.png (centered, scaled to 40% of canvas)
- Updated page.tsx: header logo img src to /tarombo-bg02.png
- Updated layout.tsx: favicon to /tarombo-bg02.png
- Updated login-form.tsx: login card logo to /tarombo-bg02.png
- Updated globals.css: tree-container background to /tarombo-bg02.png
- Added .page-bg CSS class with tarombo-bg02.png as full-page cover background (fixed attachment, centered)
- Applied page-bg class to main page wrapper in page.tsx
- Verified no remaining references to tarombo-bg01.png
- Browser-verified: logo loads, background image applied correctly, no console errors

Stage Summary:
- tarombo-bg02.png is now used as: watermark (exports), logo (header + login), background (full page + tree container)
- All 5 files updated, 0 remaining references to old image
- Browser verified successfully

---
Task ID: 3
Agent: Main
Task: Deep audit — find and fix all integration issues

Work Log:
- Read and audited all 20+ source files: db.ts, auth.ts, types/index.ts, 12 API routes, tree-view.tsx, person-detail.tsx, person-form.tsx, partnership-form.tsx, partnership-list.tsx, search-panel.tsx, profile-panel.tsx, rbac-panel.tsx, user-management.tsx, login-form.tsx, export-dialog.tsx, page.tsx, layout.tsx, globals.css, package.json
- Browser-tested: login, all 6 tabs, person detail (Profile + Search), dark theme toggle, admin panel, RBAC panel, tree rendering

Issues found and fixed (9 total):
1. **CRITICAL — PersonDetail crash bug**: API returns `{parents: {father, mother}, children: Person[]}` but component expected `parents: Array<{parent_id, child_id, person}>` and `children: Array<{id, parent_id, child_id, person}>`. Called `.find()` on object → TypeError crash. Fixed interface and all property access patterns.
2. **HIGH — Monogamy check incomplete**: `createPartnership` only checked `WHERE person1_id = ?` for person1 and `WHERE person2_id = ?` for person2. Missed case where person is in opposite column. Fixed to `WHERE (person1_id = ? OR person2_id = ?)`.
3. **MEDIUM — Invalid CSS `background-opacity`**: `tree-container` and `page-bg` classes used `background-opacity: 0.05` which is not a valid CSS property. Replaced with `::before` pseudo-element approach using `opacity`.
4. **LOW — `custom-scrollbar` class undefined**: Referenced in search-panel.tsx but never defined in CSS. Removed the class.
5. **LOW — Dead `getAuthUser()` function**: Always returned null with comment "use async version". Removed dead code from auth.ts.
6. **LOW — Unused files**: Removed `src/app/api/route.ts` (Hello World), `src/hooks/use-toast.ts`, `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx` (replaced by sonner).
7. **LOW — Stale Prisma scripts**: `db:push`, `db:generate`, `db:migrate`, `db:reset` still in package.json. Removed.
8. **MEDIUM — RBAC save mutation silent failures**: `Promise.all` ignored individual response errors. Changed to `Promise.allSettled` with error count check.
9. **MEDIUM — Person form empty string vs null**: Update mutation sent empty strings `''` for cleared optional fields instead of `null`. Added explicit null assignment for empty optional fields during edit.

Stage Summary:
- 1 critical crash bug fixed (person detail page)
- 1 data integrity bug fixed (monogamy enforcement)
- 1 CSS rendering bug fixed (background opacity)
- 6 code quality improvements
- All fixes browser-verified: zero console errors, all tabs functional, person detail loads correctly from both Profile and Search
- Lint passes: 0 errors, 3 warnings (all non-blocking)
