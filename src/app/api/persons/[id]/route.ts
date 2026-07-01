import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUpdate, canDelete } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { handleDeathAutoDivorce } from "@/lib/death-utils";
import { checkCircularReference } from "@/lib/ancestor-utils";
import { logAudit, getSessionUserInfo } from "@/lib/audit-log";
import { existsSync, unlinkSync } from "fs";
import path from "path";

const personUpdateSchema = z.object({
  fullName: z.string().min(1, "Nama lengkap wajib diisi").optional(),
  nickname: z.string().nullable().optional(),
  birthPlace: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  deathPlace: z.string().nullable().optional(),
  deathDate: z.string().nullable().optional(),
  birthOrder: z.number().int().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  address: z.string().nullable().optional(),
  religion: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  photoPath: z.string().nullable().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  isDeceased: z.boolean().optional(),
  fatherId: z.string().nullable().optional(),
  motherId: z.string().nullable().optional(),
});

function getUserRole(session: unknown): Role | undefined {
  if (!session || typeof session !== "object" || !("user" in session)) return undefined;
  return (session.user as Record<string, unknown>)?.role as Role | undefined;
}

// GET /api/persons/[id] - Get a single person with relations
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const person = await db.person.findUnique({
      where: { id },
      include: {
        father: { select: { id: true, fullName: true, nickname: true, gender: true } },
        mother: { select: { id: true, fullName: true, nickname: true, gender: true } },
        childrenAsFather: {
          select: { id: true, fullName: true, nickname: true, gender: true, birthOrder: true, birthDate: true, isDeceased: true },
          orderBy: [{ birthOrder: "asc" }, { fullName: "asc" }],
        },
        childrenAsMother: {
          select: { id: true, fullName: true, nickname: true, gender: true, birthOrder: true, birthDate: true, isDeceased: true },
          orderBy: [{ birthOrder: "asc" }, { fullName: "asc" }],
        },
        marriagesAsHusband: {
          include: {
            wife: { select: { id: true, fullName: true, nickname: true, gender: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        marriagesAsWife: {
          include: {
            husband: { select: { id: true, fullName: true, nickname: true, gender: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: "Data orang tidak ditemukan" },
        { status: 404 }
      );
    }

    // Merge children from both parents
    const allChildren = [
      ...person.childrenAsFather.map((c) => ({ ...c, parentRelation: "father" as const })),
      ...person.childrenAsMother.map((c) => ({ ...c, parentRelation: "mother" as const })),
    ];

    return NextResponse.json({
      ...person,
      allChildren,
    });
  } catch (error) {
    console.error("Get person error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// PUT /api/persons/[id] - Update a person
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getUserRole(session);
    if (!canUpdate(role)) {
      return NextResponse.json(
        { error: "Forbidden - Anda tidak memiliki izin untuk mengubah data" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.person.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Data orang tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = personUpdateSchema.parse(body);

    // Validate logical date constraints for updated dates
    // Use the new value if provided, otherwise fall back to existing value
    const effectiveBirthDate = validated.birthDate !== undefined ? validated.birthDate : existing.birthDate?.toISOString();
    const effectiveDeathDate = validated.deathDate !== undefined ? validated.deathDate : existing.deathDate?.toISOString();

    if (effectiveBirthDate && effectiveDeathDate) {
      if (new Date(effectiveDeathDate) < new Date(effectiveBirthDate)) {
        return NextResponse.json(
          { error: "Tanggal meninggal tidak boleh sebelum tanggal lahir" },
          { status: 400 }
        );
      }
    }

    if (effectiveDeathDate && new Date(effectiveDeathDate) > new Date()) {
      return NextResponse.json(
        { error: "Tanggal meninggal tidak boleh di masa depan" },
        { status: 400 }
      );
    }

    if (effectiveBirthDate && new Date(effectiveBirthDate) > new Date()) {
      return NextResponse.json(
        { error: "Tanggal lahir tidak boleh di masa depan" },
        { status: 400 }
      );
    }

    // Prevent circular references (full ancestor chain check)
    if (validated.fatherId && validated.fatherId !== id) {
      const circularError = await checkCircularReference(id, validated.fatherId, "father");
      if (circularError) {
        return NextResponse.json({ error: circularError }, { status: 400 });
      }

      // Also check: new father should not already have this person as an ancestor
      // (i.e., don't make someone your own grandchild's father)
      const fatherAncestors = await (await import("@/lib/ancestor-utils")).getAncestorIds(validated.fatherId);
      if (fatherAncestors.has(id)) {
        return NextResponse.json(
          { error: "Tidak dapat menetapkan — calon ayah sudah memiliki Anda dalam rantai keturunannya" },
          { status: 400 }
        );
      }
    }
    if (validated.motherId && validated.motherId !== id) {
      const circularError = await checkCircularReference(id, validated.motherId, "mother");
      if (circularError) {
        return NextResponse.json({ error: circularError }, { status: 400 });
      }
    }

    // Validate father is male
    if (validated.fatherId) {
      const father = await db.person.findUnique({
        where: { id: validated.fatherId },
      });
      if (father && father.gender !== "MALE") {
        return NextResponse.json(
          { error: "Ayah harus berjenis kelamin laki-laki" },
          { status: 400 }
        );
      }
    }

    // Validate mother is female
    if (validated.motherId) {
      const mother = await db.person.findUnique({
        where: { id: validated.motherId },
      });
      if (mother && mother.gender !== "FEMALE") {
        return NextResponse.json(
          { error: "Ibu harus berjenis kelamin perempuan" },
          { status: 400 }
        );
      }
    }

    const wasPreviouslyDeceased = existing.isDeceased;
    const isNowDeceased = validated.isDeceased ?? existing.isDeceased;

    const person = await db.person.update({
      where: { id },
      data: {
        ...(validated.fullName !== undefined && { fullName: validated.fullName }),
        ...(validated.nickname !== undefined && { nickname: validated.nickname }),
        ...(validated.birthPlace !== undefined && { birthPlace: validated.birthPlace }),
        ...(validated.birthDate !== undefined && {
          birthDate: validated.birthDate ? new Date(validated.birthDate) : null,
        }),
        ...(validated.deathPlace !== undefined && { deathPlace: validated.deathPlace }),
        ...(validated.deathDate !== undefined && {
          deathDate: validated.deathDate ? new Date(validated.deathDate) : null,
        }),
        ...(validated.birthOrder !== undefined && { birthOrder: validated.birthOrder }),
        ...(validated.gender !== undefined && { gender: validated.gender }),
        ...(validated.address !== undefined && { address: validated.address }),
        ...(validated.religion !== undefined && { religion: validated.religion }),
        ...(validated.phone !== undefined && { phone: validated.phone }),
        ...(validated.photoPath !== undefined && { photoPath: validated.photoPath }),
        ...(validated.maritalStatus !== undefined && { maritalStatus: validated.maritalStatus }),
        ...(validated.isDeceased !== undefined && { isDeceased: validated.isDeceased }),
        ...(validated.fatherId !== undefined && { fatherId: validated.fatherId }),
        ...(validated.motherId !== undefined && { motherId: validated.motherId }),
      },
    });

    // Auto-divorce: if person just became deceased
    if (!wasPreviouslyDeceased && isNowDeceased) {
      await handleDeathAutoDivorce(person.id, person.gender);
    }

    // Audit log
    const userInfo = getSessionUserInfo(session);
    await logAudit({
      userId: userInfo?.userId,
      userName: userInfo?.userName,
      action: "UPDATE_PERSON",
      resource: "person",
      resourceId: person.id,
      details: { changes: validated },
    });

    return NextResponse.json(person);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update person error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/persons/[id] - Delete a person (ADMIN only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getUserRole(session);
    if (!canDelete(role)) {
      return NextResponse.json(
        { error: "Forbidden - Hanya Administrator yang dapat menghapus data" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const person = await db.person.findUnique({
      where: { id },
      include: {
        childrenAsFather: { select: { id: true } },
        childrenAsMother: { select: { id: true } },
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: "Data orang tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if person has children
    if (person.childrenAsFather.length > 0 || person.childrenAsMother.length > 0) {
      return NextResponse.json(
        {
          error:
            "Tidak dapat menghapus orang yang masih memiliki anak. Hapus atau pindahkan anak terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    // Delete photo file if exists
    if (person.photoPath) {
      const filePath = path.join(process.cwd(), "public", person.photoPath);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          // Ignore file deletion errors
        }
      }
    }

    await db.person.delete({ where: { id } });

    // Audit log
    const deleteUserInfo = getSessionUserInfo(session);
    await logAudit({
      userId: deleteUserInfo?.userId,
      userName: deleteUserInfo?.userName,
      action: "DELETE_PERSON",
      resource: "person",
      resourceId: id,
      details: { fullName: person.fullName },
    });

    return NextResponse.json({ message: "Data berhasil dihapus" });
  } catch (error) {
    console.error("Delete person error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}