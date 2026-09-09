"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchActiveUser } from "./api-client";
import type { ActiveUserPublic } from "./types";

/** Hook untuk ambil user aktif + permissions-nya. */
export function useActiveUser() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["active-user"],
    queryFn: fetchActiveUser,
    staleTime: 10_000,
  });

  const user: ActiveUserPublic | null = query.data?.data ?? null;
  const hasUsers = query.data?.hasUsers ?? false;

  const can = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  const canAny = (...permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some((p) => user.permissions.includes(p));
  };

  const canAll = (...permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every((p) => user.permissions.includes(p));
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["active-user"] });

  return {
    user,
    hasUsers,
    isLoading: query.isLoading,
    can,
    canAny,
    canAll,
    refresh,
  };
}
