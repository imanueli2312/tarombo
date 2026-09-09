import { db } from "@/lib/db";
import type {
  FamilyNode,
  Gender,
  MaritalStatus,
  PartnershipStatus,
  TreeNodePerson,
  TreePartnership,
} from "./types";

// ============================================================================
// Mapper: Person (Prisma) -> TreeNodePerson (serializable)
// ============================================================================

export function serializePerson(p: {
  id: string;
  fullName: string;
  nickname: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  deathDate: Date | null;
  birthOrder: number | null;
  gender: string;
  address: string | null;
  religion: string | null;
  phone: string | null;
  photo: string | null;
  maritalStatus: string;
  generationNumber: number | null;
  burialName: string | null;
  burialAddress: string | null;
  burialLat: number | null;
  burialLng: number | null;
  fatherId: string | null;
  motherId: string | null;
}): TreeNodePerson {
  return {
    id: p.id,
    fullName: p.fullName,
    nickname: p.nickname,
    birthPlace: p.birthPlace,
    birthDate: p.birthDate ? p.birthDate.toISOString() : null,
    deathDate: p.deathDate ? p.deathDate.toISOString() : null,
    birthOrder: p.birthOrder,
    gender: p.gender as Gender,
    address: p.address,
    religion: p.religion,
    phone: p.phone,
    photo: p.photo,
    maritalStatus: p.maritalStatus as MaritalStatus,
    generationNumber: p.generationNumber,
    burialName: p.burialName,
    burialAddress: p.burialAddress,
    burialLat: p.burialLat,
    burialLng: p.burialLng,
    fatherId: p.fatherId,
    motherId: p.motherId,
    alive: p.deathDate === null,
  };
}

export function serializePartnership(pr: {
  id: string;
  husbandId: string;
  wifeId: string;
  marriageDate: Date | null;
  divorceDate: Date | null;
  status: string;
}): TreePartnership {
  return {
    id: pr.id,
    husbandId: pr.husbandId,
    wifeId: pr.wifeId,
    husband: null,
    wife: null,
    marriageDate: pr.marriageDate ? pr.marriageDate.toISOString() : null,
    divorceDate: pr.divorceDate ? pr.divorceDate.toISOString() : null,
    status: pr.status as PartnershipStatus,
  };
}

// ============================================================================
// Logika bisnis: pasangan aktif maksimal 1
// ============================================================================

/**
 * Cari partnership AKTIF untuk seorang Person.
 * Mengembalikan null bila tidak ada pasangan aktif.
 */
export async function findActivePartnership(personId: string) {
  return db.partnership.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ husbandId: personId }, { wifeId: personId }],
    },
  });
}

/**
 * Validasi: satu orang (laki-laki / perempuan) maksimal 1 pasangan aktif.
 * Melempar Error bila melanggar.
 */
export async function assertNoActivePartner(
  personId: string,
  excludePartnershipId?: string,
): Promise<void> {
  const existing = await findActivePartnership(personId);
  if (existing && existing.id !== excludePartnershipId) {
    throw new Error(
      "Orang ini sudah memiliki pasangan aktif. Satu orang hanya boleh memiliki maksimal 1 pasangan aktif.",
    );
  }
}

/**
 * Sinkronkan maritalStatus Person berdasarkan partnership-nya.
 */
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

/**
 * Saat seorang Person meninggal (deathDate diset), partnership AKTIF-nya
 * otomatis ditandai WIDOWED dengan divorceDate = tanggal kematian.
 * Status marital partner yang masih hidup juga diupdate menjadi WIDOWED.
 */
export async function handleDeathSideEffects(personId: string): Promise<void> {
  const person = await db.person.findUnique({ where: { id: personId } });
  if (!person || !person.deathDate) return;

  // Cari semua partnership AKTIF orang ini
  const activePartnerships = await db.partnership.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ husbandId: personId }, { wifeId: personId }],
    },
  });

  for (const partnership of activePartnerships) {
    const isHusbandDead = partnership.husbandId === personId;
    const survivorId = isHusbandDead ? partnership.wifeId : partnership.husbandId;

    // Set tanggal cerai = tanggal kematian, status WIDOWED
    await db.partnership.update({
      where: { id: partnership.id },
      data: {
        divorceDate: person.deathDate,
        status: "WIDOWED",
      },
    });

    // Update maritalStatus pasangan yang masih hidup
    if (survivorId) {
      await db.person.update({
        where: { id: survivorId },
        data: { maritalStatus: "WIDOWED" },
      });
    }
  }

  // Update maritalStatus orang yang meninggal menjadi WIDOWED (jika sebelumnya menikah)
  if (activePartnerships.length > 0) {
    await db.person.update({
      where: { id: personId },
      data: { maritalStatus: "WIDOWED" },
    });
  }
}

