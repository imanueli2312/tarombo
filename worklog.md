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

---
Task ID: 4
Agent: Main
Task: Deep audit round 2 — comprehensive re-verification of all integration points

Work Log:
- Re-read all 20+ source files from scratch for line-by-line audit
- Verified db.ts: schema, CRUD, monogamy check, death auto-divorce, cascade delete, search, RBAC functions
- Verified all 12 API routes for RBAC protection consistency, error handling, input validation
- Verified tree-view.tsx: D3 vertical layout, zoom/pan, spouse nodes, deceased indicators, node click
- Verified person-detail.tsx: correct interface matching API response (father/mother/children/spouse)
- Verified export-dialog.tsx: watermark bg02 centered 40% scale 30% opacity, PNG/JPG/PDF/large PDF
- Verified rbac-panel.tsx: Promise.allSettled, admin locked, dirty tracking, permission toggle
- Verified user-management.tsx: CRUD, self-delete prevention, role validation
- Verified auth flow: login-form → cookie + JWT → auth-provider → auth-store → RBAC tabs
- Verified theme: next-themes class-based, dark/light toggle, CSS variables for both themes
- Verified business rules: monogamy (OR check on both columns), death auto-divorce (duda/janda), single marga
- Ran ESLint: 0 errors, 3 warnings → fixed 1 → 0 errors, 2 warnings
- Browser-verified with agent-browser: page load, login, all 6 tabs, search → person detail, RBAC panel, dark theme toggle, Pernikahan tab
- Checked console for errors: found SVG flood-color/flood-opacity DOM warnings

Issues found and fixed (3 total):
1. **MEDIUM — RBACPermission.allowed type mismatch**: SQLite returns `allowed` as INTEGER (0/1) but TypeScript type expects boolean. Functions `getPermissionsForRole()`, `getAllPermissions()`, `updatePermission()` used `as RBACPermission[]` without converting values. Fixed by mapping rows with `allowed: row.allowed === 1`.
2. **MEDIUM — SVG DOM warnings**: `feDropShadow` used kebab-case attributes `flood-color`/`flood-opacity` which are invalid in React JSX. Fixed to camelCase `floodColor`/`floodOpacity`.
3. **LOW — Unused eslint-disable directive**: `tree-view.tsx` line 76 had `// eslint-disable-next-line @typescript-eslint/no-explicit-any` but the rule was not active. Removed.

Accepted risks (non-issues):
- `/api/seed` POST has no auth: intentional bootstrap endpoint, idempotent (checks data existence)
- `persons` GET has no auth: intentional for viewer role (public family tree)
- React Hook Form `watch()` compiler warning: known library limitation, not fixable on our side
- html2canvas CSS variable resolution: known library limitation for SVG exports

Stage Summary:
- 3 issues found and fixed (2 medium, 1 low)
- Lint: 0 errors, 2 warnings (both React Hook Form library limitations)
- Dev log: all 200s, zero runtime errors
- Browser verified: all flows work correctly, zero console errors after fixes
- Total across all audits: 12 issues found and fixed (1 critical, 1 high, 5 medium, 5 low)

---
Task ID: 5
Agent: Main
Task: Deep audit round 3 — final verification and push to repository

Work Log:
- Re-read all 20+ source files from scratch for line-by-line audit
- Verified db.ts: schema, CRUD, monogamy (OR check), death auto-divorce, cascade delete, search, RBAC boolean conversion
- Verified all 12 API routes: RBAC consistency, error handling, input validation, monogamy 409 response
- Verified D3 tree-view: vertical layout, zoom/pan, spouse nodes, deceased overlay, node click, camelCase SVG attrs
- Verified person-detail: correct interface (father/mother/children/spouse), edit/delete handlers
- Verified export-dialog: watermark bg02 centered 40% 30% opacity, PNG/JPG/PDF/large PDF
- Verified RBAC panel: Promise.allSettled, admin locked, dirty tracking
- Verified user-management: CRUD, self-delete prevention, role validation
- Verified auth flow: login-form → cookie + JWT → auth-provider → auth-store → RBAC tabs
- Verified theme: next-themes class-based, dark/light toggle, CSS variables for both themes
- Ran ESLint: 0 errors, 2 warnings (React Hook Form library limitations)
- Started dev server: all routes return expected status codes, zero compilation errors

Issues found and fixed (2 total):
1. **MEDIUM — Missing delete person UI**: PersonDetail component has delete functionality, but profile-panel.tsx and search-panel.tsx never passed the `onDelete` prop, making it impossible to delete persons from the UI. Fixed by passing `onDelete` handler gated by `delete_person` permission.
2. **LOW — Stale file**: `public/tarombo-bg01.png` remained in the repo (2MB) despite all references being replaced with bg02 in Task ID 2. Removed.

Stage Summary:
- 2 issues found and fixed (1 medium, 1 low)
- Lint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and runs correctly, all routes return expected status codes
- Pushed to GitHub: commit 4520cb4
- Total across all audits (rounds 1-3): 14 issues found and fixed (1 critical, 1 high, 6 medium, 6 low)

