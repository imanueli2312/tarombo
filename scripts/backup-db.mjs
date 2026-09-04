/**
 * Backup database SQLite Tarombo — aman dijalankan saat aplikasi berjalan.
 *
 * Memakai online backup API better-sqlite3 (setara `sqlite3 .backup`):
 * snapshot konsisten meski database sedang aktif ditulis (mode WAL).
 *
 * Pemakaian (bun atau node sama-sama bisa):
 *   bun scripts/backup-db.mjs [direktori_tujuan]
 *   node scripts/backup-db.mjs [direktori_tujuan]
 *
 * Environment:
 *   DATABASE_PATH     — lokasi DB (default: db/tarombo.db)
 *   BACKUP_DIR        — direktori tujuan (default: ./backups)
 *   BACKUP_KEEP_DAYS  — hari sebelum backup lama dihapus (default: 14)
 *   BACKUP_GZIP       — set "1" untuk kompresi gzip (butuh gzip di PATH)
 *
 * Cron (backup harian jam 02:00):
 *   0 2 * * * cd /opt/tarombo && DATABASE_PATH=/data/tarombo.db \
 *     node scripts/backup-db.mjs /data/backups >> /var/log/tarombo-backup.log 2>&1
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'tarombo.db');
const BACKUP_DIR = process.argv[2] || process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 14);
const GZIP = process.env.BACKUP_GZIP === '1';

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[backup] Database tidak ditemukan: ${DB_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const dest = path.join(BACKUP_DIR, `tarombo-backup-${stamp}.db`);
  const tmp = dest + '.tmp';

  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    // Online backup (async) — snapshot konsisten meski ada penulisan bersamaan
    console.log(`[backup] Sumber : ${DB_PATH}`);
    console.log(`[backup] Tujuan : ${dest}`);
    await db.backup(tmp);
    console.log(`[backup] Snapshot selesai (${(fs.statSync(tmp).size / 1024).toFixed(1)} KB)`);
  } finally {
    db.close();
  }

  // Finalisasi: rename file temporer ke nama final
  fs.renameSync(tmp, dest);

  // Kompresi opsional (menghasilkan dest.gz, file mentah dihapus)
  if (GZIP) {
    execFileSync('gzip', ['-9', '-f', dest]);
    console.log(`[backup] Dikompresi: ${dest}.gz`);
  }

  // Prune: hapus backup lebih tua dari KEEP_DAYS
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  let pruned = 0;
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    if (!/^tarombo-backup-.*\.db(\.gz)?$/.test(f)) continue;
    const full = path.join(BACKUP_DIR, f);
    if (fs.statSync(full).mtimeMs < cutoff) {
      fs.unlinkSync(full);
      pruned++;
    }
  }
  if (pruned > 0) console.log(`[backup] Menghapus ${pruned} backup lama (> ${KEEP_DAYS} hari)`);

  const total = fs.readdirSync(BACKUP_DIR).filter((f) => /^tarombo-backup-/.test(f)).length;
  console.log(`[backup] OK — total ${total} backup tersimpan di ${BACKUP_DIR}`);
}

main().catch((err) => {
  console.error('[backup] GAGAL:', err);
  process.exit(1);
});
