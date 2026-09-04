import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DEFAULT_PERMISSIONS, ALL_PERMISSIONS } from '@/types';
import { sanitizeLikePattern } from '@/lib/validation';
import { normalizeMarga } from '@/lib/batak-culture';

/** Tipe instance database better-sqlite3 (dipakai modul lain) */
export type SQLiteDatabase = Database.Database;

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'tarombo.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Pastikan direktori database ada (fresh clone tidak lagi membawa db)
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initializeSchema(_db);
  runMigrations(_db);
  seedDefaultData(_db);

  return _db;
}

/**
 * Kerangka migrasi skema terversi via PRAGMA user_version (audit S-08).
 *
 * Aturan:
 * - Setiap langkah HARUS idempoten (aman dijalankan ulang) karena database
 *   lama yang dibuat sebelum kerangka ini ada masih memiliki user_version = 0
 *   dan akan menjalankan semua langkah sekaligus.
 * - Version selalu naik monoton; jangan pernah menyisipkan nomor yang sudah
 *   terpakai, tambahkan langkah baru di ekor array.
 * - initializeSchema() tetap memakai CREATE TABLE IF NOT EXISTS untuk database
 *   baru; migrasi menangani ALTER pada database yang sudah berisi data.
 */
interface SchemaMigration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const SCHEMA_MIGRATIONS: SchemaMigration[] = [
  {
    version: 1,
    description: 'kolom kultural Batak pada persons (migrasi ad-hoc lama, kini terversi)',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(persons)').all() as { name: string }[];
      const colNames = new Set(cols.map((c) => c.name));
      const legacy: { col: string; def: string }[] = [
        { col: 'marga_asal', def: "ALTER TABLE persons ADD COLUMN marga_asal TEXT NOT NULL DEFAULT ''" },
        { col: 'tempat_asal', def: "ALTER TABLE persons ADD COLUMN tempat_asal TEXT NOT NULL DEFAULT ''" },
        { col: 'pendidikan', def: "ALTER TABLE persons ADD COLUMN pendidikan TEXT NOT NULL DEFAULT ''" },
        { col: 'pekerjaan', def: "ALTER TABLE persons ADD COLUMN pekerjaan TEXT NOT NULL DEFAULT ''" },
        { col: 'keterangan', def: "ALTER TABLE persons ADD COLUMN keterangan TEXT NOT NULL DEFAULT ''" },
      ];
      for (const m of legacy) {
        if (!colNames.has(m.col)) db.exec(m.def);
      }
    },
  },
  {
    version: 2,
    description: 'revocasi sesi (audit T-02) — kolom token_version pada users',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
      if (!cols.some((c) => c.name === 'token_version')) {
        db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');
      }
    },
  },
];

