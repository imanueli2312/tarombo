import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

// ============================================================================
// Koneksi SQLite (better-sqlite3) — tanpa Prisma, tanpa Cloud, tanpa SaaS
// ============================================================================

const DB_DIR = join(process.cwd(), "db");
const DB_PATH = join(DB_DIR, "custom.db");
const SCHEMA_PATH = join(DB_DIR, "schema.sql");

// Pastikan folder db ada
mkdirSync(DB_DIR, { recursive: true });

export const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Inisialisasi skema bila tabel belum ada
function initSchema() {
  const applied = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='person'",
    )
    .get() as { name: string } | undefined;

  if (!applied) {
    const sql = readFileSync(SCHEMA_PATH, "utf-8");
    sqlite.exec(sql);
  }
}
initSchema();

export type Db = typeof sqlite;
