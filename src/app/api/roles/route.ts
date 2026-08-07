import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import {
  getRequestContext,
  assertAction,
  generateId,
  HTTPError,
} from "@/lib/auth";
import {
  VIEWER_PERMISSIONS,
  EDITOR_PERMISSIONS,
  ADMIN_PERMISSIONS,
  type Permissions,
  type Role,
} from "@/lib/types";

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

export function GET() {
  return handleApi(async () => {
    const rows = sqlite.prepare("SELECT * FROM roles ORDER BY name").all();
    const parsed = rows.map(parseRole);
    return json(parsed);
  });
}

function normalizePermissions(input: any): Permissions {
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

export function POST(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageRoles");
    const body = (await req.json()) as {
      name: string;
      description?: string;
      permissions?: Permissions;
    };
    if (!body.name) return errorResponse(400, "Role name is required");

    const exists = sqlite
      .prepare("SELECT id FROM roles WHERE name = ?")
      .get(body.name);
    if (exists) return errorResponse(409, "Role name already exists");

    const id = generateId("role");
    const perms = body.permissions
      ? normalizePermissions(body.permissions)
      : VIEWER_PERMISSIONS;

    sqlite
      .prepare(
        `INSERT INTO roles (id, name, description, permissions, is_system)
         VALUES (?, ?, ?, ?, 0)`
      )
      .run(id, body.name, body.description ?? null, JSON.stringify(perms));

    const row = sqlite.prepare("SELECT * FROM roles WHERE id = ?").get(id);
    return json(parseRole(row), 201);
  });
}

export { ADMIN_PERMISSIONS, EDITOR_PERMISSIONS, VIEWER_PERMISSIONS };
