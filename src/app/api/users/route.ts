import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { userSchema } from "@/lib/tarombo/types";
import type { UserPublic } from "@/lib/tarombo/types";
import {
  newId,
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

/** GET /api/users — butuh permission user:view */
export async function GET() {
  try {
    await requirePermission("user:view");
    const users = sqlite
      .prepare("SELECT * FROM user ORDER BY created_at ASC")
      .all() as UserRow[];
    return NextResponse.json({
      data: users.map((u) =>
        serializeUser(u, getRole(u.role_id), getLinkedPerson(u.linked_person_id)),
      ),
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/users — butuh permission user:manage */
export async function POST(req: NextRequest) {
  try {
    await requirePermission("user:manage");
    const body = await req.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const exists = sqlite
      .prepare("SELECT id FROM user WHERE email = ?")
      .get(data.email) as { id: string } | undefined;
    if (exists) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 },
      );
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

    const id = newId();
    const ts = now();
    sqlite
      .prepare(
        `INSERT INTO user (id, email, name, password, photo, phone, role_id, linked_person_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        data.email,
        data.name,
        data.password,
        data.photo ?? null,
        data.phone ?? null,
        data.roleId ?? null,
        data.linkedPersonId ?? null,
        ts,
        ts,
      );

    const created = getUser(id)!;
    return NextResponse.json(
      {
        data: serializeUser(
          created,
          getRole(created.role_id),
          getLinkedPerson(created.linked_person_id),
        ),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
