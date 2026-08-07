# Panduan Deployment — Windows 11 + Visual Studio Code

**Proyek:** Tarombo Hariandja — Marga Hariandja Family Tree
**Target OS:** Windows 11 (64-bit)
**IDE:** Visual Studio Code
**Terakhir diperbarui:** 7 Agustus 2026

> **Bahasa:** [English](./DEPLOYMENT_WINDOWS.md) · **Indonesia** (file ini)

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Persyaratan Sistem](#2-persyaratan-sistem)
3. [Instal Prasyarat](#3-instal-prasyarat)
4. [Kloning Repositori](#4-kloning-repositori)
5. [Konfigurasi VS Code](#5-konfigurasi-vs-code)
6. [Instal Dependensi Proyek](#6-instal-dependensi-proyek)
7. [Konfigurasi Lingkungan](#7-konfigurasi-lingkungan)
8. [Jalankan Server Pengembangan](#8-jalankan-server-pengembangan)
9. [Build Produksi di Windows](#9-build-produksi-di-windows)
10. [Manajemen Basis Data](#10-manajemen-basis-data)
11. [Penyelesaian Masalah](#11-penyelesaian-masalah)
12. [Daftar Periksa Deployment](#12-daftar-periksa-deployment)

---

## 1. Gambaran Umum

Panduan ini memandu Anda dalam menyiapkan proyek Tarombo Hariandja pada mesin **Windows 11** menggunakan **Visual Studio Code**. Proyek ini adalah aplikasi Next.js 16 yang menggunakan **better-sqlite3** (addon C++ native), yang memerlukan penanganan khusus pada Windows.

> ⚠️ **Pertimbangan utama Windows:** Modul native `better-sqlite3` harus dikompilasi untuk versi Node.js Anda. Panduan ini mencakup dua pendekatan: **Bun** (disarankan, lebih cepat) dan **Node.js + npm** (alternatif cadangan).

---

## 2. Persyaratan Sistem

| Persyaratan | Minimum | Disarankan |
|-------------|---------|-------------|
| **OS** | Windows 10 (64-bit) | Windows 11 (64-bit) |
| **RAM** | 4 GB | 8 GB+ |
| **Ruang disk** | 1 GB bebas | 2 GB bebas |
| **PowerShell** | 5.1 | 7+ (Windows Terminal) |
| **Hak admin** | Diperlukan untuk instalasi tools | — |

### Fitur Windows yang dibutuhkan
- **Windows Subsystem for Linux (WSL 2)** — *opsional namun disarankan* untuk kompatibilitas terbaik
- **Git for Windows** — diperlukan untuk kloning dan version control
- **.NET Framework 4.8+** — biasanya sudah terinstal di Windows 11

---

## 3. Instal Prasyarat

### Langkah 3.1 — Instal Git for Windows

1. Unduh dari **https://git-scm.com/download/win**
2. Jalankan installer dengan opsi berikut:
   - **Components:** Centang "Git Bash Here" dan "Git GUI Here"
   - **Default editor:** Biarkan Git menggunakan VS Code
   - **PATH:** "Git from the command line and also from 3rd-party software"
3. Verifikasi di PowerShell:
   ```powershell
   git --version
   # Expected: git version 2.45.x.windows.x
   ```

### Langkah 3.2 — Instal Node.js (LTS)

> Diperlukan bahkan jika Anda menggunakan Bun, karena `better-sqlite3` dikompilasi terhadap header Node.js.

1. Unduh **versi LTS (v20.x atau v22.x)** dari **https://nodejs.org/**
2. Jalankan installer dengan opsi default (termasuk npm)
3. Verifikasi di jendela PowerShell **baru**:
   ```powershell
   node --version
   # Expected: v20.x.x or v22.x.x
   npm --version
   # Expected: 10.x.x or higher
   ```

### Langkah 3.3 — Instal Bun (disarankan)

Bun adalah alternatif yang lebih cepat dibanding npm/node untuk menjalankan dev server.

1. Buka PowerShell dan jalankan:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
2. **Tutup dan buka kembali** PowerShell, lalu verifikasi:
   ```powershell
   bun --version
   # Expected: 1.3.x or higher
   ```

> Jika installer Bun gagal, unduh binary Windows langsung dari https://bun.sh/docs/installation#windows dan tambahkan ke PATH Anda.

### Langkah 3.4 — Instal Visual Studio Build Tools (untuk modul native)

> `better-sqlite3` adalah addon C++ yang harus dikompilasi. Pada Windows, ini memerlukan MSVC build tools.

1. Unduh **Visual Studio Build Tools 2022** dari:
   **https://visualstudio.microsoft.com/visual-cpp-build-tools/**
2. Jalankan installer dan pilih workload **"Desktop development with C++"**
3. Pastikan komponen-komponen berikut dicentang:
   - MSVC v143 - VS 2022 C++ x64/x86 build tools
   - Windows 11 SDK (or Windows 10 SDK)
   - C++ CMake tools for Windows
4. Klik **Install** (memerlukan ~6 GB ruang disk)
5. Mulai ulang komputer Anda setelah instalasi

> **Alternatif (lebih ringan):** Jika Anda tidak menginginkan build tools lengkap, instal **windows-build-tools** melalui npm:
> ```powershell
> npm install -g windows-build-tools
> ```
> ⚠️ Pendekatan ini kurang andal; Build Tools lengkap lebih disarankan.

### Langkah 3.5 — Instal Visual Studio Code

1. Unduh dari **https://code.visualstudio.com/**
2. Jalankan installer dengan opsi berikut:
   - ✅ "Add to PATH" (penting)
   - ✅ "Register Code as an editor for supported file types"
   - ✅ "Add 'Open with Code' action to Windows Explorer"
3. Jalankan VS Code

#### Ekstensi VS Code yang Direkomendasikan

Buka VS Code → tekan `Ctrl+Shift+X` → cari dan instal:

| Extension | Publisher | Tujuan |
|-----------|-----------|---------|
| **ES7+ React/Redux/React-Native snippets** | dsznajder | React snippets |
| **Tailwind CSS IntelliSense** | Tailwind Labs | Tailwind autocomplete |
| **TypeScript Vue Plugin (Volar)** | Vue | Dukungan TS (opsional) |
| **Prettier - Code formatter** | Prettier | Format kode |
| **ESLint** | Microsoft | Integrasi linting |
| **GitLens** | GitKraken | Fitur Git lanjutan |
| **Better Comments** | Aaron Bond | Komentar yang disorot |
| **Path Intellisense** | Christian Kohler | Autocomplete nama file |
| **SQLite Viewer** | Florian Klampfer | Lihat file .db di VS Code |

---

## 4. Kloning Repositori

### Opsi A: Menggunakan integrasi Git VS Code

1. Buka VS Code
2. Tekan `Ctrl+Shift+P` → ketik **"Git: Clone"** → tekan Enter
3. Tempel: `https://github.com/imanueli2312/tarombo.git`
4. Pilih folder (mis., `C:\Projects\tarombo`)
5. Saat diminta, klik **"Open"** untuk membuka repositori yang dikloning

### Opsi B: Menggunakan PowerShell

```powershell
cd C:\Projects
git clone https://github.com/imanueli2312/tarombo.git
cd tarombo
code .   # opens VS Code in this folder
```

### Konfigurasi Git (jika belum dilakukan)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.autocrlf true   # Windows line-ending handling
```

---

## 5. Konfigurasi VS Code

### Pengaturan workspace yang disarankan

Buat file `.vscode/settings.json` di root proyek:

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

### Tasks yang disarankan

Buat `.vscode/tasks.json`:

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

Tekan `Ctrl+Shift+B` untuk menjalankan tasks, atau `Ctrl+Shift+P` → "Tasks: Run Task".

---

## 6. Instal Dependensi Proyek

### Daftar dependensi lengkap

Proyek ini menggunakan paket-paket npm berikut (lihat `package.json`):

#### Dependensi runtime
| Package | Version | Tujuan |
|---------|---------|---------|
| `next` | ^16.1.1 | Framework Next.js |
| `react` / `react-dom` | ^19.0.0 | Library UI |
| `better-sqlite3` | ^13.0.3 | Driver database SQLite (native) |
| `next-auth` | ^4.24.11 | Autentikasi |
| `bcryptjs` | ^3.0.3 | Hashing password |
| `d3` | ^7.9.0 | Visualisasi family tree |
| `jspdf` | ^4.2.1 | Ekspor PDF |
| `sharp` | ^0.34.3 | Pemrosesan gambar (native) |
| `tailwindcss` / `tw-animate-css` | ^4 / ^1.3.5 | Framework CSS |
| `class-variance-authority` / `clsx` / `tailwind-merge` | various | Utilitas class |
| `lucide-react` | ^0.525.0 | Library ikon |
| `sonner` | ^2.0.6 | Notifikasi toast |
| `zod` | ^4.0.2 | Validasi schema |
| `zustand` | ^5.0.6 | Manajemen state |
| `@tanstack/react-query` | ^5.82.0 | State server |
| `@tanstack/react-table` | ^8.21.3 | Tabel data |
| `framer-motion` | ^12.23.2 | Animasi |
| `react-hook-form` / `@hookform/resolvers` | various | Formulir |
| `react-markdown` / `react-syntax-highlighter` | various | Markdown |
| `uuid` | ^11.1.0 | Pembuatan ID |
| `date-fns` | ^4.1.0 | Utilitas tanggal |
| `next-themes` | ^0.4.6 | Dukungan tema |
| `next-intl` | ^4.3.4 | Internasionalisasi |
| `recharts` | ^2.15.4 | Chart |
| `vaul` | ^1.1.2 | Komponen drawer |
| `embla-carousel-react` | ^8.6.0 | Carousel |
| `react-day-picker` | ^9.8.0 | Date picker |
| `react-resizable-panels` | ^3.0.3 | Panel yang dapat diubah ukurannya |
| `cmdk` | ^1.1.1 | Command palette |
| `input-otp` | ^1.4.2 | Input OTP |
| `@mdxeditor/editor` | ^3.39.1 | Editor MDX |
| `@dnd-kit/core` / `sortable` / `utilities` | various | Drag-and-drop |
| `@reactuses/core` | ^6.0.5 | React hooks |
| `@radix-ui/react-*` (30 packages) | various | Primitif UI headless |
| `z-ai-web-dev-sdk` | ^0.0.18 | AI SDK (tidak digunakan untuk fitur inti) |

#### Dependensi dev
| Package | Version | Tujuan |
|---------|---------|---------|
| `typescript` | ^5 | Compiler TypeScript |
| `eslint` / `eslint-config-next` | ^9 / ^16.1.1 | Linting |
| `@tailwindcss/postcss` | ^4 | Tailwind PostCSS |
| `@types/react` / `@types/react-dom` | ^19 | Tipe React |
| `@types/better-sqlite3` | ^9.6.0 | Tipe SQLite |
| `@types/d3` | ^7.4.3 | Tipe D3 |
| `@types/bcryptjs` | ^3.0.0 | Tipe bcrypt |
| `bun-types` | ^1.3.4 | Tipe Bun |
| `prisma` | ^6.11.1 | Prisma CLI (legacy, tidak digunakan) |
| `@prisma/client` | ^6.11.1 | Prisma client (legacy, tidak digunakan) |

> **Catatan:** `prisma` dan `@prisma/client` masih ada di `package.json` dari scaffold namun **tidak digunakan** oleh proyek ini. Database dikelola langsung oleh `better-sqlite3`.

### Langkah instalasi

#### Menggunakan Bun (disarankan)

Buka terminal terintegrasi VS Code (`Ctrl+` `` ` ``) dan jalankan:

```powershell
bun install
```

Kemudian trust modul native:

```powershell
bun pm trust better-sqlite3
```

#### Menggunakan npm (alternatif cadangan)

```powershell
npm install
```

Jika `better-sqlite3` gagal dikompilasi, rebuild:

```powershell
npm rebuild better-sqlite3
```

### Verifikasi modul native

```powershell
# Test that better-sqlite3 loads correctly
node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); console.log('better-sqlite3 works:', db.prepare('SELECT 1 as x').get());"
```

Output yang diharapkan:
```
better-sqlite3 works: { x: 1 }
```

---

## 7. Konfigurasi Lingkungan

### Buat file `.env`

Di root proyek, buat file `.env`:

```env
# Database path — use Windows path format with forward slashes
DATABASE_URL=file:./db/hariandja.db

# NextAuth secret — generate a strong random string for production
# Generate one at https://generate-secret.now.sh/32
NEXTAUTH_SECRET=your-strong-secret-here-at-least-32-chars

# NextAuth URL (set to your deployment URL in production)
NEXTAUTH_URL=http://localhost:3000
```

> ⚠️ File `.env` di-gitignore dan tidak akan di-commit ke repositori.

### Catatan path Windows

Path database di `src/lib/database.ts` menggunakan `process.cwd()`:
```typescript
const DB_PATH = path.join(process.cwd(), "db", "hariandja.db");
```

Ini diresolusi dengan benar di Windows (mis., `C:\Projects\tarombo\db\hariandja.db`). Tidak perlu perubahan.

---

## 8. Jalankan Server Pengembangan

### Menggunakan Bun (disarankan)

Di terminal VS Code:

```powershell
bun run dev
```

### Menggunakan npm (alternatif cadangan)

```powershell
npm run dev
```

> Jika menggunakan npm, pertama edit `package.json` dan ubah script `dev` dari `next dev -p 3000 2>&1 | tee dev.log` menjadi `next dev -p 3000` karena perintah `tee` tidak tersedia di Windows PowerShell. Sebagai alternatif, instal `tee` melalui Git Bash.

### Output yang diharapkan

```
▲ Next.js 16.1.3 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
✓ Ready in 660ms
```

Buka **http://localhost:3000** di browser Anda. Pada first run:
- Database SQLite dibuat di `db/hariandja.db`
- Data seed dimasukkan (40 persons, 17 spouses, 2 users, 3 roles)

### Login dengan akun demo

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hariandja.id` | `admin123` |
| Editor | `editor@hariandja.id` | `editor123` |

---

## 9. Build Produksi di Windows

### Build proyek

```powershell
bun run build
```

> ⚠️ Script `build` di `package.json` menggunakan perintah Unix `cp`. Di Windows, Anda memiliki dua opsi:

#### Opsi A: Gunakan script build yang kompatibel dengan Windows

Edit `package.json` — ganti script `build`:

```json
"build": "next build && node scripts/copy-standalone.js"
```

Buat `scripts/copy-standalone.js`:

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

#### Opsi B: Gunakan Git Bash

```powershell
# In Git Bash terminal (not PowerShell)
bun run build
```

### Mulai server produksi

```powershell
# Set NODE_ENV and start (PowerShell syntax)
$env:NODE_ENV="production"
bun .next/standalone/server.js
```

Atau menggunakan npm:

```powershell
$env:NODE_ENV="production"
node .next/standalone/server.js
```

---

## 10. Manajemen Basis Data

### Lihat database di VS Code

1. Instal ekstensi **"SQLite Viewer"** (oleh Florian Klampfer)
2. Di panel Explorer, navigasikan ke `db/hariandja.db`
3. Klik file — akan terbuka di table viewer

### Reset database

Di PowerShell:

```powershell
Remove-Item db\hariandja.db, db\hariandja.db-shm, db\hariandja.db-wal -ErrorAction SilentlyContinue
bun run dev   # re-creates and re-seeds
```

### Backup database

```powershell
# Create a timestamped backup
Copy-Item db\hariandja.db "db\hariandja-backup-$(Get-Date -Format 'yyyy-MM-dd').db"
```

### Restore dari backup

```powershell
# Stop the server first, then:
Copy-Item "db\hariandja-backup-2026-08-07.db" db\hariandja.db -Force
```

---

## 11. Penyelesaian Masalah

### Masalah: build `better-sqlite3` gagal

**Error:** `MSBuild.exe` tidak ditemukan, atau error `node-gyp`.

**Solusi:**
1. Pastikan **Visual Studio Build Tools 2022** dengan workload C++ terinstal
2. Buka **"Developer PowerShell for VS 2022"** (dari Start Menu) alih-alih PowerShell biasa
3. Jalankan:
   ```powershell
   npm rebuild better-sqlite3 --build-from-source
   ```

### Masalah: modul native `sharp` gagal

**Error:** Error `sharp` atau `libvips` saat instal.

**Solusi:**
```powershell
bun remove sharp
bun add sharp
# or
npm rebuild sharp
```

### Masalah: `tee` tidak dikenali

**Error:** `'tee' is not recognized as an internal or external command`

**Solusi:** Script `dev` menggunakan `tee` Unix. Anda dapat:
- Menggunakan terminal **Git Bash** di VS Code, ATAU
- Edit script `package.json` untuk menghapus `| tee dev.log`:
  ```json
  "dev": "next dev -p 3000",
  "start": "node .next/standalone/server.js"
  ```

### Masalah: Port 3000 sudah digunakan

**Error:** `EADDRINUSE: address already in use 0.0.0.0:3000`

**Solusi:**
```powershell
# Find the process using port 3000
netstat -ano | findstr :3000
# Kill it (replace PID)
taskkill /PID <PID> /F
```

### Masalah: Database terkunci

**Error:** `SQLITE_BUSY: database is locked`

**Solusi:** Hentikan dev server, hapus file WAL, lalu mulai ulang:
```powershell
Remove-Item db\hariandja.db-shm, db\hariandja.db-wal -ErrorAction SilentlyContinue
bun run dev
```

### Masalah: Sesi NextAuth tidak berfungsi

**Penyebab:** `NEXTAUTH_URL` atau `NEXTAUTH_SECRET` tidak diset.

**Solusi:** Pastikan `.env` berisi:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-at-least-32-characters-long
```

### Masalah: Hot reload tidak berfungsi

**Solusi:**
1. Pastikan Anda menjalankan `bun run dev` (bukan `start`)
2. Periksa bahwa `next.config.ts` tidak menonaktifkan Turbopack
3. Coba hapus cache `.next`:
   ```powershell
   Remove-Item .next -Recurse -Force
   bun run dev
   ```

### Masalah: Error path terlalu panjang

**Error:** `The specified path, file name, or both are too long`

**Solusi:** Aktifkan dukungan path panjang di Windows:
1. Buka **Registry Editor** sebagai Admin
2. Navigasikan ke `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
3. Set `LongPathsEnabled` menjadi `1`
4. Mulai ulang komputer Anda

Atau jalankan ini di PowerShell yang elevated:
```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Masalah: Peringatan line ending

**Error:** `warning: LF will be replaced by CRLF`

**Solusi:** Ini normal di Windows. File `.gitattributes` atau `git config core.autocrlf true` menangani ini secara otomatis.

---

## 12. Daftar Periksa Deployment

Sebelum deploy ke server produksi:

- [ ] **Visual Studio Build Tools 2022** terinstal dengan workload C++
- [ ] **Node.js LTS** terinstal dan ada di PATH
- [ ] **Bun** terinstal dan ada di PATH
- [ ] **Git** dikonfigurasi dengan nama dan email Anda
- [ ] **VS Code** terinstal dengan ekstensi yang direkomendasikan
- [ ] Repositori dikloning ke path yang pendek (mis., `C:\Projects\tarombo`)
- [ ] `bun install` selesai tanpa error
- [ ] `bun pm trust better-sqlite3` dijalankan
- [ ] Tes verifikasi `better-sqlite3` lulus
- [ ] File `.env` dibuat dengan `NEXTAUTH_SECRET` diset ke nilai random yang kuat
- [ ] `bun run dev` berjalan sukses di port 3000
- [ ] Halaman dimuat di http://localhost:3000
- [ ] Database ter-seed otomatis (40 persons muncul di tree)
- [ ] Login berfungsi dengan akun demo
- [ ] **Password demo diubah** melalui Admin → Users
- [ ] `bun run lint` lulus tanpa error
- [ ] `bun run build` selesai dengan sukses
- [ ] Backup database terjadwal (Windows Task Scheduler)

### Pengerasan Keamanan

- [ ] Ubah password `admin@hariandja.id`
- [ ] Ubah password `editor@hariandja.id`
- [ ] Set `NEXTAUTH_SECRET` yang kuat (32+ karakter acak)
- [ ] Batasi permission direktori `upload/`
- [ ] Siapkan HTTPS (gunakan IIS, Caddy, atau Nginx sebagai reverse proxy)
- [ ] Konfigurasi Windows Firewall untuk hanya mengizinkan port 3000 (atau 80/443)
- [ ] Siapkan backup database otomatis

---

## Referensi Cepat — Perintah Umum

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

## Langkah Selanjutnya

- Baca [User Manual](./USER_MANUAL.md) untuk cara menggunakan aplikasi
- Baca [Technical Documentation](./TECHNICAL_DOC.md) untuk detail arsitektur
- Baca [Project Status](./PROJECT_STATUS.md) untuk status pengembangan saat ini

---

*Horas! — Semoga sukses dengan deployment Anda.* 🙏
