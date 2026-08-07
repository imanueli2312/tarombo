import { sqlite } from "@/lib/database";
import { handleApi, json } from "@/lib/api";
import {
  getRequestContext,
  assertPageAccess,
  assertAction,
  generateId,
  HTTPError,
} from "@/lib/auth";
import { getTreeData } from "@/lib/tree";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/tree - return full family tree
export function GET() {
  return handleApi(() => {
    return json(getTreeData());
  });
}

// POST /api/tree - placeholder (no creation at tree level)
export function POST() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertPageAccess(permissions, "familyTree");
    return json({ ok: true });
  });
}

// Helper to create a person (used internally and by persons API)
export function createPerson(input: Partial<Person>): Person {
  const id = input.id ?? generateId("p");
  sqlite
    .prepare(
      `INSERT INTO persons (
        id, name, nickname, place_of_birth, date_of_birth, date_of_death,
        birth_order, gender, residential_address, religion, phone_number,
        photo, marital_status, generation, father_id, mother_id, parent_id,
        burial_name, burial_address, burial_lat, burial_lng
      ) VALUES (@id, @name, @nickname, @place_of_birth, @date_of_birth, @date_of_death,
        @birth_order, @gender, @residential_address, @religion, @phone_number,
        @photo, @marital_status, @generation, @father_id, @mother_id, @parent_id,
        @burial_name, @burial_address, @burial_lat, @burial_lng)`
    )
    .run({
      id,
      name: input.name ?? "Tanpa Nama",
      nickname: input.nickname ?? null,
      place_of_birth: input.place_of_birth ?? null,
      date_of_birth: input.date_of_birth ?? null,
      date_of_death: input.date_of_death ?? null,
      birth_order: input.birth_order ?? 0,
      gender: input.gender ?? "male",
      residential_address: input.residential_address ?? null,
      religion: input.religion ?? null,
      phone_number: input.phone_number ?? null,
      photo: input.photo ?? null,
      marital_status: input.marital_status ?? null,
      generation: input.generation ?? 1,
      father_id: input.father_id ?? null,
      mother_id: input.mother_id ?? null,
      parent_id: input.parent_id ?? null,
      burial_name: input.burial_name ?? null,
      burial_address: input.burial_address ?? null,
      burial_lat: input.burial_lat ?? null,
      burial_lng: input.burial_lng ?? null,
    });
  return sqlite.prepare("SELECT * FROM persons WHERE id = ?").get(id) as Person;
}

// Validate parent assignment to prevent cycles and enforce constraints
export function validateParentAssignment(
  personId: string | null,
  parentId: string,
  parentRole: "father" | "mother" | "parent"
): void {
  if (personId && personId === parentId) {
    throw new HTTPError(400, "A person cannot be their own parent.");
  }
  const parent = sqlite
    .prepare("SELECT * FROM persons WHERE id = ?")
    .get(parentId) as Person | undefined;
  if (!parent) {
    throw new HTTPError(400, "Referenced parent does not exist.");
  }
  if (parentRole === "father" && parent.gender !== "male") {
    throw new HTTPError(400, "Father must be male.");
  }
  if (parentRole === "mother" && parent.gender !== "female") {
    throw new HTTPError(400, "Mother must be female.");
  }
  // Prevent cycles
  if (personId) {
    let current: string | null = parentId;
    const visited = new Set<string>();
    while (current) {
      if (current === personId) {
        throw new HTTPError(
          400,
          "Cycle detected: this parent assignment would create a circular reference."
        );
      }
      if (visited.has(current)) break;
      visited.add(current);
      const row = sqlite
        .prepare("SELECT parent_id FROM persons WHERE id = ?")
        .get(current) as { parent_id: string | null } | undefined;
      current = row?.parent_id ?? null;
    }
  }
}
