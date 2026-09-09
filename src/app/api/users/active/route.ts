import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { getActiveUserWithPermissions } from "@/lib/tarombo/auth";
import type { UserRow } from "@/lib/tarombo/queries";
import { now } from "@/lib/tarombo/queries";

const ACTIVE_COOKIE = "tarombo_active_user";

/** GET /api/users/active
 *  Selalu mengembalikan user aktif. Bila tidak ada cookie → guest Viewer
 *  (read-only, tanpa login). hasUsers menandakan apakah ada akun terdaftar
 *  (untuk toggle menu login).
 */
export async function GET() {
  try {
    const totalCount = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM user").get() as { c: number }
    ).c;
    const user = await getActiveUserWithPermissions();
    return NextResponse.json({
      data: user,
      hasUsers: totalCount > 0,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/users/active — login dengan password
 *  Body: { userId, password }
 *  Viewer (guest) tetap bisa akses tanpa login. Administrator & Editor
 *  diharuskan login dengan password yang benar.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId: string | undefined = body.userId;
    const password: string | undefined = body.password;
    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json(
        { error: "Password wajib diisi untuk login." },
        { status: 400 },
      );
    }

    const u = sqlite
      .prepare("SELECT * FROM user WHERE id = ?")
      .get(userId) as UserRow | undefined;
    if (!u) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan" },
        { status: 404 },
      );
    }

    // Verifikasi password
    if (u.password !== password) {
      return NextResponse.json(
        { error: "Password salah. Login ditolak." },
        { status: 403 },
      );
    }

    sqlite
      .prepare("UPDATE user SET last_login_at = ?, updated_at = ? WHERE id = ?")
      .run(now(), now(), u.id);

    const full = await getActiveUserWithPermissions();
    const res = NextResponse.json({ data: full });
    res.cookies.set(ACTIVE_COOKIE, u.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/users/active — logout */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(ACTIVE_COOKIE);
  return res;
}
