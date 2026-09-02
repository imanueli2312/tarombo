import Database from 'better-sqlite3';
import path from 'path';
import { DEFAULT_PERMISSIONS } from '@/types';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'tarombo.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initializeSchema(_db);
  seedDefaultData(_db);

  return _db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','editor','admin')),
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
  `);
}

let seeded = false;

function seedDefaultData(db: Database.Database) {
  if (seeded) return;

  const permCount = db.prepare('SELECT COUNT(*) as c FROM rbac_permissions').get() as { c: number };
  if (permCount.c > 0) {
    seeded = true;
    return;
  }

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
    for (const perm of ['view_tree','search','view_profile','view_bagans','view_marriages','create_person','edit_person','delete_person','create_marriage','edit_marriage','delete_marriage','export','manage_users','manage_permissions','view_admin']) {
      allPerms.push({ role, permission: perm, allowed: permSet.has(perm) });
    }
  }
  insertMany(allPerms);
  seeded = true;
}

// Person CRUD
export function getPersons(db: Database.Database) {
  return db.prepare('SELECT * FROM persons ORDER BY nomor_generasi, nama').all() as import('@/types').Person[];
}

export function getPersonById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as import('@/types').Person | undefined;
}

export function createPerson(db: Database.Database, data: import('@/types').PersonCreate & { id: string }) {
  const { father_id, mother_id, ...fields } = data;
  db.prepare(`
    INSERT INTO persons (id, nama, nama_panggilan, tempat_lahir, tanggal_lahir, tanggal_kematian,
      nomor_urut_lahir, jenis_kelamin, alamat, agama, nomor_telepon, photo, status_pernikahan,
      nomor_generasi, burial_nama, burial_alamat, burial_latitude, burial_longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.nama, data.nama_panggilan ?? '', data.tempat_lahir ?? '',
    data.tanggal_lahir ?? null, data.tanggal_kematian ?? null,
    data.nomor_urut_lahir ?? null, data.jenis_kelamin, data.alamat ?? '',
    data.agama ?? '', data.nomor_telepon ?? '', data.photo ?? null,
    data.status_pernikahan ?? 'belum_menikah', data.nomor_generasi ?? 1,
    data.burial_nama ?? null, data.burial_alamat ?? null,
    data.burial_latitude ?? null, data.burial_longitude ?? null
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

  const allowedFields = ['nama','nama_panggilan','tempat_lahir','tanggal_lahir','tanggal_kematian','nomor_urut_lahir','jenis_kelamin','alamat','agama','nomor_telepon','photo','status_pernikahan','nomor_generasi','burial_nama','burial_alamat','burial_latitude','burial_longitude'];

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
export function getPartnerships(db: Database.Database) {
  return db.prepare('SELECT * FROM partnerships ORDER BY marriage_date DESC NULLS LAST').all() as import('@/types').Partnership[];
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
  const spouseMap = new Map<string, { id: string; nama: string; nama_panggilan: string; jenis_kelamin: import('@/types').Gender; tanggal_lahir: string | null; tanggal_kematian: string | null; status_pernikahan: import('@/types').MaritalStatus; photo: string | null } | null>();
  for (const p of partnerships) {
    if (p.divorce_date) continue;
    const p1 = personMap.get(p.person1_id);
    const p2 = personMap.get(p.person2_id);
    if (!p1 || !p2) continue;
    spouseMap.set(p.person1_id, {
      id: p2.id, nama: p2.nama, nama_panggilan: p2.nama_panggilan,
      jenis_kelamin: p2.jenis_kelamin, tanggal_lahir: p2.tanggal_lahir,
      tanggal_kematian: p2.tanggal_kematian, status_pernikahan: p2.status_pernikahan,
      photo: p2.photo,
    });
    spouseMap.set(p.person2_id, {
      id: p1.id, nama: p1.nama, nama_panggilan: p1.nama_panggilan,
      jenis_kelamin: p1.jenis_kelamin, tanggal_lahir: p1.tanggal_lahir,
      tanggal_kematian: p1.tanggal_kematian, status_pernikahan: p1.status_pernikahan,
      photo: p1.photo,
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
  return db.prepare(
    `SELECT * FROM persons WHERE nama LIKE ? OR nama_panggilan LIKE ? ORDER BY nomor_generasi, nama LIMIT 50`
  ).all(`%${q}%`, `%${q}%`) as import('@/types').Person[];
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
export function getUsers(db: Database.Database) {
  return db.prepare('SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at').all() as import('@/types').User[];
}

export function getUserById(db: Database.Database, id: string) {
  return db.prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?').get(id) as import('@/types').User | undefined;
}

export function getUserByEmail(db: Database.Database, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as (import('@/types').User & { password_hash: string }) | undefined;
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
  }
  if (data.password_hash) {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(data.password_hash, id);
  }
  return getUserById(db, id);
}

export function deleteUser(db: Database.Database, id: string) {
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