// ============================================================================
// Membangun pohon silsilah (FamilyNode) — rekursif
// ============================================================================

/**
 * Bangun pohon tarombo dari satu Person sebagai root.
 * Setiap node: Person + pasangan (jika ada) + anak-anak (rekursif).
 * Dilindungi dari loop dengan set visited.
 */
export async function buildFamilyTree(rootPersonId: string): Promise<FamilyNode | null> {
  const root = await db.person.findUnique({ where: { id: rootPersonId } });
  if (!root) return null;

  const visited = new Set<string>();
  return buildNode(root.id, visited);
}

async function buildNode(
  personId: string,
  visited: Set<string>,
): Promise<FamilyNode | null> {
  if (visited.has(personId)) {
    // Loop terdeteksi — kembalikan null untuk menghindari rekursi tak terhingga
    return null;
  }
  visited.add(personId);

  const person = await db.person.findUnique({ where: { id: personId } });
  if (!person) return null;

  // Cari partnership (prioritaskan AKTIF)
  const partnerships = await db.partnership.findMany({
    where: { OR: [{ husbandId: personId }, { wifeId: personId }] },
    orderBy: [{ status: "asc" }, { marriageDate: "asc" }],
  });

  let spouse = null;
  let partnership = null;

  if (partnerships.length > 0) {
    partnership = partnerships[0];
    const spouseId =
      partnership.husbandId === personId ? partnership.wifeId : partnership.husbandId;
    const spouseRecord = await db.person.findUnique({ where: { id: spouseId } });
    if (spouseRecord) spouse = spouseRecord;
  }

  // Anak-anak: Person yang fatherId atau motherId = personId
  // (dan pasangan, jika ada, untuk memastikan anak dari pasangan ini)
  const childrenWhere =
    person.gender === "MALE"
      ? { fatherId: personId }
      : { motherId: personId };

  const childRecords = await db.person.findMany({
    where: childrenWhere,
    orderBy: [{ birthOrder: "asc" }, { birthDate: "asc" }],
  });

  const children: FamilyNode[] = [];
  for (const child of childRecords) {
    const node = await buildNode(child.id, visited);
    if (node) children.push(node);
  }

  return {
    person: serializePerson(person),
    spouse: spouse ? serializePerson(spouse) : null,
    partnership: partnership
      ? {
          ...serializePartnership(partnership),
          husband: serializePerson(
            partnership.husbandId === personId ? person : (spouse as never),
          ),
          wife: serializePerson(
            partnership.wifeId === personId ? person : (spouse as never),
          ),
        }
      : null,
    children,
  };
}

/**
 * Temukan root leluhur tertinggi (Person tanpa ayah & ibu).
 *
 * Aturan agar tidak ada duplikasi pohon:
 *  - Pasangan yang "menikah masuk" (menikah dengan orang yang PUNYA orang tua)
 *    TIDAK dianggap root — mereka tampil sebagai pasangan di pohon partnernya.
 *  - Pasangan pendiri (keduanya tanpa orang tua) hanya menghasilkan SATU root
 *    (pihak laki-laki dipilih sebagai root; perempuan disubsumsi).
 *  - Orang tanpa ortu & tanpa pasangan → root mandiri.
 */
export async function findRootAncestors() {
  const candidates = await db.person.findMany({
    where: {
      AND: [{ fatherId: null }, { motherId: null }],
    },
    include: {
      partnershipsAsHusband: { include: { wife: true } },
      partnershipsAsWife: { include: { husband: true } },
    },
    orderBy: [{ generationNumber: "asc" }, { birthDate: "asc" }],
  });

  const roots: typeof candidates = [];
  for (const c of candidates) {
    const partners = [
      ...c.partnershipsAsHusband.map((p) => p.wife),
      ...c.partnershipsAsWife.map((p) => p.husband),
    ];

    const hasPartnerWithParents = partners.some(
      (p) => p.fatherId !== null || p.motherId !== null,
    );
    const hasPartnerWithoutParents = partners.some(
      (p) => p.fatherId === null && p.motherId === null,
    );

    // Menikah-masuk: punya partner dgn ortu, tapi tidak punya partner tanpa ortu
    if (hasPartnerWithParents && !hasPartnerWithoutParents) continue;

    // Pasangan pendiri: perempuan yang punya suami tanpa ortu → subsumsi
    if (c.gender === "FEMALE") {
      const hasMalePartnerNoParents = partners.some(
        (p) => p.gender === "MALE" && p.fatherId === null && p.motherId === null,
      );
      if (hasMalePartnerNoParents) continue;
    }

    roots.push(c);
  }

  // strip relasi agar konsisten dengan return type Person[]
  return roots.map(({ partnershipsAsHusband, partnershipsAsWife, ...rest }) => rest);
}
