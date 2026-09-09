"use client";

import type {
  FamilyNode,
  PartnershipInput,
  PartnershipStatus,
  PersonInput,
  TreeNodePerson,
  UserInput,
  UserPublic,
  RolePublic,
  ActiveUserPublic,
} from "./types";
import type { PermissionDef } from "./permissions";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body && typeof body === "object" && "error" in body && (body.error as string)) ||
      `Permintaan gagal (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json() as Promise<T>;
}

// ============================================================================
// Persons
// ============================================================================

export async function fetchPersons(params: {
  q?: string;
  gender?: string;
  alive?: boolean;
  root?: boolean;
} = {}): Promise<TreeNodePerson[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.gender) qs.set("gender", params.gender);
  if (params.alive) qs.set("alive", "true");
  if (params.root) qs.set("root", "true");
  const res = await fetch(`/api/persons?${qs.toString()}`, { cache: "no-store" });
  const data = await jsonOrThrow<{ data: TreeNodePerson[] }>(res);
  return data.data;
}

export async function fetchPersonDetail(id: string) {
  const res = await fetch(`/api/persons/${id}`, { cache: "no-store" });
  return jsonOrThrow<{
    data: TreeNodePerson;
    relations: {
      father: TreeNodePerson | null;
      mother: TreeNodePerson | null;
      partnerships: (Record<string, unknown> & { partner: TreeNodePerson })[];
      children: TreeNodePerson[];
    };
  }>(res);
}

export async function createPerson(input: PersonInput) {
  const res = await fetch("/api/persons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<{ data: TreeNodePerson }>(res);
}

export async function updatePerson(id: string, input: Partial<PersonInput>) {
  const res = await fetch(`/api/persons/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<{ data: TreeNodePerson }>(res);
}

export async function deletePerson(id: string) {
  const res = await fetch(`/api/persons/${id}`, { method: "DELETE" });
  return jsonOrThrow<{ success: boolean }>(res);
}

// ============================================================================
// Partnerships
// ============================================================================

export async function fetchPartnerships(params: {
  status?: PartnershipStatus;
  personId?: string;
} = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.personId) qs.set("personId", params.personId);
  const res = await fetch(`/api/partnerships?${qs.toString()}`, {
    cache: "no-store",
  });
  return jsonOrThrow<{
    data: (Record<string, unknown> & {
      husband: TreeNodePerson;
      wife: TreeNodePerson;
    })[];
  }>(res);
}

export async function createPartnership(input: PartnershipInput) {
  const res = await fetch("/api/partnerships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<{ data: Record<string, unknown> }>(res);
}

export async function deletePartnership(id: string) {
  const res = await fetch(`/api/partnerships/${id}`, { method: "DELETE" });
  return jsonOrThrow<{ success: boolean }>(res);
}

// ============================================================================
// Tree
// ============================================================================

export async function fetchTree(rootId?: string): Promise<{
  trees: FamilyNode[];
  roots: TreeNodePerson[];
}> {
  const qs = rootId ? `?rootId=${encodeURIComponent(rootId)}` : "";
  const res = await fetch(`/api/tree${qs}`, { cache: "no-store" });
  const data = await jsonOrThrow<{
    data: FamilyNode | FamilyNode[];
    roots?: TreeNodePerson[];
  }>(res);
  if (Array.isArray(data.data)) {
    return { trees: data.data, roots: data.roots ?? [] };
  }
  return {
    trees: data.data ? [data.data] : [],
    roots: [],
  };
}

// ============================================================================
// Seed & stats
// ============================================================================

export async function seedSampleData() {
  const res = await fetch("/api/seed", { method: "POST" });
  return jsonOrThrow<{ seeded: boolean; message: string; persons?: number }>(res);
}

export async function resetAllData() {
  const res = await fetch("/api/seed", { method: "DELETE" });
  return jsonOrThrow<{ success: boolean }>(res);
}

export interface Stats {
  totalPersons: number;
  alive: number;
  deceased: number;
  males: number;
  females: number;
  totalPartnerships: number;
  activePartnerships: number;
  widowed: number;
  divorced: number;
  generations: { generation: number | null; count: number }[];
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats", { cache: "no-store" });
  return jsonOrThrow<Stats>(res);
}

// ============================================================================
// Users (akun pengguna — terpisah dari Person di pohon tarombo)
// ============================================================================

export async function fetchUsers(): Promise<UserPublic[]> {
  const res = await fetch("/api/users", { cache: "no-store" });
  const data = await jsonOrThrow<{ data: UserPublic[] }>(res);
  return data.data;
}

/** Versi publik (tanpa login) — untuk dropdown login guest.
 *  Hanya id, name, roleName, roleColor. Tidak ada data sensitif. */
export interface PublicUser {
  id: string;
  name: string;
  roleName: string | null;
  roleColor: string | null;
}

export async function fetchPublicUsers(): Promise<PublicUser[]> {
  const res = await fetch("/api/users/list-public", { cache: "no-store" });
  const data = await jsonOrThrow<{ data: PublicUser[] }>(res);
  return data.data;
}

export async function fetchActiveUser(): Promise<{
  data: ActiveUserPublic | null;
  hasUsers: boolean;
}> {
  const res = await fetch("/api/users/active", { cache: "no-store" });
  return jsonOrThrow<{ data: ActiveUserPublic | null; hasUsers: boolean }>(res);
}

export async function setActiveUser(
  userId: string,
  password: string,
): Promise<ActiveUserPublic> {
  const res = await fetch("/api/users/active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });
  const data = await jsonOrThrow<{ data: ActiveUserPublic | null }>(res);
  if (!data.data) throw new Error("Gagal login");
  return data.data;
}

export async function createUser(input: UserInput): Promise<UserPublic> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ data: UserPublic }>(res);
  return data.data;
}

