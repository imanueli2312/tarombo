# Kebijakan Keamanan — Tarombo

## Versi yang didukung

| Versi | Status |
| ----- | ------ |
| 0.6.x | didukung (cabang `main`) |
| < 0.6 | tidak didukung — mohon upgrade |

## Melaporkan kerentanan

Kami memperlakukan data silsilah keluarga sebagai data pribadi — celah
keamanan di aplikasi ini berpotensi membocorkannya, jadi laporan Anda sangat
berarti.

1. **JANGAN** membuka issue publik, PR, atau membahas celah di tempat terbuka.
2. Kirim laporan ke pemilik repositori secara privat (GitHub Security
   Advisory: tab **Security → Report a vulnerability** pada repo ini).
3. Sertakan jika memungkinkan: langkah reproduksi, dampak yang diperkirakan,
   versi aplikasi, dan environment (Docker/Windows native).

### Waktu tanggap

- Konfirmasi penerimaan: maksimal 72 jam.
- Penilaian awal + rencana perbaikan: maksimal 7 hari.
- Perbaikan untuk celah berdampak tinggi: target rilis dalam 14 hari; celah
  yang sulit dieksploitasi dapat menunggu rilis terjadwal.

Mohon beri kami waktu untuk memperbaiki sebelum publikasi. Laporan yang
disampaikan dengan itikad baik tidak akan ditindak.

## Hardening yang sudah berlaku

Ringkasan lapisan proteksi aktif (detail di docs/DEPLOYMENT.md dan CHANGELOG):

- Cookie sesi httpOnly + Secure (produksi) + SameSite=Lax; JWT HS256 dengan
  issuer/audience terverifikasi + revocasi `token_version` seketika.
- Login berlapis rate-limit (per-IP 30/15 mnt, per IP+email 5/15 mnt),
  bcrypt 12 putaran, dummy-hash timing-safe, verifikasi Origin/Referer.
- SQL 100% parameterisasi + escape pola LIKE; allow-list kolom di lapisan DB.
- Security headers lengkap (CSP tanpa unsafe-eval di produksi, HSTS, XFO
  DENY, nosniff, Referrer-Policy, Permissions-Policy).
- Service worker network-only untuk `/api/*` — data keluarga tidak
  meninggalkan jejak di Cache Storage.
- Ekspor/impor transfer atomik + dry-run + audit trail transfer_log.
