import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { personSchema } from "@/lib/tarombo/types";
import {
  deriveMaritalStatus,
  handleDeathSideEffects,
  now,
  serializePerson,
  type PartnershipRow,
  type PersonRow,
} from "@/lib/tarombo/queries";
import { PermissionDeniedError, requirePermission } from "@/lib/tarombo/auth";

function getPerson(id: string): PersonRow | undefined {
  return sqlite.prepare("SELECT * FROM person WHERE id = ?").get(id) as
    | PersonRow
    | undefined;
}

/** GET /api/persons/[id] — butuh person:view */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("person:view");
    const { id } = await params;
    const person = getPerson(id);
    if (!person)
      return NextResponse.json({ error: "Orang tidak ditemukan" }, { status: 404 });

    const father = person.father_id ? getPerson(person.father_id) : null;
    const mother = person.mother_id ? getPerson(person.mother_id) : null;

    // partnerships
    const ps = sqlite
      .prepare(
        `SELECT * FROM partnership WHERE husband_id = ? OR wife_id = ?`,
      )
      .all(id, id) as PartnershipRow[];

    const partnerships = ps.map((p) => {
      const partnerId = p.husband_id === id ? p.wife_id : p.husband_id;
      const partner = getPerson(partnerId);
      return { ...p, partner: partner ? serializePerson(partner) : null };
    });

    const childrenAsFather = sqlite
      .prepare("SELECT * FROM person WHERE father_id = ? ORDER BY birth_order ASC NULLS LAST, birth_date ASC NULLS LAST")
      .all(id) as PersonRow[];
    const childrenAsMother = sqlite
      .prepare("SELECT * FROM person WHERE mother_id = ? ORDER BY birth_order ASC NULLS LAST, birth_date ASC NULLS LAST")
      .all(id) as PersonRow[];

    return NextResponse.json({
      data: serializePerson(person),
      relations: {
        father: father ? serializePerson(father) : null,
        mother: mother ? serializePerson(mother) : null,
        partnerships,
        children: [
          ...childrenAsFather.map(serializePerson),
          ...childrenAsMother.map(serializePerson),
        ],
      },
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/persons/[id] — butuh person:edit */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("person:edit");
    const { id } = await params;
    const existing = getPerson(id);
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

    if (data.fatherId) {
      const father = getPerson(data.fatherId);
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
      const mother = getPerson(data.motherId);
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

    const wasAlive = existing.death_date === null;
    const willDie =
      data.deathDate !== null && data.deathDate !== undefined;

    // Build UPDATE dynamically
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    const push = (col: string, val: unknown) => {
      sets.push(`${col} = ?`);
      vals.push(val as string | number | null);
    };
    if (data.fullName !== undefined) push("full_name", data.fullName);
    if (data.nickname !== undefined) push("nickname", data.nickname ?? null);
    if (data.birthPlace !== undefined) push("birth_place", data.birthPlace ?? null);
    if (data.birthDate !== undefined)
      push(
        "birth_date",
        data.birthDate ? new Date(data.birthDate as string).toISOString() : null,
      );
    if (data.deathDate !== undefined)
      push(
        "death_date",
        data.deathDate ? new Date(data.deathDate as string).toISOString() : null,
      );
    if (data.birthOrder !== undefined) push("birth_order", data.birthOrder ?? null);
    if (data.gender !== undefined) push("gender", data.gender);
    if (data.address !== undefined) push("address", data.address ?? null);
    if (data.religion !== undefined) push("religion", data.religion ?? null);
    if (data.phone !== undefined) push("phone", data.phone ?? null);
    if (data.photo !== undefined) push("photo", data.photo ?? null);
    if (data.maritalStatus !== undefined) push("marital_status", data.maritalStatus);
    if (data.generationNumber !== undefined)
      push("generation_number", data.generationNumber ?? null);
    if (data.burialName !== undefined) push("burial_name", data.burialName ?? null);
    if (data.burialAddress !== undefined) push("burial_address", data.burialAddress ?? null);
    if (data.burialLat !== undefined) push("burial_lat", data.burialLat ?? null);
    if (data.burialLng !== undefined) push("burial_lng", data.burialLng ?? null);
    if (data.fatherId !== undefined) push("father_id", data.fatherId ?? null);
    if (data.motherId !== undefined) push("mother_id", data.motherId ?? null);

    if (sets.length > 0) {
      sets.push("updated_at = ?");
      vals.push(now());
      vals.push(id);
      sqlite.prepare(`UPDATE person SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }

    const updated = getPerson(id)!;
    if (wasAlive && willDie) {
      handleDeathSideEffects(updated.id);
    }

    // Sinkronkan maritalStatus
    const ps = sqlite
      .prepare("SELECT status FROM partnership WHERE husband_id = ? OR wife_id = ?")
      .all(id, id) as { status: string }[];
    const derived = deriveMaritalStatus(ps, updated.death_date !== null);
    if (derived !== updated.marital_status) {
      sqlite
        .prepare("UPDATE person SET marital_status = ?, updated_at = ? WHERE id = ?")
        .run(derived, now(), id);
    }

    const refreshed = getPerson(id)!;
    return NextResponse.json({ data: serializePerson(refreshed) });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/persons/[id] — butuh person:delete */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("person:delete");
    const { id } = await params;
    const existing = getPerson(id);
    if (!existing)
      return NextResponse.json({ error: "Orang tidak ditemukan" }, { status: 404 });

    sqlite.prepare("DELETE FROM person WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
