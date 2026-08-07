import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import {
  getRequestContext,
  assertAction,
  assertPageAccess,
  generateId,
  HTTPError,
} from "@/lib/auth";
import type { Person, Spouse } from "@/lib/types";

export const dynamic = "force-dynamic";

// If a spouse has died, automatically set the divorce date to the death date.
function applyDeathAutoDivorce() {
  const rows = sqlite
    .prepare(
      `SELECT s.id as sid, s.is_active, h.date_of_death as h_death, w.date_of_death as w_death,
              s.divorce_date
       FROM spouses s
       JOIN persons h ON h.id = s.husband_id
       JOIN persons w ON w.id = s.wife_id
       WHERE s.is_active = 1`
    )
    .all() as {
      sid: string;
      is_active: number;
      h_death: string | null;
      w_death: string | null;
      divorce_date: string | null;
    }[];

  for (const r of rows) {
    const deathDate = r.h_death ?? r.w_death;
    if (deathDate && !r.divorce_date) {
      sqlite
        .prepare(
          "UPDATE spouses SET divorce_date=?, is_active=0, updated_at=datetime('now') WHERE id=?"
        )
        .run(deathDate, r.sid);
    }
  }
}

// Validate spouse constraints
function validateSpouse(input: {
  husband_id: string;
  wife_id: string;
  is_active: number;
  excludeId?: string;
}) {
  const husband = sqlite
    .prepare("SELECT * FROM persons WHERE id = ?")
    .get(input.husband_id) as Person | undefined;
  const wife = sqlite
    .prepare("SELECT * FROM persons WHERE id = ?")
    .get(input.wife_id) as Person | undefined;
  if (!husband || !wife) {
    throw new HTTPError(400, "Husband or wife does not exist.");
  }
  if (husband.gender !== "male") {
    throw new HTTPError(400, "Husband must be male.");
  }
  if (wife.gender !== "female") {
    throw new HTTPError(400, "Wife must be female.");
  }
  if (husband.id === wife.id) {
    throw new HTTPError(400, "A person cannot be married to themselves.");
  }

  if (input.is_active === 1) {
    // A man can have at most one active spouse
    const husbandActive = sqlite
      .prepare(
        "SELECT COUNT(*) as c FROM spouses WHERE husband_id=? AND is_active=1" +
          (input.excludeId ? " AND id != ?" : "")
      )
      .get(...(input.excludeId ? [input.husband_id, input.excludeId] : [input.husband_id])) as {
      c: number;
    };
    if (husbandActive.c > 0) {
      throw new HTTPError(
        400,
        "This man already has an active spouse. A man can have at most one active spouse."
      );
    }
    // A woman can have at most one active spouse
    const wifeActive = sqlite
      .prepare(
        "SELECT COUNT(*) as c FROM spouses WHERE wife_id=? AND is_active=1" +
          (input.excludeId ? " AND id != ?" : "")
      )
      .get(...(input.excludeId ? [input.wife_id, input.excludeId] : [input.wife_id])) as {
      c: number;
    };
    if (wifeActive.c > 0) {
      throw new HTTPError(
        400,
        "This woman already has an active spouse. A woman can have at most one active spouse."
      );
    }
  }
}

// GET /api/spouses
export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertPageAccess(permissions, "familyTree");
    applyDeathAutoDivorce();
    const rows = sqlite.prepare("SELECT * FROM spouses ORDER BY marriage_date").all() as Spouse[];
    return json(rows);
  });
}

// POST /api/spouses
export function POST(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageSpouses");
    const body = (await req.json()) as Partial<Spouse>;

    validateSpouse({
      husband_id: body.husband_id!,
      wife_id: body.wife_id!,
      is_active: body.is_active ?? 1,
    });

    const id = body.id ?? generateId("s");
    const marriageDate = body.marriage_date ?? null;
    const divorceDate = body.divorce_date ?? null;
    const isActive = body.is_active ?? 1;

    sqlite
      .prepare(
        `INSERT INTO spouses (id, husband_id, wife_id, marriage_date, divorce_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, body.husband_id, body.wife_id, marriageDate, divorceDate, isActive);

    // After insert, apply death-based auto divorce
    applyDeathAutoDivorce();

    const row = sqlite.prepare("SELECT * FROM spouses WHERE id = ?").get(id) as Spouse;
    return json(row, 201);
  });
}
