import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personSchema } from "@/lib/tarombo/types";
import {
  deriveMaritalStatus,
  handleDeathSideEffects,
  serializePerson,
} from "@/lib/tarombo/queries";

/** GET /api/persons/[id] — detail satu orang + partnership-nya. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const person = await db.person.findUnique({
      where: { id },
      include: {
        father: true,
        mother: true,
        partnershipsAsHusband: { include: { wife: true } },
        partnershipsAsWife: { include: { husband: true } },
        childrenAsFather: { orderBy: { birthOrder: "asc" } },
        childrenAsMother: { orderBy: { birthOrder: "asc" } },
      },
    });
    if (!person)
      return NextResponse.json({ error: "Orang tidak ditemukan" }, { status: 404 });

    return NextResponse.json({ data: serializePerson(person), relations: {
      father: person.father ? serializePerson(person.father) : null,
      mother: person.mother ? serializePerson(person.mother) : null,
      partnerships: [
        ...person.partnershipsAsHusband.map((p) => ({
          ...p,
          partner: serializePerson(p.wife),
        })),
        ...person.partnershipsAsWife.map((p) => ({
          ...p,
          partner: serializePerson(p.husband),
        })),
      ],
      children: [
        ...person.childrenAsFather.map(serializePerson),
        ...person.childrenAsMother.map(serializePerson),
      ],
    }});
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/persons/[id] — update orang.
 *  Bila deathDate baru diset (sebelumnya null) dan ada pasangan aktif →
 *  otomatis set tanggal cerai & status pasangan menjadi WIDOWED.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await db.person.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Orang tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const parsed = personSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Validasi ayah / ibu
    if (data.fatherId) {
      const father = await db.person.findUnique({ where: { id: data.fatherId } });
      if (!father)
        return NextResponse.json({ error: "Ayah tidak ditemukan" }, { status: 400 });
      if (father.gender !== "MALE")
        return NextResponse.json(
          { error: "Ayah harus berjenis kelamin laki-laki" },
          { status: 400 },
        );
      if (data.fatherId === id)
        return NextResponse.json(
          { error: "Tidak boleh menjadi ayah diri sendiri" },
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
      if (data.motherId === id)
        return NextResponse.json(
          { error: "Tidak boleh menjadi ibu diri sendiri" },
          { status: 400 },
        );
    }

    // Deteksi perubahan status kematian (sebelumnya hidup → sekarang meninggal)
    const wasAlive = existing.deathDate === null;
    const willDie = data.deathDate !== null && data.deathDate !== undefined;

    const updated = await db.person.update({ where: { id }, data });

    // Efek samping kematian: auto-cerai pasangan aktif
    if (wasAlive && willDie) {
      await handleDeathSideEffects(updated.id);
    }

    // Sinkronkan maritalStatus berdasarkan partnership saat ini
    const partnerships = await db.partnership.findMany({
      where: { OR: [{ husbandId: id }, { wifeId: id }] },
      select: { status: true },
    });
    const derived = deriveMaritalStatus(partnerships, updated.deathDate !== null);
    if (derived !== updated.maritalStatus) {
      await db.person.update({ where: { id }, data: { maritalStatus: derived } });
    }

    const refreshed = await db.person.findUnique({ where: { id } });
    return NextResponse.json({ data: serializePerson(refreshed!) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/persons/[id] — hapus orang.
 *  Anak-anak akan set fatherId/motherId = null (onDelete: SetNull).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await db.person.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Orang tidak ditemukan" }, { status: 404 });

    await db.person.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
