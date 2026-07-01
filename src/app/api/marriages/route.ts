import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canCreate, canUpdate, canDelete } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";

const marriageSchema = z.object({
  husbandId: z.string().min(1, "Suami wajib diisi"),
  wifeId: z.string().min(1, "Istri wajib diisi"),
  marriageDate: z.string().nullable().optional(),
});

function getUserRole(session: unknown): Role | undefined {
  if (!session || typeof session !== "object" || !("user" in session)) return undefined;
  return (session.user as Record<string, unknown>)?.role as Role | undefined;
}

// GET /api/marriages - Get all marriages
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const marriages = await db.marriage.findMany({
      include: {
        husband: { select: { id: true, fullName: true, nickname: true, gender: true } },
        wife: { select: { id: true, fullName: true, nickname: true, gender: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(marriages);
  } catch (error) {
    console.error("Get marriages error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/marriages - Create a new marriage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getUserRole(session);
    if (!canCreate(role)) {
      return NextResponse.json(
        { error: "Forbidden - Anda tidak memiliki izin untuk menambahkan data" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = marriageSchema.parse(body);

    // Validate husband exists and is male
    const husband = await db.person.findUnique({
      where: { id: validated.husbandId },
    });
    if (!husband) {
      return NextResponse.json(
        { error: "Suami tidak ditemukan" },
        { status: 404 }
      );
    }
    if (husband.gender !== "MALE") {
      return NextResponse.json(
        { error: "Suami harus berjenis kelamin laki-laki" },
        { status: 400 }
      );
    }

    // Validate wife exists and is female
    const wife = await db.person.findUnique({
      where: { id: validated.wifeId },
    });
    if (!wife) {
      return NextResponse.json(
        { error: "Istri tidak ditemukan" },
        { status: 404 }
      );
    }
    if (wife.gender !== "FEMALE") {
      return NextResponse.json(
        { error: "Istri harus berjenis kelamin perempuan" },
        { status: 400 }
      );
    }

    // Check if husband and wife are the same person
    if (validated.husbandId === validated.wifeId) {
      return NextResponse.json(
        { error: "Suami dan istri tidak boleh orang yang sama" },
        { status: 400 }
      );
    }

    // Check if husband already has an active marriage (max 1 active)
    const husbandActiveMarriage = await db.marriage.findFirst({
      where: {
        husbandId: validated.husbandId,
        isActive: true,
      },
    });
    if (husbandActiveMarriage) {
      return NextResponse.json(
        {
          error: `${husband.fullName} sudah memiliki pasangan aktif. Satu laki-laki hanya boleh memiliki maksimal 1 pasangan aktif.`,
        },
        { status: 400 }
      );
    }

    // Check if wife already has an active marriage (max 1 active)
    const wifeActiveMarriage = await db.marriage.findFirst({
      where: {
        wifeId: validated.wifeId,
        isActive: true,
      },
    });
    if (wifeActiveMarriage) {
      return NextResponse.json(
        {
          error: `${wife.fullName} sudah memiliki pasangan aktif. Satu perempuan hanya boleh memiliki maksimal 1 pasangan aktif.`,
        },
        { status: 400 }
      );
    }

    // Check if this marriage already exists
    const existingMarriage = await db.marriage.findUnique({
      where: {
        husbandId_wifeId: {
          husbandId: validated.husbandId,
          wifeId: validated.wifeId,
        },
      },
    });
    if (existingMarriage) {
      if (existingMarriage.isActive) {
        return NextResponse.json(
          { error: "Data pernikahan ini sudah ada dan masih aktif" },
          { status: 409 }
        );
      }
      // Re-activate the existing marriage (re-marriage scenario)
      const reactivated = await db.marriage.update({
        where: { id: existingMarriage.id },
        data: {
          isActive: true,
          divorceDate: null,
          ...(validated.marriageDate
            ? { marriageDate: new Date(validated.marriageDate) }
            : {}),
        },
      });

      // Update marital status for both to MARRIED
      await db.person.updateMany({
        where: { id: { in: [validated.husbandId, validated.wifeId] } },
        data: { maritalStatus: "MARRIED" },
      });

      return NextResponse.json(reactivated, { status: 200 });
    }

    const marriage = await db.marriage.create({
      data: {
        husbandId: validated.husbandId,
        wifeId: validated.wifeId,
        marriageDate: validated.marriageDate
          ? new Date(validated.marriageDate)
          : null,
        isActive: true,
      },
    });

    // Update marital status for both
    await db.person.update({
      where: { id: validated.husbandId },
      data: { maritalStatus: "MARRIED" },
    });
    await db.person.update({
      where: { id: validated.wifeId },
      data: { maritalStatus: "MARRIED" },
    });

    return NextResponse.json(marriage, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create marriage error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}