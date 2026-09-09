import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSchema } from "@/lib/tarombo/types";
import type { UserPublic, UserRole } from "@/lib/tarombo/types";

function serializeUser(u: {
  id: string;
  email: string;
  name: string;
  photo: string | null;
  phone: string | null;
  role: string;
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
    role: u.role as UserRole,
    linkedPersonId: u.linkedPersonId,
    linkedPersonName: u.linkedPerson?.fullName ?? null,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}

/** GET /api/users/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      include: { linkedPerson: { select: { fullName: true } } },
    });
    if (!user)
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: serializeUser(user) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/users/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
        ...(data.role ? { role: data.role } : {}),
        ...(data.linkedPersonId !== undefined
          ? { linkedPersonId: data.linkedPersonId ?? null }
          : {}),
      },
      include: { linkedPerson: { select: { fullName: true } } },
    });

    return NextResponse.json({ data: serializeUser(updated) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/users/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
