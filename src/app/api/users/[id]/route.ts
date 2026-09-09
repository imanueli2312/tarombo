import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { userSchema } from "@/lib/tarombo/types";
import type { UserPublic } from "@/lib/tarombo/types";
import {
  now,
  type RoleRow,
  type UserRow,
} from "@/lib/tarombo/queries";
import { PermissionDeniedError, requirePermission } from "@/lib/tarombo/auth";

function serializeUser(
  u: UserRow,
  role: RoleRow | null,
  linkedPerson: { full_name: string } | null,
): UserPublic {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    photo: u.photo,
    phone: u.phone,
    roleId: u.role_id,
    roleName: role?.name ?? null,
    roleColor: role?.color ?? null,
    roleIsSystem: role ? role.is_system === 1 : false,
    linkedPersonId: u.linked_person_id,
    linkedPersonName: linkedPerson?.full_name ?? null,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
  };
}

function getUser(id: string): UserRow | undefined {
  return sqlite.prepare("SELECT * FROM user WHERE id = ?").get(id) as
    | UserRow
    | undefined;
}
function getRole(id: string | null): RoleRow | null {
  if (!id) return null;
  return (sqlite.prepare("SELECT * FROM role WHERE id = ?").get(id) as
    | RoleRow
    | undefined) ?? null;
}
function getLinkedPerson(id: string | null) {
  if (!id) return null;
  return (sqlite
    .prepare("SELECT full_name FROM person WHERE id = ?")
    .get(id) as { full_name: string } | undefined) ?? null;
}

/** GET /api/users/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user:view");
    const { id } = await params;
    const u = getUser(id);
    if (!u)
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    return NextResponse.json({
      data: serializeUser(u, getRole(u.role_id), getLinkedPerson(u.linked_person_id)),
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/users/[id] — butuh user:manage */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user:manage");
    const { id } = await params;
    const existing = getUser(id);
    if (!existing)
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const parsed = userSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (data.email && data.email !== existing.email) {
      const dup = sqlite
        .prepare("SELECT id FROM user WHERE email = ?")
        .get(data.email) as { id: string } | undefined;
      if (dup) {
        return NextResponse.json(
          { error: "Email sudah dipakai pengguna lain" },
          { status: 400 },
        );
      }
    }
    if (data.roleId) {
      const role = getRole(data.roleId);
      if (!role) {
        return NextResponse.json(
          { error: "Role tidak ditemukan" },
          { status: 400 },
        );
      }
    }
    if (data.linkedPersonId) {
      const person = sqlite
        .prepare("SELECT id FROM person WHERE id = ?")
        .get(data.linkedPersonId);
      if (!person) {
        return NextResponse.json(
          { error: "Person yang ditautkan tidak ditemukan" },
          { status: 400 },
        );
      }
    }

    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    const push = (col: string, val: unknown) => {
      sets.push(`${col} = ?`);
      vals.push(val as string | number | null);
    };
    if (data.email !== undefined) push("email", data.email);
    if (data.name !== undefined) push("name", data.name);
    if (data.password) push("password", data.password);
    if (data.photo !== undefined) push("photo", data.photo ?? null);
    if (data.phone !== undefined) push("phone", data.phone ?? null);
    if (data.roleId !== undefined) push("role_id", data.roleId ?? null);
    if (data.linkedPersonId !== undefined)
      push("linked_person_id", data.linkedPersonId ?? null);

    if (sets.length > 0) {
      sets.push("updated_at = ?");
      vals.push(now());
      vals.push(id);
      sqlite.prepare(`UPDATE user SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }

    const updated = getUser(id)!;
    return NextResponse.json({
      data: serializeUser(
        updated,
        getRole(updated.role_id),
        getLinkedPerson(updated.linked_person_id),
      ),
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/users/[id] — butuh user:manage */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user:manage");
    const { id } = await params;
    const existing = getUser(id);
    if (!existing)
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

    sqlite.prepare("DELETE FROM user WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
