import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partnershipSchema } from "@/lib/tarombo/types";
import {
  assertNoActivePartner,
  deriveMaritalStatus,
  serializePartnership,
  serializePerson,
} from "@/lib/tarombo/queries";

/** GET /api/partnerships — daftar semua pasangan. */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const personId = searchParams.get("personId");

    const where: { AND: Record<string, unknown>[] } = { AND: [] };
    if (status && ["ACTIVE", "DIVORCED", "WIDOWED"].includes(status)) {
      where.AND.push({ status });
    }
    if (personId) {
      where.AND.push({
        OR: [{ husbandId: personId }, { wifeId: personId }],
      });
    }

    const partnerships = await db.partnership.findMany({
      where,
      include: { husband: true, wife: true },
      orderBy: [{ status: "asc" }, { marriageDate: "asc" }],
    });

    return NextResponse.json({
      data: partnerships.map((p) => ({
        ...serializePartnership(p),
        husband: serializePerson(p.husband),
        wife: serializePerson(p.wife),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/partnerships — buat pasangan baru.
 *  Validasi bisnis:
 *  - husband harus MALE, wife harus FEMALE
 *  - husbandId != wifeId
 *  - Maksimal 1 pasangan AKTIF per orang (laki-laki & perempuan)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = partnershipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (data.husbandId === data.wifeId) {
      return NextResponse.json(
        { error: "Suami dan istri tidak boleh orang yang sama" },
        { status: 400 },
      );
    }

    const husband = await db.person.findUnique({ where: { id: data.husbandId } });
    const wife = await db.person.findUnique({ where: { id: data.wifeId } });
    if (!husband)
      return NextResponse.json({ error: "Calon suami tidak ditemukan" }, { status: 400 });
    if (!wife)
      return NextResponse.json({ error: "Calon istri tidak ditemukan" }, { status: 400 });

    if (husband.gender !== "MALE")
      return NextResponse.json({ error: "Suami harus berjenis kelamin laki-laki" }, { status: 400 });
    if (wife.gender !== "FEMALE")
      return NextResponse.json({ error: "Istri harus berjenis kelamin perempuan" }, { status: 400 });

    // Validasi maks 1 pasangan aktif
    if (data.status === "ACTIVE") {
      await assertNoActivePartner(husband.id);
      await assertNoActivePartner(wife.id);
    }

    const created = await db.partnership.create({
      data,
      include: { husband: true, wife: true },
    });

    // Update maritalStatus kedua pihak
    if (data.status === "ACTIVE") {
      await db.person.update({
        where: { id: husband.id },
        data: { maritalStatus: "MARRIED" },
      });
      await db.person.update({
        where: { id: wife.id },
        data: { maritalStatus: "MARRIED" },
      });
    } else {
      // Recompute marital status
      for (const personId of [husband.id, wife.id]) {
        const ps = await db.partnership.findMany({
          where: { OR: [{ husbandId: personId }, { wifeId: personId }] },
          select: { status: true },
        });
        const person = await db.person.findUnique({ where: { id: personId } });
        if (person) {
          const ms = deriveMaritalStatus(ps, person.deathDate !== null);
          await db.person.update({ where: { id: personId }, data: { maritalStatus: ms } });
        }
      }
    }

    return NextResponse.json(
      {
        data: {
          ...serializePartnership(created),
          husband: serializePerson(created.husband),
          wife: serializePerson(created.wife),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
