# Deployment Guide — Windows 11 + Visual Studio Code

**Project:** Tarombo Hariandja — Marga Hariandja Family Tree
**Target OS:** Windows 11 (64-bit)
**IDE:** Visual Studio Code
**Last updated:** 7 August 2026

> **Language:** **English** (this file) · [Indonesia](./DEPLOYMENT_WINDOWS.id.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Requirements](#2-system-requirements)
3. [Install Prerequisites](#3-install-prerequisites)
4. [Clone the Repository](#4-clone-the-repository)
5. [Configure VS Code](#5-configure-vs-code)
6. [Install Project Dependencies](#6-install-project-dependencies)
7. [Environment Configuration](#7-environment-configuration)
8. [Run the Development Server](#8-run-the-development-server)
9. [Production Build on Windows](#9-production-build-on-windows)
10. [Database Management](#10-database-management)
11. [Troubleshooting](#11-troubleshooting)
12. [Deployment Checklist](#12-deployment-checklist)

---

## 1. Overview

This guide walks you through setting up the Tarombo Hariandja project on a **Windows 11** machine using **Visual Studio Code**. The project is a Next.js 16 application that uses **better-sqlite3** (a native C++ addon), which requires special handling on Windows.

> ⚠️ **Key Windows consideration:** The `better-sqlite3` native module must be compiled for your Node.js version. This guide covers two approaches: **Bun** (recommended, faster) and **Node.js + npm** (fallback).

---

## 2. System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Windows 10 (64-bit) | Windows 11 (64-bit) |
| **RAM** | 4 GB | 8 GB+ |
| **Disk space** | 1 GB free | 2 GB free |
| **PowerShell** | 5.1 | 7+ (Windows Terminal) |
| **Admin rights** | Required for installing tools | — |

### Windows features needed
- **Windows Subsystem for Linux (WSL 2)** — *optional but recommended* for best compatibility
- **Git for Windows** — required for cloning and version control
- **.NET Framework 4.8+** — usually pre-installed on Windows 11

---

## 3. Install Prerequisites

### Step 3.1 — Install Git for Windows

1. Download from **https://git-scm.com/download/win**
2. Run the installer with these options:
   - **Components:** Check "Git Bash Here" and "Git GUI Here"
   - **Default editor:** Let Git use VS Code
   - **PATH:** "Git from the command line and also from 3rd-party software"
3. Verify in PowerShell:
   ```powershell
   git --version
   # Expected: git version 2.45.x.windows.x
   ```

### Step 3.2 — Install Node.js (LTS)

> Required even if you use Bun, because `better-sqlite3` compiles against Node.js headers.

1. Download the **LTS version (v20.x or v22.x)** from **https://nodejs.org/**
2. Run the installer with default options (includes npm)
3. Verify in a **new** PowerShell window:
   ```powershell
   node --version
   # Expected: v20.x.x or v22.x.x
   npm --version
   # Expected: 10.x.x or higher
   ```

### Step 3.3 — Install Bun (recommended)

Bun is a faster alternative to npm/node for running the dev server.

1. Open PowerShell and run:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
2. **Close and reopen** PowerShell, then verify:
   ```powershell
   bun --version
   # Expected: 1.3.x or higher
   ```

> If the Bun installer fails, download the Windows binary directly from https://bun.sh/docs/installation#windows and add it to your PATH.

### Step 3.4 — Install Visual Studio Build Tools (for native modules)

> `better-sqlite3` is a C++ addon that must be compiled. On Windows, this requires the MSVC build tools.

1. Download **Visual Studio Build Tools 2022** from:
   **https://visualstudio.microsoft.com/visual-cpp-build-tools/**
2. Run the installer and select the **"Desktop development with C++"** workload
3. Ensure these components are checked:
   - MSVC v143 - VS 2022 C++ x64/x86 build tools
   - Windows 11 SDK (or Windows 10 SDK)
   - C++ CMake tools for Windows
4. Click **Install** (requires ~6 GB disk space)
5. Restart your computer after installation

> **Alternative (lighter):** If you don't want the full build tools, install **windows-build-tools** via npm:
> ```powershell
> npm install -g windows-build-tools
> ```
> ⚠️ This approach is less reliable; the full Build Tools are recommended.

### Step 3.5 — Install Visual Studio Code

1. Download from **https://code.visualstudio.com/**
2. Run the installer with these options:
   - ✅ "Add to PATH" (important)
   - ✅ "Register Code as an editor for supported file types"
   - ✅ "Add 'Open with Code' action to Windows Explorer"
3. Launch VS Code

#### Recommended VS Code Extensions

Open VS Code → press `Ctrl+Shift+X` → search and install:

| Extension | Publisher | Purpose |
|-----------|-----------|---------|
| **ES7+ React/Redux/React-Native snippets** | dsznajder | React snippets |
| **Tailwind CSS IntelliSense** | Tailwind Labs | Tailwind autocomplete |
| **TypeScript Vue Plugin (Volar)** | Vue | TS support (optional) |
| **Prettier - Code formatter** | Prettier | Code formatting |
| **ESLint** | Microsoft | Linting integration |
| **GitLens** | GitKraken | Git superpowers |
| **Better Comments** | Aaron Bond | Highlighted comments |
| **Path Intellisense** | Christian Kohler | Autocomplete filenames |
| **SQLite Viewer** | Florian Klampfer | View .db files in VS Code |

---

## 4. Clone the Repository

### Option A: Using VS Code's Git integration

1. Open VS Code
2. Press `Ctrl+Shift+P` → type **"Git: Clone"** → press Enter
3. Paste: `https://github.com/imanueli2312/tarombo.git`
4. Choose a folder (e.g., `C:\Projects\tarombo`)
5. When prompted, click **"Open"** to open the cloned repository

### Option B: Using PowerShell

```powershell
cd C:\Projects
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo
code .   # opens VS Code in this folder
```

### Configure Git (if not done already)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.autocrlf true   # Windows line-ending handling
```

---

## 5. Configure VS Code

### Recommended workspace settings

Create a `.vscode/settings.json` file in the project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "files.eol": "\n",
  "typescript.tsdk": "node_modules/typescript/lib",
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/db": true
  }
}
```

### Recommended tasks

Create a `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Dev Server",
      "type": "shell",
      "command": "bun run dev",
      "group": "build",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Lint",
      "type": "shell",
      "command": "bun run lint",
      "group": "build",
      "problemMatcher": ["$eslint-stylish"]
    },
    {
      "label": "Build",
      "type": "shell",
      "command": "bun run build",
      "group": "build",
      "problemMatcher": []
    }
  ]
}
```

Press `Ctrl+Shift+B` to run tasks, or `Ctrl+Shift+P` → "Tasks: Run Task".

---

## 6. Install Project Dependencies

### Full dependency list

The project uses these npm packages (see `package.json`):

#### Runtime dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^16.1.1 | Next.js framework |
| `react` / `react-dom` | ^19.0.0 | UI library |
| `better-sqlite3` | ^13.0.3 | SQLite database driver (native) |
| `next-auth` | ^4.24.11 | Authentication |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `d3` | ^7.9.0 | Family tree visualization |
| `jspdf` | ^4.2.1 | PDF export |
| `sharp` | ^0.34.3 | Image processing (native) |
| `tailwindcss` / `tw-animate-css` | ^4 / ^1.3.5 | CSS framework |
| `class-variance-authority` / `clsx` / `tailwind-merge` | various | Class utilities |
| `lucide-react` | ^0.525.0 | Icon library |
| `sonner` | ^2.0.6 | Toast notifications |
| `zod` | ^4.0.2 | Schema validation |
| `zustand` | ^5.0.6 | State management |
| `@tanstack/react-query` | ^5.82.0 | Server state |
| `@tanstack/react-table` | ^8.21.3 | Data tables |
| `framer-motion` | ^12.23.2 | Animations |
| `react-hook-form` / `@hookform/resolvers` | various | Forms |
| `react-markdown` / `react-syntax-highlighter` | various | Markdown |
| `uuid` | ^11.1.0 | ID generation |
| `date-fns` | ^4.1.0 | Date utilities |
| `next-themes` | ^0.4.6 | Theme support |
| `next-intl` | ^4.3.4 | Internationalization |
| `recharts` | ^2.15.4 | Charts |
| `vaul` | ^1.1.2 | Drawer component |
| `embla-carousel-react` | ^8.6.0 | Carousel |
| `react-day-picker` | ^9.8.0 | Date picker |
| `react-resizable-panels` | ^3.0.3 | Resizable panels |
| `cmdk` | ^1.1.1 | Command palette |
| `input-otp` | ^1.4.2 | OTP input |
| `@mdxeditor/editor` | ^3.39.1 | MDX editor |
| `@dnd-kit/core` / `sortable` / `utilities` | various | Drag-and-drop |
| `@reactuses/core` | ^6.0.5 | React hooks |
| `@radix-ui/react-*` (30 packages) | various | Headless UI primitives |
| `z-ai-web-dev-sdk` | ^0.0.18 | AI SDK (not used for core features) |

#### Dev dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5 | TypeScript compiler |
| `eslint` / `eslint-config-next` | ^9 / ^16.1.1 | Linting |
| `@tailwindcss/postcss` | ^4 | Tailwind PostCSS |
| `@types/react` / `@types/react-dom` | ^19 | React types |
| `@types/better-sqlite3` | ^9.6.0 | SQLite types |
| `@types/d3` | ^7.4.3 | D3 types |
| `@types/bcryptjs` | ^3.0.0 | bcrypt types |
| `bun-types` | ^1.3.4 | Bun types |
| `prisma` | ^6.11.1 | Prisma CLI (legacy, unused) |
| `@prisma/client` | ^6.11.1 | Prisma client (legacy, unused) |

> **Note:** `prisma` and `@prisma/client` remain in `package.json` from the scaffold but are **not used** by this project. The database is managed by `better-sqlite3` directly.

### Installation steps

#### Using Bun (recommended)

Open VS Code's integrated terminal (`Ctrl+` `` ` ``) and run:

```powershell
bun install
```

Then trust the native modules:

```powershell
bun pm trust better-sqlite3
```

#### Using npm (fallback)

```powershell
npm install
```

If `better-sqlite3` fails to compile, rebuild it:

```powershell
npm rebuild better-sqlite3
```

### Verify native modules

```powershell
# Test that better-sqlite3 loads correctly
node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); console.log('better-sqlite3 works:', db.prepare('SELECT 1 as x').get());"
```

Expected output:
```
better-sqlite3 works: { x: 1 }
```

---

## 7. Environment Configuration

### Create the `.env` file

In the project root, create a `.env` file:

```env
# Database path — use Windows path format with forward slashes
DATABASE_URL=file:./db/hariandja.db

# NextAuth secret — generate a strong random string for production
# Generate one at https://generate-secret.now.sh/32
NEXTAUTH_SECRET=your-strong-secret-here-at-least-32-chars

# NextAuth URL (set to your deployment URL in production)
NEXTAUTH_URL=http://localhost:3000
```

> ⚠️ The `.env` file is gitignored and will not be committed to the repository.

### Windows path notes

The database path in `src/lib/database.ts` uses `process.cwd()`:
```typescript
const DB_PATH = path.join(process.cwd(), "db", "hariandja.db");
```

This resolves correctly on Windows (e.g., `C:\Projects\tarombo\db\hariandja.db`). No changes needed.

---

## 8. Run the Development Server

### Using Bun (recommended)

In the VS Code terminal:

```powershell
bun run dev
```

### Using npm (fallback)

```powershell
npm run dev
```

> If using npm, first edit `package.json` and change the `dev` script from `next dev -p 3000 2>&1 | tee dev.log` to `next dev -p 3000` because the `tee` command is not available on Windows PowerShell. Alternatively, install `tee` via Git Bash.

### Expected output

```
▲ Next.js 16.1.3 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
✓ Ready in 660ms
```

Open **http://localhost:3000** in your browser. On first run:
- The SQLite database is created at `db/hariandja.db`
- Seed data is inserted (40 persons, 17 spouses, 2 users, 3 roles)

### Login with demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hariandja.id` | `admin123` |
| Editor | `editor@hariandja.id` | `editor123` |

---

## 9. Production Build on Windows

### Build the project

```powershell
bun run build
```

> ⚠️ The `build` script in `package.json` uses Unix `cp` commands. On Windows, you have two options:

#### Option A: Use the Windows-compatible build script

Edit `package.json` — replace the `build` script:

```json
"build": "next build && node scripts/copy-standalone.js"
```

Create `scripts/copy-standalone.js`:

```javascript
const fs = require("fs");
const path = require("path");

const standaloneDir = path.join(".next", "standalone");
const staticSrc = path.join(".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
const publicSrc = "public";
const publicDest = path.join(standaloneDir, "public");

if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log("✓ Copied .next/static to standalone");
}
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log("✓ Copied public to standalone");
}
```

#### Option B: Use Git Bash

```powershell
# In Git Bash terminal (not PowerShell)
bun run build
```

### Start the production server

```powershell
# Set NODE_ENV and start (PowerShell syntax)
$env:NODE_ENV="production"
bun .next/standalone/server.js
```

Or using npm:

```powershell
$env:NODE_ENV="production"
node .next/standalone/server.js
```

---

## 10. Database Management

### View the database in VS Code

1. Install the **"SQLite Viewer"** extension (by Florian Klampfer)
2. In the Explorer pane, navigate to `db/hariandja.db`
3. Click the file — it opens in a table viewer

### Reset the database

In PowerShell:

```powershell
Remove-Item db\hariandja.db, db\hariandja.db-shm, db\hariandja.db-wal -ErrorAction SilentlyContinue
bun run dev   # re-creates and re-seeds
```

### Backup the database

```powershell
# Create a timestamped backup
Copy-Item db\hariandja.db "db\hariandja-backup-$(Get-Date -Format 'yyyy-MM-dd').db"
```

### Restore from backup

```powershell
# Stop the server first, then:
Copy-Item "db\hariandja-backup-2026-08-07.db" db\hariandja.db -Force
```

---

## 11. Troubleshooting

### Problem: `better-sqlite3` build fails

**Error:** `MSBuild.exe` not found, or `node-gyp` errors.

**Solution:**
1. Ensure **Visual Studio Build Tools 2022** with C++ workload is installed
2. Open **"Developer PowerShell for VS 2022"** (from Start Menu) instead of regular PowerShell
3. Run:
   ```powershell
   npm rebuild better-sqlite3 --build-from-source
   ```

### Problem: `sharp` native module fails

**Error:** `sharp` or `libvips` errors during install.

**Solution:**
```powershell
bun remove sharp
bun add sharp
# or
npm rebuild sharp
```

### Problem: `tee` not recognized

**Error:** `'tee' is not recognized as an internal or external command`

**Solution:** The `dev` script uses Unix `tee`. Either:
- Use **Git Bash** terminal in VS Code, OR
- Edit `package.json` scripts to remove `| tee dev.log`:
  ```json
  "dev": "next dev -p 3000",
  "start": "node .next/standalone/server.js"
  ```

### Problem: Port 3000 already in use

**Error:** `EADDRINUSE: address already in use 0.0.0.0:3000`

**Solution:**
```powershell
# Find the process using port 3000
netstat -ano | findstr :3000
# Kill it (replace PID)
taskkill /PID <PID> /F
```

### Problem: Database is locked

**Error:** `SQLITE_BUSY: database is locked`

**Solution:** Stop the dev server, delete the WAL files, and restart:
```powershell
Remove-Item db\hariandja.db-shm, db\hariandja.db-wal -ErrorAction SilentlyContinue
bun run dev
```

### Problem: NextAuth session not working

**Cause:** `NEXTAUTH_URL` or `NEXTAUTH_SECRET` not set.

**Solution:** Ensure `.env` contains:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-at-least-32-characters-long
```

### Problem: Hot reload not working

**Solution:**
1. Ensure you're running `bun run dev` (not `start`)
2. Check that `next.config.ts` doesn't disable Turbopack
3. Try deleting `.next` cache:
   ```powershell
   Remove-Item .next -Recurse -Force
   bun run dev
   ```

### Problem: Long path errors

**Error:** `The specified path, file name, or both are too long`

**Solution:** Enable long path support in Windows:
1. Open **Registry Editor** as Admin
2. Navigate to `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
3. Set `LongPathsEnabled` to `1`
4. Restart your computer

Or run this in an elevated PowerShell:
```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Problem: Line ending warnings

**Error:** `warning: LF will be replaced by CRLF`

**Solution:** This is normal on Windows. The `.gitattributes` file or `git config core.autocrlf true` handles this automatically.

---

## 12. Deployment Checklist

Before deploying to a production server:

- [ ] **Visual Studio Build Tools 2022** installed with C++ workload
- [ ] **Node.js LTS** installed and in PATH
- [ ] **Bun** installed and in PATH
- [ ] **Git** configured with your name and email
- [ ] **VS Code** installed with recommended extensions
- [ ] Repository cloned to a short path (e.g., `C:\Projects\tarombo`)
- [ ] `bun install` completed without errors
- [ ] `bun pm trust better-sqlite3` executed
- [ ] `better-sqlite3` verification test passes
- [ ] `.env` file created with `NEXTAUTH_SECRET` set to a strong random value
- [ ] `bun run dev` starts successfully on port 3000
- [ ] Page loads at http://localhost:3000
- [ ] Database seeds automatically (40 persons appear in tree)
- [ ] Login works with demo accounts
- [ ] **Demo passwords changed** via Admin → Users
- [ ] `bun run lint` passes cleanly
- [ ] `bun run build` completes successfully
- [ ] Database backup scheduled (Windows Task Scheduler)

### Security hardening

- [ ] Change `admin@hariandja.id` password
- [ ] Change `editor@hariandja.id` password
- [ ] Set a strong `NEXTAUTH_SECRET` (32+ random characters)
- [ ] Restrict `upload/` directory permissions
- [ ] Set up HTTPS (use IIS, Caddy, or Nginx as reverse proxy)
- [ ] Configure Windows Firewall to allow only port 3000 (or 80/443)
- [ ] Set up automatic database backups

---

## Quick Reference — Common Commands

```powershell
# Development
bun run dev              # Start dev server (hot reload)
bun run lint             # Run ESLint
bun run build            # Production build

# Database
Remove-Item db\*.db*     # Reset database (restart to re-seed)
Copy-Item db\hariandja.db db\backup.db   # Backup database

# Git
git pull                 # Get latest changes
git add -A               # Stage all changes
git commit -m "message"  # Commit
git push                 # Push to remote

# Native module rebuild (if needed)
npm rebuild better-sqlite3
npm rebuild sharp
```

---

## Next Steps

- Read the [User Manual](./USER_MANUAL.md) for how to use the application
- Read the [Technical Documentation](./TECHNICAL_DOC.md) for architecture details
- Read the [Project Status](./PROJECT_STATUS.md) for current development state

---

*Horas! — Good luck with your deployment.* 🙏
