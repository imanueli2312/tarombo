"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import type { Permissions, Person, SafeUser } from "@/lib/types";

interface AuthState {
  user: {
    id: string;
    email: string;
    name: string;
    role_id: string;
    role_name: string;
    person_id: string | null;
    person: Person | null;
  } | null;
  permissions: Permissions | null;
  loading: boolean;
  error: string | null;
}

const VIEWER_PERMISSIONS: Permissions = {
  pages: {
    search: true,
    familyTree: true,
    familyChart: false,
    birthdays: false,
    weddings: false,
    profile: false,
    map: true,
    pedigree: true,
    descendants: true,
  },
  actions: {
    managePersons: false,
    manageSpouses: false,
    manageUsers: false,
    manageRoles: false,
    exportData: false,
  },
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      setState({
        user: data.user,
        permissions: data.permissions,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setState({
        user: null,
        permissions: VIEWER_PERMISSIONS,
        loading: false,
        error: e?.message ?? "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // ignore
    }
    await refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
    logout,
    isLoggedIn: !!state.user,
    isViewer: !state.user,
    // Helper accessors that fall back to viewer permissions
    can: (page: keyof Permissions["pages"]) =>
      state.permissions?.pages[page] ?? false,
    canDo: (action: keyof Permissions["actions"]) =>
      state.permissions?.actions[action] ?? false,
  };
}
