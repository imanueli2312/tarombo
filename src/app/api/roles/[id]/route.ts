import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext, assertAction, HTTPError } from "@/lib/auth";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseRole(row: any): Role {
  return {
    ...row,
    permissions:
      typeof row.permissions === "string"
        ? JSON.parse(row.permissions)
        : row.permissions,
    is_system: row.is_system ?? 0,
  };
}

function normalizePermissions(input: any) {
  return {
    pages: {
      search: input?.pages?.search !== undefined ? Boolean(input.pages.search) : true,
      familyTree: Boolean(input?.pages?.familyTree),
      familyChart: Boolean(input?.pages?.familyChart),
      birthdays: Boolean(input?.pages?.birthdays),
      weddings: Boolean(input?.pages?.weddings),
      profile: Boolean(input?.pages?.profile),
    },
    actions: {
      managePersons: Boolean(input?.actions?.managePersons),
      manageSpouses: Boolean(input?.actions?.manageSpouses),
      manageUsers: Boolean(input?.actions?.manageUsers),
      manageRoles: Boolean(input?.actions?.manageRoles),
      exportData: Boolean(input?.actions?.exportData),
    },
  };
}

export function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageRoles");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM roles WHERE id = ?")
      .get(id);
    if (!existing) return errorResponse(404, "Role not found");

    const body = (await req.json()) as {
      name?: string;
      description?: string;
      permissions?: any;
    };

    const name = body.name ?? (existing as any).name;
    const description =
      body.description ?? (existing as any).description ?? null;
    const perms = body.permissions
      ? normalizePermissions(body.permissions)
      : parseRole(existing).permissions;

    if (body.name && body.name !== (existing as any).name) {
      const dup = sqlite
        .prepare("SELECT id FROM roles WHERE name = ? AND id != ?")
        .get(body.name, id);
      if (dup) return errorResponse(409, "Role name already exists");
    }

    sqlite
      .prepare(
        `UPDATE roles SET name=?, description=?, permissions=?, updated_at=datetime('now') WHERE id=?`
      )
      .run(name, description, JSON.stringify(perms), id);

    const row = sqlite.prepare("SELECT * FROM roles WHERE id = ?").get(id);
    return json(parseRole(row));
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageRoles");
    const { id } = await params;
    const role = sqlite.prepare("SELECT * FROM roles WHERE id = ?").get(id) as any;
    if (!role) return errorResponse(404, "Role not found");
    if (role.is_system === 1) {
      return errorResponse(400, "Built-in system roles cannot be deleted.");
    }
    const users = sqlite
      .prepare("SELECT COUNT(*) as c FROM users WHERE role_id = ?")
      .get(id) as { c: number };
    if (users.c > 0) {
      return errorResponse(
        400,
        `Cannot delete role: ${users.c} user(s) are still assigned to it. Reassign them first.`
      );
    }
    sqlite.prepare("DELETE FROM roles WHERE id = ?").run(id);
    return json({ ok: true });
  });
}
