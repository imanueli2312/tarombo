# 🔒 Security Policy — Tarombo

Dokumen ini menjelaskan kebijakan keamanan, fitur keamanan yang diterapkan, dan cara melaporkan vulnerability.

---

## 📋 Daftar Isi

- [Fitur Keamanan](#fitur-keamanan)
- [Model RBAC](#model-rbac)
- [Autentikasi & Password](#autentikasi--password)
- [Data Sensitif](#data-sensitif)
- [Yang Perlu Diperhatikan](#yang-perlu-diperhatikan)
- [Pelaporan Vulnerability](#pelaporan-vulnerability)
- [Respons Timeline](#respons-timeline)
- [Best Practices untuk Deployment](#best-practices-untuk-deployment)

---

## Fitur Keamanan

### ✅ Yang Diterapkan

| Fitur | Implementasi | Status |
|-------|-------------|--------|
| **Password Hashing** | bcrypt (10 rounds) | ✅ |
| **Cookie httpOnly** | JavaScript tidak bisa akses cookie | ✅ |
| **SameSite=lax** | Proteksi CSRF | ✅ |
| **RBAC Enforcement** | Server-side `requirePermission()` di setiap API route | ✅ |
| **SQL Injection Protection** | Prepared statements (parameterized queries) | ✅ |
| **File Upload Validation** | Tipe gambar + max 10MB | ✅ |
| **Photo Resize & Strip Metadata** | sharp → 400×400 WebP | ✅ |
| **Activity Log / Audit Trail** | Semua aksi tercatat | ✅ |
| **Soft Delete** | Data tidak langsung hilang | ✅ |
| **Guest Viewer Publik** | Read-only, tanpa login | ✅ |
| **Login Wajib untuk Editor/Admin** | Password verification | ✅ |
| **Legacy Password Auto-upgrade** | Plain-text → bcrypt saat login pertama | ✅ |
| **CORS Locked** | Same-origin (tidak ada CORS header) | ✅ |

### ❌ Yang TIDAK Diterapkan (Limitasi)

| Fitur | Alasan | Mitigasi |
|-------|--------|----------|
| **Rate Limiting** | Tidak ada middleware rate-limit | Tambahkan di reverse proxy (Nginx `limit_req`) |
| **HTTPS Enforcement** | Tidak ada redirect otomatis | Setup di reverse proxy (Let's Encrypt) |
| **CSRF Token** | SameSite=lax cukup untuk most cases | Tambahkan `csurf` bila butuh |
| **2FA** | Tidak ada | Tambahkan bila butuh keamanan tinggi |
| **Session Expiry Warning** | Cookie 30 hari, no warning | Custom implementation bila perlu |
| **Password Strength Checker** | Tidak ada validasi kompleksitas | Tambahkan zod rule bila perlu |

---

## Model RBAC

### 3 Role Default

| Role | Akses | Login |
|------|-------|-------|
| **Viewer** | Read-only (lihat pohon + export) | ❌ Tidak perlu (publik) |
| **Editor** | CRUD person/partnership + export | ✅ Wajib |
| **Administrator** | Akses penuh (semua fitur) | ✅ Wajib |

### 13 Permission (6 Grup)

```
Orang:       person:view, person:create, person:edit, person:delete
Pasangan:    partnership:create, partnership:edit, partnership:delete
Pengguna:    user:view, user:manage
Role:        role:manage
Export:      export:view
Data:        data:seed, data:reset
```

### Enforcement Dua Lapis

1. **API (Server-side)**: Setiap route memanggil `requirePermission(perm)` → 403 bila tidak berhak
2. **UI (Client-side)**: Tombol/menu disembunyikan via `useActiveUser().can(perm)`

### Guest Viewer (Tanpa Login)

- Bila tidak ada cookie `tarombo_active_user` → user otomatis menjadi "Tamu" (Viewer)
- Permission: `person:view` + `export:view` saja
- **Tidak bisa** edit/tambah/hapus/manage
- Berguna untuk berbagi pohon keluarga ke kerabat tanpa registrasi

---

## Autentikasi & Password

### Alur Login

```
Guest (no cookie)
  ↓
Klik user → LoginDialog → input password
  ↓
POST /api/users/active { userId, password }
  ↓
Cari user di DB
  ↓
isBcryptHash(password)?
  ├─ Ya: verifyPassword(plain, hash) via bcrypt.compareSync
  └─ Tidak (legacy plain-text):
       plain === password?
       ├─ Ya: auto-upgrade ke bcrypt hash, simpan ke DB
       └─ Tidak: 403 "Password salah"
  ↓
Password benar?
  ├─ Tidak: 403, logActivity("login", success: false)
  └─ Ya:
       Set cookie tarombo_active_user (httpOnly, SameSite=lax, 30 hari)
       logActivity("login", success: true)
       Return ActiveUserPublic + permissions
```

### Password Storage

- **Algorithm**: bcrypt
- **Salt Rounds**: 10
- **Format**: `$2a$10$...` atau `$2b$10$...`
- **Auto-upgrade**: Plain-text password lama otomatis di-hash saat login pertama kali

### Cookie Configuration

```typescript
res.cookies.set(ACTIVE_COOKIE, userId, {
  httpOnly: true,      // JavaScript tidak bisa akses
  sameSite: "lax",     // Proteksi CSRF
  maxAge: 60 * 60 * 24 * 30,  // 30 hari
  path: "/",
});
```

### Logout

```http
DELETE /api/users/active
```

- Menghapus cookie `tarombo_active_user`
- User kembali ke guest Viewer
- `logActivity("logout")` tercatat

---

## Data Sensitif

### Yang Disimpan di Database

| Data | Lokasi | Proteksi |
|------|--------|----------|
| **Password** | `user.password` | bcrypt hash |
| **Email** | `user.email` | Plain text (data pribadi) |
| **Photo** | `person.photo`, `user.photo` | URL ke file di `public/uploads/` |
| **Activity log** | `activity_log.details` | JSON string (bisa berisi entity name) |

### Yang TIDAK Disimpan

- ❌ Token JWT (pakai cookie session)
- ❌ Data kartu kredit / pembayaran
- ❌ Data kesehatan / medis (kecuali tanggal lahir/wafat)
- ❌ Lokasi real-time (GPS tracking)

### File Uploads

- **Lokasi**: `public/uploads/`
- **Akses**: Publik (bisa diakses langsung via URL)
- **Validasi**: Hanya gambar (`image/*`), max 10MB
- **Processing**: Resize ke 400×400, convert WebP, strip metadata (sharp)
- **Nama file**: `photo-<timestamp>-<random>.webp` (tidak predictable)

### Backup File

- **Format**: JSON
- **Konten**: persons, partnerships, users (termasuk password hash), roles, activity_log
- **Akses**: Butuh permission `data:reset` (admin only)
- **Perhatian**: File backup berisi password hash — simpan di tempat aman

---

## Yang Perlu Diperhatikan

### ⚠️ Password Demo Default

Seed membuat akun dengan password default:
- `admin@tarombo.id` → `admin123`
- `robby@tarombo.id` → `robby123`

**Di produksi**: Ganti password ini segera via "Kelola Pengguna" setelah seed.

### ⚠️ Guest Viewer Publik

- Viewer bisa lihat pohon & export tanpa login
- Data keluarga (nama, tanggal lahir, alamat) **terlihat publik**
- Bila data sensitif → buat role custom tanpa `person:view` untuk guest, atau modifikasi `GUEST_PERMISSIONS`

### ⚠️ Activity Log Bisa Membesar

- Setiap aksi tercatat → tabel `activity_log` membesar seiring waktu
- **Mitigasi**: Rotate log (hapus entry >90 hari) via cron job

### ⚠️ SQLite File-Based

- Database = file `db/custom.db`
- Bila file rusak/hilang → **seluruh data hilang**
- **Mitigasi**: Backup berkala (cron job harian)

### ⚠️ uploads/ Folder Publik

- File di `public/uploads/` bisa diakses langsung via URL
- Sudah divalidasi hanya gambar, tapi tetap pertimbangkan bila ada data sensitif di foto

### ⚠️ CORS Tidak Dikonfigurasi

- Aplikasi same-origin (tidak ada CORS header)
- Bila API diakses dari domain lain → perlu setup CORS

---

## Pelaporan Vulnerability

Kami menghargai laporan vulnerability dari komunitas. Mohon laporkan dengan bertanggung jawab.

### Cara Melaporkan

1. **JANGAN** buat public GitHub issue untuk vulnerability
2. Email ke: **security@tarombo.app** (atau DM langsung ke maintainer)
3. Sertakan:
   - Deskripsi vulnerability
   - Langkah reproduksi (step-by-step)
   - Impact (apa yang bisa dilakukan attacker)
   - Saran fix (opsional)

### Scope

**Dalam scope**:
- Vulnerability di kode aplikasi Tarombo
- Bypass RBAC/permission
- SQL injection
- XSS / CSRF
- Path traversal
- Authentication bypass

**Di luar scope**:
- Vulnerability di dependency (lapor ke upstream)
- DDOS (gunakan rate limiting di infrastruktur)
- Social engineering
- Physical access attack

---

## Respons Timeline

| Tahap | Target Time | Deskripsi |
|-------|-------------|-----------|
| **Acknowledgment** | 48 jam | Konfirmasi penerimaan laporan |
| **Initial Assessment** | 7 hari | Klasifikasi severity & validasi |
| **Fix Development** | 30 hari | Develop patch (bisa lebih cepat untuk critical) |
| **Disclosure** | 90 hari | Public disclosure setelah fix dirilis |

### Severity Levels

| Level | Deskripsi | Response Time |
|-------|-----------|---------------|
| **Critical** | RCE, auth bypass, data leak massal | 24 jam |
| **High** | Privilege escalation, SQL injection | 48 jam |
| **Medium** | XSS, CSRF, info disclosure | 7 hari |
| **Low** | Info leak terbatas, UX issue | 30 hari |

---

## Best Practices untuk Deployment

### 1. Ganti Password Default

```bash
# Via UI: Kelola Pengguna → Edit → ganti password
# Atau via API:
curl -X PATCH http://localhost:3000/api/users/<admin-id> \
  -H "Content-Type: application/json" \
  -d '{"password":"<strong-password>"}' \
  -b /tmp/admin.cookie
```

### 2. Setup HTTPS

```bash
# Let's Encrypt (gratis)
sudo certbot --nginx -d tarombo.example.com
```

### 3. Firewall

```bash
# Hanya expose port 80/443 (bukan 3000)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp
sudo ufw enable
```

### 4. Rate Limiting (Nginx)

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://127.0.0.1:3000;
        }
    }
}
```

### 5. Backup Berkala

```bash
# Cron job backup harian
0 2 * * * /opt/tarombo/scripts/backup.sh
```

### 6. Monitor Activity Log

- Cek secara berkala untuk aktivitas mencurigakan
- Banyak login failure → kemungkinan brute force
- Export massal → kemungkinan data scraping

### 7. Update Dependency

```bash
# Cek vulnerability
npm audit

# Update package
npm update

# Rebuild & restart
npm run build
pm2 restart tarombo
```

### 8. Restrict Guest Access (Opsional)

Bila tidak ingin pohon publik, edit `GUEST_PERMISSIONS` di `src/lib/tarombo/permissions.ts`:

```typescript
// Viewer publik tidak bisa lihat pohon (harus login)
export const GUEST_PERMISSIONS: string[] = [];
// Atau hanya bisa lihat halaman login
export const GUEST_PERMISSIONS: string[] = ["user:view"]; // minimal
```

---

## Compliance

### GDPR (Bila melayani user EU)

- **Data collected**: nama, email, tanggal lahir, alamat, telepon, foto
- **Right to access**: User bisa lihat datanya via "Kelola Pengguna"
- **Right to deletion**: Soft delete → permanent delete dari Trash
- **Data portability**: Export backup JSON
- **Consent**: Saat registrasi, user consent untuk simpan data

### Catatan

Dokumen ini bukan legal advice. Konsultasi dengan ahli hukum untuk kepatuhan penuh.

---

## Contact

- **Security issues**: security@tarombo.app
- **General issues**: [GitHub Issues](https://github.com/imanueli2312/tarombo/issues)
- **Maintainer**: @imanueli2312

---

**Versi Dokumen**: 1.0 | **Update**: 2026-09-09
