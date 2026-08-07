import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import {
  getRequestContext,
  assertAction,
  HTTPError,
} from "@/lib/auth";
import type { Spouse } from "@/lib/types";

export const dynamic = "force-dynamic";

function validateSpouse(input: {
  husband_id: string;
  wife_id: string;
  is_active: number;
  excludeId: string;
}) {
  const rows = sqlite
    .prepare(
      `SELECT gender FROM persons WHERE id IN (?, ?) ORDER BY id`,
    )
    .all(input.husband_id, input.wife_id) as { gender: string }[];
  if (rows.length < 2) throw new HTTPError(400, "Husband or wife does not exist.");

  const husband = sqlite.prepare("SELECT * FROM persons WHERE id = ?").get(input.husband_id) as any;
  const wife = sqlite.prepare("SELECT * FROM persons WHERE id = ?").get(input.wife_id) as any;
  if (!husband || !wife) throw new HTTPError(400, "Husband or wife does not exist.");
  if (husband.gender !== "male") throw new HTTPError(400, "Husband must be male.");
  if (wife.gender !== "female") throw new HTTPError(400, "Wife must be female.");
  if (husband.id === wife.id)
    throw new HTTPError(400, "A person cannot be married to themselves.");

  if (input.is_active === 1) {
    const ha = sqlite
      .prepare(
        "SELECT COUNT(*) as c FROM spouses WHERE husband_id=? AND is_active=1 AND id != ?"
      )
      .get(input.husband_id, input.excludeId) as { c: number };
    if (ha.c > 0)
      throw new HTTPError(400, "This man already has an active spouse.");
    const wa = sqlite
      .prepare(
        "SELECT COUNT(*) as c FROM spouses WHERE wife_id=? AND is_active=1 AND id != ?"
      )
      .get(input.wife_id, input.excludeId) as { c: number };
    if (wa.c > 0)
      throw new HTTPError(400, "This woman already has an active spouse.");
  }
}

export function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageSpouses");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM spouses WHERE id = ?")
      .get(id) as Spouse | undefined;
    if (!existing) return errorResponse(404, "Spouse record not found");

    const body = (await req.json()) as Partial<Spouse>;
    const merged: Spouse = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString(),
    };

    validateSpouse({
      husband_id: merged.husband_id,
      wife_id: merged.wife_id,
      is_active: merged.is_active,
      excludeId: id,
    });

    sqlite
      .prepare(
        `UPDATE spouses SET husband_id=?, wife_id=?, marriage_date=?, divorce_date=?, is_active=?, updated_at=datetime('now') WHERE id=?`
      )
      .run(
        merged.husband_id,
        merged.wife_id,
        merged.marriage_date,
        merged.divorce_date,
        merged.is_active,
        id
      );

    const updated = sqlite
      .prepare("SELECT * FROM spouses WHERE id = ?")
      .get(id) as Spouse;
    return json(updated);
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageSpouses");
    const { id } = await params;
    sqlite.prepare("DELETE FROM spouses WHERE id=?").run(id);
    return json({ ok: true });
  });
}
