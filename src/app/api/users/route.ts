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

/** GET /api/users — butuh permission user:view */
export async function GET() {
  try {
    await requirePermission("user:view");
    const users = await db.user.findMany({
      include: {
        role: { select: { name: true, color: true, isSystem: true } },
        linkedPerson: { select: { fullName: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    });
    return NextResponse.json({ data: users.map(serializeUser) });
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

    // Cek email unik
    const exists = await db.user.findUnique({ where: { email: data.email } });
    if (exists) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 },
      );
    }

    // Validasi roleId bila diset
    if (data.roleId) {
      const role = await db.role.findUnique({ where: { id: data.roleId } });
      if (!role) {
        return NextResponse.json(
          { error: "Role tidak ditemukan" },
          { status: 400 },
        );
      }
    }

    // Validasi linkedPerson bila diset
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

    const created = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        photo: data.photo ?? null,
        phone: data.phone ?? null,
        roleId: data.roleId ?? null,
        linkedPersonId: data.linkedPersonId ?? null,
      },
      include: {
        role: { select: { name: true, color: true, isSystem: true } },
        linkedPerson: { select: { fullName: true } },
      },
    });

    return NextResponse.json(
      { data: serializeUser(created) },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
