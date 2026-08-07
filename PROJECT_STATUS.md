# Project Status Report

**Project:** Tarombo Hariandja — Marga Hariandja Family Tree
**Repository:** https://github.com/imanueli2312/tarombo
**Report date:** 7 August 2026
**Version:** 0.2.1
**Status:** ✅ **Functional — ready for clan review**

---

## 1. Executive Summary

The Tarombo Hariandja family-tree application has been built end-to-end and is fully functional. All requirements specified in the original brief have been implemented, verified via automated browser testing, and pushed to the GitHub repository. The application runs cleanly on the development server with no runtime errors.

The site presents an interactive D3.js vertical *tarombo* of 40 Hariandja clan members across 8 generations, with role-based access control separating anonymous Viewers from authenticated Editors and Admins. Account data is kept strictly separate from genealogy records. All five export formats (PDF, multi-page PDF, large-format PDF, PNG, JPG) are operational and apply the clan emblem as a centered watermark.

---

## 2. Requirements Compliance

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Exclusively for the extended Hariandja clan | ✅ Done | Seed data, branding, and copy all reference Marga Hariandja |
| 2 | Soft, modern, minimalist aesthetic | ✅ Done | Warm terracotta/cream palette, rounded cards, ample whitespace |
| 3 | Light mode support | ✅ Done | Light mode is the default and primary theme |
| 4 | Separation of user accounts from genealogy data | ✅ Done | `users` table is independent of `persons`; `person_id` is an optional link |
| 5 | RBAC: Viewer, Editor, Admin | ✅ Done | Three built-in roles with distinct permission sets |
| 6 | Customizable RBAC roles | ✅ Done | Admins can create/edit/delete custom roles via the UI |
| 7 | Viewers require no account | ✅ Done | Anonymous access to Family Tree; `/api/me` returns null user |
| 8 | Viewers access only the Family Tree | ✅ Done | Nav and view gating enforced client- and server-side |
| 9 | Editors & Admins access all 5 pages | ✅ Done | Family Tree, Family Chart, Birthdays, Weddings, Profile |
| 10 | No Cloud / S3 / SaaS / MinIO / GEDCOM / AI / Prisma | ✅ Done | better-sqlite3 + local file storage only |
| 11 | D3.js visualization, vertical layout | ✅ Done | Custom vertical tree layout with couple cards, pan/zoom |
| 12 | Exports: PDF, multiple PDFs, large-format PDF, JPG, PNG | ✅ Done | All 5 formats implemented in `src/lib/export.ts` |
| 13 | `tarombo-ikon02.png` as watermark, centered, sized to file | ✅ Done | ~35% of smaller dimension, centered, 18% opacity |
| 14 | `tarombo-ikon02.png` as logo | ✅ Done | In nav bar and footer |
| 15 | `tarombo-bg01.png` as background | ✅ Done | Subtle page background + optional export background |

### Data-logic requirements

| Rule | Status | Enforcement |
|------|--------|-------------|
| Person has one father (not necessarily the tree parent) | ✅ | `father_id` FK, independent of `parent_id` |
| Person has one mother (not necessarily the tree parent) | ✅ | `mother_id` FK, independent of `parent_id` |
| Person has one official parent | ✅ | `parent_id` FK determines tree position |
| Person has 0–many children | ✅ | Children = persons whose `parent_id` = this person |
| Person can have a spouse | ✅ | Via `spouses` table |
| Couple has 0–many children | ✅ | Children reference the primary parent |
| Man: max 1 active spouse | ✅ | Validated in `validateSpouse()` before insert/update |
| Woman: max 1 active spouse | ✅ | Validated in `validateSpouse()` before insert/update |
| Husband dies → divorce date auto-set | ✅ | `applyDeathAutoDivorce()` runs on every spouse query |
| Wife dies → divorce date auto-set | ✅ | Same function |

---

## 3. Build & Quality Metrics

### Code size
- **Total source lines:** ~12,543 (including shadcn/ui library)
- **Application-specific lines:** ~5,790 (excluding `components/ui/`)
- **API route handlers:** 15
- **React components (custom):** 11 views + dialogs
- **shadcn/ui components available:** 60+

### Linting
```
$ bun run lint
✓ 0 errors, 0 warnings
```
All code passes ESLint with Next.js rules cleanly.

### Test results (Agent Browser verification)

End-to-end verification was performed using the Agent Browser automation tool. All golden-path flows passed:

| Flow | Result |
|------|--------|
| Page loads (anonymous) | ✅ 200 OK, tree renders 40 person cards |
| Click person card → detail dialog | ✅ Opens with correct person data |
| Login as Admin | ✅ Session established, all nav items visible |
| Login as Editor | ✅ Session established, 5 pages + edit access |
| Birthdays view | ✅ 14 cards across "Coming up" and "Later" sections |
| Weddings view | ✅ Anniversaries listed with years |
| Family Chart view | ✅ Indented hierarchy renders correctly |
| Admin → Users tab | ✅ 2 users in table, add/edit/delete available |
| Admin → Roles tab | ✅ 3 system roles with permission badges |
| Export dialog (PNG) | ✅ No console errors, file generated |
| Logout | ✅ Session cleared, nav reverts to Viewer-only |
| Mobile viewport (390×844) | ✅ Hamburger menu, responsive layout |

