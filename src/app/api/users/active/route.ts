import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { getActiveUserWithPermissions } from "@/lib/tarombo/auth";
import type { UserRow } from "@/lib/tarombo/queries";
import { now } from "@/lib/tarombo/queries";
import {
  hashPassword,
  isBcryptHash,
  logActivity,
  verifyPassword,
} from "@/lib/tarombo/security";

const ACTIVE_COOKIE = "tarombo_active_user";

// Simple in-memory rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now2 = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now2 > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now2 + LOGIN_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now2) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

/** GET /api/users/active */
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

/** POST /api/users/active — login dengan password (bcrypt).
 *  Mendukung legacy plain-text password: bila password di DB belum berupa
 *  bcrypt hash dan cocok plain-text, auto-upgrade ke bcrypt hash.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 },
      );
    }

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

    let ok = false;
    if (isBcryptHash(u.password)) {
      ok = verifyPassword(password, u.password);
    } else {
      // Legacy plain-text — verify langsung, lalu auto-upgrade ke bcrypt
      if (u.password === password) {
        ok = true;
        const hashed = hashPassword(password);
        sqlite
          .prepare("UPDATE user SET password = ?, updated_at = ? WHERE id = ?")
          .run(hashed, now(), u.id);
      }
    }

    if (!ok) {
      logActivity({
        userId: u.id,
        userName: u.name,
        action: "login",
        entityType: "user",
        entityId: u.id,
        entityName: u.name,
        details: { success: false },
      });
      return NextResponse.json(
        { error: "Password salah. Login ditolak." },
        { status: 403 },
      );
    }

    sqlite
      .prepare("UPDATE user SET last_login_at = ?, updated_at = ? WHERE id = ?")
      .run(now(), now(), u.id);

    logActivity({
      userId: u.id,
      userName: u.name,
      action: "login",
      entityType: "user",
      entityId: u.id,
      entityName: u.name,
      details: { success: true },
    });

    const full = await getActiveUserWithPermissions();
    const res = NextResponse.json({ data: full });
    res.cookies.set(ACTIVE_COOKIE, u.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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
  try {
    const user = await getActiveUserWithPermissions();
    if (user.id !== "guest") {
      logActivity({
        userId: user.id,
        userName: user.name,
        action: "logout",
        entityType: "user",
        entityId: user.id,
        entityName: user.name,
      });
    }
  } catch {
    // ignore
  }
  const res = NextResponse.json({ success: true });
  res.cookies.delete(ACTIVE_COOKIE);
  return res;
}