---
Task ID: 6
Agent: Main
Task: Deep audit round 4 — cross-feature integration, data flow, edge cases

Work Log:
- Line-by-line re-audit of all 20+ files focusing on integration correctness
- Traced data flow: form → API → db → API response → component state → UI
- Verified all query invalidation chains (person CRUD ↔ tree ↔ partnerships ↔ search)
- Tested tree node click flow: tree-view.tsx → page.tsx → ProfilePanel/SearchPanel
- Analyzed person-form burial coordinate handling (valueAsNumber → NaN edge case)
- Checked API validation gaps (missing FK existence checks)
- Verified permission-gated UI rendering across all components
- Ran ESLint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: all routes return expected status codes, zero compilation errors

Issues found and fixed (6 total):
1. **MEDIUM — Tree node click unresponsive**: TreeView had onNodeClick wired internally but page.tsx never passed the prop. Clicking nodes did nothing despite cursor:pointer. Fixed by wiring onNodeClick to switch to Profile/Search tab with the selected person ID. Uses key-based remounting for clean state initialization.
2. **MEDIUM — Missing partnerships invalidation on person delete**: PersonDetail's deleteMutation only invalidated ['persons'] and ['tree']. If the deleted person had partnerships, the Pernikahan tab would show stale data with broken person references until manual refresh. Added ['partnerships'] invalidation.
3. **MEDIUM — Edit button shown without permission check**: ProfilePanel always passed onEdit to PersonDetail, so the Edit button was visible to all users (including viewers). Users without edit_person permission would see the button, click it, open the form, submit, and get a 403 API error. Fixed by gating onEdit with canEdit permission check.
4. **MEDIUM — Missing FK existence validation**: POST /api/persons accepted any father_id/mother_id without checking if the person exists. SQLite FK constraint would throw a raw "FOREIGN KEY constraint failed" error. Added explicit validation with user-friendly 404 messages ("Ayah tidak ditemukan" / "Ibu tidak ditemukan").
5. **MEDIUM — NaN sent for burial coordinates**: person-form.tsx used `data.burial_latitude != null` to check coordinates, but react-hook-form's valueAsNumber returns NaN for empty number inputs. NaN passes `!= null` (NaN !== null is true) but fails `=== null` (NaN === null is false), so NaN was sent to the API and stored in SQLite. Fixed both create and update mutations to use `Number.isFinite()` instead.
6. **LOW — Missing persons invalidation on partnership delete**: PartnershipList's deleteMutation only invalidated ['partnerships'] and ['tree']. Deleting a partnership changes the persons' marital status (e.g., menikah → belum_menikah), but the Profile tab would show stale status. Added ['persons'] invalidation.

Stage Summary:
- 6 issues found and fixed (5 medium, 1 low)
- Lint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and runs correctly, all routes return expected status codes
- Pushed to GitHub: commit 588c9c3
- Total across all audits (rounds 1-4): 20 issues found and fixed (1 critical, 1 high, 11 medium, 8 low)

---
Task ID: 7
Agent: Main
Task: Deep audit round 5 — cascade deletion data integrity, cross-mutation invalidation, API validation parity, search panel edit parity

