# Berkontribusi ke Tarombo

Terima kasih atas minatnya menjaga pohon keluarga digital ini tetap sehat.
Aplikasi ini memikul kepercayaan data keluarga lintas generasi — setiap
perubahan harus melewati gerbang kualitas di bawah.

## Persiapan

```bash
bun install          # instal dependensi (lihat docs/DEPLOYMENT.md §5.5 untuk Windows)
bun run dev          # server dev di http://localhost:3000 (men-generate sw.js otomatis)
```

## Gerbang kualitas — WAJIB sebelum commit

```bash
bun run verify       # typecheck + lint + test + build (urutan lengkap)
```

Semua harus hijau. CI (GitHub Actions) menjalankan hal yang sama pada setiap
push/PR ke `main` — jika CI merah, jangan deploy.

## Alur kerja

1. Fork / branch baru dari `main` (`feat/nama-fitur` atau `fix/nama-bug`).
2. Perubahan kode disertai perubahan/penambahan **test** bila menyentuh
   `src/lib/**` (auth, validasi, transfer, adat-rules) atau endpoint API.
3. Jalankan `bun run verify`.
4. Commit dengan pesan konvensional ringkas dalam bahasa Indonesia atau
   Inggris (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
5. PR ke `main` — jelaskan APA dan MENGAPA (bukan hanya bagaimana).

## Konvensi penting

- **Keamanan**: endpoint baru WAJIB `getAuthUserAsync` + `hasPermission`
  (kecuali health/seed yang memang publik), body divalidasi zod via
  `src/lib/schemas.ts`, dan POST/PUT/DELETE memanggil `assertSameOrigin`.
- **Validasi**: skema zod untuk endpoint tulis — jangan `as` cast mentah.
- **Aksesibilitas**: komponen interaktif harus bisa dioperasikan keyboard dan
  punya label (aria-label bila ikon-saja).
- **Bahasa**: UI dan pesan error dalam Bahasa Indonesia; kode/komentar boleh
  campuran Indonesia-Inggris.
- **Migrasi DB**: tambahkan langkah bernomor di `SCHEMA_MIGRATIONS`
  (src/lib/db.ts) — harus idempoten, jangan pernah menomor ulang langkah lama.
- **Dependensi**: hapus yang tidak terpakai; verifikasi dengan grep sebelum
  menambah yang baru.

## Melaporkan kerentanan keamanan

JANGAN buka issue publik untuk celah keamanan — ikuti SECURITY.md.
