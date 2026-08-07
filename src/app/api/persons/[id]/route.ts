import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import {
  getRequestContext,
  assertAction,
} from "@/lib/auth";
import { logAudit, diffChanges } from "@/lib/audit";
import { validateParentAssignment } from "@/app/api/tree/route";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/persons/:id
export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const row = sqlite
      .prepare("SELECT * FROM persons WHERE id = ?")
      .get(id) as Person | undefined;
    if (!row) return errorResponse(404, "Person not found");
    return json(row);
  });
}

// PUT /api/persons/:id
export function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { permissions, session } = await getRequestContext();
    assertAction(permissions, "managePersons");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM persons WHERE id = ?")
      .get(id) as Person | undefined;
    if (!existing) return errorResponse(404, "Person not found");

    const body = (await req.json()) as Partial<Person>;

    const changes = diffChanges(existing as any, body as any, [
      "name", "nickname", "place_of_birth", "date_of_birth", "date_of_death",
      "birth_order", "gender", "residential_address", "religion", "phone_number",
      "photo", "marital_status", "generation", "father_id", "mother_id", "parent_id",
      "burial_name", "burial_address", "burial_lat", "burial_lng",
    ]);

    if (body.father_id && body.father_id !== existing.father_id)
      validateParentAssignment(id, body.father_id, "father");
    if (body.mother_id && body.mother_id !== existing.mother_id)
      validateParentAssignment(id, body.mother_id, "mother");
    if (body.parent_id && body.parent_id !== existing.parent_id)
      validateParentAssignment(id, body.parent_id, "parent");

    const merged: Person = { ...existing, ...body, id, updated_at: new Date().toISOString() };

    sqlite
      .prepare(
        `UPDATE persons SET
          name=@name, nickname=@nickname, place_of_birth=@place_of_birth,
          date_of_birth=@date_of_birth, date_of_death=@date_of_death,
          birth_order=@birth_order, gender=@gender,
          residential_address=@residential_address, religion=@religion,
          phone_number=@phone_number, photo=@photo,
          marital_status=@marital_status, generation=@generation,
          father_id=@father_id, mother_id=@mother_id, parent_id=@parent_id,
          burial_name=@burial_name, burial_address=@burial_address,
          burial_lat=@burial_lat, burial_lng=@burial_lng,
          updated_at=@updated_at
        WHERE id=@id`
      )
      .run({
        id,
        name: merged.name,
        nickname: merged.nickname,
        place_of_birth: merged.place_of_birth,
        date_of_birth: merged.date_of_birth,
        date_of_death: merged.date_of_death,
        birth_order: merged.birth_order,
        gender: merged.gender,
        residential_address: merged.residential_address,
        religion: merged.religion,
        phone_number: merged.phone_number,
        photo: merged.photo,
        marital_status: merged.marital_status,
        generation: merged.generation,
        father_id: merged.father_id,
        mother_id: merged.mother_id,
        parent_id: merged.parent_id,
        burial_name: merged.burial_name,
        burial_address: merged.burial_address,
        burial_lat: merged.burial_lat,
        burial_lng: merged.burial_lng,
        updated_at: merged.updated_at,
      });

    const updated = sqlite
      .prepare("SELECT * FROM persons WHERE id = ?")
      .get(id) as Person;
    logAudit({
      user_id: session?.id ?? null,
      user_name: session?.name ?? null,
      action: "update",
      entity_type: "person",
      entity_id: id,
      entity_name: updated.name,
      changes,
    });
    return json(updated);
  });
}

// DELETE /api/persons/:id
export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { permissions, session } = await getRequestContext();
    assertAction(permissions, "managePersons");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM persons WHERE id = ?")
      .get(id) as Person | undefined;
    if (!existing) return errorResponse(404, "Person not found");

    // Clear references from children (set parent_id/father_id/mother_id to NULL)
    sqlite
      .prepare("UPDATE persons SET father_id=NULL WHERE father_id=?")
      .run(id);
    sqlite
      .prepare("UPDATE persons SET mother_id=NULL WHERE mother_id=?")
      .run(id);
    sqlite
      .prepare("UPDATE persons SET parent_id=NULL WHERE parent_id=?")
      .run(id);
    // Clear user references
    sqlite
      .prepare("UPDATE users SET person_id=NULL WHERE person_id=?")
      .run(id);
    // Delete spouse relationships
    sqlite
      .prepare("DELETE FROM spouses WHERE husband_id=? OR wife_id=?")
      .run(id, id);
    // Delete the person
    sqlite.prepare("DELETE FROM persons WHERE id=?").run(id);
    logAudit({
      user_id: session?.id ?? null,
      user_name: session?.name ?? null,
      action: "delete",
      entity_type: "person",
      entity_id: id,
      entity_name: existing.name,
    });
    return json({ ok: true });
  });
}