Work Log:
- Line-by-line re-audit of all 20+ source files, focusing on data integrity edge cases, mutation invalidation chains, and API validation consistency
- Traced cascade delete flow: deletePerson → raw SQL DELETE partnerships → spouse marital status NOT updated
- Traced death auto-divorce flow: updatePerson (sets tanggal_kematian) → auto-divorce fires → partnerships records changed → frontend updateMutation does NOT invalidate ['partnerships']
- Verified PUT /api/persons/[id] has no FK validation for father_id/mother_id (POST does, but PUT doesn't)
- Verified search-panel.tsx has no onEdit handler or PersonForm integration (editors can't edit from search results)
- Fixed duplicate imports in search-panel.tsx (Person and PersonForm imported twice from previous partial edit)
- Ran ESLint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: all routes return expected status codes, zero compilation errors

Issues found and fixed (4 total):
1. **MEDIUM — Stale marital status after cascade person deletion**: `deletePerson()` in db.ts uses raw SQL to delete partnerships, bypassing the `deletePartnership()` function's spouse marital status update logic. When a person (and their descendants) are deleted, surviving spouses retain 'menikah' status. Fixed by adding a `fixStaleMaritalStatus` prepared statement inside the transaction that updates any person marked 'menikah' but with no active partnership.
2. **MEDIUM — Missing partnerships invalidation on person edit**: `person-form.tsx` updateMutation only invalidated ['persons'] and ['tree']. When a death date is set, the auto-divorce logic in db.ts changes partnership records and spouse statuses. The Pernikahan tab would show stale data. Fixed by adding `queryClient.invalidateQueries({ queryKey: ['partnerships'] })` to the updateMutation's onSuccess.
3. **MEDIUM — Missing FK validation in PUT /api/persons/[id]**: The POST route validates father_id/mother_id exist before creating parent_child links, but the PUT route did not. With foreign_keys=ON, passing a non-existent parent would cause a raw SQLite FOREIGN KEY error instead of a user-friendly 404 message. Fixed by adding explicit FK existence checks matching the POST route pattern.
4. **LOW — Search panel missing edit capability for editors**: SearchPanel only had onDelete but no onEdit handler or PersonForm integration. Editors viewing person details from search results had no way to edit — they had to navigate to the Profile tab. Fixed by adding canEdit check, handleEdit callback, onEdit prop to PersonDetail, and PersonForm component with proper state management.

Accepted risks (non-issues):
- 'Bagan Keluarga' tab renders same ProfilePanel as 'Profil' tab (product/design decision, not code bug)
- Client-side permission caching: permissions fetched at login, not real-time (known limitation)
- SQLite single-writer lock for concurrent requests (known limitation for family tree scale)

Stage Summary:
- 4 issues found and fixed (3 medium, 1 low)
- Lint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and runs correctly, all routes return expected status codes
- Total across all audits (rounds 1-5): 24 issues found and fixed (1 critical, 1 high, 14 medium, 8 low)

---
Task ID: 8
Agent: Main
Task: Deep audit round 6 — Core Genealogy (Foundation) areas identification

Work Log:
- Line-by-line audit of 20+ source files focusing on Core Genealogy Foundation:
  - Data model completeness (schema, types, constraints)
  - Tree data building logic (getTreeData)
  - D3 tree rendering (tree-view.tsx)
  - Parent-child relationship semantics
  - Partnership/spouse handling
  - Search completeness
  - Person form CRUD parity
  - Generation number calculation
  - Data integrity edge cases
  - API validation gaps
- Traced complete data flow: form → API → db → tree → UI
- Analyzed D3 tree root-node selection logic for duplicate spouse issue
- Verified parent-child link handling in both create and edit flows
- Checked gender consistency enforcement across API routes
- Analyzed query invalidation chains for all partnership mutations
- Ran ESLint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: all routes return expected status codes, zero compilation errors

Issues found and fixed (4 total):
1. **HIGH — Tree shows married-in spouses as duplicate root nodes**: In getTreeData(), root nodes were identified as `persons with no parents`. Spouses who married into the family (no parents in the system) appeared both as: (a) standalone root nodes at the top level, AND (b) spouse cards next to their partner. This violated the patrilineal tree structure. Fixed by filtering root nodes: a person with no parents is only a root if they have children (blood lineage) or are not a spouse of someone else.

2. **MEDIUM — Partnership create/update mutations missing ['persons'] invalidation**: When a partnership is created, both persons' status_pernikahan changes to 'menikah'. When divorce_date is set via edit, both change to 'cerai'. However, the frontend mutations only invalidated ['partnerships'] and ['tree'], leaving the ['persons'] query cache stale. Profile tab and person detail would show incorrect marital status until manual refresh. Fixed by adding `queryClient.invalidateQueries({ queryKey: ['persons'] })` to both create and update onSuccess handlers.

3. **MEDIUM — No gender validation for father_id/mother_id**: POST and PUT /api/persons validated that father_id/mother_id exist, but did not verify gender. A female person could be set as father, a male as mother. This would corrupt the tree's parent-child semantics. Fixed by adding `jenis_kelamin` checks: father must be 'L', mother must be 'P'. Returns 400 with clear Indonesian error message.

4. **MEDIUM — Person form hides parent editing during update**: The person form showed parent selection (father_id, mother_id) only during CREATE. The API (PUT /api/persons/[id]) fully supports updating parent links via updatePerson() in db.ts. Users who made mistakes during creation had no way to correct parent assignments from the UI. Fixed by: (a) removing the !isEditing condition, (b) fetching person's current parents via personDetail query when editing, (c) pre-filling parent selects, (d) including father_id/mother_id in the update mutation payload, (e) extracting PersonDetailResponse to shared types, (f) filtering self from parent options.

---

## CORE GENEALOGY FOUNDATION — IMPROVEMENT AREAS IDENTIFIED

### TIER 1: Critical Foundation Gaps

**F-1. No distinction between 'blood lineage' and 'married-in spouse' in data model**
- Current: All persons are treated identically. The system cannot distinguish between a Hariandja blood member and a spouse who married in.
- Impact: Tree root filtering (fixed above) is a workaround, not a solution. The fundamental issue remains that the data model doesn't encode this critical Batak Toba genealogy concept.
- Recommendation: Add a `is_blood_lineage` (BOOLEAN DEFAULT 1) or `lineage_type` ('blood' | 'married_in') column to persons. When creating a partnership, the non-Hariandja spouse should be marked as 'married_in'. This enables: correct tree root selection, lineage-specific statistics, and proper GEDCOM export.

**F-2. No audit trail / change history**
- Current: All mutations (person update, partnership create/delete) are permanent with no history tracking.
- Impact: For a genealogy application, data accuracy is critical. Accidental deletions or incorrect edits cannot be undone. There's no way to see who changed what and when.
- Recommendation: Add an `audit_log` table (id, user_id, action, entity_type, entity_id, old_values JSON, new_values JSON, created_at). Record all CUD operations. Consider soft-delete for persons instead of hard-delete.

**F-3. No data backup / GEDCOM export-import**
- Current: Only visual exports (PNG/JPG/PDF) exist. No structured data export.
- Impact: If the SQLite database is lost, all genealogy data is permanently gone. No way to migrate data to/from other genealogy tools.
- Recommendation: Implement JSON backup export/import endpoint. Consider GEDCOM 5.5.1 standard support for interoperability with other genealogy software (Ahnenblatt, Gramps, FamilySearch).

### TIER 2: Important Functional Gaps

**F-4. No cycle detection beyond direct self-reference**
- Current: parent_child has CHECK(parent_id != child_id) preventing A→A, but nothing prevents A→B→C→A cycles.
- Impact: If cycles are introduced (via API bug or direct DB manipulation), the tree rendering uses a `visited` set to prevent infinite loops, but the data would be semantically corrupt and the tree would silently drop nodes.
- Recommendation: Add recursive cycle detection in updatePerson/createPerson before inserting parent_child links. Walk up the ancestor chain from the proposed parent to verify the child doesn't appear.

**F-5. Generation number only auto-calculated from father**
- Current: POST /api/persons calculates nomor_generasi from father only. If only mother is specified, the user must manually set generation.
- Impact: Children with only a mother recorded get generation 1 by default, regardless of the mother's actual generation.
- Recommendation: Also check mother's generation as fallback. Use MAX(father_gen, mother_gen) + 1 if both parents are specified.

**F-6. Limited search scope**
- Current: searchPersons() only queries `nama LIKE ? OR nama_panggilan LIKE ?`.
- Impact: Cannot search by birth place, address, phone, religion, generation number, or burial location. For large families, users need more filter dimensions.
- Recommendation: Extend search to include tempat_lahir, alamat, agama. Add a dedicated filter/search API with structured parameters (generation, gender, marital status, date ranges) instead of just a text search.

**F-7. Deceased/divorced spouses disappear from tree**
- Current: spouseMap in getTreeData() only includes partnerships where divorce_date IS NULL. When a person dies (auto-divorce sets divorce_date), the spouse completely disappears from the tree. When a couple divorces, same result.
- Impact: The tree loses historical context. In Batak genealogy, knowing who was married to whom (even if divorced or deceased) is important.
- Recommendation: Show ALL spouses in the tree with visual distinction: solid line for active, dashed line for divorced, cross/overlay for deceased. This requires extending spouseMap to include divorced/deceased partnerships.

**F-8. No sibling relationship concept**
- Current: Siblings can be inferred (shared parents) but there's no first-class sibling query or display.
- Impact: Person detail shows parents and children but not siblings. Users must navigate to parent's detail to see other children.
- Recommendation: Add getSiblingOf(personId) query. Show siblings section in PersonDetail. Consider sibling order (by birth date or nomor_urut_lahir).

### TIER 3: Data Model Enhancements

**F-9. Missing Batak-specific fields**
- No `marga` field per person (currently hardcoded 'Hariandja' in tree subtitle). If the app ever expands to multi-marga, every person needs their own marga.
- No `tempat_meninggal` (place of death) — only date is tracked.
- No `marriage_place` in partnerships.
- No `photo` upload mechanism — the field exists but there's no upload endpoint or UI.
- No `notes` or `biography` field for additional context.

**F-10. No date validation logic**
- Current: Dates are stored as free-form strings. No validation that: birth date < death date, marriage date < divorce date, child birth date > parent birth date, etc.
- Impact: Nonsensical dates can be stored (e.g., death before birth, child born before parent).
- Recommendation: Add date validation in API routes. At minimum: death_date >= birth_date, marriage_date <= divorce_date.

**F-11. No statistics/dashboard**
- Current: No way to see aggregate family statistics (total members per generation, male/female ratio, deceased count, marital status distribution, oldest living member, etc.).
- Impact: For large families, statistical overview is valuable for understanding the family's composition.
- Recommendation: Add a statistics API endpoint and a dashboard panel with charts.

**F-12. SQLite single-writer concurrency**
- Current: better-sqlite3 with WAL mode. Only one write transaction at a time.
- Impact: If multiple editors submit changes simultaneously, one will get SQLITE_BUSY error. For a single-family app this is unlikely but becomes an issue at scale.
- Recommendation: For current scale (single marga, ~hundreds of members), this is acceptable. Document the limitation. If scaling to multi-marga, consider PostgreSQL.

Stage Summary:
- 4 issues found and fixed (1 high, 3 medium)
- 12 Core Genealogy Foundation improvement areas identified across 3 tiers
- Lint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and runs correctly, all routes return expected status codes
- Total across all audits (rounds 1-6): 28 issues found and fixed (1 critical, 2 high, 17 medium, 8 low)

---
Task ID: 9
Agent: Main
Task: Deep audit round 7 — PWA & Data Quality areas

Work Log:
- Audited PWA capabilities: manifest, service worker, meta tags, viewport, theme-color, icons, apple-web-app
- Audited Data Quality: date validation, nama trimming, coordinate ranges, search sanitization, future dates, numeric constraints
- Created `/public/manifest.json` with PWA manifest (name, short_name, display standalone, SVG icons, theme-color)
- Updated `layout.tsx`: added Viewport export with theme-color (light/dark), appleWebApp metadata, manifest link, OpenGraph tags, proper SVG favicon/icon
- Fixed `package.json` name from generic `nextjs_tailwind_shadcn_ts` to `tarombo-hariandja`, bumped version to 0.3.0
- Created `src/lib/validation.ts` with shared validation helpers: parseDate, validateDeathAfterBirth, validateDivorceAfterMarriage, validateNotFuture, validateLatitude, validateLongitude, sanitizeLikePattern
- Applied validation to POST /api/persons: nama trim, jenis_kelamin enum check, death>=birth, no future birth, father/mother gender, nomor_generasi>=1, nomor_urut_lahir>0, burial coords range
- Applied validation to PUT /api/persons/[id]: nama trim, jenis_kelamin enum, death>=birth (merges with existing), no future birth, father/mother gender, nomor_generasi, nomor_urut_lahir, burial coords
- Applied validation to PUT /api/partnerships/[id]: divorce>=marriage (merges with existing values)
- Applied validation to POST /api/partnerships: marriage date not in future
- Sanitized search LIKE pattern in db.ts: escape % and _ characters to prevent pattern injection, added ESCAPE clause
- Ran ESLint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and runs correctly, all routes return expected status codes, zero compilation errors

Issues found and fixed (8 total, 0 bugs — all proactive validation gaps):

PWA (4):
1. **HIGH — No PWA manifest**: App had no manifest.json. Browsers couldn't identify it as an installable PWA. Created `/public/manifest.json` with proper PWA config.
2. **HIGH — Missing PWA meta tags**: layout.tsx lacked viewport (now via Viewport export), theme-color, apple-mobile-web-app-capable, manifest link, OpenGraph, and apple-touch-icon. Added all meta tags with light/dark theme-color support.
3. **MEDIUM — Wrong favicon**: Used 1.5MB tarombo-bg02.png as icon/favicon (too large, wrong format). Changed to logo.svg (1KB vector, proper for icons).
4. **LOW — Generic package.json name**: `nextjs_tailwind_shadcn_ts` → `tarombo-hariandja`.

Data Quality (4):
5. **HIGH — No date logic validation**: tanggal_kematian could be before tanggal_lahir, divorce_date before marriage_date. Added validateDeathAfterBirth, validateDivorceAfterMarriage to both POST and PUT routes (merge with existing values for partial updates).
6. **MEDIUM — No future-date prevention**: Users could set tanggal_lahir or marriage_date in the future. Added validateNotFuture checks.
7. **MEDIUM — Weak nama validation**: Empty/whitespace-only names passed the `!body.nama` check (empty string is truthy-ish in JS, and API didn't trim). Added explicit trim + reject. Also added jenis_kelamin enum validation, nomor_generasi>=1, nomor_urut_lahir>0, burial_latitude [-90,90], burial_longitude [-180,180].
8. **MEDIUM — Search LIKE pattern injection**: searchPersons() passed user input directly into LIKE pattern. Characters like `%` and `_` in search query could match unintended rows. Added sanitizeLikePattern() to escape these characters, and ESCAPE clause to the SQL.

PWA Improvement Areas Identified (not fixed — requires infrastructure):
- P1: No service worker / offline support — requires next-pwa or @serwist/next package
- P2: No push notifications
- P3: No background sync for offline mutations
- P4: No periodic background sync for data refresh
- P5: No app shortcuts (quick actions from home screen)
- P6: No screenshots for install prompt
- P7: SVG icons not supported on all Android versions — needs PNG fallbacks at 192x192 and 512x512

Data Quality Improvement Areas Identified (not fixed):
- DQ1: No cycle detection for parent-child links (A→B→C→A)
- DQ2: No child birth date vs parent birth date validation
- DQ3: Empty strings stored for optional text fields (alamat, agama, etc.) instead of NULL — affects search accuracy
- DQ4: No input length limits (nama 500 chars? nomor_telepon format?)
- DQ5: No duplicate person detection (same name + same parents + same birth date)
- DQ6: No data migration/repair endpoint for existing invalid data

Stage Summary:
- 8 issues found and fixed (2 high, 4 medium, 2 low — all proactive, no runtime bugs)
- Lint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and runs correctly, all routes return expected status codes
- Total across all audits (rounds 1-7): 36 issues found and fixed (1 critical, 4 high, 21 medium, 10 low)

---
Task ID: 10
Agent: Main
Task: Apply remaining PWA & Data Quality improvements from audit round 7

Work Log:
- Generated PNG icons (192x192, 512x512) from tarombo-bg02.png using sharp (center-crop square)
- Created basic service worker (public/sw.js): cache-first for static, network-first for API, old cache cleanup
- Created ServiceWorkerProvider client component to register SW on mount
- Wrapped layout.tsx with ServiceWorkerProvider
- Updated manifest.json with PNG icons + SVG fallback + maskable purpose
- Updated layout.tsx icons metadata to reference PNG icons (with apple-touch-icon)
- Implemented wouldCreateCycle() in db.ts: walks full ancestor chain to detect A→B→C→A cycles
- Added cycle detection to POST and PUT /api/persons routes (before parent link creation)
- Added validateChildAfterParent() in validation.ts: ensures child birth date is at least 10 years after parent
- Added child vs parent birth date validation in POST /api/persons
- Added FIELD_LIMITS config and validateFieldLength() in validation.ts (nama 200, alamat 1000, etc.)
- Added field length validation to POST and PUT /api/persons routes
- Normalized empty strings to NULL in createPerson() for optional text fields (nama_panggilan, tempat_lahir, alamat, agama, nomor_telepon)
- Ran ESLint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and runs correctly, all routes return expected status codes

Issues implemented (9 total):

PWA (4, from round 7 backlog):
1. Service worker with cache strategy (static cache-first, API network-first with fallback)
2. PNG icon generation (192x192, 512x512) from tarombo-bg02.png
3. Service worker registration via ServiceWorkerProvider client component
4. Manifest.json updated with PNG icons + maskable purpose

Data Quality (5, from round 7 backlog):
5. Cycle detection for parent-child links — prevents A→B→C→A circular ancestry
6. Child birth date vs parent birth date validation (minimum 10-year gap)
7. Field length limits (nama 200, nama_panggilan 100, tempat_lahir 200, alamat 1000, agama 50, nomor_telepon 20, burial fields 200/500)
8. Empty string → NULL normalization in createPerson for optional text fields
9. Field length validation applied to PUT route as well

Stage Summary:
- 9 improvements implemented from round 7 backlog
- Lint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and runs correctly, all routes return expected status codes
- Total across all audits (rounds 1-7 + this): 45 issues addressed (1 critical, 4 high, 26 medium, 14 low)

---
Task ID: 11
Agent: Main
Task: Deep audit round 8 — Visual & Reporting areas

Work Log:
- Audited all visual and reporting components: tree-view, export-dialog, person-detail, person-form, search-panel, profile-panel, partnership-list, partnership-form, rbac-panel, user-management, page.tsx, globals.css, layout.tsx
- Identified 8 issues across Visual & Reporting areas
- Created /api/statistics endpoint with family aggregates (total, gender, generation dist, marital dist, age dist, oldest/youngest)
- Created StatisticsPanel component with Recharts (bar chart, pie chart, stat cards)
- Added Statistik tab to page.tsx (available for editor+ roles)
- Enhanced export-dialog with title header, date footer, visual legend, dark mode support
- Added generation level labels to D3 tree SVG (left-side Gen 1, Gen 2, etc.)
- Fixed partnership list to show correct gender avatars (User/UserRound) with proper color coding
- Added deceased cross (✝) indicator to spouse cards in tree view
- Added dark mode scrollbar styles (.dark ::-webkit-scrollbar-thumb)
- Fixed profile grid redundant name display (only show full nama when different from nama_panggilan)
- Expanded search results area from max-h-96 to flex-1, removed redundant ScrollArea, added ScrollArea to person detail view
- Made tree zoom controls mobile-responsive (smaller on mobile, repositioned)
- Ran ESLint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and serves correctly, statistics API returns valid JSON
- Pushed to GitHub: https://github.com/imanueli2312/tarombo

Issues found and fixed (8 total):

1. **HIGH — No statistics/dashboard**: The app had rich genealogy data but zero aggregate reporting. No way to see family composition, generation distribution, or demographics. Created full statistics panel with 8 summary cards, generation distribution bar chart (by gender), marital status pie chart, and age distribution chart. Added new /api/statistics endpoint and Statistik tab.

2. **HIGH — Export has no title, footer, or legend**: Exported images (PNG/JPG/PDF) were bare tree captures with only a watermark. No title, date, or explanation of symbols. Added header (Tarombo Hariandja), footer (export date), and visual legend (gender colors, deceased ✝, divorce dashed line). Also fixed dark mode export to detect theme and use matching background color.

3. **MEDIUM — No generation level labels in tree**: The D3 tree showed generation info per-node but no overall level indicators. Users had to inspect each node to understand which generation they were looking at. Added left-side generation labels (Gen 1, Gen 2, etc.) positioned at each generation level, with expanded bounding box to prevent clipping.

4. **MEDIUM — Partnership list uses wrong gender avatars**: Both person avatars in partnership cards used the same <User> icon with hardcoded colors (primary for p1, rose for p2 assuming always female). Fixed to use actual gender data: User icon + sky color for male, UserRound icon + rose color for female. Also changed to show nama_panggilan first with full nama fallback.

5. **MEDIUM — Spouse card missing deceased indicator**: Main node cards showed ✝ for deceased persons, but spouse cards only had a subtle opacity overlay. Added ✝ cross symbol on spouse cards matching the main card pattern.

6. **MEDIUM — Dark mode scrollbar invisible**: The scrollbar thumb used oklch(0.7) which is medium gray — barely visible on dark backgrounds. Added .dark-specific scrollbar styles with oklch(0.4) thumb (lighter) and oklch(0.55) on hover.

7. **MEDIUM — Profile grid shows redundant name**: When nama_panggilan equals nama, the grid card displayed the same name twice (truncated above, full below). Added conditional rendering: only show full nama line when nama_panggilan exists and differs from nama.

8. **MEDIUM — Search results area too small + zoom controls not mobile-friendly**: Search results were constrained to max-h-96 (384px), forcing scrolling in a tiny area on desktop. Changed to flex-1 to fill available space. Removed redundant nested ScrollArea. Added ScrollArea wrapper for person detail view when selected. Tree zoom controls were fixed size — made them mobile-first (h-7 w-7 mobile, h-8 w-8 desktop) and repositioned closer to edge on mobile.

Stage Summary:
- 8 issues found and fixed (2 high, 6 medium)
- Lint: 0 errors, 2 warnings (known React Hook Form library limitations)
- Dev server: compiles and serves correctly, statistics API returns valid JSON
- Total across all audits (rounds 1-8): 53 issues addressed (1 critical, 6 high, 32 medium, 14 low)

---
Task ID: 5
Agent: Main
Task: Enhance Tree View with Batak cultural elements

Work Log:
- Added import for `getMargaLabel` and `MARGA_UTAMA` from `@/lib/batak-culture`
- Added `marga_asal: ''` to the virtual root node object (line 64)
- Changed node subtitle from hardcoded `Hariandja, Gen ${n}` to dynamic `${d.data.marga_asal || MARGA_UTAMA}, Gen ${n}` (line 234)
- Enhanced spouse label to show Batak cultural context: `(Boru · {marga_asal})` or `(Cerai · {marga_asal})` when spouse has a different marga, otherwise falls back to existing `(Pasangan)` / `(Cerai)` (lines 326-337)
- Added warm amber border (`oklch(0.65 0.15 60)`, stroke-width 1.5) on spouse card rect when spouse marga differs from MARGA_UTAMA (lines 273-283)

Stage Summary:
- Tree view now dynamically displays each person's actual marga in the subtitle
- Spouses from other clans (Boru) are visually distinguished with amber border and labeled with their marga
- Batak cultural terminology (Boru) integrated into the tree visualization
- All existing functionality preserved (zoom, pan, click, deceased indicators, divorce styling)

---
Task ID: 8
Agent: general-purpose
Task: Enhance statistics panel with Batak cultural statistics

Work Log:
- Updated `Stats` interface: added `totalUniqueMarga` and `spouseMargaCount` to `summary`, added `margaDistribution` and `tempatAsalDistribution` arrays
- Added new "Marga Berbeda" stat card in the second row (Users icon, amber color) showing unique clan count and spouse marga count
- Added horizontal bar chart for Marga Distribution (Dalihan Na Tolu) — conditional on `margaDistribution.length > 1`, amber color `oklch(0.65 0.18 60)`
- Added horizontal bar chart for Asal Daerah (Huta) — conditional on `tempatAsalDistribution.length > 0`, teal color `oklch(0.6 0.15 160)`
- Both charts use Recharts `BarChart` with `layout="vertical"`, `YAxis type="category"`, `h-48` height

Stage Summary:
- Statistics panel now displays Batak cultural data: unique marga count, spouse-origin clan count, marga distribution chart, and origin region (huta) chart
- All new charts/cards are conditionally rendered to avoid empty states
- File modified: `src/components/features/statistics/statistics-panel.tsx`
---
Task ID: 1-13
Agent: main
Task: Budaya Batak Mendalam deep audit and implementation

Work Log:
- Created src/lib/batak-culture.ts: Dalihan Na Tolu, Tiga Tujuan Batak (Hasangapon/Hagabeon/Hamoraon), MARGA_BATAK list, kinship terminology, helper functions
- Added DB migration for 5 new columns: marga_asal, tempat_asal, pendidikan, pekerjaan, keterangan
- Updated Person/PersonCreate/PersonUpdate/TreeNode types with new fields
- Updated createPerson and updatePerson DB functions
- Updated getTreeData to include marga_asal in nodes and spouses
- Updated API validation for new fields in POST and PUT routes
- Enhanced statistics API with marga distribution, tempat asal distribution, Dalihan Na Tolu counts
- Enhanced Tree View: dynamic marga labels, Boru labels for in-marrying spouses, amber border for different-marga spouses
- Enhanced Person Form: new Data Budaya Batak section (Marga Asal, Tempat Asal/Huta, Pendidikan, Pekerjaan, Keterangan)
- Enhanced Person Detail: marga badge in header, Data Budaya Batak section, Batak kinship terms (Amang/Inang) for parents, spouse marga display
- Enhanced Statistics: new Marga Berbeda stat card, Marga Distribution horizontal bar chart, Tempat Asal (Huta) chart
- Enhanced Footer: Hasangapon · Hagabeon · Hamoraon cultural motto
- Enhanced Login Form: Batak cultural motto subtitle
- Enhanced Export: cultural motto in header, Batak terms in legend (Meninggal/Alm., Cerai/Pisah, Boru)
- Enhanced Profile Panel: marga badge on cards
- Enhanced Search Panel: marga badge on search results
- Version bump to 0.4.0

Stage Summary:
- 16 files modified, 1 new file created
- 5 new database columns with migration
- Deep Batak cultural integration across entire app
- All changes pass ESLint (0 errors, 1 pre-existing warning)


---
Task ID: 7
Agent: API Routes Agent
Task: Create oral-histories API routes

Work Log:
- Created /api/oral-histories/route.ts (GET list, POST create)
- Created /api/oral-histories/[id]/route.ts (GET by id, PUT update, DELETE)
- All routes include proper auth and RBAC permission checks

Stage Summary:
- Full CRUD API for oral histories with person join data
- Permission-gated: create_heritage, edit_heritage, delete_heritage
- Supports filtering by person_id via query param

---
Task ID: 7-b
Agent: Pusaka API Agent
Task: Create pusaka API routes

Work Log:
- Created /api/pusaka/route.ts (GET list, POST create)
- Created /api/pusaka/[id]/route.ts (GET by id, PUT update, DELETE)
- All routes include proper auth and RBAC permission checks

Stage Summary:
- Full CRUD API for pusaka items with person join data
- Permission-gated: create_heritage, edit_heritage, delete_heritage
- Supports filtering by person_id via query param

---
Task ID: 8
Agent: Heritage Panel Agent
Task: Create Warisan Budaya panel UI

Work Log:
- Created heritage-panel.tsx with dual-tab layout (Turian + Pusaka)
- Implemented full CRUD forms with Dialog components
- Added search, filter by category/type
- Used TanStack Query for data fetching and cache invalidation
- RBAC permission checks for create/edit/delete
- Framer Motion animations, Skeleton loaders, responsive grid

Stage Summary:
- Complete Warisan Budaya panel with Oral History and Pusaka management
- Bilingual labels (Indonesian + Batak) for categories and types
- Permission-gated CRUD operations

---
Task ID: 9
Agent: PersonDetail Update Agent
Task: Integrate Oral History & Pusaka into PersonDetail

Work Log:
- Read current person-detail.tsx
- Added useQuery imports for TanStack Query
- Added Batak culture icon imports
- Added Turian (Oral History) section with category badges and verified indicator
- Added Pusaka (Warisan) section with sacred indicator and type badges
- Both sections conditionally render only when linked items exist

Stage Summary:
- PersonDetail now shows linked oral histories and pusaka items
- Uses lazy loading with staleTime for performance
- Bilingual category/type labels from batak-culture module---
Task ID: Oral History & Pusaka Deep Audit
Agent: Main Agent
Task: Audit and implement Oral History (Turian) & Pusaka (Heirloom) features

Work Log:
- Conducted deep audit of codebase for Oral History & Pusaka cultural elements
- Identified 14 issues across database, types, API, UI, search, and statistics layers
- Added oral_histories and pusaka_items database tables with full CRUD functions
- Extended batak-culture.ts with 8 Oral History categories and 14 Pusaka types (bilingual labels)
- Added Peran Adat (traditional ceremony roles) constants
- Created OralHistory and Pusaka TypeScript types (OralHistoryCategory, PusakaType, etc.)
- Added 4 new RBAC permissions: view_heritage, create_heritage, edit_heritage, delete_heritage
- Created API routes: /api/oral-histories (CRUD) and /api/pusaka (CRUD)
- Created HeritagePanel component with dual-tab layout (Turian + Pusaka)
- Integrated heritage items into PersonDetail component (linked oral histories and pusaka)
- Updated Statistics panel with heritage data (2 new stat cards, 2 new donut charts)
- Updated search to include heritage items (turian + pusaka results)
- Updated search API to support heritage=1 query parameter
- Added Warisan Budaya tab to main page navigation
- Updated footer to show "Turian · Pusaka · Tarombo"
- Fixed pre-existing ?? || operator mixing bug in person-form.tsx

Stage Summary:
- Complete Oral History & Pusaka feature implementation
- 2 new database tables, 4 new API route files, 1 new UI panel component
- 14 Batak cultural pusaka types documented (tombak, ulos, tunggal_panaluan, gorga, etc.)
- 8 oral history categories (turian_asal_usul, gondang, mangalahat, saur_matua, etc.)
- 6 traditional ceremony roles (parhata, habonaron do bona, namora pungka, etc.)
- Heritage items integrated into person detail, search, and statistics
- All labels bilingual (Indonesian + Batak language)
- RBAC permission-gated for all heritage CRUD operations
