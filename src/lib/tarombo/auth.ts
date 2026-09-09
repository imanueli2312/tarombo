import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { parsePermissions } from "./permissions";

// ============================================================================
// Helper autentikasi & otorisasi (RBAC) server-side
// ============================================================================

const ACTIVE_COOKIE = "tarombo_active_user";

export class PermissionDeniedError extends Error {
  permission: string;
  constructor(permission: string) {
    super(`Akses ditolak. Permission "${permission}" diperlukan.`);
    this.permission = permission;
    this.name = "PermissionDeniedError";
  }
}

export interface ActiveUserWithPermissions {
  id: string;
  email: string;
  name: string;
  photo: string | null;
  phone: string | null;
  linkedPersonId: string | null;
  linkedPersonName: string | null;
  lastLoginAt: string | null;
  roleId: string | null;
  roleName: string | null;
  roleColor: string | null;
  roleIsSystem: boolean;
  permissions: string[];
}

function serializeActiveUser(u: {
  id: string;
  email: string;
  name: string;
  photo: string | null;
  phone: string | null;
  linkedPersonId: string | null;
  linkedPerson: { fullName: string } | null;
  lastLoginAt: Date | null;
  roleId: string | null;
  role: { name: string; color: string; isSystem: boolean; permissions: string } | null;
}): ActiveUserWithPermissions {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    photo: u.photo,
    phone: u.phone,
    linkedPersonId: u.linkedPersonId,
    linkedPersonName: u.linkedPerson?.fullName ?? null,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    roleId: u.roleId,
    roleName: u.role?.name ?? null,
    roleColor: u.role?.color ?? null,
    roleIsSystem: u.role?.isSystem ?? false,
    permissions: u.role ? parsePermissions(u.role.permissions) : [],
  };
}

/**
 * Ambil user aktif lengkap dengan permissions-nya.
 * - Baca cookie `tarombo_active_user`.
 * - Bila tidak ada / invalid → fallback ke user pertama dengan role Administrator.
 * - Bila tidak ada user sama sekali → null.
 */
export async function getActiveUserWithPermissions(): Promise<ActiveUserWithPermissions | null> {
  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get(ACTIVE_COOKIE)?.value;

  let user = null;
  if (cookieUserId) {
    user = await db.user.findUnique({
      where: { id: cookieUserId },
      include: {
        role: true,
        linkedPerson: { select: { fullName: true } },
      },
    });
  }

  if (!user) {
    // fallback: user dengan role Administrator
    const adminRole = await db.role.findFirst({
      where: { name: "Administrator", isSystem: true },
    });
    if (adminRole) {
      user = await db.user.findFirst({
        where: { roleId: adminRole.id },
        include: {
          role: true,
          linkedPerson: { select: { fullName: true } },
        },
      });
    }
  }

  if (!user) {
    // fallback terakhir: user pertama yang punya role
    user = await db.user.findFirst({
      where: { roleId: { not: null } },
      include: {
        role: true,
        linkedPerson: { select: { fullName: true } },
      },
    });
  }

  if (!user) return null;
  return serializeActiveUser(user);
}

/** Cek apakah user aktif memiliki permission tertentu. */
export async function hasPermission(
  permission: string,
): Promise<{ allowed: boolean; user: ActiveUserWithPermissions | null }> {
  const user = await getActiveUserWithPermissions();
  if (!user) return { allowed: false, user: null };
  return { allowed: user.permissions.includes(permission), user };
}

/**
 * Pastikan user aktif memiliki permission. Bila tidak → lempar
 * PermissionDeniedError yang harus ditangkap di route handler.
 */
export async function requirePermission(
  permission: string,
): Promise<ActiveUserWithPermissions> {
  const { allowed, user } = await hasPermission(permission);
  if (!allowed || !user) {
    throw new PermissionDeniedError(permission);
  }
  return user;
}

/** Cek multiple permission sekaligus (semua harus terpenuhi). */
export async function requireAllPermissions(
  ...permissions: string[]
): Promise<ActiveUserWithPermissions> {
  const user = await getActiveUserWithPermissions();
  if (!user) throw new PermissionDeniedError(permissions[0] ?? "unknown");
  const hasAll = permissions.every((p) => user.permissions.includes(p));
  if (!hasAll) {
    throw new PermissionDeniedError(permissions.join(", "));
  }
  return user;
}
