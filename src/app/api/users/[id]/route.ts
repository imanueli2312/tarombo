import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { logAudit, getSessionUserInfo } from "@/lib/audit-log";

function getUserRole(session: unknown): Role | undefined {
  if (!session || typeof session !== "object" || !("user" in session)) return undefined;
  return (session.user as Record<string, unknown>)?.role as Role | undefined;
}

// PUT /api/users/[id] - Update user role/status (ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getUserRole(session);
    if (!canManageUsers(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role: newRole, isActive, name } = body;

    const updateData: Record<string, unknown> = {};
    if (newRole !== undefined && ["ADMIN", "EDITOR", "VIEWER"].includes(newRole)) {
      updateData.role = newRole;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (name !== undefined) {
      updateData.name = name;
    }

    // Prevent admin from deactivating themselves
    const currentUserId = (session.user as Record<string, unknown>)?.userId as string;
    if (id === currentUserId && isActive === false) {
      return NextResponse.json(
        { error: "Anda tidak dapat menonaktifkan akun sendiri" },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log
    const updateUserUserInfo = getSessionUserInfo(session);
    await logAudit({
      userId: updateUserUserInfo?.userId,
      userName: updateUserUserInfo?.userName,
      action: "UPDATE_USER",
      resource: "user",
      resourceId: id,
      details: { changes: updateData },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (ADMIN only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getUserRole(session);
    if (!canManageUsers(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const currentUserId = (session.user as Record<string, unknown>)?.userId as string;

    // Prevent self-deletion
    if (id === currentUserId) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun sendiri" },
        { status: 400 }
      );
    }

    const userCount = await db.user.count();
    if (userCount <= 1) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus pengguna terakhir" },
        { status: 400 }
      );
    }

    await db.user.delete({ where: { id } });

    // Audit log
    const deleteUserUserInfo = getSessionUserInfo(session);
    await logAudit({
      userId: deleteUserUserInfo?.userId,
      userName: deleteUserUserInfo?.userName,
      action: "DELETE_USER",
      resource: "user",
      resourceId: id,
    });

    return NextResponse.json({ message: "Pengguna berhasil dihapus" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}