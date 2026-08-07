import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import {
  getRequestContext,
  assertAction,
  generateId,
} from "@/lib/auth";
import bcrypt from "bcryptjs";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export interface SafeUserRow {
  id: string;
  email: string;
  name: string;
  role_id: string;
  person_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function toSafe(u: User): SafeUserRow {
  // strip password_hash
  const { password_hash: _ph, ...rest } = u as any;
  return rest;
}

export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const rows = sqlite
      .prepare(
        `SELECT u.*, r.name as role_name, p.name as person_name
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         LEFT JOIN persons p ON p.id = u.person_id
         ORDER BY u.name`
      )
      .all();
    return json(rows);
  });
}

export function POST(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const body = (await req.json()) as {
      email: string;
      password: string;
      name: string;
      role_id: string;
      person_id?: string | null;
      is_active?: number;
    };

    if (!body.email || !body.password || !body.name || !body.role_id) {
      return errorResponse(400, "Missing required fields");
    }
    const exists = sqlite
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(body.email);
    if (exists) return errorResponse(409, "Email already in use");

    const role = sqlite
      .prepare("SELECT id FROM roles WHERE id = ?")
      .get(body.role_id);
    if (!role) return errorResponse(400, "Role does not exist");

    const id = generateId("u");
    const hash = bcrypt.hashSync(body.password, 10);
    sqlite
      .prepare(
        `INSERT INTO users (id, email, password_hash, name, role_id, person_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        body.email,
        hash,
        body.name,
        body.role_id,
        body.person_id ?? null,
        body.is_active ?? 1
      );
    const row = sqlite
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as User;
    return json(toSafe(row), 201);
  });
}
