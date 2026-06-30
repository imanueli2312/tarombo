export type Role = "ADMIN" | "EDITOR" | "VIEWER";

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export function hasPermission(
  userRole: Role | undefined,
  requiredRole: Role
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canCreate(userRole: Role | undefined): boolean {
  return hasPermission(userRole, "EDITOR");
}

export function canUpdate(userRole: Role | undefined): boolean {
  return hasPermission(userRole, "EDITOR");
}

export function canDelete(userRole: Role | undefined): boolean {
  return hasPermission(userRole, "ADMIN");
}

export function canManageUsers(userRole: Role | undefined): boolean {
  return hasPermission(userRole, "ADMIN");
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    ADMIN: "Administrator",
    EDITOR: "Editor",
    VIEWER: "Pengamat",
  };
  return labels[role];
}

export function getAllRoles(): { value: Role; label: string }[] {
  return [
    { value: "ADMIN", label: "Administrator" },
    { value: "EDITOR", label: "Editor" },
    { value: "VIEWER", label: "Pengamat" },
  ];
}