# Panduan Go-Live / Deployment Produksi

Panduan lengkap membawa Tarombo dari repositori ke produksi, termasuk
deployment Docker, reverse proxy TLS, backup terjadwal, dan checklist
sebelum (serta sesudah) go-live.

> **Prasyarat baca**: [README.md](../README.md) untuk gambaran aplikasi dan
> [BUKU_MARGA_TRANSFER.md](BUKU_MARGA_TRANSFER.md) untuk fitur transfer data.

---

## Daftar Isi

1. [Arsitektur Produksi](#1-arsitektur-produksi)
2. [Opsi A — Docker Compose (Direkomendasikan)](#2-opsi-a--docker-compose-direkomendasikan)
3. [Opsi B — Server/VPS Langsung](#3-opsi-b--servervps-langsung)
4. [Opsi C — Platform Serverless (Vercel dll.)](#4-opsi-c--platform-serverless-vercel-dll)
5. [Monitoring & Health Check](#5-monitoring--health-check)
6. [Backup & Restore Database](#6-backup--restore-database)
7. [Upgrade Aplikasi (Zero Data Loss)](#7-upgrade-aplikasi-zero-data-loss)
8. [Checklist Go-Live](#8-checklist-go-live)
9. [Sesudah Go-Live (Hari-1)](#9-sesudah-go-live-hari-1)
10. [Pemecahan Masalah](#10-pemecahan-masalah)

---

## 1. Arsitektur Produksi

```
        Internet
           │  :80/:443 (TLS otomatis)
           ▼
     ┌───────────┐
     │   Caddy   │  reverse proxy + sertifikat Let's Encrypt
     └─────┬─────┘
           │  internal :3000
           ▼
     ┌───────────┐         ┌──────────────┐
     │ Next.js   │ ──────► │  /data/      │ volume persisten
     │ (Node)    │  SQLite │ tarombo.db   │ (data keluarga!)
     └───────────┘         └──────────────┘
```

Karakteristik penting yang memengaruhi deployment:

| Karakteristik | Konsekuensi |
|---|---|
| SQLite via better-sqlite3 (file lokal) | **Single instance saja.** Jangan scale `app` > 1. Butuh volume persisten. |
| Rate limiter in-memory | Sama — satu proses. |
| `output: "standalone"` | Image runtime hanya butuh `.next/standalone` + `public` + `.next/static`. |
| `NEXT_PUBLIC_MARGA_UTAMA` | Di-inline **saat build** ke bundle klien — override via `--build-arg`, bukan env runtime. |
| `JWT_SECRET`, `SEED_ADMIN_PASSWORD` | Env **runtime** — aplikasi menolak jalan di produksi tanpa ini. |
| Cookie login `Secure`+`httpOnly` | **HTTPS wajib** (disediakan Caddy). |

---

## 2. Opsi A — Docker Compose (Direkomendasikan)

Satu server/VPS dengan Docker. Termasuk Caddy reverse proxy + TLS otomatis.

### Prasyarat

- VPS dengan RAM ≥ 1 GB, disk ≥ 10 GB (Ubuntu 22.04/Debian 12 disarankan)
- Docker Engine ≥ 24 + docker compose plugin
  ([cara install](https://docs.docker.com/engine/install/))
- Domain yang menunjuk (A record) ke IP VPS
- Port 80 & 443 terbuka di firewall

### Langkah

```bash
# 1. Clone repositori ke server
git clone https://github.com/imanueli2312/tarombo.git /opt/tarombo
cd /opt/tarombo

# 2. Siapkan environment (compose membaca file .env)
cp .env.example .env
nano .env
```

Isi minimal di `.env`:

```env
# WAJIB — generate: openssl rand -hex 32
JWT_SECRET=<64-karakter-hex-acak>
# WAJIB — password admin pertama (min 8 karakter, huruf+angka)
SEED_ADMIN_PASSWORD=<password-kuat>
# Opsional
SEED_ADMIN_EMAIL=admin@domainanda.com
```

```bash
# 3. Set domain Anda di reverse proxy
nano deploy/Caddyfile     # ganti "tarombo.example.com"

# 4. Jalankan (build pertama ± 2-5 menit)
docker compose up -d --build

# 5. Cek kesehatan
docker compose ps                  # STATUS harus "healthy"
curl -s http://localhost:3000/api/health | head -c 200

# 6. Buat admin pertama + leluhur akar (SEKALI saja)
docker compose exec app bash -c \
  'node -e "fetch(\"http://localhost:3000/api/seed\",{method:\"POST\"}).then(r=>r.json()).then(console.log)"'
```

Buka `https://domain-anda` → login sebagai admin → **segera ganti password**
(Panel Admin → Manajemen Pengguna).

### Perintah operasional harian

```bash
docker compose logs -f app          # lihat log aplikasi (tail)
docker compose logs -f caddy        # log proxy/TLS
docker compose restart app          # restart aplikasi (data aman, ada volume)
docker compose pull && docker compose up -d --build   # upgrade
docker compose down                 # stop (data tetap di volume app-data)
docker compose down -v              # ⚠️ HAPUS DATA — jangan dipakai di produksi!
```

---

## 3. Opsi B — Server/VPS Langsung

Tanpa Docker — build dengan bun, jalankan hasil standalone dengan **Node**
(runtime kanonik Next.js; bun juga bisa, tapi Node paling stabil lintas versi
kernel untuk signal handling & graceful shutdown).

### Prasyarat

- Node.js ≥ 20 **dan** bun ≥ 1.1 (Node untuk runtime, bun untuk install/build)
- Reverse proxy TLS pilihan: Caddy, Nginx, atau Traefik
- Direktori data terpisah dari aplikasi, mis. `/var/lib/tarombo`

### Langkah

```bash
# 1. Clone & install
git clone https://github.com/imanueli2312/tarombo.git /opt/tarombo
cd /opt/tarombo
bun install --frozen-lockfile

# 2. Environment produksi
cp .env.example /etc/tarombo.env
nano /etc/tarombo.env   # isi JWT_SECRET & SEED_ADMIN_PASSWORD

# 3. Build
bun run build

# 4. Direktori data persisten
sudo mkdir -p /var/lib/tarombo && sudo chown $USER /var/lib/tarombo

# 5. Jalankan
set -a; source /etc/tarombo.env; set +a
DATABASE_PATH=/var/lib/tarombo/tarombo.db NODE_ENV=production \
  node .next/standalone/server.js
```

### Systemd service (auto-start & restart)

Buat `/etc/systemd/system/tarombo.service`:

```ini
[Unit]
Description=Tarombo — Pohon Keluarga Digital
After=network.target

[Service]
Type=simple
User=tarombo
WorkingDirectory=/opt/tarombo
EnvironmentFile=/etc/tarombo.env
Environment=NODE_ENV=production
Environment=DATABASE_PATH=/var/lib/tarombo/tarombo.db
ExecStart=/usr/bin/node /opt/tarombo/.next/standalone/server.js
Restart=on-failure
RestartSec=5
# Hardening ringan
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/tarombo

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd -r -s /usr/sbin/nologin tarombo
sudo chown -R tarombo:tarombo /var/lib/tarombo
sudo systemctl daemon-reload
sudo systemctl enable --now tarombo
systemctl status tarombo
```

Lalu pasang reverse proxy TLS di depan `:3000` (contoh Caddyfile satu domain
tersedia di `deploy/Caddyfile` — bagian `reverse_proxy app:3000` tinggal
diganti `reverse_proxy localhost:3000`).

### Contoh Caddyfile minimal (non-Docker)

```
tarombo.example.com {
    encode zstd gzip
    reverse_proxy localhost:3000
}
```

---

## 4. Opsi C — Platform Serverless (Vercel dll.)

**Bisa, dengan catatan serius.** Aplikasi ini memakai SQLite file lokal:

- Vercel menyediakan filesystem **read-only & efemeral** (kecuali `/tmp`).
- Data keluarga **tidak akan persisten** antar cold start — hanya cocok untuk
  demo/staging, BUKAN produksi data nyata.
- Rate limiter in-memory tidak konsisten antar instance Lambda.

Jika tetap ingin deploy di Vercel (mis. untuk demo publik):

1. Import repositori ke Vercel (framework: Next.js, build default).
2. Set Environment Variables: `JWT_SECRET`, `SEED_ADMIN_PASSWORD`,
   `DATABASE_PATH=/tmp/tarombo.db`, `NEXT_PUBLIC_MARGA_UTAMA`.
3. Deploy. Data akan hilang saat instance di-recycle.

Untuk produksi data nyata, gunakan **Opsi A atau B**, atau refaktor
lapisan `src/lib/db.ts` ke database terkelola (PostgreSQL + driver async)
dengan antarmuka yang sama.

---

## 5. Monitoring & Health Check

### Endpoint `/api/health`

Endpoint publik ringan (tanpa autentikasi) untuk prober:

```json
{
  "status": "ok",
  "checks": { "database": { "ok": true, "latencyMs": 1 } },
  "uptimeSec": 3600,
  "version": "0.4.0",
  "timestamp": "2026-09-04T02:00:00.000Z"
}
```

- `status: "ok"` (HTTP 200) — aplikasi & database sehat.
- `status: "degraded"` (HTTP 503) — database tidak bisa diakses;
  load balancer sebaiknya memindahkan traffic.

### Integrasi uptime monitor

**UptimeRobot / Better Stack / Gatus**: pantau `https://domain-anda/api/health`
dengan interval 60 detit, trigger jika non-200 ≥ 2 kali beruntun.

**Docker**: healthcheck bawaan image memanggil `/api/health` setiap 30 detik —
`docker compose ps` menampilkan `healthy`/`unhealthy`.

**Cron sederhana di server:**

```cron
*/5 * * * * curl -fsS -m 10 https://domain-anda/api/health >/dev/null || echo "TAROMBO DOWN $(date)" >> /var/log/tarombo-alert.log
```

### Log

Semua log ke stdout (Docker `json-file` dengan rotasi 10 MB × 3 sudah
dikonfigurasi di `docker-compose.yml`). Event penting yang tercatat:
login gagal (rate limited), impor transfer, error internal (stack ke log
saja — klien hanya pesan generik).

---

## 6. Backup & Restore Database

### Backup manual / terjadwal

Skrip `scripts/backup-db.mjs` memakai **online backup** SQLite — aman
dijalankan saat aplikasi sedang melayani penulisan (mode WAL):

```bash
# Manual (di host dengan Docker)
docker compose exec app node scripts/backup-db.mjs /data/backups
# …atau dari luar, menyalin volume:
docker compose cp app:/data/backups ./backups

# Terjadwal (cron di host) — backup harian 02:00, gzip, simpan 30 hari
0 2 * * * cd /opt/tarombo && docker compose exec -T app \
  env BACKUP_GZIP=1 BACKUP_KEEP_DAYS=30 node scripts/backup-db.mjs /data/backups \
  >> /var/log/tarombo-backup.log 2>&1
```

> Volume `app-data` memuat `backups/` juga — backup ikut hilang bila volume
> dihapus. **Salin secara berkala ke lokasi off-site** (S3/rsync/rsync.net):
> ```bash
> docker compose cp app:/data/backups /nas/tarombo/$(date +%F)/
> ```

### Restore

```bash
# 1. Stop aplikasi (agar tidak menulis saat restore)
docker compose stop app

# 2. Salin backup ke volume (via container sementara)
docker compose run --rm --entrypoint "" app \
  cp /backup/tarombo-backup-2026-09-04T02-00-00.db /data/tarombo.db
#   (mount file backup: -v $(pwd)/backups:/backup)

# 3. Start & verifikasi
docker compose start app
curl -s https://domain-anda/api/health
```

### Strategi minimal yang disarankan

| Item | Nilai |
|---|---|
| Frekuensi backup | Harian (02:00) |
| Retensi on-server | 30 hari (gzip) |
| Retensi off-site | 12 bulan (kuartalan + harian 30 hari) |
| Uji restore | Setiap 3 bulan — backup yang tidak pernah diuji = bukan backup |

---

## 7. Upgrade Aplikasi (Zero Data Loss)

Data keluarga hidup di volume `app-data`, terpisah dari image — upgrade
hanya mengganti kode:

```bash
cd /opt/tarombo

# 1. (Disarankan) Backup dulu
docker compose exec app node scripts/backup-db.mjs /data/backups

# 2. Ambil kode baru
git pull origin main

# 3. Rebuild & restart (downtime ± 10-30 detik)
docker compose up -d --build

# 4. Verifikasi
docker compose ps
curl -s https://domain-anda/api/health
```

Migrasi skema berjalan otomatis saat aplikasi start (`runMigrations` di
`src/lib/db.ts` — idempotent, additive, tidak menimpa penyesuaian admin).

Untuk zero-downtime sejati (blue/green) — tidak diperlukan untuk skala
keluarga; cukup jendela maintenance singkat.

---

## 8. Checklist Go-Live

Tandai semua sebelum membuka akses publik:

### Konfigurasi & Keamanan
- [ ] `JWT_SECRET` di-generate acak (`openssl rand -hex 32`) — **bukan** password mudah ditebak
- [ ] `SEED_ADMIN_PASSWORD` kuat & unik (min 8, huruf+angka)
- [ ] `.env` **tidak** ter-commit ke git (sudah di-`.gitignore`; verifikasi: `git ls-files | grep -i env` hanya boleh menampilkan `.env.example`)
- [ ] Domain + TLS aktif (padlock hijau; `curl -sI https://domain | grep -i strict`)
- [ ] Security headers terkirim (CSP, HSTS, X-Frame-Options: DENY)
- [ ] Rate limit login aktif (uji: 6× login salah → HTTP 429)

### Data & Fungsional
- [ ] Seeding awal dijalankan sekali (admin + Raja Hariandja)
- [ ] Password admin diganti dari nilai seed
- [ ] Pohon keluarga, Buku Marga, Transfer data (impor/ekspor) — smoke test
- [ ] Cookie login bertanda `Secure` (cek di DevTools → Application)

### Infrastruktur
- [ ] `docker compose ps` → semua service `healthy`/`running`
- [ ] `/api/health` memantau 200 dari uptime monitor eksternal
- [ ] Cron backup harian terpasang & file backup benar-benar muncul
- [ ] Backup disalin ke lokasi off-site
- [ ] Disk space cukup (log terbatas 10 MB × 3; DB tumbuh < 100 KB/anggota)
- [ ] Akses SSH server di-hardening (key-only, fail2ban) — di luar cakupan repo ini

### Opsional tapi disarankan
- [ ] Uji restore dari backup (sekali sebelum go-live!)
- [ ] Monitoring error aplikasi (mis. Sentry self-hosted / GlitchTip)
- [ ] Membatasi `/api/seed` — rate limit bawaan 10/jam/IP sudah ada

---

## 9. Sesudah Go-Live (Hari-1)

1. **Ganti password admin** segera setelah login pertama.
2. **Buat akun per-peran** untuk anggota keluarga (viewer/editor) — jangan
   bagikan akun admin.
3. **Buka RBAC panel** dan sesuaikan izin default per peran bila perlu.
4. **Uji ekspor penuh** (Transfer data → Ekspor JSON) dan simpan salinannya
   di tempat aman — ini backup data awal Anda.
5. **Pantau log 24 jam pertama**: `docker compose logs -f app | grep -iE "error|warn"`.

---

## 10. Pemecahan Masalah

| Gejala | Kemungkinan & Solusi |
|---|---|
| Container `unhealthy` | `docker compose logs app` — biasanya DB tidak bisa dibuka; cek volume `app-data` ter-mount & permission user `node` (UID 1000). |
| Aplikasi exit dengan "JWT_SECRET wajib diset" | `.env` belum terbaca oleh compose; pastikan file bernama persis `.env` di direktori compose, lalu `docker compose up -d`. |
| Login gagal terus (401) | Cookie `Secure` butuh HTTPS — akses via `https://domain`, bukan IP:port. Verifikasi TLS aktif di Caddy. |
| Sertifikat TLS tidak terbit | DNS domain belum menunjuk ke server, atau port 80/443 diblokir firewall. Cek `docker compose logs caddy`. |
| `429 Terlalu banyak permintaan` setelah deploy | Rate limiter in-memory ter-reset saat restart — cukup tunggu 15 menit atau restart ulang. |
| Impor transfer ditolak (5 MB / 10.000 entitas) | Batas by design; pecah file atau lakukan dry-run untuk melihat laporan validasi. |
| Database terlihat "hilang" setelah `down` | `docker compose down` tidak menghapus volume. Bila terlanjur `down -v`, pulihkan dari backup (§6). |
| Build Docker gagal di `bun install` | Prebuilt better-sqlite3 tidak tersedia untuk arsitektur Anda; gunakan image dasar yang sama (debian-based `oven/bun:1-slim`). |

---

**Semboyan**: *Hasangapon · Hagabeon · Hamoraon* — selamat go-live!
