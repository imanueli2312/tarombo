import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PERMISSIONS,
  parsePermissions,
  serializePermissions,
} from "@/lib/tarombo/permissions";
import type { RolePublic } from "@/lib/tarombo/types";
import { z } from "zod";
import {
  PermissionDeniedError,
  requirePermission,
  getActiveUserWithPermissions,
} from "@/lib/tarombo/auth";

function serializeRole(r: {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  permissions: string;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  _count?: { users: number };
}): RolePublic {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    icon: r.icon,
    permissions: parsePermissions(r.permissions),
    isSystem: r.isSystem,
    sortOrder: r.sortOrder,
    userCount: r._count?.users ?? 0,
    createdAt: r.createdAt.toISOString(),
  };
}

const roleSchema = z.object({
  name: z.string().min(1, "Nama role wajib diisi").max(60),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna harus hex #rrggbb").default("#7a1f1f"),
  icon: z.string().nullable().optional(),
  permissions: z.array(z.string()).default([]),
  isSystem: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/** GET /api/roles — butuh permission user:view (lihat) agar UI bisa render dropdown role. */
export async function GET() {
  try {
    // Lihat daftar role hanya butuh user:view (agar bisa pilih role saat edit user)
    try {
      await requirePermission("user:view");
    } catch {
      // fallback: admin tetap bisa lihat untuk kelola role
      const me = await getActiveUserWithPermissions();
      if (!me || !me.permissions.includes("role:manage")) {
        throw new PermissionDeniedError("user:view");
      }
    }

    const roles = await db.role.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { users: true } } },
    });
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

/** POST /api/roles — butuh permission role:manage */
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

    // validasi: semua permission harus ada di katalog
    const invalid = data.permissions.filter(
      (p) => !PERMISSIONS.some((perm) => perm.key === p),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Permission tidak valid: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }

    // cek nama unik
    const exists = await db.role.findUnique({ where: { name: data.name } });
    if (exists) {
      return NextResponse.json(
        { error: "Nama role sudah dipakai" },
        { status: 400 },
      );
    }

    const created = await db.role.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        color: data.color,
        icon: data.icon ?? null,
        permissions: serializePermissions(data.permissions),
        isSystem: false, // role buatan user tidak pernah system
        sortOrder: data.sortOrder ?? 0,
      },
      include: { _count: { select: { users: true } } },
    });

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
