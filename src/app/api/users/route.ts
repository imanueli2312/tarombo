import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSchema } from "@/lib/tarombo/types";
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

/** GET /api/users — daftar semua pengguna */
export async function GET() {
  try {
    const users = await db.user.findMany({
      include: { linkedPerson: { select: { fullName: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ data: users.map(serializeUser) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/users — buat pengguna baru */
export async function POST(req: NextRequest) {
  try {
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
        password: data.password, // demo: plain text ( produksi: hash)
        photo: data.photo ?? null,
        phone: data.phone ?? null,
        role: data.role,
        linkedPersonId: data.linkedPersonId ?? null,
      },
      include: { linkedPerson: { select: { fullName: true } } },
    });

    return NextResponse.json(
      { data: serializeUser(created) },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
