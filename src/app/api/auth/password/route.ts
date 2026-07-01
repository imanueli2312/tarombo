import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

// PUT /api/auth/password - Change user's own password
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>)?.userId as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Password lama dan password baru wajib diisi" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password baru minimal 8 karakter" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Password lama tidak sesuai" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Password berhasil diubah" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}