import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit, getSessionUserInfo } from "@/lib/audit-log";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/rbac";

function getUserRole(session: unknown): Role | undefined {
  if (!session || typeof session !== "object" || !("user" in session)) return undefined;
  return (session.user as Record<string, unknown>)?.role as Role | undefined;
}

interface ExportPerson {
  id: string;
  fullName: string;
  nickname: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  deathPlace: string | null;
  deathDate: string | null;
  birthOrder: number | null;
  gender: "MALE" | "FEMALE";
  address: string | null;
  religion: string | null;
  phone: string | null;
  photoPath: string | null;
  maritalStatus: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  isDeceased: boolean;
  fatherId: string | null;
  motherId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExportMarriage {
  id: string;
  husbandId: string;
  wifeId: string;
  marriageDate: string | null;
  divorceDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExportData {
  exportedAt: string;
  version: string;
  persons: ExportPerson[];
  marriages: ExportMarriage[];
}

interface ImportPerson {
  fullName: string;
  nickname?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null;
  deathPlace?: string | null;
  deathDate?: string | null;
  birthOrder?: number | null;
  gender: "MALE" | "FEMALE";
  address?: string | null;
  religion?: string | null;
  phone?: string | null;
  photoPath?: string | null;
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  isDeceased?: boolean;
  fatherId?: string | null;
  motherId?: string | null;
  id?: string;
}

interface ImportMarriage {
  husbandId: string;
  wifeId: string;
  marriageDate?: string | null;
  divorceDate?: string | null;
  isActive?: boolean;
  id?: string;
}

// GET /api/backup - Export all data as JSON (ADMIN only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getUserRole(session);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [persons, marriages] = await Promise.all([
      db.person.findMany({ orderBy: { createdAt: "asc" } }),
      db.marriage.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    const exportData: ExportData = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      persons: persons.map((p) => ({
        ...p,
        birthDate: p.birthDate?.toISOString() ?? null,
        deathDate: p.deathDate?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })) as ExportPerson[],
      marriages: marriages.map((m) => ({
        ...m,
        marriageDate: m.marriageDate?.toISOString() ?? null,
        divorceDate: m.divorceDate?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })) as ExportMarriage[],
    };

    // Audit log
    const userInfo = getSessionUserInfo(session);
    await logAudit({
      userId: userInfo?.userId,
      userName: userInfo?.userName,
      action: "EXPORT_BACKUP",
      resource: "backup",
      details: { personCount: persons.length, marriageCount: marriages.length },
    });

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export backup error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengekspor data" },
      { status: 500 }
    );
  }
}

// POST /api/backup - Import data from JSON (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getUserRole(session);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate data structure
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Format data tidak valid" },
        { status: 400 }
      );
    }

    const { persons, marriages } = body as { persons?: ImportPerson[]; marriages?: ImportMarriage[] };

    if (!Array.isArray(persons)) {
      return NextResponse.json(
        { error: "Data 'persons' harus berupa array" },
        { status: 400 }
      );
    }

    if (!Array.isArray(marriages)) {
      return NextResponse.json(
        { error: "Data 'marriages' harus berupa array" },
        { status: 400 }
      );
    }

    // Validate each person has required fields
    for (const person of persons) {
      if (!person.fullName || typeof person.fullName !== "string") {
        return NextResponse.json(
          { error: "Setiap person harus memiliki 'fullName' yang valid" },
          { status: 400 }
        );
      }
      if (person.gender !== "MALE" && person.gender !== "FEMALE") {
        return NextResponse.json(
          { error: `Gender tidak valid untuk '${person.fullName}'` },
          { status: 400 }
        );
      }
    }

    // Validate each marriage has required fields
    for (const marriage of marriages) {
      if (!marriage.husbandId || !marriage.wifeId) {
        return NextResponse.json(
          { error: "Setiap marriage harus memiliki 'husbandId' dan 'wifeId'" },
          { status: 400 }
        );
      }
    }

    // Perform import in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Delete existing marriages first (FK constraint)
      await tx.marriage.deleteMany();

      // 2. Delete existing persons
      await tx.person.deleteMany();

      // 3. Create persons and build ID mapping (old ID -> new ID)
      const idMap = new Map<string, string>();
      const createdPersons = [];

      for (const person of persons) {
        const created = await tx.person.create({
          data: {
            fullName: person.fullName,
            nickname: person.nickname ?? null,
            birthPlace: person.birthPlace ?? null,
            birthDate: person.birthDate ? new Date(person.birthDate) : null,
            deathPlace: person.deathPlace ?? null,
            deathDate: person.deathDate ? new Date(person.deathDate) : null,
            birthOrder: person.birthOrder ?? null,
            gender: person.gender,
            address: person.address ?? null,
            religion: person.religion ?? null,
            phone: person.phone ?? null,
            photoPath: person.photoPath ?? null,
            maritalStatus: person.maritalStatus ?? "SINGLE",
            isDeceased: person.isDeceased ?? false,
            fatherId: null, // Will update after all persons created
            motherId: null,
          },
        });

        if (person.id) {
          idMap.set(person.id, created.id);
        }
        createdPersons.push({ oldId: person.id, newId: created.id, fatherId: person.fatherId, motherId: person.motherId });
      }

      // 4. Update parent references using mapped IDs
      for (const ref of createdPersons) {
        const newFatherId = ref.fatherId ? (idMap.get(ref.fatherId) ?? ref.fatherId) : null;
        const newMotherId = ref.motherId ? (idMap.get(ref.motherId) ?? ref.motherId) : null;

        if (newFatherId || newMotherId) {
          await tx.person.update({
            where: { id: ref.newId },
            data: {
              fatherId: newFatherId,
              motherId: newMotherId,
            },
          });
        }
      }

      // 5. Create marriages with mapped IDs
      for (const marriage of marriages) {
        const newHusbandId = idMap.get(marriage.husbandId) ?? marriage.husbandId;
        const newWifeId = idMap.get(marriage.wifeId) ?? marriage.wifeId;

        await tx.marriage.create({
          data: {
            husbandId: newHusbandId,
            wifeId: newWifeId,
            marriageDate: marriage.marriageDate ? new Date(marriage.marriageDate) : null,
            divorceDate: marriage.divorceDate ? new Date(marriage.divorceDate) : null,
            isActive: marriage.isActive ?? true,
          },
        });
      }

      // 6. Re-seed admin user if no users remain
      const userCount = await tx.user.count();
      if (userCount === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 12);
        await tx.user.create({
          data: {
            email: "admin@hariandja.id",
            name: "Administrator Hariandja",
            password: hashedPassword,
            role: "ADMIN",
          },
        });
      }

      return { personCount: persons.length, marriageCount: marriages.length };
    });

    // Audit log
    const userInfo = getSessionUserInfo(session);
    await logAudit({
      userId: userInfo?.userId,
      userName: userInfo?.userName,
      action: "IMPORT_BACKUP",
      resource: "backup",
      details: result,
    });

    return NextResponse.json({
      message: "Data berhasil diimpor",
      ...result,
    });
  } catch (error) {
    console.error("Import backup error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengimpor data" },
      { status: 500 }
    );
  }
}