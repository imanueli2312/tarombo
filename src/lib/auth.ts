import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { sqlite } from "./database";
import { ensureSeeded } from "./seed";
import type { Permissions, Role, SafeUser, User, Person } from "./types";

ensureSeeded();

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role_id: string;
  person_id: string | null;
  permissions: Permissions;
  role_name: string;
}

function parseRole(row: any): Role {
  return {
    ...row,
    permissions: typeof row.permissions === "string"
      ? JSON.parse(row.permissions)
      : row.permissions ?? { pages: {}, actions: {} },
    is_system: row.is_system ?? 0,
  };
}

export function getRoleById(roleId: string): Role | null {
  const row = sqlite
    .prepare("SELECT * FROM roles WHERE id = ?")
    .get(roleId) as any;
  if (!row) return null;
  return parseRole(row);
}

export function getViewerRole(): Role {
  const row = sqlite
    .prepare("SELECT * FROM roles WHERE id = 'role_viewer'")
    .get() as any;
  return parseRole(row);
}

export function getUserById(userId: string): User | null {
  const row = sqlite
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as any;
  return row ?? null;
}

export function getUserByEmail(email: string): User & { password_hash: string } | null {
  const row = sqlite
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as any;
  return row ?? null;
}

export function getSafeUser(userId: string): SafeUser | null {
  const user = getUserById(userId);
  if (!user) return null;
  const role = getRoleById(user.role_id);
  const person = user.person_id
    ? (sqlite.prepare("SELECT * FROM persons WHERE id = ?").get(user.person_id) as Person)
    : null;
  return {
    ...user,
    role: role ?? undefined,
    person: person ?? null,
  };
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = getUserById(session.user.id);
  if (!user || !user.is_active) return null;
  const role = getRoleById(user.role_id);
  if (!role) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role_id: user.role_id,
    person_id: user.person_id,
    permissions: role.permissions,
    role_name: role.name,
  };
}

// For API routes that don't need a user account (Viewer access)
export function getEffectivePermissions(session: SessionUser | null): Permissions {
  if (session) return session.permissions;
  return getViewerRole().permissions;
}

export function canAccessPage(
  permissions: Permissions,
  page: keyof Permissions["pages"]
): boolean {
  return Boolean(permissions.pages[page]);
}

export function canPerformAction(
  permissions: Permissions,
  action: keyof Permissions["actions"]
): boolean {
  return Boolean(permissions.actions[action]);
}

// Helper: get request context with permissions
export async function getRequestContext() {
  const session = await getCurrentSession();
  const permissions = getEffectivePermissions(session);
  return { session, permissions };
}

// Middleware-like helper to enforce page access in API routes
export function assertPageAccess(
  permissions: Permissions,
  page: keyof Permissions["pages"]
) {
  if (!canAccessPage(permissions, page)) {
    throw new HTTPError(403, "You do not have access to this page.");
  }
}

export function assertAction(
  permissions: Permissions,
  action: keyof Permissions["actions"]
) {
  if (!canPerformAction(permissions, action)) {
    throw new HTTPError(403, "You do not have permission for this action.");
  }
}

export class HTTPError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
