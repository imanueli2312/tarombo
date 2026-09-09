import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { partnershipSchema } from "@/lib/tarombo/types";
import {
  assertNoActivePartner,
  deriveMaritalStatus,
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

/** GET /api/partnerships/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("person:view");
    const { id } = await params;
    const partnership = sqlite
      .prepare("SELECT * FROM partnership WHERE id = ?")
      .get(id) as PartnershipRow | undefined;
    if (!partnership)
      return NextResponse.json({ error: "Pasangan tidak ditemukan" }, { status: 404 });

    const husband = getPerson(partnership.husband_id);
    const wife = getPerson(partnership.wife_id);
    return NextResponse.json({
      data: {
        ...serializePartnership(partnership),
        husband: husband ? serializePerson(husband) : null,
        wife: wife ? serializePerson(wife) : null,
      },
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/partnerships/[id] — butuh partnership:edit */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("partnership:edit");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM partnership WHERE id = ?")
      .get(id) as PartnershipRow | undefined;
    if (!existing)
      return NextResponse.json({ error: "Pasangan tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const parsed = partnershipSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (
      data.husbandId &&
      data.wifeId &&
      data.husbandId === data.wifeId
    ) {
      return NextResponse.json(
        { error: "Suami dan istri tidak boleh orang yang sama" },
        { status: 400 },
      );
    }

    const willBeActive = data.status === "ACTIVE" && existing.status !== "ACTIVE";
    if (willBeActive) {
      assertNoActivePartner(existing.husband_id, id);
      assertNoActivePartner(existing.wife_id, id);
    }

    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    const push = (col: string, val: unknown) => {
      sets.push(`${col} = ?`);
      vals.push(val as string | number | null);
    };
    if (data.husbandId !== undefined) push("husband_id", data.husbandId);
    if (data.wifeId !== undefined) push("wife_id", data.wifeId);
    if (data.marriageDate !== undefined)
      push(
        "marriage_date",
        data.marriageDate
          ? new Date(data.marriageDate as string).toISOString()
          : null,
      );
    if (data.divorceDate !== undefined)
      push(
        "divorce_date",
        data.divorceDate
          ? new Date(data.divorceDate as string).toISOString()
          : null,
      );
    if (data.status !== undefined) push("status", data.status);

    if (sets.length > 0) {
      sets.push("updated_at = ?");
      vals.push(now());
      vals.push(id);
      sqlite
        .prepare(`UPDATE partnership SET ${sets.join(", ")} WHERE id = ?`)
        .run(...vals);
    }

    const updated = sqlite
      .prepare("SELECT * FROM partnership WHERE id = ?")
      .get(id) as PartnershipRow;

    // Sinkronkan marital status kedua pihak
    const ts = now();
    for (const personId of [updated.husband_id, updated.wife_id]) {
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

    const husband = getPerson(updated.husband_id);
    const wife = getPerson(updated.wife_id);
    return NextResponse.json({
      data: {
        ...serializePartnership(updated),
        husband: husband ? serializePerson(husband) : null,
        wife: wife ? serializePerson(wife) : null,
      },
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** DELETE /api/partnerships/[id] — butuh partnership:delete */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("partnership:delete");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM partnership WHERE id = ?")
      .get(id) as PartnershipRow | undefined;
    if (!existing)
      return NextResponse.json({ error: "Pasangan tidak ditemukan" }, { status: 404 });

    sqlite.prepare("DELETE FROM partnership WHERE id = ?").run(id);

    const ts = now();
    for (const personId of [existing.husband_id, existing.wife_id]) {
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

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
