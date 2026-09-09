import { z } from "zod";

// ============================================================================
// Enum-like string unions (disimpan sebagai String di SQLite)
// ============================================================================

export const GENDER = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDER)[number];

export const MARITAL_STATUS = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"] as const;
export type MaritalStatus = (typeof MARITAL_STATUS)[number];

export const PARTNERSHIP_STATUS = ["ACTIVE", "DIVORCED", "WIDOWED"] as const;
export type PartnershipStatus = (typeof PARTNERSHIP_STATUS)[number];

// ============================================================================
// Validators (Zod)
// ============================================================================

/** ISO date string helper — menerima "YYYY-MM-DD" atau DateTime. */
const dateField = z
  .union([z.string(), z.date()])
  .nullable()
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const d = typeof v === "string" ? new Date(v) : v;
    return isNaN(d.getTime()) ? null : d;
  });

export const personSchema = z.object({
  fullName: z.string().min(1, "Nama lengkap wajib diisi"),
  nickname: z.string().nullable().optional(),
  birthPlace: z.string().nullable().optional(),
  birthDate: dateField,
  deathDate: dateField,
  birthOrder: z.number().int().min(0).nullable().optional(),
  gender: z.enum(GENDER).default("MALE"),
  address: z.string().nullable().optional(),
  religion: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  photo: z.string().nullable().optional(),
  maritalStatus: z.enum(MARITAL_STATUS).default("SINGLE"),
  generationNumber: z.number().int().nullable().optional(),
  burialName: z.string().nullable().optional(),
  burialAddress: z.string().nullable().optional(),
  burialLat: z.number().nullable().optional(),
  burialLng: z.number().nullable().optional(),
  fatherId: z.string().nullable().optional(),
  motherId: z.string().nullable().optional(),
});

export type PersonInput = z.infer<typeof personSchema>;

export const partnershipSchema = z.object({
  husbandId: z.string().min(1),
  wifeId: z.string().min(1),
  marriageDate: dateField,
  divorceDate: dateField,
  status: z.enum(PARTNERSHIP_STATUS).default("ACTIVE"),
});

export type PartnershipInput = z.infer<typeof partnershipSchema>;

// ============================================================================
// Tipe response untuk pohon silsilah (tree)
// ============================================================================

export interface TreeNodePerson {
  id: string;
  fullName: string;
  nickname: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  deathDate: string | null;
  birthOrder: number | null;
  gender: Gender;
  address: string | null;
  religion: string | null;
  phone: string | null;
  photo: string | null;
  maritalStatus: MaritalStatus;
  generationNumber: number | null;
  burialName: string | null;
  burialAddress: string | null;
  burialLat: number | null;
  burialLng: number | null;
  fatherId: string | null;
  motherId: string | null;
  alive: boolean;
}

export interface TreePartnership {
  id: string;
  husbandId: string;
  wifeId: string;
  husband: TreeNodePerson | null;
  wife: TreeNodePerson | null;
  marriageDate: string | null;
  divorceDate: string | null;
  status: PartnershipStatus;
}

/** Node pohon: satu orang (mungkin dengan pasangan) beserta cabang anak. */
export interface FamilyNode {
  person: TreeNodePerson;
  spouse: TreeNodePerson | null;
  partnership: TreePartnership | null;
  children: FamilyNode[];
}

// ============================================================================
// Helper formatting
// ============================================================================

export function genderLabel(g: string | null | undefined): string {
  if (g === "MALE") return "Laki-laki";
  if (g === "FEMALE") return "Perempuan";
  return "-";
}

export function maritalLabel(s: string | null | undefined): string {
  switch (s) {
    case "SINGLE":
      return "Belum Menikah";
    case "MARRIED":
      return "Menikah";
    case "DIVORCED":
      return "Cerai";
    case "WIDOWED":
      return "Janda/Duda";
    default:
      return "-";
  }
}

export function partnershipLabel(s: string | null | undefined): string {
  switch (s) {
    case "ACTIVE":
      return "Aktif";
    case "DIVORCED":
      return "Cerai";
    case "WIDOWED":
      return "Janda/Duda";
    default:
      return "-";
  }
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Versi pendek: 12 Mar 1950 */
export function formatDateShort(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