function runMigrations(db: Database.Database) {
  const current = Number(db.pragma('user_version', { simple: true })) || 0;
  for (const m of SCHEMA_MIGRATIONS) {
    if (m.version <= current) continue;
    try {
      m.up(db);
      db.pragma(`user_version = ${m.version}`);
      console.info(`[db] migrasi skema v${m.version} diterapkan: ${m.description}`);
    } catch (error) {
      console.error(`[db] migrasi skema v${m.version} GAGAL:`, error);
      throw error;
    }
  }
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','editor','admin')),
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS persons (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL DEFAULT '',
      nama_panggilan TEXT NOT NULL DEFAULT '',
      tempat_lahir TEXT NOT NULL DEFAULT '',
      tanggal_lahir TEXT,
      tanggal_kematian TEXT,
      nomor_urut_lahir INTEGER,
      jenis_kelamin TEXT NOT NULL DEFAULT 'L' CHECK(jenis_kelamin IN ('L','P')),
      alamat TEXT NOT NULL DEFAULT '',
      agama TEXT NOT NULL DEFAULT '',
      nomor_telepon TEXT NOT NULL DEFAULT '',
      photo TEXT,
      status_pernikahan TEXT NOT NULL DEFAULT 'belum_menikah' CHECK(status_pernikahan IN ('belum_menikah','menikah','cerai','duda','janda')),
      nomor_generasi INTEGER NOT NULL DEFAULT 1,
      burial_nama TEXT,
      burial_alamat TEXT,
      burial_latitude REAL,
      burial_longitude REAL,
      marga_asal TEXT NOT NULL DEFAULT '',
      tempat_asal TEXT NOT NULL DEFAULT '',
      pendidikan TEXT NOT NULL DEFAULT '',
      pekerjaan TEXT NOT NULL DEFAULT '',
      keterangan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partnerships (
      id TEXT PRIMARY KEY,
      person1_id TEXT NOT NULL,
      person2_id TEXT NOT NULL,
      marriage_date TEXT,
      divorce_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (person1_id) REFERENCES persons(id) ON DELETE CASCADE,
      FOREIGN KEY (person2_id) REFERENCES persons(id) ON DELETE CASCADE,
      CHECK(person1_id != person2_id)
    );

    CREATE TABLE IF NOT EXISTS parent_child (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES persons(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES persons(id) ON DELETE CASCADE,
      CHECK(parent_id != child_id),
      UNIQUE(parent_id, child_id)
    );

    CREATE TABLE IF NOT EXISTS rbac_permissions (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('viewer','editor','admin')),
      permission TEXT NOT NULL,
      allowed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(role, permission)
    );

    CREATE INDEX IF NOT EXISTS idx_persons_nama ON persons(nama);
    CREATE INDEX IF NOT EXISTS idx_persons_generasi ON persons(nomor_generasi);
    CREATE INDEX IF NOT EXISTS idx_partnerships_p1 ON partnerships(person1_id);
    CREATE INDEX IF NOT EXISTS idx_partnerships_p2 ON partnerships(person2_id);
    CREATE INDEX IF NOT EXISTS idx_parent_child_parent ON parent_child(parent_id);
    CREATE INDEX IF NOT EXISTS idx_parent_child_child ON parent_child(child_id);
    CREATE INDEX IF NOT EXISTS idx_rbac_role ON rbac_permissions(role);

    CREATE TABLE IF NOT EXISTS oral_histories (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'turian_umum' CHECK(category IN ('turian_asal_usul','turian_migrasi','turian_peristiwa','gondang','mangalahat','saur_matua','pesta_pernikahan','turian_umum')),
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      source_person_name TEXT NOT NULL DEFAULT '',
      recorded_date TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pusaka_items (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'lainnya' CHECK(type IN ('tombak','ulos','tunggal_panaluan','gorga','gabe','hasangapon','rattan_box','kalung_bulan','gutar_guar','tali_tiga','porhala','jamita','sial_solam_sial_sao','lainnya')),
      description TEXT NOT NULL DEFAULT '',
      origin TEXT NOT NULL DEFAULT '',
      image TEXT,
      passed_from_person_id TEXT,
      year_acquired TEXT,
      is_sacred INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
      FOREIGN KEY (passed_from_person_id) REFERENCES persons(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_oral_histories_person ON oral_histories(person_id);
    CREATE INDEX IF NOT EXISTS idx_oral_histories_category ON oral_histories(category);
    CREATE INDEX IF NOT EXISTS idx_pusaka_person ON pusaka_items(person_id);
    CREATE INDEX IF NOT EXISTS idx_pusaka_type ON pusaka_items(type);

    -- Audit trail untuk semua operasi transfer data (ekspor/impor/pusaka)
    CREATE TABLE IF NOT EXISTS transfer_log (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('export_json','export_gedcom','import_json','import_csv','import_gedcom','pusaka_transfer','marga_book_export','generasi_recompute')),
      actor_email TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_transfer_log_created ON transfer_log(created_at);
  `);
}

let seeded = false;

function seedDefaultData(db: Database.Database) {
  if (seeded) return;

  // INSERT OR IGNORE memakai constraint UNIQUE(role, permission):
  // - database baru: semua permission default terisi
  // - database lama: permission baru (mis. view_marga_book, transfer_data)
  //   otomatis ditambahkan tanpa menimpa penyesuaian admin
  const insertPerm = db.prepare(
    'INSERT OR IGNORE INTO rbac_permissions (id, role, permission, allowed) VALUES (?, ?, ?, ?)'
  );
  const insertMany = db.transaction((perms: { role: string; permission: string; allowed: boolean }[]) => {
    for (const p of perms) {
      insertPerm.run(crypto.randomUUID(), p.role, p.permission, p.allowed ? 1 : 0);
    }
  });

  const allPerms: { role: string; permission: string; allowed: boolean }[] = [];
  for (const [role, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
    const permSet = new Set(permissions);
    for (const perm of ALL_PERMISSIONS) {
      allPerms.push({ role, permission: perm, allowed: permSet.has(perm) });
    }
  }
  insertMany(allPerms);
  seeded = true;
}

// Person CRUD

/** Parameter paginasi standar (audit S-06) */
export interface PageOptions {
  limit?: number;
  offset?: number;
}

export function getPersons(db: Database.Database, page?: PageOptions) {
  const sql = 'SELECT * FROM persons ORDER BY nomor_generasi, nama';
  if (page?.limit != null) {
    return db.prepare(`${sql} LIMIT ? OFFSET ?`).all(page.limit, page.offset ?? 0) as import('@/types').Person[];
  }
  return db.prepare(sql).all() as import('@/types').Person[];
}

export function countPersons(db: Database.Database): number {
  return (db.prepare('SELECT COUNT(*) as c FROM persons').get() as { c: number }).c;
}

export function getPersonById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as import('@/types').Person | undefined;
}

export function createPerson(db: Database.Database, data: import('@/types').PersonCreate & { id: string }) {
  const { father_id, mother_id, ...fields } = data;
  db.prepare(`
    INSERT INTO persons (id, nama, nama_panggilan, tempat_lahir, tanggal_lahir, tanggal_kematian,
      nomor_urut_lahir, jenis_kelamin, alamat, agama, nomor_telepon, photo, status_pernikahan,
      nomor_generasi, burial_nama, burial_alamat, burial_latitude, burial_longitude,
      marga_asal, tempat_asal, pendidikan, pekerjaan, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    // Kolom NOT NULL: string kosong disimpan sebagai '' (bukan null)
    data.id, data.nama ?? '', data.nama_panggilan ?? '', data.tempat_lahir ?? '',
    data.tanggal_lahir ?? null, data.tanggal_kematian ?? null,
    data.nomor_urut_lahir ?? null, data.jenis_kelamin, data.alamat ?? '',
    data.agama ?? '', data.nomor_telepon ?? '', data.photo ?? null,
    data.status_pernikahan ?? 'belum_menikah', data.nomor_generasi ?? 1,
    data.burial_nama ?? null, data.burial_alamat ?? null,
    data.burial_latitude ?? null, data.burial_longitude ?? null,
    data.marga_asal ?? '', data.tempat_asal ?? '',
    data.pendidikan ?? '', data.pekerjaan ?? '', data.keterangan ?? ''
  );

  if (father_id) {
    db.prepare('INSERT OR IGNORE INTO parent_child (id, parent_id, child_id) VALUES (?, ?, ?)')
      .run(crypto.randomUUID(), father_id, data.id);
  }
  if (mother_id) {
    db.prepare('INSERT OR IGNORE INTO parent_child (id, parent_id, child_id) VALUES (?, ?, ?)')
      .run(crypto.randomUUID(), mother_id, data.id);
  }

  return getPersonById(db, data.id);
}

export function updatePerson(db: Database.Database, id: string, data: import('@/types').PersonUpdate) {
  const { father_id, mother_id, ...fields } = data;

  const updates: string[] = [];
  const values: unknown[] = [];

  const allowedFields = ['nama','nama_panggilan','tempat_lahir','tanggal_lahir','tanggal_kematian','nomor_urut_lahir','jenis_kelamin','alamat','agama','nomor_telepon','photo','status_pernikahan','nomor_generasi','burial_nama','burial_alamat','burial_latitude','burial_longitude','marga_asal','tempat_asal','pendidikan','pekerjaan','keterangan'];

  for (const f of allowedFields) {
    if (fields[f as keyof typeof fields] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(fields[f as keyof typeof fields]);
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE persons SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  // Handle parent links
  if (father_id !== undefined) {
    db.prepare('DELETE FROM parent_child WHERE child_id = ? AND parent_id IN (SELECT id FROM persons WHERE jenis_kelamin = ?)').run(id, 'L');
    if (father_id) {
      db.prepare('INSERT OR IGNORE INTO parent_child (id, parent_id, child_id) VALUES (?, ?, ?)')
        .run(crypto.randomUUID(), father_id, id);
    }
  }
  if (mother_id !== undefined) {
    db.prepare('DELETE FROM parent_child WHERE child_id = ? AND parent_id IN (SELECT id FROM persons WHERE jenis_kelamin = ?)').run(id, 'P');
    if (mother_id) {
      db.prepare('INSERT OR IGNORE INTO parent_child (id, parent_id, child_id) VALUES (?, ?, ?)')
        .run(crypto.randomUUID(), mother_id, id);
    }
  }

  // Auto-divorce logic: if person just died, set divorce_date on active partnerships
  if (data.tanggal_kematian) {
    db.prepare(`
      UPDATE partnerships SET divorce_date = ?, updated_at = datetime('now')
      WHERE (person1_id = ? OR person2_id = ?) AND divorce_date IS NULL
    `).run(data.tanggal_kematian, id, id);

    // Update spouse marital status
    const activePartnerships = db.prepare(
      'SELECT person1_id, person2_id FROM partnerships WHERE (person1_id = ? OR person2_id = ?) AND divorce_date = ?'
    ).all(id, id, data.tanggal_kematian) as { person1_id: string; person2_id: string }[];

    for (const p of activePartnerships) {
      const spouseId = p.person1_id === id ? p.person2_id : p.person1_id;
      const spouse = getPersonById(db, spouseId);
      if (spouse) {
        const newStatus = spouse.jenis_kelamin === 'L' ? 'duda' : 'janda';
        db.prepare("UPDATE persons SET status_pernikahan = ?, updated_at = datetime('now') WHERE id = ?")
          .run(newStatus, spouseId);
      }
    }

    // Update own status
    const person = getPersonById(db, id);
    if (person) {
      const newStatus = person.jenis_kelamin === 'L' ? 'duda' : 'janda';
      db.prepare("UPDATE persons SET status_pernikahan = ?, updated_at = datetime('now') WHERE id = ?")
        .run(newStatus, id);
    }
  }

  return getPersonById(db, id);
}

export function deletePerson(db: Database.Database, id: string) {
  // Collect all descendant IDs recursively
  const descendantIds = collectDescendantIds(db, id);
  const allIds = [id, ...descendantIds];

  const deletePartnerships = db.prepare('DELETE FROM partnerships WHERE person1_id = ? OR person2_id = ?');
  const deleteParentChild = db.prepare('DELETE FROM parent_child WHERE parent_id = ? OR child_id = ?');
  const deletePerson = db.prepare('DELETE FROM persons WHERE id = ?');

  const fixStaleMaritalStatus = db.prepare(`
    UPDATE persons SET status_pernikahan =
      CASE
        WHEN tanggal_kematian IS NOT NULL THEN
          CASE WHEN jenis_kelamin = 'L' THEN 'duda' ELSE 'janda' END
        ELSE 'belum_menikah'
      END,
      updated_at = datetime('now')
    WHERE status_pernikahan = 'menikah'
      AND id NOT IN (
        SELECT person1_id FROM partnerships WHERE divorce_date IS NULL
        UNION
        SELECT person2_id FROM partnerships WHERE divorce_date IS NULL
      )
  `);

  const tx = db.transaction(() => {
    for (const did of allIds) {
      deletePartnerships.run(did, did);
      deleteParentChild.run(did, did);
      deletePerson.run(did);
    }
    // Fix stale marital statuses for surviving spouses after cascade deletion
    fixStaleMaritalStatus.run();
  });
  tx();

  return { deleted: allIds.length };
}

function collectDescendantIds(db: Database.Database, personId: string): string[] {
  const children = db.prepare('SELECT child_id FROM parent_child WHERE parent_id = ?').all(personId) as { child_id: string }[];
  let ids: string[] = [];
  for (const c of children) {
    ids.push(c.child_id);
    ids = ids.concat(collectDescendantIds(db, c.child_id));
  }
  return ids;
}

// Partnership CRUD
export function getPartnerships(db: Database.Database, page?: PageOptions) {
  const sql = 'SELECT * FROM partnerships ORDER BY marriage_date DESC NULLS LAST';
  if (page?.limit != null) {
    return db.prepare(`${sql} LIMIT ? OFFSET ?`).all(page.limit, page.offset ?? 0) as import('@/types').Partnership[];
  }
  return db.prepare(sql).all() as import('@/types').Partnership[];
}

export function countPartnerships(db: Database.Database): number {
  return (db.prepare('SELECT COUNT(*) as c FROM partnerships').get() as { c: number }).c;
}

export function getPartnershipById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM partnerships WHERE id = ?').get(id) as import('@/types').Partnership | undefined;
}

export function createPartnership(db: Database.Database, data: import('@/types').PartnershipCreate & { id: string }) {
  // Enforce monogamy: check for active partnerships (either column)
  const existing1 = db.prepare(
    'SELECT id FROM partnerships WHERE (person1_id = ? OR person2_id = ?) AND divorce_date IS NULL'
  ).get(data.person1_id, data.person1_id);
  if (existing1) throw new Error('Orang ini sudah memiliki pasangan aktif');

  const existing2 = db.prepare(
    'SELECT id FROM partnerships WHERE (person1_id = ? OR person2_id = ?) AND divorce_date IS NULL'
  ).get(data.person2_id, data.person2_id);
  if (existing2) throw new Error('Orang ini sudah memiliki pasangan aktif');

  db.prepare(
    'INSERT INTO partnerships (id, person1_id, person2_id, marriage_date, divorce_date) VALUES (?, ?, ?, ?, ?)'
  ).run(data.id, data.person1_id, data.person2_id, data.marriage_date ?? null, null);

  // Update both persons' marital status
  db.prepare("UPDATE persons SET status_pernikahan = 'menikah', updated_at = datetime('now') WHERE id = ?").run(data.person1_id);
  db.prepare("UPDATE persons SET status_pernikahan = 'menikah', updated_at = datetime('now') WHERE id = ?").run(data.person2_id);

  return getPartnershipById(db, data.id);
}

export function updatePartnership(db: Database.Database, id: string, data: { marriage_date?: string | null; divorce_date?: string | null }) {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.marriage_date !== undefined) {
    updates.push('marriage_date = ?');
    values.push(data.marriage_date);
  }
  if (data.divorce_date !== undefined) {
    updates.push('divorce_date = ?');
    values.push(data.divorce_date);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE partnerships SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  // If divorce_date is set, update marital statuses
  if (data.divorce_date) {
    const p = getPartnershipById(db, id);
    if (p) {
      db.prepare("UPDATE persons SET status_pernikahan = 'cerai', updated_at = datetime('now') WHERE id = ?").run(p.person1_id);
      db.prepare("UPDATE persons SET status_pernikahan = 'cerai', updated_at = datetime('now') WHERE id = ?").run(p.person2_id);
    }
  }

  return getPartnershipById(db, id);
}

export function deletePartnership(db: Database.Database, id: string) {
  const p = getPartnershipById(db, id);
  db.prepare('DELETE FROM partnerships WHERE id = ?').run(id);

  if (p) {
    const p1 = getPersonById(db, p.person1_id);
    const p2 = getPersonById(db, p.person2_id);
    if (p1) {
      const hasOther = db.prepare('SELECT id FROM partnerships WHERE (person1_id = ? OR person2_id = ?) AND divorce_date IS NULL AND id != ?').get(p1.id, p1.id, id);
      if (!hasOther) {
        const newStatus = p1.tanggal_kematian ? (p1.jenis_kelamin === 'L' ? 'duda' : 'janda') : 'belum_menikah';
        db.prepare("UPDATE persons SET status_pernikahan = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, p1.id);
      }
    }
    if (p2) {
      const hasOther = db.prepare('SELECT id FROM partnerships WHERE (person1_id = ? OR person2_id = ?) AND divorce_date IS NULL AND id != ?').get(p2.id, p2.id, id);
      if (!hasOther) {
        const newStatus = p2.tanggal_kematian ? (p2.jenis_kelamin === 'L' ? 'duda' : 'janda') : 'belum_menikah';
        db.prepare("UPDATE persons SET status_pernikahan = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, p2.id);
      }
    }
  }

  return { deleted: true };
}

// Tree data
export function getTreeData(db: Database.Database): import('@/types').TreeNode[] {
  const persons = getPersons(db);
  const partnerships = getPartnerships(db);
  const parentChild = db.prepare('SELECT parent_id, child_id FROM parent_child').all() as { parent_id: string; child_id: string }[];

  const personMap = new Map<string, import('@/types').Person>();
  for (const p of persons) personMap.set(p.id, p);

  // Build children map (deduplicated)
  const childrenMap = new Map<string, string[]>();
  for (const pc of parentChild) {
    const existing = childrenMap.get(pc.parent_id) || [];
    if (!existing.includes(pc.child_id)) {
      existing.push(pc.child_id);
      childrenMap.set(pc.parent_id, existing);
    }
  }

  // Build spouse map (active partnerships only)
  const spouseMap = new Map<string, { id: string; nama: string; nama_panggilan: string; jenis_kelamin: import('@/types').Gender; tanggal_lahir: string | null; tanggal_kematian: string | null; status_pernikahan: import('@/types').MaritalStatus; photo: string | null; marga_asal: string } | null>();
  for (const p of partnerships) {
    if (p.divorce_date) continue;
    const p1 = personMap.get(p.person1_id);
    const p2 = personMap.get(p.person2_id);
    if (!p1 || !p2) continue;
    spouseMap.set(p.person1_id, {
      id: p2.id, nama: p2.nama, nama_panggilan: p2.nama_panggilan,
      jenis_kelamin: p2.jenis_kelamin, tanggal_lahir: p2.tanggal_lahir,
      tanggal_kematian: p2.tanggal_kematian, status_pernikahan: p2.status_pernikahan,
      photo: p2.photo, marga_asal: p2.marga_asal,
    });
    spouseMap.set(p.person2_id, {
      id: p1.id, nama: p1.nama, nama_panggilan: p1.nama_panggilan,
      jenis_kelamin: p1.jenis_kelamin, tanggal_lahir: p1.tanggal_lahir,
      tanggal_kematian: p1.tanggal_kematian, status_pernikahan: p1.status_pernikahan,
      photo: p1.photo, marga_asal: p1.marga_asal,
    });
  }

  // Find root nodes (persons with no parents AND not appearing as someone's spouse)
  const hasParent = new Set<string>();
  for (const pc of parentChild) hasParent.add(pc.child_id);
  const spouseIds = new Set<string>();
  for (const p of partnerships) {
    if (!p.divorce_date) {
      spouseIds.add(p.person1_id);
      spouseIds.add(p.person2_id);
    }
  }
  // Root = no parents, and either has children (blood lineage) or is not a spouse
  // This prevents married-in spouses (no parents, no blood children) from appearing as separate roots
  const hasChild = new Set<string>();
  for (const pc of parentChild) hasChild.add(pc.parent_id);
  const rootPersons = persons.filter(p => {
    if (hasParent.has(p.id)) return false; // has parents → not a root
    if (hasChild.has(p.id)) return true; // has children → blood lineage root
    if (!spouseIds.has(p.id)) return true; // not a spouse → standalone person (orphan record)
    return false; // is a spouse without children → skip (shown as spouse card)
  });

  // Build tree recursively
  const visited = new Set<string>();

  function buildNode(person: import('@/types').Person): import('@/types').TreeNode {
    const childIds = childrenMap.get(person.id) || [];
    const children = childIds
      .map(cid => personMap.get(cid))
      .filter((c): c is import('@/types').Person => !!c && !visited.has(c.id))
      .map(c => {
        visited.add(c.id);
        return buildNode(c);
      });

    return {
      id: person.id,
      nama: person.nama,
      nama_panggilan: person.nama_panggilan,
      jenis_kelamin: person.jenis_kelamin,
      tanggal_lahir: person.tanggal_lahir,
      tanggal_kematian: person.tanggal_kematian,
      status_pernikahan: person.status_pernikahan,
      nomor_generasi: person.nomor_generasi,
      photo: person.photo,
      marga_asal: person.marga_asal,
      spouse: spouseMap.get(person.id) || null,
      children,
    };
  }

  return rootPersons.map(p => {
    visited.add(p.id);
    return buildNode(p);
  });
}

// Search
export function searchPersons(db: Database.Database, q: string) {
  const safe = sanitizeLikePattern(q);
  return db.prepare(
    `SELECT * FROM persons WHERE nama LIKE ? ESCAPE '\' OR nama_panggilan LIKE ? ESCAPE '\' ORDER BY nomor_generasi, nama LIMIT 50`
  ).all(`%${safe}%`, `%${safe}%`) as import('@/types').Person[];
}

// RBAC
export function getPermissionsForRole(db: Database.Database, role: string): import('@/types').RBACPermission[] {
  const rows = db.prepare('SELECT * FROM rbac_permissions WHERE role = ?').all(role) as (Omit<import('@/types').RBACPermission, 'allowed'> & { allowed: number })[];
  return rows.map(r => ({ ...r, allowed: r.allowed === 1 }));
}

export function getAllPermissions(db: Database.Database): import('@/types').RBACPermission[] {
  const rows = db.prepare('SELECT * FROM rbac_permissions ORDER BY role, permission').all() as (Omit<import('@/types').RBACPermission, 'allowed'> & { allowed: number })[];
  return rows.map(r => ({ ...r, allowed: r.allowed === 1 }));
}

export function updatePermission(db: Database.Database, id: string, allowed: boolean): import('@/types').RBACPermission {
  db.prepare('UPDATE rbac_permissions SET allowed = ? WHERE id = ?').run(allowed ? 1 : 0, id);
  const row = db.prepare('SELECT * FROM rbac_permissions WHERE id = ?').get(id) as (Omit<import('@/types').RBACPermission, 'allowed'> & { allowed: number });
  return { ...row, allowed: row.allowed === 1 };
}

export function hasPermission(db: Database.Database, role: string, permission: string): boolean {
  if (role === 'admin') return true;
  const row = db.prepare('SELECT allowed FROM rbac_permissions WHERE role = ? AND permission = ?').get(role, permission) as { allowed: number } | undefined;
  return row ? row.allowed === 1 : false;
}

// Users
export function getUsers(db: Database.Database, page?: PageOptions) {
  const sql = 'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at';
  if (page?.limit != null) {
    return db.prepare(`${sql} LIMIT ? OFFSET ?`).all(page.limit, page.offset ?? 0) as import('@/types').User[];
  }
  return db.prepare(sql).all() as import('@/types').User[];
}

export function countUsers(db: Database.Database): number {
  return (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
}

export function getUserById(db: Database.Database, id: string) {
  return db.prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?').get(id) as import('@/types').User | undefined;
}

export function getUserByEmail(db: Database.Database, email: string) {
  // Case-insensitive agar email dengan kapitalisasi berbeda tidak membuat akun ganda
  return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as (import('@/types').User & { password_hash: string; token_version: number }) | undefined;
}

/**
 * Data user untuk validasi sesi di getAuthUserAsync (revocasi, audit T-02).
 * Dipisah dari getUserById agar tidak mengubah bentuk respons API publik.
 */
export function getUserSessionData(db: Database.Database, id: string) {
  return db
    .prepare('SELECT id, email, name, role, token_version FROM users WHERE id = ?')
    .get(id) as { id: string; email: string; name: string; role: import('@/types').UserRole; token_version: number } | undefined;
}

/** Naikkan token_version — semua JWT yang diterbitkan sebelumnya langsung hangus. */
export function bumpTokenVersion(db: Database.Database, id: string) {
  db.prepare("UPDATE users SET token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?").run(id);
}

export function createUser(db: Database.Database, data: import('@/types').UserCreate & { id: string; password_hash: string }) {
  db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)')
    .run(data.id, data.email, data.password_hash, data.name, data.role);
  return getUserById(db, data.id);
}

export function updateUser(db: Database.Database, id: string, data: import('@/types').UserUpdate & { password_hash?: string }) {
  if (data.name !== undefined) {
    db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").run(data.name, id);
  }
  if (data.role !== undefined) {
    db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(data.role, id);
    // Perubahan role = perubahan hak istimewa — invalidasi semua token lama
    // (audit T-02: demote/promote harus berlaku seketika).
    bumpTokenVersion(db, id);
  }
  if (data.password_hash) {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(data.password_hash, id);
    // Ganti password = kredensial baru — semua sesi lama wajib login ulang.
    bumpTokenVersion(db, id);
  }
  return getUserById(db, id);
}

export function deleteUser(db: Database.Database, id: string) {
  // Naikkan versi dulu (walau baris akan dihapus) agar token aktif yang beredar
  // tidak lolos validasi iat-versi jika akun dengan id sama dibuat ulang nanti.
  bumpTokenVersion(db, id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { deleted: true };
}

// Parent-child helpers
export function getParentsOf(db: Database.Database, personId: string) {
  const rows = db.prepare(`
    SELECT p.* FROM persons p
    JOIN parent_child pc ON p.id = pc.parent_id
    WHERE pc.child_id = ?
  `).all(personId) as import('@/types').Person[];
  return { father: rows.find(r => r.jenis_kelamin === 'L'), mother: rows.find(r => r.jenis_kelamin === 'P') };
}

export function getChildrenOf(db: Database.Database, personId: string) {
  return db.prepare(`
    SELECT p.* FROM persons p
    JOIN parent_child pc ON p.id = pc.child_id
    WHERE pc.parent_id = ?
  `).all(personId) as import('@/types').Person[];
}

export function getActiveSpouseOf(db: Database.Database, personId: string) {
  const row = db.prepare(`
    SELECT p.* FROM persons p
    JOIN partnerships ps ON (p.id = CASE WHEN ps.person1_id = ? THEN ps.person2_id ELSE ps.person1_id END)
    WHERE (ps.person1_id = ? OR ps.person2_id = ?) AND ps.divorce_date IS NULL
  `).get(personId, personId, personId) as import('@/types').Person | undefined;
  return row || null;
}

// Oral History CRUD
export function getOralHistories(db: Database.Database, page?: PageOptions) {
  const sql = `
    SELECT oh.*, p.nama as person_nama, p.nama_panggilan as person_panggilan, p.jenis_kelamin as person_jenis_kelamin, p.marga_asal
    FROM oral_histories oh
    JOIN persons p ON oh.person_id = p.id
    ORDER BY oh.created_at DESC
  `;
  if (page?.limit != null) {
    return db.prepare(`${sql} LIMIT ? OFFSET ?`).all(page.limit, page.offset ?? 0) as (import('@/types').OralHistory & { person_nama: string; person_panggilan: string; person_jenis_kelamin: string; marga_asal: string })[];
  }
  return db.prepare(sql).all() as (import('@/types').OralHistory & { person_nama: string; person_panggilan: string; person_jenis_kelamin: string; marga_asal: string })[];
}

export function countOralHistories(db: Database.Database): number {
  return (db.prepare('SELECT COUNT(*) as c FROM oral_histories').get() as { c: number }).c;
}

export function getOralHistoryById(db: Database.Database, id: string) {
  return db.prepare(`
    SELECT oh.*, p.nama as person_nama, p.nama_panggilan as person_panggilan, p.jenis_kelamin as person_jenis_kelamin, p.marga_asal
    FROM oral_histories oh
    JOIN persons p ON oh.person_id = p.id
    WHERE oh.id = ?
  `).get(id) as (import('@/types').OralHistory & { person_nama: string; person_panggilan: string; person_jenis_kelamin: string; marga_asal: string }) | undefined;
}

export function getOralHistoriesByPerson(db: Database.Database, personId: string) {
  return db.prepare(`
    SELECT * FROM oral_histories WHERE person_id = ? ORDER BY created_at DESC
  `).all(personId) as import('@/types').OralHistory[];
}

export function createOralHistory(db: Database.Database, data: import('@/types').OralHistoryCreate & { id: string }) {
  db.prepare(`
    INSERT INTO oral_histories (id, person_id, category, title, content, source_person_name, recorded_date, is_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(data.id, data.person_id, data.category, data.title, data.content ?? '', data.source_person_name || null, data.recorded_date ?? null, data.is_verified ? 1 : 0);
  return getOralHistoryById(db, data.id);
}

export function updateOralHistory(db: Database.Database, id: string, data: Partial<import('@/types').OralHistoryCreate>) {
  const updates: string[] = [];
  const values: unknown[] = [];
  const allowed = ['person_id','category','title','content','source_person_name','recorded_date','is_verified'];
  for (const f of allowed) {
    if (data[f as keyof typeof data] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'is_verified' ? (data.is_verified ? 1 : 0) : (data[f as keyof typeof data] ?? null));
    }
  }
  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE oral_histories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  return getOralHistoryById(db, id);
}

export function deleteOralHistory(db: Database.Database, id: string) {
  db.prepare('DELETE FROM oral_histories WHERE id = ?').run(id);
  return { deleted: true };
}

// Pusaka CRUD
export function getPusakaItems(db: Database.Database, page?: PageOptions) {
  const sql = `
    SELECT pi.*, p.nama as person_nama, p.nama_panggilan as person_panggilan, p.jenis_kelamin as person_jenis_kelamin, p.marga_asal,
      pf.nama as passed_from_nama
    FROM pusaka_items pi
    JOIN persons p ON pi.person_id = p.id
    LEFT JOIN persons pf ON pi.passed_from_person_id = pf.id
    ORDER BY pi.created_at DESC
  `;
  if (page?.limit != null) {
    return db.prepare(`${sql} LIMIT ? OFFSET ?`).all(page.limit, page.offset ?? 0) as (import('@/types').PusakaItem & { person_nama: string; person_panggilan: string; person_jenis_kelamin: string; marga_asal: string; passed_from_nama: string | null })[];
  }
  return db.prepare(sql).all() as (import('@/types').PusakaItem & { person_nama: string; person_panggilan: string; person_jenis_kelamin: string; marga_asal: string; passed_from_nama: string | null })[];
}

export function countPusakaItems(db: Database.Database): number {
  return (db.prepare('SELECT COUNT(*) as c FROM pusaka_items').get() as { c: number }).c;
}

export function getPusakaById(db: Database.Database, id: string) {
  return db.prepare(`
    SELECT pi.*, p.nama as person_nama, p.nama_panggilan as person_panggilan, p.jenis_kelamin as person_jenis_kelamin, p.marga_asal,
      pf.nama as passed_from_nama
    FROM pusaka_items pi
    JOIN persons p ON pi.person_id = p.id
    LEFT JOIN persons pf ON pi.passed_from_person_id = pf.id
    WHERE pi.id = ?
  `).get(id) as (import('@/types').PusakaItem & { person_nama: string; person_panggilan: string; person_jenis_kelamin: string; marga_asal: string; passed_from_nama: string | null }) | undefined;
}

export function getPusakaByPerson(db: Database.Database, personId: string) {
  return db.prepare(`
    SELECT * FROM pusaka_items WHERE person_id = ? ORDER BY created_at DESC
  `).all(personId) as import('@/types').PusakaItem[];
}

export function createPusakaItem(db: Database.Database, data: import('@/types').PusakaCreate & { id: string }) {
  db.prepare(`
    INSERT INTO pusaka_items (id, person_id, name, type, description, origin, image, passed_from_person_id, year_acquired, is_sacred)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(data.id, data.person_id, data.name, data.type, data.description ?? '', data.origin ?? '', data.image ?? null, data.passed_from_person_id ?? null, data.year_acquired ?? null, data.is_sacred ? 1 : 0);
  return getPusakaById(db, data.id);
}

export function updatePusakaItem(db: Database.Database, id: string, data: Partial<import('@/types').PusakaCreate>) {
  const updates: string[] = [];
  const values: unknown[] = [];
  const allowed = ['person_id','name','type','description','origin','image','passed_from_person_id','year_acquired','is_sacred'];
  for (const f of allowed) {
    if (data[f as keyof typeof data] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'is_sacred' ? (data.is_sacred ? 1 : 0) : (data[f as keyof typeof data] ?? null));
    }
  }
  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE pusaka_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  return getPusakaById(db, id);
}

export function deletePusakaItem(db: Database.Database, id: string) {
  db.prepare('DELETE FROM pusaka_items WHERE id = ?').run(id);
  return { deleted: true };
}

// Heritage stats for statistics panel
export function getHeritageStats(db: Database.Database) {
  const oralCount = db.prepare('SELECT COUNT(*) as c FROM oral_histories').get() as { c: number };
  const pusakaCount = db.prepare('SELECT COUNT(*) as c FROM pusaka_items').get() as { c: number };
  const sacredCount = db.prepare('SELECT COUNT(*) as c FROM pusaka_items WHERE is_sacred = 1').get() as { c: number };
  const verifiedCount = db.prepare('SELECT COUNT(*) as c FROM oral_histories WHERE is_verified = 1').get() as { c: number };

  const oralByCategory = db.prepare(`
    SELECT category, COUNT(*) as jumlah FROM oral_histories GROUP BY category ORDER BY jumlah DESC
  `).all() as { category: string; jumlah: number }[];

  const pusakaByType = db.prepare(`
    SELECT type, COUNT(*) as jumlah FROM pusaka_items GROUP BY type ORDER BY jumlah DESC
  `).all() as { type: string; jumlah: number }[];

  return {
    totalOralHistories: oralCount.c,
    totalPusakaItems: pusakaCount.c,
    sacredPusakaCount: sacredCount.c,
    verifiedOralCount: verifiedCount.c,
    oralByCategory,
    pusakaByType,
  };
}

// Heritage search
export function searchHeritage(db: Database.Database, q: string) {
  const safe = sanitizeLikePattern(q);
  const oralResults = db.prepare(`
    SELECT oh.*, 'oral_history' as result_type, p.nama as person_nama, p.nama_panggilan as person_panggilan
    FROM oral_histories oh
    JOIN persons p ON oh.person_id = p.id
    WHERE oh.title LIKE ? ESCAPE '\' OR oh.content LIKE ? ESCAPE '\' OR oh.source_person_name LIKE ? ESCAPE '\'
    ORDER BY oh.created_at DESC LIMIT 20
  `).all(`%${safe}%`, `%${safe}%`, `%${safe}%`) as (import('@/types').OralHistory & { result_type: string; person_nama: string; person_panggilan: string })[];

  const pusakaResults = db.prepare(`
    SELECT pi.*, 'pusaka' as result_type, p.nama as person_nama, p.nama_panggilan as person_panggilan
    FROM pusaka_items pi
    JOIN persons p ON pi.person_id = p.id
    WHERE pi.name LIKE ? ESCAPE '\' OR pi.description LIKE ? ESCAPE '\' OR pi.origin LIKE ? ESCAPE '\'
    ORDER BY pi.created_at DESC LIMIT 20
  `).all(`%${safe}%`, `%${safe}%`, `%${safe}%`) as (import('@/types').PusakaItem & { result_type: string; person_nama: string; person_panggilan: string })[];

  return { oral: oralResults, pusaka: pusakaResults };
}

// Cycle detection: check if making parentId a parent of childId would create a cycle
export function wouldCreateCycle(db: Database.Database, parentId: string, childId: string): boolean {
  const visited = new Set<string>();
  visited.add(childId); // the person themselves
  function walkUp(id: string): boolean {
    if (visited.has(id)) return true;
    visited.add(id);
    const parents = db.prepare('SELECT parent_id FROM parent_child WHERE child_id = ?').all(id) as { parent_id: string }[];
    for (const p of parents) {
      if (walkUp(p.parent_id)) return true;
    }
    return false;
  }
  return walkUp(parentId);
}

// ============================================================================
// TRANSFER LOG — audit trail operasi transfer (ekspor/impor/pusaka)
// ============================================================================

export function addTransferLog(
  db: Database.Database,
  data: { kind: import('@/types').TransferLogKind; actor_email: string; summary: string; details?: Record<string, unknown> },
): import('@/types').TransferLogEntry {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO transfer_log (id, kind, actor_email, summary, details) VALUES (?, ?, ?, ?, ?)'
  ).run(id, data.kind, data.actor_email, data.summary, JSON.stringify(data.details ?? {}));
  const row = db.prepare('SELECT * FROM transfer_log WHERE id = ?').get(id) as import('@/types').TransferLogEntry;
  return row;
}

export function getTransferLogs(db: Database.Database, limit = 100): import('@/types').TransferLogEntry[] {
  return db.prepare('SELECT * FROM transfer_log ORDER BY created_at DESC, id DESC LIMIT ?').all(limit) as import('@/types').TransferLogEntry[];
}

/**
 * Transfer kepemilikan pusaka ke pemegang baru.
 * Pemegang lama otomatis tercatat sebagai passed_from (riwayat pewarisan).
 * Setiap transfer tercatat di transfer_log (audit trail).
 */
export function transferPusakaItem(db: Database.Database, pusakaId: string, toPersonId: string, actorEmail: string) {
  const pusaka = getPusakaById(db, pusakaId);
  if (!pusaka) return { error: 'Pusaka tidak ditemukan' as const };

  const to = getPersonById(db, toPersonId);
  if (!to) return { error: 'Orang tujuan tidak ditemukan' as const };
  if (pusaka.person_id === toPersonId) return { error: 'Pusaka sudah berada pada pemegang tersebut' as const };

  const from = getPersonById(db, pusaka.person_id);

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE pusaka_items
      SET passed_from_person_id = person_id, person_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(toPersonId, pusakaId);
    addTransferLog(db, {
      kind: 'pusaka_transfer',
      actor_email: actorEmail,
      summary: `Pusaka "${pusaka.name}" dipindahkan dari ${from?.nama ?? '?'} ke ${to.nama}`,
      details: {
        pusaka_id: pusakaId,
        pusaka_nama: pusaka.name,
        dari_person_id: pusaka.person_id,
        dari_nama: from?.nama ?? null,
        ke_person_id: toPersonId,
        ke_nama: to.nama,
      },
    });
  });
  tx();

  return { item: getPusakaById(db, pusakaId) };
}

// ============================================================================
// BUKU MARGA — statistik direktori marga & rekomputasi generasi
// ============================================================================

/**
 * Direktori marga: statistik agregat per marga (dari data persons).
 * Marga dinormalisasi untuk pengelompokan, label asli dipertahankan.
 */
export function getMargaDirectory(db: Database.Database, margaUtama: string): import('@/types').MargaDirectoryEntry[] {
  const rows = db.prepare(`
    SELECT marga_asal, COUNT(*) as jumlah,
      SUM(CASE WHEN jenis_kelamin = 'L' THEN 1 ELSE 0 END) as laki_laki,
      SUM(CASE WHEN jenis_kelamin = 'P' THEN 1 ELSE 0 END) as perempuan,
      SUM(CASE WHEN tanggal_kematian IS NOT NULL THEN 1 ELSE 0 END) as wafat,
      SUM(CASE WHEN tanggal_kematian IS NULL THEN 1 ELSE 0 END) as hidup,
      MIN(nomor_generasi) as generasi_min,
      MAX(nomor_generasi) as generasi_max
    FROM persons
    WHERE TRIM(marga_asal) != ''
    GROUP BY LOWER(REPLACE(REPLACE(TRIM(marga_asal), ' ', ''), '-', ''))
    ORDER BY jumlah DESC, marga_asal ASC
  `).all() as (Omit<import('@/types').MargaDirectoryEntry, 'subetnis' | 'is_utama'> & { marga_asal: string })[];

  const utamaNorm = normalizeMarga(margaUtama);
  return rows.map((r) => ({
    marga: r.marga_asal,
    jumlah: r.jumlah,
    laki_laki: r.laki_laki,
    perempuan: r.perempuan,
    hidup: r.hidup,
    wafat: r.wafat,
    generasi_min: r.generasi_min,
    generasi_max: r.generasi_max,
    subetnis: null,
    is_utama: utamaNorm ? normalizeMarga(r.marga_asal) === utamaNorm : false,
  }));
}

/**
 * Rekomputasi nomor_generasi seluruh silsilah:
 * generasi = 1 + max(generasi orang tua). Akar (tanpa orang tua) = 1.
 * Mengembalikan jumlah baris yang dikoreksi — menjaga konsistensi Buku Marga.
 */
export function recomputeGenerations(db: Database.Database): { checked: number; corrected: number } {
  const persons = getPersons(db);
  const parentsOf = new Map<string, string[]>();
  for (const pc of db.prepare('SELECT parent_id, child_id FROM parent_child').all() as { parent_id: string; child_id: string }[]) {
    const list = parentsOf.get(pc.child_id) || [];
    list.push(pc.parent_id);
    parentsOf.set(pc.child_id, list);
  }

  const genCache = new Map<string, number>();
  const visiting = new Set<string>();

  function genOf(id: string): number {
    const cached = genCache.get(id);
    if (cached != null) return cached;
    if (visiting.has(id)) return 1; // pengaman siklus (seharusnya tak mungkin)
    visiting.add(id);
    const parents = parentsOf.get(id) || [];
    let g = 1;
    for (const pid of parents) g = Math.max(g, genOf(pid) + 1);
    visiting.delete(id);
    genCache.set(id, g);
    return g;
  }

  let corrected = 0;
  const tx = db.transaction(() => {
    const upd = db.prepare("UPDATE persons SET nomor_generasi = ?, updated_at = datetime('now') WHERE id = ?");
    for (const p of persons) {
      const g = genOf(p.id);
      if (g !== p.nomor_generasi) {
        upd.run(g, p.id);
        corrected++;
      }
    }
  });
  tx();

  return { checked: persons.length, corrected };
}

// ============================================================================
// DALIHAN NA TOLU — relasi adat dihitung dari data silsilah nyata
// ============================================================================

/** Satu entri relasi Dalihan Na Tolu */
export interface DalihanRelationEntry {
  id: string;
  nama: string;
  marga: string;
  /** Label hubungan dalam bahasa Indonesia */
  relation: string;
  /** Label hubungan dalam istilah adat Batak */
  relationBatak: string;
}

export interface DalihanRelations {
  /** Pihak pemberi istri: orang tua pasangan + saudara laki-laki ibu (tulang) */
  hulahula: DalihanRelationEntry[];
  /** Pihak penerima istri: suami anak perempuan + suami saudara perempuan */
  boru: DalihanRelationEntry[];
  /** Sesama marga (dongan sabutuha) */
  donganSabutuha: { marga: string | null; total: number };
}

function toEntry(p: import('@/types').Person, relation: string, relationBatak: string): DalihanRelationEntry {
  return { id: p.id, nama: p.nama_panggilan || p.nama, marga: p.marga_asal || '', relation, relationBatak };
}

/** Cari pasangan (suami/istri) aktif seseorang */
function getSpousesOf(db: Database.Database, personId: string): import('@/types').Person[] {
  const rows = db.prepare(`
    SELECT p.* FROM persons p
    JOIN partnerships ps ON (p.id = CASE WHEN ps.person1_id = ? THEN ps.person2_id ELSE ps.person1_id END)
    WHERE (ps.person1_id = ? OR ps.person2_id = ?)
  `).all(personId, personId, personId) as import('@/types').Person[];
  return rows;
}

/**
 * Menghitung relasi Dalihan Na Tolu seseorang dari data silsilah:
 * - Hula-hula (Tulang): orang tua dari pasangan, serta saudara laki-laki ibu.
 * - Boru: suami dari anak perempuan, serta suami dari saudara perempuan.
 * - Dongan Sabutuha: jumlah kerabat semarga (marga patrilineal).
 */
export function getDalihanRelations(db: Database.Database, personId: string): DalihanRelations {
  const empty: DalihanRelations = { hulahula: [], boru: [], donganSabutuha: { marga: null, total: 0 } };
  const ego = getPersonById(db, personId);
  if (!ego) return empty;

  const hulahula: DalihanRelationEntry[] = [];
  const boru: DalihanRelationEntry[] = [];
  const seen = new Set<string>();
  const push = (list: DalihanRelationEntry[], e: DalihanRelationEntry) => {
    if (e.id === ego.id || seen.has(`${list === hulahula ? 'h' : 'b'}:${e.id}`)) return;
    seen.add(`${list === hulahula ? 'h' : 'b'}:${e.id}`);
    list.push(e);
  };

  // --- HULA-HULA: orang tua pasangan ---
  for (const spouse of getSpousesOf(db, ego.id)) {
    const sp = getParentsOf(db, spouse.id);
    if (sp.father) push(hulahula, toEntry(sp.father, `Ayah ${spouse.nama_panggilan || spouse.nama}`, 'Tulang / Hula-hula'));
    if (sp.mother) push(hulahula, toEntry(sp.mother, `Ibu ${spouse.nama_panggilan || spouse.nama}`, 'Nantulang / Hula-hula'));
  }

  // --- HULA-HULA (TULANG): saudara laki-laki ibu ---
  const { mother } = getParentsOf(db, ego.id);
  if (mother) {
    const motherParents = getParentsOf(db, mother.id);
    for (const gp of [motherParents.father, motherParents.mother]) {
      if (!gp) continue;
      for (const sibling of getChildrenOf(db, gp.id)) {
        if (sibling.id !== mother.id && sibling.jenis_kelamin === 'L') {
          push(hulahula, toEntry(sibling, 'Saudara laki-laki ibu', 'Tulang'));
        }
      }
    }
  }

  // --- BORU: suami dari anak perempuan ---
  for (const child of getChildrenOf(db, ego.id)) {
    if (child.jenis_kelamin !== 'P') continue;
    for (const spouse of getSpousesOf(db, child.id)) {
      if (spouse.jenis_kelamin === 'L') {
        push(boru, toEntry(spouse, `Suami ${child.nama_panggilan || child.nama}`, 'Tunggane'));
      }
    }
  }

  // --- BORU: suami dari saudara perempuan ---
  const { father } = getParentsOf(db, ego.id);
  if (father || mother) {
    const parentIds = [father?.id, mother?.id].filter((x): x is string => !!x);
    const siblingIds = new Set<string>();
    for (const pid of parentIds) {
      for (const sibling of getChildrenOf(db, pid)) siblingIds.add(sibling.id);
    }
    siblingIds.delete(ego.id);
    for (const sid of siblingIds) {
      const sibling = getPersonById(db, sid);
      if (!sibling || sibling.jenis_kelamin !== 'P') continue;
      for (const spouse of getSpousesOf(db, sibling.id)) {
        if (spouse.jenis_kelamin === 'L') {
          push(boru, toEntry(spouse, `Suami ${sibling.nama_panggilan || sibling.nama}`, 'Tunggane'));
        }
      }
    }
  }

  // --- DONGAN SABUTUHA: sesama marga ---
  let dongan = { marga: null as string | null, total: 0 };
  const egoMarga = normalizeMarga(ego.marga_asal);
  if (egoMarga) {
    const allPersons = getPersons(db);
    const same = allPersons.filter(
      (p) => p.id !== ego.id && normalizeMarga(p.marga_asal) === egoMarga,
    );
    dongan = { marga: ego.marga_asal, total: same.length };
  }

  return { hulahula, boru, donganSabutuha: dongan };
}
