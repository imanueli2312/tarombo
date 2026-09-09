import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personSchema } from "@/lib/tarombo/types";
import {
  assertNoActivePartner,
  deriveMaritalStatus,
  handleDeathSideEffects,
  serializePerson,
} from "@/lib/tarombo/queries";

/**
 * GET /api/persons
 * Query params:
 *  - q        : cari berdasarkan nama / nama panggilan
 *  - gender   : MALE | FEMALE
 *  - alive    : "true" hanya yang masih hidup
 *  - root     : "true" hanya leluhur (tanpa ayah/ibu)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const gender = searchParams.get("gender");
    const alive = searchParams.get("alive");
    const root = searchParams.get("root");

    const where: { AND: Record<string, unknown>[] } = { AND: [] };

    if (q) {
      where.AND.push({
        OR: [
          { fullName: { contains: q } },
          { nickname: { contains: q } },
        ],
      });
    }
    if (gender === "MALE" || gender === "FEMALE") {
      where.AND.push({ gender });
    }
    if (alive === "true") {
      where.AND.push({ deathDate: null });
    }
    if (root === "true") {
      where.AND.push({ fatherId: null });
      where.AND.push({ motherId: null });
    }

    const persons = await db.person.findMany({
      where,
      orderBy: [{ generationNumber: "asc" }, { birthDate: "asc" }],
    });

    return NextResponse.json({ data: persons.map(serializePerson) });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/persons — buat orang baru.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = personSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Validasi: ayah harus laki-laki, ibu harus perempuan
    if (data.fatherId) {
      const father = await db.person.findUnique({ where: { id: data.fatherId } });
      if (!father)
        return NextResponse.json({ error: "Ayah tidak ditemukan" }, { status: 400 });
      if (father.gender !== "MALE")
        return NextResponse.json(
          { error: "Ayah harus berjenis kelamin laki-laki" },
          { status: 400 },
        );
    }
    if (data.motherId) {
      const mother = await db.person.findUnique({ where: { id: data.motherId } });
      if (!mother)
        return NextResponse.json({ error: "Ibu tidak ditemukan" }, { status: 400 });
      if (mother.gender !== "FEMALE")
        return NextResponse.json(
          { error: "Ibu harus berjenis kelamin perempuan" },
          { status: 400 },
        );
    }

    const created = await db.person.create({ data });

    // Efek samping kematian (auto-cerai pasangan aktif)
    if (created.deathDate) {
      await handleDeathSideEffects(created.id);
    }

    return NextResponse.json({ data: serializePerson(created) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
