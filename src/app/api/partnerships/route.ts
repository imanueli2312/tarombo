import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { partnershipSchema } from "@/lib/tarombo/types";
import {
  assertNoActivePartner,
  deriveMaritalStatus,
  newId,
  now,
  serializePartnership,
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

/** GET /api/partnerships — butuh person:view */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("person:view");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const personId = searchParams.get("personId");

    let sql = "SELECT * FROM partnership WHERE 1=1";
    const params: string[] = [];
    if (status && ["ACTIVE", "DIVORCED", "WIDOWED"].includes(status)) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (personId) {
      sql += " AND (husband_id = ? OR wife_id = ?)";
      params.push(personId, personId);
    }
    sql += " ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'WIDOWED' THEN 1 ELSE 2 END, marriage_date ASC NULLS LAST";

    const rows = sqlite.prepare(sql).all(...params) as PartnershipRow[];
    return NextResponse.json({
      data: rows.map((p) => {
        const husband = getPerson(p.husband_id);
        const wife = getPerson(p.wife_id);
        return {
          ...serializePartnership(p),
          husband: husband ? serializePerson(husband) : null,
          wife: wife ? serializePerson(wife) : null,
        };
      }),
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/partnerships — butuh partnership:create */
export async function POST(req: NextRequest) {
  try {
    await requirePermission("partnership:create");
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

    const husband = getPerson(data.husbandId);
    const wife = getPerson(data.wifeId);
    if (!husband)
      return NextResponse.json({ error: "Calon suami tidak ditemukan" }, { status: 400 });
    if (!wife)
      return NextResponse.json({ error: "Calon istri tidak ditemukan" }, { status: 400 });

    if (husband.gender !== "MALE")
      return NextResponse.json({ error: "Suami harus berjenis kelamin laki-laki" }, { status: 400 });
    if (wife.gender !== "FEMALE")
      return NextResponse.json({ error: "Istri harus berjenis kelamin perempuan" }, { status: 400 });

    if (data.status === "ACTIVE") {
      assertNoActivePartner(husband.id);
      assertNoActivePartner(wife.id);
    }

    const id = newId();
    const ts = now();
    sqlite
      .prepare(
        `INSERT INTO partnership (id, husband_id, wife_id, marriage_date, divorce_date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        data.husbandId,
        data.wifeId,
        data.marriageDate ? new Date(data.marriageDate as string).toISOString() : null,
        data.divorceDate ? new Date(data.divorceDate as string).toISOString() : null,
        data.status,
        ts,
        ts,
      );

    // Update maritalStatus kedua pihak
    if (data.status === "ACTIVE") {
      sqlite
        .prepare("UPDATE person SET marital_status = 'MARRIED', updated_at = ? WHERE id = ?")
        .run(ts, husband.id);
      sqlite
        .prepare("UPDATE person SET marital_status = 'MARRIED', updated_at = ? WHERE id = ?")
        .run(ts, wife.id);
    } else {
      for (const personId of [husband.id, wife.id]) {
        const ps = sqlite
          .prepare("SELECT status FROM partnership WHERE husband_id = ? OR wife_id = ?")
          .all(personId, personId) as { status: string }[];
        const person = getPerson(personId);
        if (person) {
          const ms = deriveMaritalStatus(ps, person.death_date !== null);
          sqlite
            .prepare("UPDATE person SET marital_status = ?, updated_at = ? WHERE id = ?")
            .run(ms, ts, personId);
        }
      }
    }

    const created = sqlite
      .prepare("SELECT * FROM partnership WHERE id = ?")
      .get(id) as PartnershipRow;
    return NextResponse.json(
      {
        data: {
          ...serializePartnership(created),
          husband: serializePerson(husband),
          wife: serializePerson(wife),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const msg = (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
