import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  PERMISSIONS,
  parsePermissions,
  serializePermissions,
} from "@/lib/tarombo/permissions";
import type { RolePublic } from "@/lib/tarombo/types";
import { z } from "zod";
import { PermissionDeniedError, requirePermission } from "@/lib/tarombo/auth";
import { now, type RoleRow } from "@/lib/tarombo/queries";

function serializeRole(r: RoleRow): RolePublic {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    icon: r.icon,
    permissions: parsePermissions(r.permissions),
    isSystem: r.is_system === 1,
    sortOrder: r.sort_order,
    userCount: (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM user WHERE role_id = ?")
        .get(r.id) as { c: number }
    ).c,
    createdAt: r.created_at,
  };
}

const roleSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().nullable().optional(),
  permissions: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

/** GET /api/roles/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user:view");
    const { id } = await params;
    const role = sqlite
      .prepare("SELECT * FROM role WHERE id = ?")
      .get(id) as RoleRow | undefined;
    if (!role)
      return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: serializeRole(role) });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/roles/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("role:manage");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM role WHERE id = ?")
      .get(id) as RoleRow | undefined;
    if (!existing)
      return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (data.permissions) {
      const invalid = data.permissions.filter(
        (p) => !PERMISSIONS.some((perm) => perm.key === p),
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Permission tidak valid: ${invalid.join(", ")}` },
          { status: 400 },
        );
      }
    }

    if (data.name && data.name !== existing.name) {
      const dup = sqlite
        .prepare("SELECT id FROM role WHERE name = ?")
        .get(data.name) as { id: string } | undefined;
      if (dup) {
        return NextResponse.json(
          { error: "Nama role sudah dipakai" },
          { status: 400 },
        );
      }
    }

    if (existing.is_system === 1 && data.name && data.name !== existing.name) {
      return NextResponse.json(
        { error: "Nama role sistem tidak dapat diubah" },
        { status: 400 },
      );
    }

    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    const push = (col: string, val: unknown) => {
      sets.push(`${col} = ?`);
      vals.push(val as string | number | null);
    };
    if (data.name && existing.is_system === 0) push("name", data.name);
    if (data.description !== undefined) push("description", data.description ?? null);
    if (data.color) push("color", data.color);
    if (data.icon !== undefined) push("icon", data.icon ?? null);
    if (data.permissions) push("permissions", serializePermissions(data.permissions));
    if (data.sortOrder !== undefined) push("sort_order", data.sortOrder);

    if (sets.length > 0) {
      sets.push("updated_at = ?");
      vals.push(now());
      vals.push(id);
      sqlite.prepare(`UPDATE role SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }

    const updated = sqlite
      .prepare("SELECT * FROM role WHERE id = ?")
      .get(id) as RoleRow;
    return NextResponse.json({ data: serializeRole(updated) });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/roles/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("role:manage");
    const { id } = await params;
    const existing = sqlite
      .prepare("SELECT * FROM role WHERE id = ?")
      .get(id) as RoleRow | undefined;
    if (!existing)
      return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 });

    if (existing.is_system === 1) {
      return NextResponse.json(
        { error: "Role sistem tidak dapat dihapus" },
        { status: 400 },
      );
    }
    const userCount = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM user WHERE role_id = ?")
        .get(id) as { c: number }
    ).c;
    if (userCount > 0) {
      return NextResponse.json(
        {
          error: `Role masih dipakai oleh ${userCount} pengguna. Ubah role pengguna tersebut terlebih dahulu.`,
        },
        { status: 400 },
      );
    }

    sqlite.prepare("DELETE FROM role WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
