import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveUserWithPermissions } from "@/lib/tarombo/auth";
import type { ActiveUserPublic } from "@/lib/tarombo/types";

const ACTIVE_COOKIE = "tarombo_active_user";

function serialize(u: NonNullable<Awaited<ReturnType<typeof getActiveUserWithPermissions>>>): ActiveUserPublic {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    photo: u.photo,
    phone: u.phone,
    linkedPersonId: u.linkedPersonId,
    linkedPersonName: u.linkedPersonName,
    lastLoginAt: u.lastLoginAt,
    roleId: u.roleId,
    roleName: u.roleName,
    roleColor: u.roleColor,
    roleIsSystem: u.roleIsSystem,
    permissions: u.permissions,
  };
}

/** GET /api/users/active — info user aktif + permissions (publik, tidak perlu permission) */
export async function GET() {
  try {
    const totalCount = await db.user.count();
    if (totalCount === 0) {
      return NextResponse.json({ data: null, hasUsers: false });
    }

    const user = await getActiveUserWithPermissions();
    if (!user) {
      return NextResponse.json({ data: null, hasUsers: true });
    }
    return NextResponse.json({ data: serialize(user), hasUsers: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/users/active — set user aktif (body: { userId }). Publik (login). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId: string | undefined = body.userId;
    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { role: true, linkedPerson: { select: { fullName: true } } },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan" },
        { status: 404 },
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const full = await getActiveUserWithPermissions();
    const res = NextResponse.json({
      data: full ? serialize(full) : null,
    });
    res.cookies.set(ACTIVE_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
      path: "/",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/users/active — logout / clear active user */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(ACTIVE_COOKIE);
  return res;
}