export async function updateUser(id: string, input: Partial<UserInput>): Promise<UserPublic> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ data: UserPublic }>(res);
  return data.data;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  await jsonOrThrow<{ success: boolean }>(res);
}

// ============================================================================
// Roles (RBAC — dikustomisasi admin)
// ============================================================================

export async function fetchRoles(): Promise<{
  roles: RolePublic[];
  catalog: PermissionDef[];
}> {
  const res = await fetch("/api/roles", { cache: "no-store" });
  const data = await jsonOrThrow<{
    data: RolePublic[];
    catalog: PermissionDef[];
  }>(res);
  return { roles: data.data, catalog: data.catalog };
}

export async function createRole(input: {
  name: string;
  description?: string | null;
  color?: string;
  icon?: string | null;
  permissions: string[];
  sortOrder?: number;
}): Promise<RolePublic> {
  const res = await fetch("/api/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ data: RolePublic }>(res);
  return data.data;
}

export async function updateRole(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    color: string;
    icon: string | null;
    permissions: string[];
    sortOrder: number;
  }>,
): Promise<RolePublic> {
  const res = await fetch(`/api/roles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ data: RolePublic }>(res);
  return data.data;
}

export async function deleteRole(id: string): Promise<void> {
  const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
  await jsonOrThrow<{ success: boolean }>(res);
}

// ============================================================================
// Export — PDF / Image (PNG / JPG)
// ============================================================================

export type ExportFormat = "pdf" | "png" | "jpg";
export type ExportScope = "current" | "all";
export type ExportSize = "A4" | "A3" | "A2" | "A1" | "LARGE";

/** Bangun URL export untuk format/scope/size tertentu.
 *  Browser akan otomatis mengunduh file hasil.
 */
export function buildExportUrl(opts: {
  format: ExportFormat;
  scope?: ExportScope;
  size?: ExportSize;
  rootId?: string | null;
}): string {
  const qs = new URLSearchParams();
  qs.set("format", opts.format);
  qs.set("scope", opts.scope ?? "all");
  if (opts.format === "pdf") qs.set("size", opts.size ?? "A3");
  if (opts.scope === "current" && opts.rootId) qs.set("rootId", opts.rootId);
  return `/api/export?${qs.toString()}`;
}

/** Trigger download file export. */
export function triggerExportDownload(opts: {
  format: ExportFormat;
  scope?: ExportScope;
  size?: ExportSize;
  rootId?: string | null;
}): void {
  const url = buildExportUrl(opts);
  const a = document.createElement("a");
  a.href = url;
  a.download = ""; // biarkan server yang tentukan nama via Content-Disposition
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
