import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUpdate, canDelete } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";

const marriageUpdateSchema = z.object({
  marriageDate: z.string().nullable().optional(),
  divorceDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

function getUserRole(session: unknown): Role | undefined {
  if (!session || typeof session !== "object" || !("user" in session)) return undefined;
  return (session.user as Record<string, unknown>)?.role as Role | undefined;
}

// GET /api/marriages/[id] - Get a single marriage
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
    const marriage = await db.marriage.findUnique({
      where: { id },
      include: {
        husband: { select: { id: true, fullName: true, nickname: true, gender: true } },
        wife: { select: { id: true, fullName: true, nickname: true, gender: true } },
      },
    });

    if (!marriage) {
      return NextResponse.json(
        { error: "Data pernikahan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(marriage);
  } catch (error) {
    console.error("Get marriage error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// PUT /api/marriages/[id] - Update a marriage (e.g., divorce)
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
    const existing = await db.marriage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Data pernikahan tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = marriageUpdateSchema.parse(body);

    const marriage = await db.marriage.update({
      where: { id },
      data: {
        ...(validated.marriageDate !== undefined && {
          marriageDate: validated.marriageDate
            ? new Date(validated.marriageDate)
            : null,
        }),
        ...(validated.divorceDate !== undefined && {
          divorceDate: validated.divorceDate
            ? new Date(validated.divorceDate)
            : null,
        }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
    });

    // If marriage is being deactivated (divorced), update marital status
    if (validated.isActive === false && existing.isActive) {
      await db.person.update({
        where: { id: existing.husbandId },
        data: { maritalStatus: "DIVORCED" },
      });
      await db.person.update({
        where: { id: existing.wifeId },
        data: { maritalStatus: "DIVORCED" },
      });
    }

    return NextResponse.json(marriage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update marriage error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/marriages/[id] - Delete a marriage (ADMIN only)
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
    const marriage = await db.marriage.findUnique({ where: { id } });
    if (!marriage) {
      return NextResponse.json(
        { error: "Data pernikahan tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.marriage.delete({ where: { id } });

    return NextResponse.json({ message: "Data pernikahan berhasil dihapus" });
  } catch (error) {
    console.error("Delete marriage error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}