"use client";

import type {
  FamilyNode,
  PartnershipInput,
  PartnershipStatus,
  PersonInput,
  TreeNodePerson,
} from "./types";

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
