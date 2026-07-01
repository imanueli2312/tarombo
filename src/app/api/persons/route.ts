import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canCreate } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { handleDeathAutoDivorce } from "@/lib/death-utils";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "persons");

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const personSchema = z.object({
  fullName: z.string().min(1, "Nama lengkap wajib diisi"),
  nickname: z.string().nullable().optional(),
  birthPlace: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  deathPlace: z.string().nullable().optional(),
  deathDate: z.string().nullable().optional(),
  birthOrder: z.number().int().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE"]),
  address: z.string().nullable().optional(),
  religion: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  isDeceased: z.boolean().optional(),
  fatherId: z.string().nullable().optional(),
  motherId: z.string().nullable().optional(),
});

function getUserRole(session: unknown): Role | undefined {
  if (!session || typeof session !== "object" || !("user" in session)) return undefined;
  return (session.user as Record<string, unknown>)?.role as Role | undefined;
}

// GET /api/persons - Get all persons (tree data)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const gender = searchParams.get("gender");
    const includeRelations = searchParams.get("includeRelations") === "true";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { nickname: { contains: search } },
      ];
    }
    if (gender) {
      where.gender = gender;
    }

    const persons = await db.person.findMany({
      where,
      include: {
        father: includeRelations
          ? { select: { id: true, fullName: true, nickname: true, gender: true } }
          : false,
        mother: includeRelations
          ? { select: { id: true, fullName: true, nickname: true, gender: true } }
          : false,
        marriagesAsHusband: includeRelations
          ? {
              include: {
                wife: { select: { id: true, fullName: true, nickname: true, gender: true } },
              },
              where: { isActive: true },
            }
          : false,
        marriagesAsWife: includeRelations
          ? {
              include: {
                husband: { select: { id: true, fullName: true, nickname: true, gender: true } },
              },
              where: { isActive: true },
            }
          : false,
      },
      orderBy: [
        { birthOrder: "asc" },
        { fullName: "asc" },
      ],
    });

    return NextResponse.json(persons);
  } catch (error) {
    console.error("Get persons error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/persons - Create a new person
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
    const validated = personSchema.parse(body);

    // Validate father exists and is male
    if (validated.fatherId) {
      const father = await db.person.findUnique({
        where: { id: validated.fatherId },
      });
      if (!father) {
        return NextResponse.json(
          { error: "Ayah tidak ditemukan" },
          { status: 404 }
        );
      }
      if (father.gender !== "MALE") {
        return NextResponse.json(
          { error: "Ayah harus berjenis kelamin laki-laki" },
          { status: 400 }
        );
      }
    }

    // Validate mother exists and is female
    if (validated.motherId) {
      const mother = await db.person.findUnique({
        where: { id: validated.motherId },
      });
      if (!mother) {
        return NextResponse.json(
          { error: "Ibu tidak ditemukan" },
          { status: 404 }
        );
      }
      if (mother.gender !== "FEMALE") {
        return NextResponse.json(
          { error: "Ibu harus berjenis kelamin perempuan" },
          { status: 400 }
        );
      }
    }

    const person = await db.person.create({
      data: {
        fullName: validated.fullName,
        nickname: validated.nickname ?? null,
        birthPlace: validated.birthPlace ?? null,
        birthDate: validated.birthDate ? new Date(validated.birthDate) : null,
        deathPlace: validated.deathPlace ?? null,
        deathDate: validated.deathDate ? new Date(validated.deathDate) : null,
        birthOrder: validated.birthOrder ?? null,
        gender: validated.gender,
        address: validated.address ?? null,
        religion: validated.religion ?? null,
        phone: validated.phone ?? null,
        maritalStatus: validated.maritalStatus ?? "SINGLE",
        isDeceased: validated.isDeceased ?? false,
        fatherId: validated.fatherId ?? null,
        motherId: validated.motherId ?? null,
      },
    });

    // Auto-divorce logic: if person is marked as deceased and has active marriages
    if (validated.isDeceased) {
      try {
        await handleDeathAutoDivorce(person.id, person.gender);
      } catch (err) {
        console.error("Auto-divorce error:", err);
      }
    }

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create person error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}