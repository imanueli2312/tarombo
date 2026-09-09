-- ============================================================================
-- TAROMBO — Skema database SQLite (tanpa Prisma ORM)
-- Tabel dipisah: Person (pohon), User (akun), Role (RBAC), Partnership
-- ============================================================================

CREATE TABLE IF NOT EXISTS role (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#7a1f1f',
  icon        TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',  -- JSON array string
  is_system   INTEGER NOT NULL DEFAULT 0,   -- 0 = custom, 1 = system
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS person (
  id                TEXT PRIMARY KEY,
  full_name         TEXT NOT NULL,
  nickname          TEXT,
  birth_place       TEXT,
  birth_date        TEXT,
  death_date        TEXT,
  birth_order       INTEGER,
  gender            TEXT NOT NULL DEFAULT 'MALE',
  address           TEXT,
  religion          TEXT,
  phone             TEXT,
  photo             TEXT,
  marital_status    TEXT NOT NULL DEFAULT 'SINGLE',
  generation_number INTEGER,
  burial_name       TEXT,
  burial_address    TEXT,
  burial_lat        REAL,
  burial_lng        REAL,
  father_id         TEXT REFERENCES person(id) ON DELETE SET NULL,
  mother_id         TEXT REFERENCES person(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partnership (
  id            TEXT PRIMARY KEY,
  husband_id    TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  wife_id       TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  marriage_date TEXT,
  divorce_date  TEXT,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user (
  id               TEXT PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  password         TEXT NOT NULL,
  photo            TEXT,
  phone            TEXT,
  role_id          TEXT REFERENCES role(id) ON DELETE SET NULL,
  linked_person_id TEXT REFERENCES person(id) ON DELETE SET NULL,
  last_login_at    TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_person_father ON person(father_id);
CREATE INDEX IF NOT EXISTS idx_person_mother ON person(mother_id);
CREATE INDEX IF NOT EXISTS idx_person_gender ON person(gender);
CREATE INDEX IF NOT EXISTS idx_partnership_husband ON partnership(husband_id);
CREATE INDEX IF NOT EXISTS idx_partnership_wife ON partnership(wife_id);
CREATE INDEX IF NOT EXISTS idx_partnership_status ON partnership(status);
CREATE INDEX IF NOT EXISTS idx_user_role ON user(role_id);
CREATE INDEX IF NOT EXISTS idx_user_linked ON user(linked_person_id);
