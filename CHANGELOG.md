# CHANGELOG — Tarombo

Format: [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), versi mengikuti
[SemVer](https://semver.org/lang/id/). Tanggal dalam WIB (UTC+7).

## [0.6.0] — 2026-09-04 — hasil audit mendalam 30 temuan (roadmap P0/P1/P2)

### Ditambahkan
- **Revocasi sesi** — `users.token_version` + klaim `tv` pada JWT: akun yang
  dihapus/diturunkan perannya/ganti password kehilangan akses SEKETIKA (bukan
  menunggu 7 hari); role selalu dibaca ulang dari DB di setiap permintaan.
- **Kerangka migrasi skema terversi** — `PRAGMA user_version` dengan langkah
  idempoten bernomor (menggantikan migrasi ad-hoc).
- **Validasi zod server-side** untuk semua endpoint tulis (`src/lib/schemas.ts`):
  enum, panjang seluruh field teks (termasuk `photo`, `content`, `description`,
  `origin` yang duluan tak berbatas), bentuk boolean/angka; field tak dikenal
  otomatis dibuang (anti mass-assignment).
- **Guard JSON + batas body 1 MB seragam** (`src/lib/http.ts`) — JSON malformed
  kini 400 (dulunya 500 di 9 handler), payload besar 413.
- **Verifikasi Origin/Referer** pada semua endpoint tulis — lapis kedua CSRF
  di atas SameSite=Lax.
- **Paginasi opsional** `?limit=&offset=` + header `X-Total-Count` pada
  persons, partnerships, oral-histories, pusaka, rbac/users (default 500 baris).
- **Observabilitas** (`src/lib/logger.ts`): log terstruktur JSON berlevel +
  request-id (`X-Request-ID`), metrik latensi/error per endpoint, endpoint
  `GET /api/metrics` (admin).
- **Pengujian** — `bun test`: unit (auth/revocasi, validasi, rate-limit,
  getClientIp, skema zod, adat-rules) + smoke API 401/403/400/413/429/200.
- **Meta repo**: LICENSE (MIT), CONTRIBUTING.md, SECURITY.md, .nvmrc,
  .editorconfig, CHANGELOG.md ini.
- Migrasi terversi; `POST /api/seed` tetap tersedia untuk bootstrap deploy.

### Diubah
- `getClientIp` membaca X-Real-IP dulu lalu entri TERAKHIRI XFF (entri pertama
  bisa dipalsukan klien); Caddyfile menimpa `X-Forwarded-For` dengan
  `{remote_host}` — rate-limit bypass via XFF spoof tertutup.
- Login kini berlapis: cap per-IP 30/15 menit (anti password spraying) di atas
  bucket per IP+email 5/15 menit.
- Service worker: navigasi network-first (dulunya cache-first), `CACHE_NAME`
  diinjeksi dari versi + git SHA oleh `scripts/gen-sw.mjs`, `cache.put` diikat
  `event.waitUntil`, header `Cache-Control: no-cache` untuk `/sw.js`, alur
  reload terkontrol saat SW baru aktif.
- Code-splitting: StatisticsPanel, TransferPanel, RBACPanel, UserManagement,
  MargaBookPanel dimuat via `next/dynamic`; `import * as d3` diganti
  d3-selection/hierarchy/zoom/shape/transition modular.
- TreeView: `React.memo` + `onNodeClick` stabil (useCallback) — Home
  re-render tidak lagi membangun ulang pohon; resize didebounce 150 ms;
  culling node di luar viewport pada pohon besar (rAF-throttled).
- `/api/health` tidak lagi membocorkan `error.message` DB (pesan generik).
- CSP: `unsafe-eval` hanya di development.
- `is_verified` turian hanya bisa disetel admin (dulunya bisa oleh editor).
- `person_id` pada POST/PUT turian & pusaka dicek eksistensinya (404 informatif,
  dulunya 500 FK violation).
- AuthProvider: tanpa cookie sesi → tanpa spinner (petunjuk cookie dari layout
  server); spinner penuh tidak lagi muncul di setiap reload anonim.
- engines: `node >= 22` + `bun >= 1.1.0` (runtime produksi Docker adalah Node 22).

### Dihapus
- 25 file `src/components/ui/` mati + `hooks/use-mobile.ts` + `examples/websocket`
  + `tailwind.config.ts` (Tailwind 4 memakai konfigurasi CSS di globals.css).
- 31 dependensi tak terpakai: 11 UNUSED (@dnd-kit/*, next-auth, next-intl,
  react-markdown, uuid, z-ai-web-dev-sdk, dll.) + 19 UI-ONLY-DEAD + 1 legacy.
- `POST /api/seed` dari page load klien — seeding adalah urusan deploy.

## [0.5.0] — 2026-09-03
### Ditambahkan
- Pembersihan 6 vulnerability npm audit (hapus @mdxeditor/editor &
  react-syntax-highlighter yang tak terpakai; sharp 0.35.4 + overrides).
- §5.5 DEPLOYMENT.md: troubleshooting `bun install` Windows native (gyp).

## [0.4.0] — 2026-09-02
### Ditambahkan
- Panduan deploy Windows 11 + VS Code (Opsi D), .gitattributes, ekstensi VS Code.
- Konfigurasi go-live produksi: Dockerfile multi-stage (node:22-slim),
  docker-compose + Caddy reverse proxy TLS otomatis, `/api/health`, backup
  online SQLite (`scripts/backup-db.mjs`) + prune, CI GitHub Actions
  (typecheck + lint + build), strict TypeScript.
- Buku Marga (direktori marga, ekspor HTML) & Transfer (GEDCOM/CSV/JSON
  ekspor-impor atomik, dry-run, transfer pusaka, transfer_log audit trail).
- Panduan Adat Batak + hardening auth/rate-limit/security headers (18 temuan).
- Oral History (Turian) & Pusaka: CRUD lengkap + validasi adat.

## [0.1.0] — 2026-08
### Ditambahkan
- Arsitektur ulang total: SQLite (better-sqlite3, WAL, FK, 14 indeks), RBAC
  3 peran + 21 permission granular, JWT httpOnly cookie, bcrypt 12,
  pohon keluarga D3 vertikal, tema gelap, ekspor PNG/PDF, PWA dasar.
