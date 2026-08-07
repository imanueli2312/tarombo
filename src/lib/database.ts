import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "db", "hariandja.db");

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Initialize schema
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT NOT NULL DEFAULT '{}',
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role_id TEXT NOT NULL,
    person_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS persons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nickname TEXT,
    place_of_birth TEXT,
    date_of_birth TEXT,
    date_of_death TEXT,
    birth_order INTEGER DEFAULT 0,
    gender TEXT NOT NULL CHECK(gender IN ('male','female')),
    residential_address TEXT,
    religion TEXT,
    phone_number TEXT,
    photo TEXT,
    marital_status TEXT,
    generation INTEGER DEFAULT 1,
    father_id TEXT,
    mother_id TEXT,
    parent_id TEXT,
    burial_name TEXT,
    burial_address TEXT,
    burial_lat REAL,
    burial_lng REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (father_id) REFERENCES persons(id) ON DELETE SET NULL,
    FOREIGN KEY (mother_id) REFERENCES persons(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES persons(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS spouses (
    id TEXT PRIMARY KEY,
    husband_id TEXT NOT NULL,
    wife_id TEXT NOT NULL,
    marriage_date TEXT,
    divorce_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (husband_id) REFERENCES persons(id) ON DELETE CASCADE,
    FOREIGN KEY (wife_id) REFERENCES persons(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_persons_father ON persons(father_id);
  CREATE INDEX IF NOT EXISTS idx_persons_mother ON persons(mother_id);
  CREATE INDEX IF NOT EXISTS idx_persons_parent ON persons(parent_id);
  CREATE INDEX IF NOT EXISTS idx_spouses_husband ON spouses(husband_id);
  CREATE INDEX IF NOT EXISTS idx_spouses_wife ON spouses(wife_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    entity_name TEXT,
    changes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

  CREATE TABLE IF NOT EXISTS registration_requests (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    person_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON registration_requests(status);
`);

export { sqlite };
export default sqlite;
