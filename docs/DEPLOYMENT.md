# Tarombo — Deployment Guide

Tarombo is a self-contained Next.js family tree (tarombo) management application for the Hariandja clan. It uses SQLite for storage, requires no external services, and is designed for simple self-hosted deployment.

---

## 1. Prerequisites

- **Node.js 18+** or [Bun](https://bun.sh/) (recommended)
- **Git**

No external database, Redis, S3, or other services are required.

---

## 2. Local Development Setup

```bash
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo
bun install
cp .env.example .env   # or create .env manually (see Environment Variables)
bun run db:push
bun run dev
```

The application starts on **port 3000** by default. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite connection string. Default: `file:./db/tarombo.db` |
| `NEXTAUTH_SECRET` | Yes | Secret used by NextAuth for signing tokens. Generate with: |

```bash
openssl rand -base64 32
```

### Example `.env` file

```env
DATABASE_URL="file:./db/tarombo.db"
NEXTAUTH_SECRET="your-generated-secret-here"
```

---

## 4. Database Setup

Tarombo uses [Prisma](https://www.prisma.io/) with SQLite. The database file is stored at `db/tarombo.db` by default.

| Command | Description |
|---|---|
| `bun run db:push` | Push Prisma schema changes directly to SQLite (no migration files) |
| `bun run db:generate` | Generate the Prisma Client for use in the application |
| `bun run db:migrate` | Create and apply database migrations |
| `bun run db:reset` | **DANGER** — Drops all data and re-applies migrations from scratch |

For initial setup, `bun run db:push` is sufficient to create the database and all tables.

---

## 5. Seeding Data

After the database is set up, you can populate it with initial sample data:

**Option A — API Endpoint**

```
GET /api/seed
```

Visit this URL in your browser after the app is running to seed the database.

**Option B — UI Button**

Click the **"Seed Data Awal"** button in the application sidebar.

### What gets seeded

- **1 admin user** — `admin@hariandja.id` / `admin123`
- **A 4-generation sample family tree** with marriages, parent-child relationships, and sample data for demonstration purposes

> **Warning:** Seeding will clear existing data. Only run this on a fresh database or when you want to reset to sample data.

---

## 6. Production Build

The project is configured with `output: "standalone"` in `next.config.ts`, which produces an optimized, self-contained production bundle.

### Build

```bash
bun run build
```

This command:
1. Runs `next build` to create the standalone output in `.next/standalone/`
2. Copies `.next/static` into `.next/standalone/.next/static`
3. Copies `public/` into `.next/standalone/public`

### Start the production server

```bash
bun run start
# or equivalently:
NODE_ENV=production bun .next/standalone/server.js
```

The server listens on **port 3000**.

---

## 7. Production Deployment Options

### Self-hosted (Recommended)

Tarombo is designed to run as a single self-contained process with no external dependencies. Below are three common approaches.

#### Option A — Docker

Create a `Dockerfile` in the project root:

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Build
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production
FROM base AS release
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/standalone/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma

# Create directories for SQLite and uploads
RUN mkdir -p db public/uploads/persons

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "server.js"]
```

Build and run:

```bash
docker build -t tarombo .
docker run -d \
  --name tarombo \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e DATABASE_URL="file:./db/tarombo.db" \
  -v tarombo-db:/app/db \
  -v tarombo-uploads:/app/public/uploads/persons \
  tarombo
```

After the container is running, push the schema and seed:

```bash
docker exec tarombo bun run db:push
docker exec tarombo bun run db:generate
# Then visit http://localhost:3000/api/seed
```

#### Option B — Systemd Service

Create `/etc/systemd/system/tarombo.service`:

```ini
[Unit]
Description=Tarombo Family Tree App
After=network.target

[Service]
Type=simple
User=tarombo
WorkingDirectory=/opt/tarombo
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:./db/tarombo.db
Environment=NEXTAUTH_SECRET=your-secret-here
ExecStart=/usr/local/bin/bun run .next/standalone/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tarombo
sudo systemctl start tarombo
sudo systemctl status tarombo
```

View logs:

```bash
journalctl -u tarombo -f
```

#### Option C — Reverse Proxy with Caddy or Nginx

**Caddy** (automatic HTTPS):

A sample `Caddyfile` is included in the project root. Here is a production-ready example:

```
tarombo.example.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
```

**Nginx**:

```nginx
server {
    listen 80;
    server_name tarombo.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase max body size for photo uploads
    client_max_body_size 10M;
}
```

### Key Considerations

| Aspect | Detail |
|---|---|
| Default port | `3000` |
| Database | SQLite file at `db/tarombo.db` |
| Photo uploads | Stored at `public/uploads/persons/` |
| External dependencies | **None** — no Redis, S3, or external database |
| Rate limiting | In-memory only (resets on restart) |

---

## 8. Backup Strategy

### Built-in backup (JSON export)

Use the **"Pencadangan Data"** feature in the application sidebar to export a full JSON backup of all family tree data, users, and marriages. This can be re-imported via the restore feature.

### File-system backups

Regularly back up these paths:

| Path | Contents |
|---|---|
| `db/tarombo.db` | SQLite database (all persons, marriages, users, audit logs) |
| `public/uploads/persons/` | Uploaded profile photos |

Example cron job for daily backups:

```bash
#!/bin/bash
BACKUP_DIR="/opt/tarombo-backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"
cp /opt/tarombo/db/tarombo.db "$BACKUP_DIR/"
cp -r /opt/tarombo/public/uploads/persons "$BACKUP_DIR/"
# Keep only the last 30 days
find /opt/tarombo-backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
```

> **Tip:** Stop the application or use `sqlite3 db/tarombo.db ".backup backup.db"` for a consistent snapshot of a live SQLite database.

---

## 9. Maintenance

| Task | Command / Action |
|---|---|
| Lint check | `bun run lint` |
| Regenerate Prisma Client | `bun run db:generate` |
| Apply schema changes | `bun run db:push` |
| View server logs | Check `server.log` or `journalctl -u tarombo -f` |
| Monitor disk usage | `du -sh db/ public/uploads/persons/` |
| Review audit logs | Use the **"Audit Log"** page in the application |
| Update application | `git pull && bun install && bun run build && systemctl restart tarombo` |

---

## 10. Troubleshooting

### Port 3000 is already in use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:** Kill the process using port 3000 or configure a different port:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or start on a different port
PORT=3001 bun run start
```

### Database locked errors

```
Error: SQLITE_BUSY: database is locked
```

**Cause:** SQLite supports only one writer at a time. This can happen under heavy concurrent write load.

**Solutions:**
- Ensure you are not running multiple instances of the application against the same database file.
- If using Docker, verify you are not mapping the database volume to multiple containers.
- For high-traffic deployments, consider enabling WAL mode:
  ```bash
  sqlite3 db/tarombo.db "PRAGMA journal_mode=WAL;"
  ```

### Photo upload failures

**Cause:** Photos are saved to `public/uploads/persons/` on the local filesystem. Uploads may fail if:

- The directory does not exist — create it:
  ```bash
  mkdir -p public/uploads/persons
  ```
- Disk is full — check with `df -h`.
- File permissions are incorrect — ensure the application process has write access:
  ```bash
  chmod 755 public/uploads/persons
  ```

### `NEXTAUTH_SECRET` not set

```
Error: NEXTAUTH_SECRET is not set
```

**Solution:** Generate and set the secret in your `.env` file:

```bash
openssl rand -base64 32
```

Then add the output to `.env`:

```env
NEXTAUTH_SECRET="<output-from-above>"
```

### Build fails with TypeScript errors

The project is configured with `ignoreBuildErrors: true` in `next.config.ts`. If you still encounter build issues:

```bash
# Clear the build cache and retry
rm -rf .next
bun run build
```

### Application returns 502 after deployment

**Solution:** Verify the application is running and listening on the expected port:

```bash
curl http://localhost:3000
```

If using a reverse proxy, ensure it is configured to forward to the correct port and that the application process has started successfully.

---

## 11. Windows 11 Setup

All npm scripts have been made cross-platform compatible using `shx` and `cross-env`. The application runs natively on Windows 11 without WSL.

### Prerequisites

| Software | Version | Download |
|---|---|---|
| **Bun** (recommended) or Node.js 18+ | Latest | [bun.sh](https://bun.sh/) / [nodejs.org](https://nodejs.org/) |
| **Git** | 2.x | [git-scm.com](https://git-scm.com/) |

No external database, Redis, S3, or other services are required. SQLite and all dependencies are self-contained.

### Step-by-step

**1. Install Git and Bun**

Download and install Git for Windows, then install Bun:

```powershell
# PowerShell (Run as Administrator)
irm bun.sh/install.ps1 | iex
```

> If you prefer Node.js instead of Bun, all scripts work with `npm` / `npx` as well.

**2. Clone the repository**

Open **Command Prompt**, **PowerShell**, or **Git Bash**:

```bash
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo
```

**3. Install dependencies**

```bash
bun install
```

> `sharp` (photo processing library) will automatically download its Windows binary during installation. No additional build tools are needed.

**4. Configure environment variables**

```powershell
# PowerShell
copy .env.example .env
notepad .env
```

```cmd
REM Command Prompt
copy .env.example .env
notepad .env
```

Edit `.env`:

```env
DATABASE_URL="file:./db/tarombo.db"
NEXTAUTH_SECRET="generate-a-random-secret-here"
```

To generate a secret in PowerShell:

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**5. Setup database**

```bash
bun run db:push
```

**6. Run the development server**

```bash
bun run dev
```

Open **http://localhost:3000** in your browser.

**7. Seed sample data (optional)**

Click **"Seed Data Awal"** in the sidebar, or visit **http://localhost:3000/api/seed** in your browser.

Default admin credentials: `admin@hariandja.id` / `admin123`

### Production Build on Windows

```bash
bun run build
bun run start
```

The production server starts on **port 3000**.

### Common Windows Issues

| Issue | Solution |
|---|---|
| **Port 3000 already in use** | `netstat -ano \| findstr :3000` then `taskkill /PID <pid> /F` |
| **Firewall blocks port 3000** | Allow when prompted, or add rule: `netsh advfirewall firewall add rule name="Tarombo" dir=in action=allow protocol=TCP localport=3000` |
| **`bun` command not found** | Restart terminal after installation, or add Bun to PATH manually |
| **Sharp installation error** | Run `bun install` again, or `npm install sharp --force` |
| **Photo upload fails** | Ensure `public/uploads/persons/` directory exists (auto-created by the app) |
| **Clear build cache** | PowerShell: `Remove-Item -Recurse -Force .next`; CMD: `rmdir /s /q .next` |

### Running as a Windows Service (Optional)

Use [NSSM](https://nssm.cc/) (Non-Sucking Service Manager) to run Tarombo as a Windows background service:

1. Download [nssm.exe](https://nssm.cc/download)
2. Install the service:

```cmd
nssm install Tarombo
```

3. In the NSSM GUI:
   - **Path**: `C:\Users\<you>\.bun\bin\bun.exe`
   - **Arguments**: `run start`
   - **Startup directory**: `C:\path\to\tarombo`
   - **Environment** tab: add `NODE_ENV=production`, `DATABASE_URL=file:./db/tarombo.db`, `NEXTAUTH_SECRET=your-secret`

4. Start the service:

```cmd
nssm start Tarombo
```