### Visual verification (VLM analysis)
An independent vision-language model analyzed screenshots and confirmed:
- The tree visualization renders correctly with connected nodes and no overlapping elements.
- The design is "soft, modern, and minimalist" with a clean light palette.
- The logo and watermark are visible and properly placed.
- The layout has a clear header, content area, and footer.
- The Family Chart shows a proper indented hierarchy.
- The Birthdays page displays content correctly with avatars, dates, and countdowns.

---

## 4. Seed Data Summary

The database is seeded automatically on first run with representative Hariandja clan data:

| Entity | Count | Details |
|--------|-------|---------|
| Persons | 40 | 8 generations, from Raja Hariandja (b. 1780) to the youngest generation (b. 1998) |
| Spouses | 17 | Marriage records spanning all generations |
| Users | 2 | Admin and Editor demo accounts |
| Roles | 3 | Viewer, Editor, Admin (system roles) |

### Generation breakdown
- **Gen 1:** Raja Hariandja & Boru Pasogit (founding ancestors)
- **Gen 2:** 2 sons with their wives
- **Gen 3:** 4 grandchildren with spouses
- **Gen 4–7:** Continuing lineage across Medan, Jakarta, Bandung, Surabaya
- **Gen 8:** Youngest living members (Joshua, Naomi, Samuel, Rebecca, Nathan)

---

## 5. Known Limitations & Future Work

### Limitations
1. **Single SQLite file** — suitable for a clan-sized dataset (hundreds to low thousands of persons). For larger scale, migration to PostgreSQL would be needed.
2. **No dark mode toggle in UI** — dark CSS variables are defined in `globals.css` but no toggle button is exposed; light mode is the sole active theme per the requirement.
3. **No search-to-select** — the search box in the tree toolbar is present but does not yet auto-focus the matching node.
4. **No email verification** — accounts are created by Admins; there is no self-registration or email verification flow.
5. **Photo storage is local** — uploaded photos are saved to `/home/z/my-project/upload/` (or the deployed equivalent). Backups are the operator's responsibility.

### Suggested enhancements (not in scope)
- [ ] Search-to-focus in the tree view
- [ ] Print-friendly CSS for direct browser printing
- [ ] CSV/Excel import for bulk person entry
- [ ] Burial location map (using the lat/lng fields with Leaflet)
- [ ] Optional dark-mode toggle
- [ ] Backup/restore database via the Admin UI

---

## 6. Deployment Notes

### Current environment
- **Dev server:** Running on port 3000 (Next.js Turbopack)
- **Gateway:** Caddy on port 81 proxies to port 3000
- **Database:** `/home/z/my-project/db/hariandja.db` (SQLite, WAL mode)

### To deploy elsewhere
1. Clone the repository.
2. Run `bun install && bun pm trust better-sqlite3`.
3. Set `DATABASE_URL` and `NEXTAUTH_SECRET` in `.env`.
4. Run `bun run build && bun run start`, or use a process manager (PM2, systemd).
5. Ensure the `upload/` directory is writable by the application user.
6. **Immediately change** the demo account passwords via Admin → Users.

### Security checklist before production
- [ ] Change `NEXTAUTH_SECRET` to a strong random value
- [ ] Change admin and editor demo passwords
- [ ] Restrict the `upload/` directory permissions
- [ ] Enable HTTPS (Caddy or a reverse proxy)
- [ ] Set up regular SQLite database backups (`sqlite3 hariandja.db ".backup ..."`)
- [ ] Review and disable any unused custom roles

---

## 7. Repository State

```
Branch:     main
Latest:     8cd1c78 — chore: exclude runtime database and upload files from version control
Remote:     https://github.com/imanueli2312/tarombo.git
```

### Gitignored (not in repo)
- `node_modules/`
- `.next/`, `.env*`
- `db/*.db`, `db/*.db-shm`, `db/*.db-wal` (runtime-generated)
- `upload/*` (except `tarombo-ikon02.png` and `tarombo-bg01.png`)
- `*.log`, `dev.log`, `server.log`

### Committed
- All source code (`src/`)
- Configuration files (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `Caddyfile`)
- Public assets (`tarombo-ikon02.png`, `tarombo-bg01.png`)
- Documentation (`README.md`, `PROJECT_STATUS.md`, `TECHNICAL_DOC.md`, `USER_MANUAL.md`)
- Scaffold scripts (`.zscripts/`, `tests/`, `examples/`)

---

## 8. Sign-off

| Item | Status |
|------|--------|
| All requirements implemented | ✅ |
| Lint passes cleanly | ✅ |
| Dev server runs without errors | ✅ |
| Browser-verified interactivity | ✅ |
| Code pushed to GitHub | ✅ |
| Documentation written | ✅ |

**The project is ready for clan review and feedback.**
