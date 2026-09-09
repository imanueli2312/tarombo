import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSchema } from "@/lib/tarombo/types";
import type { UserPublic } from "@/lib/tarombo/types";
import { requirePermission, PermissionDeniedError } from "@/lib/tarombo/auth";

function serializeUser(u: {
  id: string;
  email: string;
  name: string;
  photo: string | null;
  phone: string | null;
  roleId: string | null;
  role: { name: string; color: string; isSystem: boolean } | null;
  linkedPersonId: string | null;
  linkedPerson: { fullName: string } | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}): UserPublic {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    photo: u.photo,
    phone: u.phone,
    roleId: u.roleId,
    roleName: u.role?.name ?? null,
    roleColor: u.role?.color ?? null,
    roleIsSystem: u.role?.isSystem ?? false,
    linkedPersonId: u.linkedPersonId,
    linkedPersonName: u.linkedPerson?.fullName ?? null,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}

/** GET /api/users/[id] — butuh permission user:view */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user:view");
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      include: {
        role: { select: { name: true, color: true, isSystem: true } },
        linkedPerson: { select: { fullName: true } },
      },
    });
    if (!user)
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: serializeUser(user) });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/users/[id] — butuh permission user:manage */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user:manage");
    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
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
      const dup = await db.user.findUnique({ where: { email: data.email } });
      if (dup) {
        return NextResponse.json(
          { error: "Email sudah dipakai pengguna lain" },
          { status: 400 },
        );
      }
    }
    if (data.roleId) {
      const role = await db.role.findUnique({ where: { id: data.roleId } });
      if (!role) {
        return NextResponse.json(
          { error: "Role tidak ditemukan" },
          { status: 400 },
        );
      }
    }
    if (data.linkedPersonId) {
      const person = await db.person.findUnique({
        where: { id: data.linkedPersonId },
      });
      if (!person) {
        return NextResponse.json(
          { error: "Person yang ditautkan tidak ditemukan" },
          { status: 400 },
        );
      }
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        ...(data.email ? { email: data.email } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.password ? { password: data.password } : {}),
        ...(data.photo !== undefined ? { photo: data.photo ?? null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
        ...(data.roleId !== undefined ? { roleId: data.roleId ?? null } : {}),
        ...(data.linkedPersonId !== undefined
          ? { linkedPersonId: data.linkedPersonId ?? null }
          : {}),
      },
      include: {
        role: { select: { name: true, color: true, isSystem: true } },
        linkedPerson: { select: { fullName: true } },
      },
    });

    return NextResponse.json({ data: serializeUser(updated) });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/users/[id] — butuh permission user:manage */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user:manage");
    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
