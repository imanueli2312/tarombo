# syntax=docker/dockerfile:1

###############################################################################
# Tarombo — Dockerfile produksi (multi-stage)
#
# Stage 1 (deps)    : install dependensi dengan layer cache terpisah (bun)
# Stage 2 (builder) : build Next.js standalone (bun — sama seperti dev)
# Stage 3 (runner)  : image produksi ringan berbasis Node LTS, non-root,
#                     dengan healthcheck /api/health
#
# Build : docker build -t tarombo .
# Run   : docker run -p 3000:3000 -e JWT_SECRET=<...> -e SEED_ADMIN_PASSWORD=<...> \
#           -v tarombo-data:/data tarombo
#
# Kenapa build=bun, runtime=Node?
# - `bun install` cepat & teruji untuk dependensi (termasuk prebuilt
#   better-sqlite3/sharp untuk linux-x64).
# - `node server.js` adalah runtime kanonik untuk output standalone Next.js
#   (kompatibilitas sinyal/graceful-shutdown paling stabil lintas kernel).
# - Native module (better-sqlite3, sharp) memakai Node-API — prebuilt yang
#   diinstal bun tetap valid di Node runtime.
###############################################################################

# --- Tahap 1: dependencies ---------------------------------------------------
FROM oven/bun:1-slim AS deps
WORKDIR /app

# Layer cache: dependensi hanya di-install ulang jika manifest berubah
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Tahap 2: build ----------------------------------------------------------
FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* di-inline ke bundle klien SAAT BUILD (bukan runtime).
# Override dengan: --build-arg NEXT_PUBLIC_MARGA_UTAMA=<NamaMarga>
ARG NEXT_PUBLIC_MARGA_UTAMA=Hariandja
ENV NEXT_PUBLIC_MARGA_UTAMA=${NEXT_PUBLIC_MARGA_UTAMA}

ENV NEXT_TELEMETRY_DISABLED=1
# Build tidak butuh env sensitif (JWT_SECRET dievaluasi lazy saat runtime)
RUN bun run build

# --- Tahap 3: runtime produksi ----------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    # Next standalone server membaca HOSTNAME untuk bind address
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    # Database SQLite disimpan di volume /data agar persisten antar deploy
    DATABASE_PATH=/data/tarombo.db

# Hasil build standalone (sudah berisi server.js, node_modules minimal,
# .next/static, dan public — disalin oleh skrip `bun run build`)
COPY --from=builder --chown=node:node /app/.next/standalone ./

# Skrip operasional (backup online SQLite) — dijalankan via:
#   docker compose exec app node scripts/backup-db.mjs /data/backups
COPY --from=builder --chown=node:node /app/scripts ./scripts

# Direktori data untuk SQLite (volume mount point)
RUN mkdir -p /data && chown -R node:node /data
VOLUME /data

# User non-root (image node menyediakan user 'node' UID 1000)
USER node

EXPOSE 3000

# Healthcheck memanggil /api/health — tanpa perlu curl/wget (fetch bawaan Node 18+)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"

# Signal handling langsung ke proses node (bukan lewat shell/tee)
CMD ["node", "server.js"]
