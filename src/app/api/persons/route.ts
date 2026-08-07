import { sqlite } from "@/lib/database";
import { handleApi, json } from "@/lib/api";
import {
  getRequestContext,
  assertPageAccess,
  assertAction,
} from "@/lib/auth";
import { createPerson, validateParentAssignment } from "@/app/api/tree/route";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/persons - list all persons
export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertPageAccess(permissions, "familyTree");
    const rows = sqlite
      .prepare("SELECT * FROM persons ORDER BY generation, birth_order, name")
      .all() as Person[];
    return json(rows);
  });
}

// POST /api/persons - create a new person
export function POST(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "managePersons");
    const body = (await req.json()) as Partial<Person>;

    if (body.father_id) validateParentAssignment(body.id ?? null, body.father_id, "father");
    if (body.mother_id) validateParentAssignment(body.id ?? null, body.mother_id, "mother");
    if (body.parent_id) validateParentAssignment(body.id ?? null, body.parent_id, "parent");

    const person = createPerson(body);
    return json(person, 201);
  });
}
