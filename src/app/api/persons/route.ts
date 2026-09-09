import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { personSchema } from "@/lib/tarombo/types";
import {
  handleDeathSideEffects,
  newId,
  now,
  serializePerson,
  type PersonRow,
} from "@/lib/tarombo/queries";
import { PermissionDeniedError, requirePermission } from "@/lib/tarombo/auth";

/** GET /api/persons — butuh permission person:view */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("person:view");
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const gender = searchParams.get("gender");
    const alive = searchParams.get("alive");
    const root = searchParams.get("root");

    let sql = "SELECT * FROM person WHERE 1=1";
    const params: (string | number)[] = [];
    if (q) {
      sql += " AND (full_name LIKE ? OR nickname LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
    if (gender === "MALE" || gender === "FEMALE") {
      sql += " AND gender = ?";
      params.push(gender);
    }
    if (alive === "true") {
      sql += " AND death_date IS NULL";
    }
    if (root === "true") {
      sql += " AND father_id IS NULL AND mother_id IS NULL";
    }
    sql += " ORDER BY generation_number ASC NULLS LAST, birth_date ASC NULLS LAST";

    const rows = sqlite.prepare(sql).all(...params) as PersonRow[];
    return NextResponse.json({ data: rows.map(serializePerson) });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/persons — butuh permission person:create */
export async function POST(req: NextRequest) {
  try {
    await requirePermission("person:create");
    const body = await req.json();
    const parsed = personSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Validasi ayah/ibu
    if (data.fatherId) {
      const father = sqlite
        .prepare("SELECT * FROM person WHERE id = ?")
        .get(data.fatherId) as PersonRow | undefined;
      if (!father)
        return NextResponse.json({ error: "Ayah tidak ditemukan" }, { status: 400 });
      if (father.gender !== "MALE")
        return NextResponse.json(
          { error: "Ayah harus berjenis kelamin laki-laki" },
          { status: 400 },
        );
    }
    if (data.motherId) {
      const mother = sqlite
        .prepare("SELECT * FROM person WHERE id = ?")
        .get(data.motherId) as PersonRow | undefined;
      if (!mother)
        return NextResponse.json({ error: "Ibu tidak ditemukan" }, { status: 400 });
      if (mother.gender !== "FEMALE")
        return NextResponse.json(
          { error: "Ibu harus berjenis kelamin perempuan" },
          { status: 400 },
        );
    }

    const id = newId();
    const ts = now();
    sqlite
      .prepare(
        `INSERT INTO person (id, full_name, nickname, birth_place, birth_date, death_date,
           birth_order, gender, address, religion, phone, photo, marital_status,
           generation_number, burial_name, burial_address, burial_lat, burial_lng,
           father_id, mother_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        data.fullName,
        data.nickname ?? null,
        data.birthPlace ?? null,
        data.birthDate ? new Date(data.birthDate as string).toISOString() : null,
        data.deathDate ? new Date(data.deathDate as string).toISOString() : null,
        data.birthOrder ?? null,
        data.gender,
        data.address ?? null,
        data.religion ?? null,
        data.phone ?? null,
        data.photo ?? null,
        data.maritalStatus,
        data.generationNumber ?? null,
        data.burialName ?? null,
        data.burialAddress ?? null,
        data.burialLat ?? null,
        data.burialLng ?? null,
        data.fatherId ?? null,
        data.motherId ?? null,
        ts,
        ts,
      );

    const created = sqlite
      .prepare("SELECT * FROM person WHERE id = ?")
      .get(id) as PersonRow;

    if (created.death_date) {
      handleDeathSideEffects(created.id);
    }

    return NextResponse.json(
      { data: serializePerson(created) },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
