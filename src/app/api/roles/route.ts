import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  PERMISSIONS,
  parsePermissions,
  serializePermissions,
} from "@/lib/tarombo/permissions";
import type { RolePublic } from "@/lib/tarombo/types";
import { z } from "zod";
import {
  PermissionDeniedError,
  getActiveUserWithPermissions,
  requirePermission,
} from "@/lib/tarombo/auth";
import {
  newId,
  now,
  type RoleRow,
} from "@/lib/tarombo/queries";

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
  name: z.string().min(1, "Nama role wajib diisi").max(60),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Warna harus hex #rrggbb")
    .default("#7a1f1f"),
  icon: z.string().nullable().optional(),
  permissions: z.array(z.string()).default([]),
  isSystem: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/** GET /api/roles */
export async function GET() {
  try {
    try {
      await requirePermission("user:view");
    } catch {
      const me = await getActiveUserWithPermissions();
      if (!me || !me.permissions.includes("role:manage")) {
        throw new PermissionDeniedError("user:view");
      }
    }

    const roles = sqlite
      .prepare("SELECT * FROM role ORDER BY sort_order ASC, name ASC")
      .all() as RoleRow[];
    return NextResponse.json({
      data: roles.map(serializeRole),
      catalog: PERMISSIONS,
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/roles — butuh role:manage */
export async function POST(req: NextRequest) {
  try {
    await requirePermission("role:manage");
    const body = await req.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const invalid = data.permissions.filter(
      (p) => !PERMISSIONS.some((perm) => perm.key === p),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Permission tidak valid: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }

    const exists = sqlite
      .prepare("SELECT id FROM role WHERE name = ?")
      .get(data.name) as { id: string } | undefined;
    if (exists) {
      return NextResponse.json(
        { error: "Nama role sudah dipakai" },
        { status: 400 },
      );
    }

    const id = newId();
    const ts = now();
    sqlite
      .prepare(
        `INSERT INTO role (id, name, description, color, icon, permissions, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      )
      .run(
        id,
        data.name,
        data.description ?? null,
        data.color,
        data.icon ?? null,
        serializePermissions(data.permissions),
        data.sortOrder ?? 0,
        ts,
        ts,
      );

    const created = sqlite
      .prepare("SELECT * FROM role WHERE id = ?")
      .get(id) as RoleRow;
    return NextResponse.json(
      { data: serializeRole(created) },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
