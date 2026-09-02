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
