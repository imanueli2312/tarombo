import { cookies } from "next/headers";
import { sqlite } from "@/lib/db";
import { parsePermissions } from "./permissions";
import type { PersonRow, RoleRow, UserRow } from "./queries";

// ============================================================================
// Helper autentikasi & otorisasi (RBAC) server-side — tanpa Prisma
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

function serializeActiveUser(
  u: UserRow,
  role: RoleRow | null,
  linkedPerson: { full_name: string } | null,
): ActiveUserWithPermissions {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    photo: u.photo,
    phone: u.phone,
    linkedPersonId: u.linked_person_id,
    linkedPersonName: linkedPerson?.full_name ?? null,
    lastLoginAt: u.last_login_at,
    roleId: u.role_id,
    roleName: role?.name ?? null,
    roleColor: role?.color ?? null,
    roleIsSystem: role ? role.is_system === 1 : false,
    permissions: role ? parsePermissions(role.permissions) : [],
  };
}

/**
 * Ambil user aktif lengkap dengan permissions-nya.
 * - Baca cookie `tarombo_active_user`.
 * - Bila tidak ada / invalid → fallback ke user pertama dengan role Administrator.
 */
export async function getActiveUserWithPermissions(): Promise<ActiveUserWithPermissions | null> {
  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get(ACTIVE_COOKIE)?.value;

  let user: UserRow | undefined;
  if (cookieUserId) {
    user = sqlite
      .prepare("SELECT * FROM user WHERE id = ?")
      .get(cookieUserId) as UserRow | undefined;
  }

  if (!user) {
    // fallback: user dengan role Administrator
    const adminRole = sqlite
      .prepare("SELECT * FROM role WHERE name = 'Administrator' AND is_system = 1")
      .get() as RoleRow | undefined;
    if (adminRole) {
      user = sqlite
        .prepare("SELECT * FROM user WHERE role_id = ? LIMIT 1")
        .get(adminRole.id) as UserRow | undefined;
    }
  }

  if (!user) {
    // fallback terakhir: user pertama yang punya role
    user = sqlite
      .prepare("SELECT * FROM user WHERE role_id IS NOT NULL LIMIT 1")
      .get() as UserRow | undefined;
  }

  if (!user) return null;

  const role = user.role_id
    ? (sqlite.prepare("SELECT * FROM role WHERE id = ?").get(user.role_id) as
        | RoleRow
        | undefined) ?? null
    : null;

  const linkedPerson = user.linked_person_id
    ? (sqlite
        .prepare("SELECT full_name FROM person WHERE id = ?")
        .get(user.linked_person_id) as
        | { full_name: string }
        | undefined) ?? null
    : null;

  return serializeActiveUser(user, role, linkedPerson);
}

export async function hasPermission(
  permission: string,
): Promise<{ allowed: boolean; user: ActiveUserWithPermissions | null }> {
  const user = await getActiveUserWithPermissions();
  if (!user) return { allowed: false, user: null };
  return { allowed: user.permissions.includes(permission), user };
}

export async function requirePermission(
  permission: string,
): Promise<ActiveUserWithPermissions> {
  const { allowed, user } = await hasPermission(permission);
  if (!allowed || !user) {
    throw new PermissionDeniedError(permission);
  }
  return user;
}

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
