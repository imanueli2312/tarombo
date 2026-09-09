import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PERMISSIONS,
  parsePermissions,
  serializePermissions,
} from "@/lib/tarombo/permissions";
import type { RolePublic } from "@/lib/tarombo/types";
import { z } from "zod";
import { PermissionDeniedError, requirePermission } from "@/lib/tarombo/auth";

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
  name: z.string().min(1).max(60).optional(),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
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
    const role = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
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

/** PATCH /api/roles/[id] — admin bisa edit permission role sistem maupun custom */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("role:manage");
    const { id } = await params;
    const existing = await db.role.findUnique({ where: { id } });
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

    // validasi permission
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

    // cek nama unik bila diganti
    if (data.name && data.name !== existing.name) {
      const dup = await db.role.findUnique({ where: { name: data.name } });
      if (dup) {
        return NextResponse.json(
          { error: "Nama role sudah dipakai" },
          { status: 400 },
        );
      }
    }

    // Role sistem: tidak boleh ganti nama (tapi boleh edit permission/color/desc)
    if (existing.isSystem && data.name && data.name !== existing.name) {
      return NextResponse.json(
        { error: "Nama role sistem tidak dapat diubah" },
        { status: 400 },
      );
    }

    const updated = await db.role.update({
      where: { id },
      data: {
        ...(data.name && !existing.isSystem ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.color ? { color: data.color } : {}),
        ...(data.icon !== undefined ? { icon: data.icon ?? null } : {}),
        ...(data.permissions
          ? { permissions: serializePermissions(data.permissions) }
          : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
      include: { _count: { select: { users: true } } },
    });

    return NextResponse.json({ data: serializeRole(updated) });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/roles/[id] — role sistem tidak bisa dihapus */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("role:manage");
    const { id } = await params;
    const existing = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing)
      return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 });

    if (existing.isSystem) {
      return NextResponse.json(
        { error: "Role sistem tidak dapat dihapus" },
        { status: 400 },
      );
    }
    if (existing._count.users > 0) {
      return NextResponse.json(
        {
          error: `Role masih dipakai oleh ${existing._count.users} pengguna. Ubah role pengguna tersebut terlebih dahulu.`,
        },
        { status: 400 },
      );
    }

    await db.role.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
