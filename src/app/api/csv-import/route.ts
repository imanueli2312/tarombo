import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext, assertAction, generateId } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handleApi(async () => {
    const { permissions, session } = await getRequestContext();
    assertAction(permissions, "managePersons");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return errorResponse(400, "No file provided");
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2)
      return errorResponse(400, "CSV must have a header and at least one row");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    let count = 0;
    const insert = sqlite.prepare(
      `INSERT INTO persons (id, name, nickname, place_of_birth, date_of_birth, date_of_death, birth_order, gender, residential_address, religion, phone_number, photo, marital_status, generation, father_id, mother_id, parent_id, burial_name, burial_address, burial_lat, burial_lng)
       VALUES (@id, @name, @nickname, @place_of_birth, @date_of_birth, @date_of_death, @birth_order, @gender, @residential_address, @religion, @phone_number, @photo, @marital_status, @generation, @father_id, @mother_id, @parent_id, @burial_name, @burial_address, @burial_lat, @burial_lng)`
    );
    const tx = sqlite.transaction(() => {
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(",");
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = (vals[idx] || "").trim() || null;
        });
        if (!row.name) continue;
        const id = generateId("p");
        insert.run({
          id,
          name: row.name,
          nickname: row.nickname,
          place_of_birth: row.place_of_birth,
          date_of_birth: row.date_of_birth,
          date_of_death: row.date_of_death,
          birth_order: parseInt(row.birth_order) || 0,
          gender: row.gender === "female" ? "female" : "male",
          residential_address: row.residential_address,
          religion: row.religion,
          phone_number: row.phone_number,
          photo: row.photo,
          marital_status: row.marital_status,
          generation: parseInt(row.generation) || 1,
          father_id: row.father_id,
          mother_id: row.mother_id,
          parent_id: row.parent_id,
          burial_name: row.burial_name,
          burial_address: row.burial_address,
          burial_lat: row.burial_lat ? parseFloat(row.burial_lat) : null,
          burial_lng: row.burial_lng ? parseFloat(row.burial_lng) : null,
        });
        logAudit({
          user_id: session?.id ?? null,
          user_name: session?.name ?? null,
          action: "create",
          entity_type: "person",
          entity_id: id,
          entity_name: row.name,
        });
        count++;
      }
    });
    tx();
    return json({ imported: count });
  });
}
