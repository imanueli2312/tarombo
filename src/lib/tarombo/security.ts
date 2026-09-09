import bcrypt from "bcryptjs";
import { sqlite } from "@/lib/db";
import { newId, now, type PersonRow, type PartnershipRow } from "./queries";

// ============================================================================
// Password Hashing (bcrypt)
// ============================================================================

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

/** Cek apakah string sudah berupa bcrypt hash */
export function isBcryptHash(s: string): boolean {
  return /^\$2[aby]?\$\d{2}\$/.test(s);
}

// ============================================================================
// Activity Log (audit trail)
// ============================================================================

export interface ActivityLogEntry {
  userId?: string | null;
  userName?: string | null;
  action: string; // create | update | delete | restore | login | logout | seed | reset | export | backup_restore
  entityType: string; // person | partnership | user | role | data
  entityId?: string | null;
  entityName?: string | null;
  details?: Record<string, unknown> | null;
}

export function logActivity(entry: ActivityLogEntry): void {
  sqlite
    .prepare(
      `INSERT INTO activity_log (id, user_id, user_name, action, entity_type, entity_id, entity_name, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId(),
      entry.userId ?? null,
      entry.userName ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.entityName ?? null,
      entry.details ? JSON.stringify(entry.details) : null,
      now(),
    );
}

// ============================================================================
// Validasi Integritas Data
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Validasi konsistensi tanggal satu orang:
 * - deathDate harus setelah birthDate
 */
export function validatePersonDates(p: {
  birthDate?: string | null;
  deathDate?: string | null;
}): string[] {
  const errors: string[] = [];
  const birth = parseDate(p.birthDate as string);
  const death = parseDate(p.deathDate as string);
  if (birth && death && death < birth) {
    errors.push("Tanggal wafat tidak boleh sebelum tanggal lahir.");
  }
  return errors;
}

/**
 * Validasi relasi orang tua-anak:
 * - Tanggal lahir anak harus setelah tanggal lahir ayah/ibu
 * - Tidak boleh menjadi ayah/ibu diri sendiri
 * - Tidak boleh cycle: anak tidak boleh menjadi leluhur orang tuanya
 */
export function validateParentRelation(opts: {
  childId?: string | null;
  fatherId?: string | null;
  motherId?: string | null;
  childBirthDate?: string | null;
}): string[] {
  const errors: string[] = [];
  const { childId, fatherId, motherId } = opts;

  if (childId) {
    if (fatherId === childId)
      errors.push("Tidak boleh menjadi ayah diri sendiri.");
    if (motherId === childId)
      errors.push("Tidak boleh menjadi ibu diri sendiri.");
  }

  const childBirth = parseDate(opts.childBirthDate as string);

  // validasi tanggal lahir ortu vs anak
  for (const parentId of [fatherId, motherId].filter(Boolean) as string[]) {
    if (parentId === childId) continue;
    const parent = sqlite
      .prepare("SELECT birth_date FROM person WHERE id = ?")
      .get(parentId) as { birth_date: string | null } | undefined;
    if (parent) {
      const parentBirth = parseDate(parent.birth_date);
      if (parentBirth && childBirth && childBirth < parentBirth) {
        errors.push(
          `Tanggal lahir anak tidak boleh sebelum tanggal lahir orang tua.`,
        );
      }
      // cycle detection: parent tidak boleh memiliki childId sebagai leluhurnya
      if (childId && wouldCreateCycle(parentId, childId)) {
        errors.push(
          "Cycle terdeteksi: orang tua yang dipilih adalah keturunan dari orang ini.",
        );
      }
    }
  }

  return errors;
}

/** Cek apakah menjadikan `parentId` sebagai parent dari `childId` menciptakan cycle. */
function wouldCreateCycle(parentId: string, childId: string): boolean {
  // Traverse ancestors of parentId. Bila childId ditemukan → cycle.
  const visited = new Set<string>();
  const stack = [parentId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (cur === childId) return true;
    const row = sqlite
      .prepare("SELECT father_id, mother_id FROM person WHERE id = ?")
      .get(cur) as { father_id: string | null; mother_id: string | null } | undefined;
    if (!row) continue;
    if (row.father_id) stack.push(row.father_id);
    if (row.mother_id) stack.push(row.mother_id);
  }
  return false;
}

/**
 * Validasi partnership:
 * - husband MALE, wife FEMALE
 * - husbandId != wifeId
 * - marriage_date setelah birth_date keduanya
 * - divorce_date setelah marriage_date
 */
export function validatePartnership(opts: {
  husbandId: string;
  wifeId: string;
  marriageDate?: string | null;
  divorceDate?: string | null;
}): string[] {
  const errors: string[] = [];
  if (opts.husbandId === opts.wifeId) {
    errors.push("Suami dan istri tidak boleh orang yang sama.");
  }
  const husband = sqlite
    .prepare("SELECT gender, birth_date FROM person WHERE id = ?")
    .get(opts.husbandId) as { gender: string; birth_date: string | null } | undefined;
  const wife = sqlite
    .prepare("SELECT gender, birth_date FROM person WHERE id = ?")
    .get(opts.wifeId) as { gender: string; birth_date: string | null } | undefined;
  if (husband && husband.gender !== "MALE")
    errors.push("Suami harus berjenis kelamin laki-laki.");
  if (wife && wife.gender !== "FEMALE")
    errors.push("Istri harus berjenis kelamin perempuan.");

  const marriage = parseDate(opts.marriageDate as string);
  const divorce = parseDate(opts.divorceDate as string);
  if (marriage && divorce && divorce < marriage) {
    errors.push("Tanggal cerai tidak boleh sebelum tanggal menikah.");
  }
  if (marriage && husband) {
    const hb = parseDate(husband.birth_date);
    if (hb && marriage < hb)
      errors.push("Tanggal menikah tidak boleh sebelum suami lahir.");
  }
  if (marriage && wife) {
    const wb = parseDate(wife.birth_date);
    if (wb && marriage < wb)
      errors.push("Tanggal menikah tidak boleh sebelum istri lahir.");
  }
  return errors;
}

/**
 * Cek duplikat orang: nama lengkap + tanggal lahir sama (case-insensitive).
 */
export function findDuplicatePerson(opts: {
  fullName: string;
  birthDate?: string | null;
  excludeId?: string | null;
}): PersonRow | undefined {
  if (!opts.fullName.trim()) return undefined;
  let sql = "SELECT * FROM person WHERE LOWER(full_name) = LOWER(?) AND deleted_at IS NULL";
  const params: (string | number)[] = [opts.fullName.trim()];
  if (opts.birthDate) {
    sql += " AND birth_date = ?";
    params.push(opts.birthDate as string);
  } else {
    sql += " AND birth_date IS NULL";
  }
  if (opts.excludeId) {
    sql += " AND id != ?";
    params.push(opts.excludeId);
  }
  return sqlite.prepare(sql).get(...params) as PersonRow | undefined;
}
