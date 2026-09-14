import { sqlite } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type {
  FamilyNode,
  Gender,
  MaritalStatus,
  PartnershipStatus,
  TreeNodePerson,
  TreePartnership,
} from "./types";

// ============================================================================
// Tipe baris database (snake_case dari SQLite)
// ============================================================================

export interface PersonRow {
  id: string;
  full_name: string;
  nickname: string | null;
  birth_place: string | null;
  birth_date: string | null;
  death_date: string | null;
  birth_order: number | null;
  gender: string;
  address: string | null;
  religion: string | null;
  phone: string | null;
  photo: string | null;
  marital_status: string;
  generation_number: number | null;
  burial_name: string | null;
  burial_address: string | null;
  burial_lat: number | null;
  burial_lng: number | null;
  father_id: string | null;
  mother_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnershipRow {
  id: string;
  husband_id: string;
  wife_id: string;
  marriage_date: string | null;
  divorce_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  permissions: string;
  is_system: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password: string;
  photo: string | null;
  phone: string | null;
  role_id: string | null;
  linked_person_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Mapper: PersonRow -> TreeNodePerson (serializable, camelCase)
// ============================================================================

export function serializePerson(p: PersonRow): TreeNodePerson {
  return {
    id: p.id,
    fullName: p.full_name,
    nickname: p.nickname,
    birthPlace: p.birth_place,
    birthDate: p.birth_date,
    deathDate: p.death_date,
    birthOrder: p.birth_order,
    gender: p.gender as Gender,
    address: p.address,
    religion: p.religion,
    phone: p.phone,
    photo: p.photo,
    maritalStatus: p.marital_status as MaritalStatus,
    generationNumber: p.generation_number,
    burialName: p.burial_name,
    burialAddress: p.burial_address,
    burialLat: p.burial_lat,
    burialLng: p.burial_lng,
    fatherId: p.father_id,
    motherId: p.mother_id,
    alive: p.death_date === null,
  };
}

export function serializePartnership(pr: PartnershipRow): TreePartnership {
  return {
    id: pr.id,
    husbandId: pr.husband_id,
    wifeId: pr.wife_id,
    husband: null,
    wife: null,
    marriageDate: pr.marriage_date,
    divorceDate: pr.divorce_date,
    status: pr.status as PartnershipStatus,
  };
}

// ============================================================================
// Logika bisnis: pasangan aktif maksimal 1
// ============================================================================

export function findActivePartnership(personId: string): PartnershipRow | undefined {
  return sqlite
    .prepare(
      `SELECT * FROM partnership
       WHERE status = 'ACTIVE' AND deleted_at IS NULL AND (husband_id = ? OR wife_id = ?)
       LIMIT 1`,
    )
    .get(personId, personId) as PartnershipRow | undefined;
}

export function assertNoActivePartner(
  personId: string,
  excludePartnershipId?: string,
): void {
  const existing = findActivePartnership(personId);
  if (existing && existing.id !== excludePartnershipId) {
    throw new Error(
      "Orang ini sudah memiliki pasangan aktif. Satu orang hanya boleh memiliki maksimal 1 pasangan aktif.",
    );
  }
}

export function deriveMaritalStatus(
  partnerships: { status: string }[],
  hasDeath: boolean,
): MaritalStatus {
  const hasActive = partnerships.some((p) => p.status === "ACTIVE");
  const hasWidowed = partnerships.some((p) => p.status === "WIDOWED");
  const hasDivorced = partnerships.some((p) => p.status === "DIVORCED");
  if (hasActive) return "MARRIED";
  if (hasWidowed) return "WIDOWED";
  if (hasDivorced) return "DIVORCED";
  return hasDeath ? "WIDOWED" : "SINGLE";
}

// ============================================================================
// Logika bisnis: auto-set tanggal cerai saat pasangan meninggal
// ============================================================================

export function handleDeathSideEffects(personId: string): void {
  const person = sqlite
    .prepare("SELECT * FROM person WHERE id = ? AND deleted_at IS NULL")
    .get(personId) as PersonRow | undefined;
  if (!person || !person.death_date) return;

  const activePartnerships = sqlite
    .prepare(
      `SELECT * FROM partnership
       WHERE status = 'ACTIVE' AND deleted_at IS NULL AND (husband_id = ? OR wife_id = ?)`,
    )
    .all(personId, personId) as PartnershipRow[];

  const now = new Date().toISOString();

  // Transaction: semua update atomic — bila salah satu gagal, rollback semua
  const tx = sqlite.transaction(() => {
    for (const partnership of activePartnerships) {
      const isHusbandDead = partnership.husband_id === personId;
      const survivorId = isHusbandDead
        ? partnership.wife_id
        : partnership.husband_id;

      sqlite
        .prepare(
          `UPDATE partnership SET divorce_date = ?, status = 'WIDOWED', updated_at = ?
           WHERE id = ?`,
        )
        .run(person.death_date, now, partnership.id);

      if (survivorId) {
        sqlite
          .prepare(
            `UPDATE person SET marital_status = 'WIDOWED', updated_at = ? WHERE id = ?`,
          )
          .run(now, survivorId);
      }
    }

    if (activePartnerships.length > 0) {
      sqlite
        .prepare(
          `UPDATE person SET marital_status = 'WIDOWED', updated_at = ? WHERE id = ?`,
        )
        .run(now, personId);
    }
  });
  tx();
}

// ============================================================================
// Membangun pohon silsilah (FamilyNode) — batch load (no N+1)
// ============================================================================

/**
 * Bangun pohon tarombo dari satu Person sebagai root.
 * Optimized: batch load semua person + partnership dalam 2 query,
 * lalu build tree in-memory. Eliminasi N+1 queries.
 */
export function buildFamilyTree(rootPersonId: string): FamilyNode | null {
  const root = sqlite
    .prepare("SELECT * FROM person WHERE id = ? AND deleted_at IS NULL")
    .get(rootPersonId) as PersonRow | undefined;
  if (!root) return null;

  // Batch load SEMUA person & partnership sekali saja
  const allPersons = sqlite
    .prepare("SELECT * FROM person WHERE deleted_at IS NULL")
    .all() as PersonRow[];
  const allPartnerships = sqlite
    .prepare("SELECT * FROM partnership WHERE deleted_at IS NULL")
    .all() as PartnershipRow[];

  // Build lookup maps
  const personMap = new Map<string, PersonRow>();
  for (const p of allPersons) personMap.set(p.id, p);

  // Map: personId → partnerships involving them
  const partnershipMap = new Map<string, PartnershipRow[]>();
  for (const p of allPartnerships) {
    for (const id of [p.husband_id, p.wife_id]) {
      if (!partnershipMap.has(id)) partnershipMap.set(id, []);
      partnershipMap.get(id)!.push(p);
    }
  }
  // Sort partnerships per person (ACTIVE first, then by marriage_date)
  for (const arr of partnershipMap.values()) {
    arr.sort((a, b) => {
      const order = (s: string) => (s === "ACTIVE" ? 0 : s === "WIDOWED" ? 1 : 2);
      const d = order(a.status) - order(b.status);
      if (d !== 0) return d;
      const da = a.marriage_date ?? "";
      const db = b.marriage_date ?? "";
      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  // Map: parentId → children (father_id or mother_id)
  const childrenMap = new Map<string, PersonRow[]>();
  for (const p of allPersons) {
    const parentId = p.gender === "MALE" ? p.father_id : p.mother_id;
    if (parentId) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(p);
    }
  }
  // Sort children by birth_order, birth_date
  for (const arr of childrenMap.values()) {
    arr.sort((a, b) => {
      const oa = a.birth_order ?? 9999;
      const ob = b.birth_order ?? 9999;
      if (oa !== ob) return oa - ob;
      const da = a.birth_date ?? "";
      const db = b.birth_date ?? "";
      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  const visited = new Set<string>();

  function buildNode(personId: string): FamilyNode | null {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const person = personMap.get(personId);
    if (!person) return null;

    // Cari partnership (sudah sorted: ACTIVE first)
    const partnerships = partnershipMap.get(personId) ?? [];
    let spouse: PersonRow | null = null;
    let partnership: PartnershipRow | null = null;

    if (partnerships.length > 0) {
      partnership = partnerships[0];
      const spouseId =
        partnership.husband_id === personId
          ? partnership.wife_id
          : partnership.husband_id;
      spouse = personMap.get(spouseId) ?? null;
    }

    // Anak-anak (sudah sorted)
    const childRecords = childrenMap.get(personId) ?? [];
    const children: FamilyNode[] = [];
    for (const child of childRecords) {
      const node = buildNode(child.id);
      if (node) children.push(node);
    }

    return {
      person: serializePerson(person),
      spouse: spouse ? serializePerson(spouse) : null,
      partnership: partnership ? serializePartnership(partnership) : null,
      children,
    };
  }

  return buildNode(root.id);
}

// ============================================================================
// Root ancestors — tanpa duplikasi
// ============================================================================

export function findRootAncestors(): PersonRow[] {
  const candidates = sqlite
    .prepare(
      `SELECT * FROM person
       WHERE father_id IS NULL AND mother_id IS NULL AND deleted_at IS NULL
       ORDER BY generation_number ASC NULLS LAST, birth_date ASC NULLS LAST`,
    )
    .all() as PersonRow[];

  // helper: ambil partner sebuah person
  const getPartners = (personId: string): PersonRow[] => {
    const rows = sqlite
      .prepare(
        `SELECT p2.* FROM partnership p
         JOIN person p2 ON (p2.id = CASE WHEN p.husband_id = ? THEN p.wife_id ELSE p.husband_id END)
         WHERE p.husband_id = ? OR p.wife_id = ?`,
      )
      .all(personId, personId, personId) as PersonRow[];
    return rows;
  };

  const roots: PersonRow[] = [];
  for (const c of candidates) {
    const partners = getPartners(c.id);
    const hasPartnerWithParents = partners.some(
      (p) => p.father_id !== null || p.mother_id !== null,
    );
    const hasPartnerWithoutParents = partners.some(
      (p) => p.father_id === null && p.mother_id === null,
    );

    if (hasPartnerWithParents && !hasPartnerWithoutParents) continue;

    if (c.gender === "FEMALE") {
      const hasMalePartnerNoParents = partners.some(
        (p) =>
          p.gender === "MALE" &&
          p.father_id === null &&
          p.mother_id === null,
      );
      if (hasMalePartnerNoParents) continue;
    }

    roots.push(c);
  }
  return roots;
}

// ============================================================================
// Helper: generate ID baru
// ============================================================================

export function newId(): string {
  return uuid();
}

export function now(): string {
  return new Date().toISOString();
}
