import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { UserPublic, UserRole } from "@/lib/tarombo/types";

const ACTIVE_COOKIE = "tarombo_active_user";

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

/** GET /api/users/active — ambil user aktif (dari cookie).
 *  Bila belum ada user sama sekali → kembalikan null.
 *  Bila ada user tapi cookie kosong → auto-pilih user pertama (admin).
 */
export async function GET() {
  try {
    const totalCount = await db.user.count();
    if (totalCount === 0) {
      return NextResponse.json({ data: null, hasUsers: false });
    }

    // Baca cookie
    const cookieHeader =
      (typeof document !== "undefined" ? undefined : "") ||
      (await getCookiesFromRequest());
    let activeId: string | null = null;

    const match = cookieHeader
      ? cookieHeader.match(new RegExp(`${ACTIVE_COOKIE}=([^;]+)`))
      : null;
    if (match) activeId = decodeURIComponent(match[1]);

    let user = null;
    if (activeId) {
      user = await db.user.findUnique({
        where: { id: activeId },
        include: { linkedPerson: { select: { fullName: true } } },
      });
    }
    if (!user) {
      // fallback: pilih admin pertama, atau user pertama
      user = await db.user.findFirst({
        where: { role: "ADMIN" },
        include: { linkedPerson: { select: { fullName: true } } },
      });
      if (!user) {
        user = await db.user.findFirst({
          include: { linkedPerson: { select: { fullName: true } } },
        });
      }
    }

    if (!user) {
      return NextResponse.json({ data: null, hasUsers: true });
    }
    return NextResponse.json({ data: serializeUser(user), hasUsers: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/users/active — set user aktif (body: { userId }) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId: string | undefined = body.userId;
    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { linkedPerson: { select: { fullName: true } } },
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

    const res = NextResponse.json({ data: serializeUser(user) });
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

// helper untuk baca cookie header di server
async function getCookiesFromRequest(): Promise<string | null> {
  // headers() dipanggil dinamis
  const { headers } = await import("next/headers");
  const h = await headers();
  return h.get("cookie");
}
