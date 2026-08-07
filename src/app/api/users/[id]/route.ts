import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext, assertAction } from "@/lib/auth";
import bcrypt from "bcryptjs";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

function toSafe(u: User) {
  const { password_hash: _ph, ...rest } = u as any;
  return rest;
}

export function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { permissions, session } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as User | undefined;
    if (!existing) return errorResponse(404, "User not found");

    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
      role_id?: string;
      person_id?: string | null;
      is_active?: number;
    };

    const email = body.email ?? existing.email;
    const name = body.name ?? existing.name;
    const role_id = body.role_id ?? existing.role_id;
    const person_id =
      body.person_id === undefined ? existing.person_id : body.person_id;
    const is_active = body.is_active ?? existing.is_active;

    if (body.email && body.email !== existing.email) {
      const dup = sqlite
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .get(body.email, id);
      if (dup) return errorResponse(409, "Email already in use");
    }
    if (body.role_id) {
      const role = sqlite
        .prepare("SELECT id FROM roles WHERE id = ?")
        .get(body.role_id);
      if (!role) return errorResponse(400, "Role does not exist");
    }

    if (body.password) {
      const hash = bcrypt.hashSync(body.password, 10);
      sqlite
        .prepare(
          `UPDATE users SET email=?, password_hash=?, name=?, role_id=?, person_id=?, is_active=?, updated_at=datetime('now') WHERE id=?`
        )
        .run(email, hash, name, role_id, person_id, is_active, id);
    } else {
      sqlite
        .prepare(
          `UPDATE users SET email=?, name=?, role_id=?, person_id=?, is_active=?, updated_at=datetime('now') WHERE id=?`
        )
        .run(email, name, role_id, person_id, is_active, id);
    }

    const row = sqlite
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as User;
    return json(toSafe(row));
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { permissions, session } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const { id } = await params;
    if (session && session.id === id) {
      return errorResponse(400, "You cannot delete your own account.");
    }
    sqlite.prepare("DELETE FROM users WHERE id=?").run(id);
    return json({ ok: true });
  });
}
