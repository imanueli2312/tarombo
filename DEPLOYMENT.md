# 🚀 Deployment Guide — Tarombo

Panduan deployment aplikasi Tarombo ke produksi.

---

## 📋 Daftar Isi

- [Prasyarat](#prasyarat)
- [Deployment Lokal (Development)](#deployment-lokal-development)
- [Deployment Produksi (Self-hosted)](#deployment-produksi-self-hosted)
- [Deployment dengan Docker](#deployment-dengan-docker)
- [Reverse Proxy (Nginx/Caddy)](#reverse-proxy-nginxcaddy)
- [Process Manager (PM2)](#process-manager-pm2)
- [Backup Berkala](#backup-berkala)
- [Environment Variables](#environment-variables)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prasyarat

### Sistem Operasi
- **Linux** (Ubuntu 20.04+ / Debian 11+ / CentOS 8+) — recommended
- **Windows Server** 2019+
- **macOS** 12+

### Software
| Software | Version | Catatan |
|----------|---------|---------|
| Node.js | 18+ (LTS recommended) | atau Bun 1.0+ |
| npm / bun | npm 9+ / bun 1.0+ | |
| Playwright Chromium | latest | Untuk export PDF/image |

### Hardware (Minimum)
| Resource | Development | Produksi |
|----------|-------------|----------|
| CPU | 1 core | 2 cores |
| RAM | 512MB | 1GB |
| Disk | 500MB | 2GB (DB + uploads) |
| Network | localhost | 100Mbps |

### Produksi (Rekomendasi)
| Resource | Small (<100 orang) | Medium (<1000) | Large (1000+) |
|----------|-------------------|----------------|---------------|
| CPU | 2 cores | 4 cores | 8 cores |
| RAM | 1GB | 2GB | 4GB |
| Disk | 2GB | 5GB | 10GB+ |

---

## Deployment Lokal (Development)

```bash
# 1. Clone
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo

# 2. Install dependencies
npm install

# 3. Inisialisasi database
npm run db:init

# 4. Jalankan dev server
npm run dev
```

Akses: http://localhost:3000

> **Catatan Windows**: Edit `package.json`, ubah `"dev": "next dev -p 3000"` (hapus `| tee dev.log`)

---

## Deployment Produksi (Self-hosted)

### 1. Persiapan Server

```bash
# Install Node.js 18 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build dependencies
sudo apt-get install -y build-essential python3

# Verify
node --version  # v18.x
npm --version   # 9.x+
```

### 2. Setup Aplikasi

```bash
# Buat direktori
sudo mkdir -p /opt/tarombo
sudo chown $USER:$USER /opt/tarombo

# Clone
cd /opt/tarombo
git clone https://github.com/imanueli2312/tarombo.git .

# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium
npx playwright install-deps  # untuk Linux (install system deps)

# Inisialisasi database
npm run db:init

# Build aplikasi
npm run build
```

### 3. Set Environment Variables

```bash
# Buat file .env
cat > /opt/tarombo/.env << 'EOF'
DATABASE_URL=file:/opt/tarombo/db/custom.db
NODE_ENV=production
PORT=3000
EOF
```

### 4. Test Build

```bash
# Test production build
npm start
# → Buka http://localhost:3000, pastikan berfungsi

# Hentikan dengan Ctrl+C
```

### 5. Seed Data Awal

```bash
# Via API (first-run, tidak butuh login)
curl -X POST http://localhost:3000/api/seed
```

---

## Deployment dengan Docker

### Dockerfile

Buat `Dockerfile` di root proyek:

```dockerfile
FROM node:18-slim

# Install dependencies untuk Playwright & better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Install Playwright browser
RUN npx playwright install chromium

# Create directories
RUN mkdir -p db public/uploads

# Expose port
EXPOSE 3000

# Volume untuk database & uploads
VOLUME ["/app/db", "/app/public/uploads"]

# Start
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  tarombo:
    build: .
    container_name: tarombo
    ports:
      - "3000:3000"
    volumes:
      - ./db:/app/db
      - ./uploads:/app/public/uploads
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/db/custom.db
    restart: unless-stopped
```

### Jalankan

```bash
# Build & start
docker-compose up -d

# Cek log
docker-compose logs -f tarombo

# Stop
docker-compose down

# Rebuild setelah update
docker-compose up -d --build
```

---

## Reverse Proxy (Nginx/Caddy)

### Nginx

Buat `/etc/nginx/sites-available/tarombo`:

```nginx
server {
    listen 80;
    server_name tarombo.example.com;

    # Redirect ke HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tarombo.example.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/tarombo.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tarombo.example.com/privkey.pem;

    # Body size (untuk photo upload)
    client_max_body_size 15M;

    # Proxy ke Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Cache uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

Aktifkan:
```bash
sudo ln -s /etc/nginx/sites-available/tarombo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL dengan Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tarombo.example.com
```

### Caddy (Alternatif Lebih Sederhana)

`Caddyfile`:
```
tarombo.example.com {
    reverse_proxy 127.0.0.1:3000
    request_body {
        max_size 15MB
    }
}
```

---

## Process Manager (PM2)

### Install PM2

```bash
sudo npm install -g pm2
```

### Jalankan dengan PM2

```bash
cd /opt/tarombo

# Start
pm2 start npm --name "tarombo" -- start

# Atau dengan ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tarombo',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    cwd: '/opt/tarombo',
    env: {
      NODE_ENV: 'production',
    },
    max_memory_restart: '500M',
    instances: 1,  // SQLite tidak support multi-instance
  }]
};
EOF

pm2 start ecosystem.config.js
```

### PM2 Commands

```bash
pm2 status                    # Cek status
pm2 logs tarombo              # Lihat log
pm2 restart tarombo           # Restart
pm2 stop tarombo              # Stop
pm2 delete tarombo            # Hapus dari PM2

# Auto-start saat boot
pm2 startup
pm2 save
```

---

## Backup Berkala

### Cron Job — Backup Harian

```bash
# Edit crontab
crontab -e

# Backup harian jam 2 pagi
0 2 * * * /opt/tarombo/scripts/backup.sh >> /var/log/tarombo-backup.log 2>&1
```

### Script Backup (`scripts/backup.sh`)

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/tarombo"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/tarombo-$DATE.json"
ADMIN_COOKIE="tarombo_active_user=<your-admin-cookie>"

mkdir -p $BACKUP_DIR

# Download backup via API
curl -s -o "$BACKUP_FILE" \
  -H "Cookie: $ADMIN_COOKIE" \
  http://localhost:3000/api/backup

# Hapus backup lebih dari 30 hari
find $BACKUP_DIR -name "tarombo-*.json" -mtime +30 -delete

echo "[$DATE] Backup saved: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"
```

```bash
chmod +x scripts/backup.sh
```

### Backup Database File Langsung

```bash
# Backup SQLite file (saat server low traffic)
cp /opt/tarombo/db/custom.db /backups/tarombo/custom-$(date +%Y%m%d).db

# Atau pakai .backup command (tidak lock DB)
sqlite3 /opt/tarombo/db/custom.db ".backup /backups/tarombo/custom-$(date +%Y%m%d).db"
```

---

## Environment Variables

### `.env` File

```env
# Database
DATABASE_URL=file:/opt/tarombo/db/custom.db

# App
NODE_ENV=production
PORT=3000

# (Opsional) Custom domain
NEXTAUTH_URL=https://tarombo.example.com
```

### Default Values

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `DATABASE_URL` | `file:./db/custom.db` | Path SQLite database |
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |

---

## Post-Deployment Checklist

### ✅ Setup Awal

- [ ] Node.js 18+ terinstall
- [ ] Dependencies terinstall (`npm install`)
- [ ] Database terinisialisasi (`npm run db:init`)
- [ ] Build sukses (`npm run build`)
- [ ] Playwright Chromium terinstall (`npx playwright install chromium`)
- [ ] Folder `db/` dan `public/uploads/` writable

### ✅ Keamanan

- [ ] Ganti password admin default (`admin123` → password kuat)
- [ ] Ganti password editor default (`robby123` → password kuat)
- [ ] Hapus atau rename akun demo bila tidak diperlukan
- [ ] Set up HTTPS (Let's Encrypt / reverse proxy)
- [ ] Firewall hanya expose port 80/443 (bukan 3000 langsung)
- [ ] Set `client_max_body_size` di reverse proxy (untuk photo upload)

### ✅ Backup

- [ ] Setup cron job backup harian
- [ ] Test restore backup
- [ ] Simpan backup di lokasi terpisah (offsite)

### ✅ Monitoring

- [ ] PM2 auto-restart aktif (`pm2 startup`)
- [ ] Log rotation configured
- [ ] Disk space monitoring (DB + uploads)
- [ ] Uptime monitoring (UptimeRobot / Better Stack)

### ✅ Performance

- [ ] Cache static assets (Nginx)
- [ ] Gzip compression di reverse proxy
- [ ] Database WAL mode aktif (default di `db.ts`)

---

## Monitoring & Maintenance

### Cek Status Aplikasi

```bash
# PM2 status
pm2 status

# PM2 logs real-time
pm2 logs tarombo --lines 100

# PM2 monit (CPU, memory)
pm2 monit
```

### Cek Database

```bash
# Ukuran database
ls -lh /opt/tarombo/db/custom.db

# Jumlah record per tabel
sqlite3 /opt/tarombo/db/custom.db << 'EOF'
SELECT 'persons' as t, COUNT(*) as c FROM person WHERE deleted_at IS NULL
UNION ALL
SELECT 'partnerships', COUNT(*) FROM partnership WHERE deleted_at IS NULL
UNION ALL
SELECT 'users', COUNT(*) FROM user
UNION ALL
SELECT 'roles', COUNT(*) FROM role
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log;
EOF
```

### Cek Activity Log

```bash
# Aktivitas 24 jam terakhir
curl -s http://localhost:3000/api/activity-log?limit=50 \
  -H "Cookie: tarombo_active_user=<admin-cookie>" | jq '.data[] | {action, entity_name, created_at}'
```

### Update Aplikasi

```bash
cd /opt/tarombo

# Backup dulu!
./scripts/backup.sh

# Pull latest
git pull origin main

# Install dependencies baru
npm install

# Build ulang
npm run build

# Restart
pm2 restart tarombo
```

### Rotate Activity Log (Opsional)

Activity log bisa membesar seiring waktu. Hapus entry lama:

```bash
# Hapus aktivitas lebih dari 90 hari
sqlite3 /opt/tarombo/db/custom.db \
  "DELETE FROM activity_log WHERE created_at < datetime('now', '-90 days');"

# Atau tambah ke cron (mingguan)
echo "0 3 * * 0 sqlite3 /opt/tarombo/db/custom.db \"DELETE FROM activity_log WHERE created_at < datetime('now', '-90 days');\"" | crontab -
```

### Clean Uploads (Opsional)

Hapus foto orphan (person sudah dihapus permanen):

```bash
# Script clean uploads
cat > /opt/tarombo/scripts/clean-uploads.sh << 'EOF'
#!/bin/bash
UPLOAD_DIR="/opt/tarombo/public/uploads"
DB="/opt/tarombo/db/custom.db"

# Ambil semua photo yang masih dipakai
USED_PHOTOS=$(sqlite3 "$DB" "SELECT DISTINCT photo FROM person WHERE photo LIKE '/uploads/%' AND deleted_at IS NULL")

# Hapus file yang tidak dipakai
for file in $UPLOAD_DIR/*.webp; do
  filename="/uploads/$(basename "$file")"
  if echo "$USED_PHOTOS" | grep -q "$filename"; then
    : # masih dipakai
  else
    rm "$file"
    echo "Deleted orphan: $filename"
  fi
done
EOF
chmod +x /opt/tarombo/scripts/clean-uploads.sh
```

---

## Troubleshooting Produksi

### Aplikasi tidak bisa start

```bash
# Cek log PM2
pm2 logs tarombo --lines 50

# Cek port 3000 dipakai atau tidak
lsof -i :3000

# Cek Node version
node --version  # harus 18+
```

### Database locked

```bash
# Cek koneksi ke DB
sqlite3 /opt/tarombo/db/custom.db "SELECT 1;"

# Bila locked, restart app
pm2 restart tarombo
```

### Export PDF gagal

```bash
# Cek Playwright terinstall
npx playwright install chromium

# Cek dependencies system (Linux)
npx playwright install-deps

# Test manual
node -e "const {chromium}=require('playwright'); chromium.launch().then(b=>{console.log('OK');b.close()}).catch(e=>console.error(e))"
```

### Photo upload gagal

```bash
# Cek permission folder uploads
ls -la /opt/tarombo/public/uploads/
# Harus writable oleh user yang menjalankan app

# Fix permission
sudo chown -R $USER:$USER /opt/tarombo/public/uploads/
chmod 755 /opt/tarombo/public/uploads/
```

### Memory tinggi

```bash
# Cek memory usage
pm2 monit

# Set limit di ecosystem.config.js
max_memory_restart: '500M'
```

---

## Rollback

Bila update bermasalah, rollback ke versi sebelumnya:

```bash
cd /opt/tarombo

# Lihat history
git log --oneline -10

# Rollback ke commit sebelumnya
git checkout <commit-hash>

# Rebuild
npm install
npm run build

# Restart
pm2 restart tarombo

# Restore database dari backup bila perlu
sqlite3 /opt/tarombo/db/custom.db ".restore /backups/tarombo/custom-<date>.db"
```

---

**Versi Dokumen**: 1.0 | **Update**: 2026-09-09
