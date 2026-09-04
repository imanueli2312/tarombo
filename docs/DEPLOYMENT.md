# Panduan Go-Live / Deployment Produksi

Panduan lengkap membawa Tarombo dari repositori ke produksi, termasuk
deployment Docker, reverse proxy TLS, backup terjadwal, checklist sebelum
(serta sesudah) go-live, dan panduan khusus bekerja dari **Windows 11 dengan
Visual Studio Code**.

> **Prasyarat baca**: [README.md](../README.md) untuk gambaran aplikasi dan
> [BUKU_MARGA_TRANSFER.md](BUKU_MARGA_TRANSFER.md) untuk fitur transfer data.

---

## Daftar Isi

1. [Arsitektur Produksi](#1-arsitektur-produksi)
2. [Opsi A — Docker Compose (Direkomendasikan)](#2-opsi-a--docker-compose-direkomendasikan)
3. [Opsi B — Server/VPS Langsung](#3-opsi-b--servervps-langsung)
4. [Opsi C — Platform Serverless (Vercel dll.)](#4-opsi-c--platform-serverless-vercel-dll)
5. [Opsi D — Deploy dari Windows 11 dengan Visual Studio Code](#5-opsi-d--deploy-dari-windows-11-dengan-visual-studio-code)
6. [Monitoring & Health Check](#6-monitoring--health-check)
7. [Backup & Restore Database](#7-backup--restore-database)
8. [Upgrade Aplikasi (Zero Data Loss)](#8-upgrade-aplikasi-zero-data-loss)
9. [Checklist Go-Live](#9-checklist-go-live)
10. [Sesudah Go-Live (Hari-1)](#10-sesudah-go-live-hari-1)
11. [Pemecahan Masalah](#11-pemecahan-masalah)

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

## 5. Opsi D — Deploy dari Windows 11 dengan Visual Studio Code

Panduan khusus bagi pengembang/pengelola yang bekerja dari PC **Windows 11**
dengan **Visual Studio Code (VS Code)**. Prinsip dasarnya: Windows + VS Code
adalah *workstation* (menulis kode, menguji, dan mengoperasikan server dari
jauh), sementara *runtime produksi* tetap server Linux (Opsi A/B) — sehingga
lingkungan build dan cara kerja aplikasi identik dengan produksi.

Tiga jalur kerja yang dibahas di bagian ini:

| Jalur | Cocok untuk | Keterangan |
|---|---|---|
| **WSL2 + VS Code** (direkomendasikan) | Development & build di PC | Ubuntu di dalam Windows; toolchain identik dengan server |
| **Native Windows (bun)** | Development cepat tanpa WSL | bun menyediakan shell lintas-platform untuk skrip repo |
| **Remote-SSH ke server** | Operasional & deploy produksi | VS Code tersambung langsung ke VPS |

### 5.1 Instalasi prasyarat (Windows 11)

Semua prasyarat dapat dipasang lewat `winget` dari PowerShell (jalankan
sebagai user biasa; buka PowerShell dari Start menu):

```powershell
# Visual Studio Code
winget install Microsoft.VisualStudioCode

# Git for Windows (menyertakan Git Bash + openssl)
winget install Git.Git

# WSL2 + Ubuntu (wajib restart PC sekali setelahnya)
wsl --install -d Ubuntu-24.04

# Runtime: bun (instaler resmi untuk PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# ... dan/atau Node.js LTS (menjalankan hasil build secara native)
winget install OpenJS.NodeJS.LTS

# Docker Desktop (opsional — untuk uji stack compose secara lokal)
winget install Docker.DockerDesktop

# (Opsional) Toolchain modul native: Python 3 + VS 2022 Build Tools (C++).
# TIDAK wajib untuk proyek ini — better-sqlite3 v13 membundel binary jadi
# (prebuilt) untuk Windows; hanya relevan bila Anda ingin tetap memakai
# `bun install` murni di native Windows. Rincian: subseksi §5.5.
# winget install -e --id Python.Python.3.13
# winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Catatan instalasi:

- **WSL2**: setelah `wsl --install`, restart PC lalu buka aplikasi Ubuntu
  sekali untuk membuat user Linux. Virtualisasi harus aktif (biasanya sudah
  default pada PC modern; cek di BIOS/UEFI bila gagal).
- **Docker Desktop**: pilih backend **WSL 2** saat diminta. Jalankan
  `wsl --update` bila Docker Desktop melaporkan masalah WSL.
- **bun vs Node**: keduanya boleh terpasang bersamaan — bun untuk
  `bun install`/`bun run build` (identik dengan CI dan image Docker), Node
  opsional untuk menjalankan `server.js` secara native.
- **curl**: Windows 11 sudah menyertakan `curl.exe` asli (bukan alias
  PowerShell). Di PowerShell, ketik `curl.exe` secara eksplisit agar tidak
  teralihkan ke `Invoke-WebRequest`.

### 5.2 Ekstensi VS Code yang direkomendasikan

Repositori menyertakan `.vscode/extensions.json` — saat pertama kali membuka
folder proyek, VS Code menampilkan notifikasi *"Do you trust the authors..."*
pilih **Yes, I trust**, lalu tawaran *"Do you want to install the recommended
extensions?"* → pilih **Install**. Semua ekstensi penting terpasang otomatis:

| Ekstensi | ID | Fungsi |
|---|---|---|
| ESLint | `dbaeumer.vscode-eslint` | Sorot error lint langsung di editor |
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss` | Autocomplete class Tailwind 4 |
| Bun for Visual Studio Code | `oven.bun-vscode` | Runner & debugger untuk proses bun |
| Docker | `ms-azuretools.vscode-docker` | Kelola image/container/compose dari sidebar |
| Remote - SSH | `ms-vscode-remote.remote-ssh` | Buka folder di server produksi (§5.7) |
| Remote - WSL | `ms-vscode-remote.remote-wsl` | Integrasi editor ↔ WSL2 |
| GitLens | `eamodio.gitlens` | Histori git, blame, dan compare di editor |

Instalasi manual (bila notifikasi tidak muncul): buka Command Palette
(`F1` atau `Ctrl+Shift+P`) → **Extensions: Show Recommended Extensions**.

### 5.3 Mengkloning dan membuka proyek

**Jalur WSL2 (direkomendasikan)** — simpan repo di filesystem Linux
(di dalam `~/`), bukan di `\\wsl$\...` dari sisi Windows, agar I/O cepat:

```bash
# dari terminal Ubuntu (aplikasi "Ubuntu" di Start menu)
git clone https://github.com/imanueli2312/tarombo.git ~/tarombo
cd ~/tarombo
code .        # VS Code terbuka terhubung ke WSL (WSL: Reopen in WSL)
```

**Jalur native Windows:**

```powershell
git clone https://github.com/imanueli2312/tarombo.git C:\dev\tarombo
cd C:\dev\tarombo
code .
```

> **Hindari folder tersinkron OneDrive** (`Documents`, `Desktop`): proses
> sinkronisasi dapat mengunci file `node_modules`/database dan memperlambat
> I/O secara signifikan. Gunakan path biasa seperti `C:\dev\tarombo`. Bila
> repo sudah terlanjur di `Documents`, nonaktifkan sinkron untuk folder itu
> (OneDrive → Settings → Sync and backup → Manage backup) atau pindahkan
> folder proyek.

> **Akhir baris (CRLF/LF)**: repositori menyertakan `.gitattributes` yang
> memaksa LF untuk `*.sh`, `Dockerfile`, `Caddyfile`, dan `*.mjs` — skrip
> tetap valid dieksekusi di Linux/container meski dikloning dari Windows.

### 5.4 Environment & secret dari Windows

Salin template lalu isi (gunakan VS Code atau perintah berikut):

```powershell
copy .env.example .env.local    # untuk development
copy .env.example .env          # untuk docker compose lokal
```

Generate `JWT_SECRET` minimal 32 karakter — dua cara setara:

```bash
# Git Bash (openssl bawaan Git for Windows):
openssl rand -hex 32
```

```powershell
# PowerShell — tanpa dependensi, memakai CSPRNG Windows:
$b = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($b)
-join ($b | ForEach-Object { $_.ToString('x2') })
```

Perbedaan sintaks variabel lingkungan yang sering menjegal pengguna baru:

| Aksi | bash (WSL / Git Bash / server) | PowerShell |
|---|---|---|
| Set untuk sesi terminal | `export NODE_ENV=production` | `$env:NODE_ENV = "production"` |
| Jalankan satu perintah | `NODE_ENV=production node server.js` | `$env:NODE_ENV="production"; node server.js` |
| Baca nilai | `echo $NODE_ENV` | `$env:NODE_ENV` |

> Catatan: `bun run start:prod` tetap bisa dijalankan langsung dari
> PowerShell — bun memakai shell bawaannya sendiri yang memahami prefix
> `VAR=nilai` lintas-platform, jadi skrip `package.json` tidak perlu diubah.

### 5.5 Menjalankan development di PC

```bash
bun install
bun run dev          # buka http://localhost:3000
```

#### `bun install` gagal di Windows native (`gyp ERR! find Python`)

Di WSL2 masalah ini tidak ada. Di **PowerShell native** (tanpa WSL), bun bisa
berhenti di tengah instalasi dengan galat seperti ini:

```text
gyp ERR! find Python You need to install the latest version of Python.
gyp ERR! stack Error: Could not find any Python installation to use
error: install script from "better-sqlite3" exited with 1
```

**Ini bukan cacat proyek** — `better-sqlite3` v13 sebenarnya sudah membundel
binary jadi untuk Windows x64/ARM64 **di dalam paket npm-nya**
(`prebuilds/win32-x64.node`), sehingga kompilasi tidak diperlukan sama
sekali. Namun bun di Windows otomatis menjalankan *node-gyp* untuk paket
ber-`binding.gyp` (perilaku yang tidak muncul di Linux/macOS), dan node-gyp
menuntut Python 3 + Visual Studio Build Tools yang memang belum terpasang.

Solusinya — pilih **salah satu** (urut dari yang termudah):

**Solusi 1 — instal dependensi lewat `npm` (tanpa Python, tanpa Build
Tools; tercepat & tanpa dependensi tambahan):**

```powershell
Remove-Item -Recurse -Force node_modules
npm install
bun run dev          # skrip proyek tetap dijalankan lewat shell bun
```

npm tidak memicu node-gyp untuk paket ini — binary prebuilt langsung dipakai
dan instalasi selesai dalam hitungan detik. `npm install` menghasilkan
`package-lock.json` yang sengaja di-`.gitignore` (repo memakai `bun.lock`);
biarkan file itu ada, jangan di-commit.

> **Soal `npm audit`**: warning `deprecated` dan `allow-scripts` pada output
> npm aman diabaikan (yang terakhir justru fitur keamanan — skrip instalasi
> dilewati, binary tetap terpasang via *optionalDependencies*). Repo ini
> dipelihara agar `npm audit` **0 vulnerability** — versi 0.5.0+ memakai
> `sharp` 0.35.4 dan tanpa dependensi rentan yang tak terpakai. **Jangan**
> menjalankan `npm audit fix --force`: bump mayor paket (recharts 3,
> MDXEditor 4) dapat merusak aplikasi. Bila muncul temuan baru, naikkan
> versi paket terkait secara terarah di `package.json` (lihat `overrides`).

**Solusi 2 — bun dengan melewati skrip instalasi:**

```powershell
Remove-Item -Recurse -Force node_modules
bun install --ignore-scripts
```

**Solusi 3 — pasang toolchain kompilasi (opsional).** Hanya perlu bila kelak
ada modul native lain yang benar-benar harus dikompilasi dari sumber:

```powershell
# Python 3 (disyaratkan node-gyp)
winget install -e --id Python.Python.3.13

# Visual Studio 2022 Build Tools + workload C++ (±3-6 GB)
winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Setelah keduanya terpasang **tutup lalu buka ulang PowerShell/VS Code**
(PATH harus terbaca ulang), verifikasi `python --version` mengembalikan
Python 3.13.x, baru ulangi `bun install`. Instalasi Python lama yang rusak
(node-gyp melaporkan `version is ""`) akan tergantikan oleh instalasi baru
di PATH.

**Solusi 4 — pindah ke jalur WSL2** (§5.3): toolchain persis sama dengan
server Linux produksi, terbebas dari seluruh masalah khas Windows.

Saat pertama kali dimuat, admin development + leluhur akar (Raja Hariandja)
dibuat otomatis (lihat [README](../README.md)). Untuk debugging:

- **Sisi klien**: Chrome/Edge DevTools (`F12` → Sources → breakpoint).
- **Sisi server (bun)**: gunakan ekstensi *Bun for Visual Studio Code*
  (Run & Debug → jalankan dengan bun) atau Chrome DevTools via `--inspect`.

### 5.6 Menguji produksi secara lokal (sebelum go-live)

**a) Build + jalankan native (WSL, atau Windows dengan bun):**

```bash
bun run build
bun run start:prod                     # via shell bun
```

```powershell
# alternatif PowerShell + Node (hasil build yang sama):
$env:NODE_ENV="production"
node .next/standalone/server.js
```

Database lokal dibuat di `db/tarombo.db` (sudah di-`.gitignore`, tidak akan
ter-commit). Verifikasi: buka `http://localhost:3000/api/health`.

**b) Uji stack lengkap dengan Docker Desktop:**

Service `app` di `docker-compose.yml` hanya `expose` (internal) — untuk uji
lokal, buat `docker-compose.override.yml` di root proyek (file ini khusus
PC Anda, **tidak di-commit** — sudah masuk `.gitignore`):

```yaml
services:
  app:
    ports:
      - "3000:3000"
```

Lalu jalankan hanya service `app` (tanpa Caddy):

```powershell
docker compose up -d --build app

# cek kesehatan (pakai curl.exe eksplisit di PowerShell):
curl.exe http://localhost:3000/api/health

# seed data UJI (bukan produksi):
docker compose exec app node -e "fetch('http://localhost:3000/api/seed',{method:'POST'}).then(r=>r.json()).then(console.log)"
```

Login di `http://localhost:3000` tetap berfungsi meskipun cookie bertanda
`Secure` — browser memperlakukan `localhost` sebagai konteks aman.

Setelah selesai menguji: `docker compose down`. Volume `app-data` lokal hanya
berisi data uji dan boleh dihapus dengan `docker compose down -v` —
**jangan pernah menjalankan `down -v` di server produksi**.

### 5.7 Deploy ke server produksi dari VS Code

Server produksi tetap disiapkan mengikuti **Opsi A** (Docker Compose) atau
**Opsi B** (VPS langsung). Dari Windows, ada dua jalur operasional:

**Jalur 1 — Remote-SSH (paling nyaman, direkomendasikan):**

1. Siapkan kunci SSH sekali di PC (Windows 11 sudah menyertakan OpenSSH
   client): `ssh-keygen -t ed25519` lalu salin kunci publik ke server —
   dari **Git Bash**: `ssh-copy-id user@ip-server` (jika `ssh-copy-id`
   tidak tersedia, dari **cmd**: `type %USERPROFILE%\.ssh\id_ed25519.pub |
   ssh user@ip-server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"`).
2. Di VS Code: `F1` → **Remote-SSH: Connect to Host** → `user@ip-server`.
3. **File → Open Folder** → `/opt/tarombo`.
4. Terminal terintegrasi VS Code kini berjalan **di server** — lanjutkan
   langkah Opsi A: edit `deploy/Caddyfile`, `git pull`,
   `docker compose up -d --build`, seeding, dan cek `/api/health`.

Editor, lint, dan terminal bekerja seolah-olah lokal, tetapi semua perintah
dieksekusi di server produksi — tidak ada file yang perlu disalin manual.

**Jalur 2 — git push + terminal SSH biasa:**

```powershell
# di PC Windows (folder proyek)
git add -A
git commit -m "perubahan terbaru"
git push origin main
ssh user@ip-server
```

```bash
# di server (sesi SSH)
cd /opt/tarombo
git pull origin main
docker compose up -d --build
curl -s localhost:3000/api/health
```

> **Kebijakan secret**: generate `JWT_SECRET` **di server** (via sesi SSH:
> `openssl rand -hex 32`) — jangan membuat secret produksi di file yang
> tersinkron cloud atau ter-commit di repo.

### 5.8 Masalah khas Windows & solusinya

| Gejala | Penyebab & solusi |
|---|---|
| `docker` tidak jalan setelah install Docker Desktop | Backend WSL2 belum siap: jalankan `wsl --update`, restart Docker Desktop; pastikan virtualisasi aktif di BIOS/UEFI. |
| `bun install` gagal: `gyp ERR! find Python` → `install script from "better-sqlite3" exited with 1` | Bun di Windows memicu node-gyp meski binary prebuilt sudah dibundel dalam paket — lihat subseksi *"bun install gagal di Windows native"* di §5.5. Solusi tercepat: `npm install`. |
| Skrip `.sh` gagal: `bad interpreter ^M` | File lama ter-cache CRLF sebelum `.gitattributes` ada. Dari Git Bash/WSL: `git add --renormalize . && git checkout -- .` |
| `NODE_ENV=production node ...` gagal di PowerShell | Prefix env hanya berlaku di bash/bun-shell → `$env:NODE_ENV="production"; node ...` |
| Port 3000 sibuk | Cari pemakai: `netstat -ano | findstr :3000` → `taskkill /PID <pid> /F`, atau ganti `PORT`. |
| WSL terasa lambat di VS Code | Repo dibuka dari sisi Windows (`\\wsl$\...`). Selalu buka dari dalam WSL: `cd ~/tarombo && code .` |
| Login gagal saat uji Docker via IP LAN (bukan localhost) | Cookie `Secure` hanya dikirim lewat HTTPS/localhost — uji lewat `http://localhost:3000`, atau lewat Caddy+domain dengan TLS. |
| `openssl` tidak dikenali di PowerShell | Git Bash punya openssl; atau pakai snippet PowerShell di §5.4. |
| `curl` di PowerShell mengembalikan objek aneh | Itu alias `Invoke-WebRequest` — gunakan `curl.exe` eksplisit. |

---

## 6. Monitoring & Health Check

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

## 7. Backup & Restore Database

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

## 8. Upgrade Aplikasi (Zero Data Loss)

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

## 9. Checklist Go-Live

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

## 10. Sesudah Go-Live (Hari-1)

1. **Ganti password admin** segera setelah login pertama.
2. **Buat akun per-peran** untuk anggota keluarga (viewer/editor) — jangan
   bagikan akun admin.
3. **Buka RBAC panel** dan sesuaikan izin default per peran bila perlu.
4. **Uji ekspor penuh** (Transfer data → Ekspor JSON) dan simpan salinannya
   di tempat aman — ini backup data awal Anda.
5. **Pantau log 24 jam pertama**: `docker compose logs -f app | grep -iE "error|warn"`.

---

## 11. Pemecahan Masalah

| Gejala | Kemungkinan & Solusi |
|---|---|
| Container `unhealthy` | `docker compose logs app` — biasanya DB tidak bisa dibuka; cek volume `app-data` ter-mount & permission user `node` (UID 1000). |
| Aplikasi exit dengan "JWT_SECRET wajib diset" | `.env` belum terbaca oleh compose; pastikan file bernama persis `.env` di direktori compose, lalu `docker compose up -d`. |
| Login gagal terus (401) | Cookie `Secure` butuh HTTPS — akses via `https://domain`, bukan IP:port. Verifikasi TLS aktif di Caddy. |
| Sertifikat TLS tidak terbit | DNS domain belum menunjuk ke server, atau port 80/443 diblokir firewall. Cek `docker compose logs caddy`. |
| `429 Terlalu banyak permintaan` setelah deploy | Rate limiter in-memory ter-reset saat restart — cukup tunggu 15 menit atau restart ulang. |
| Impor transfer ditolak (5 MB / 10.000 entitas) | Batas by design; pecah file atau lakukan dry-run untuk melihat laporan validasi. |
| Database terlihat "hilang" setelah `down` | `docker compose down` tidak menghapus volume. Bila terlanjur `down -v`, pulihkan dari backup (§7). |
| Build Docker gagal di `bun install` | Prebuilt better-sqlite3 tidak tersedia untuk arsitektur Anda; gunakan image dasar yang sama (debian-based `oven/bun:1-slim`). |

---

**Semboyan**: *Hasangapon · Hagabeon · Hamoraon* — selamat go-live!
