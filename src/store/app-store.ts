import { create } from "zustand";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { AppTheme, TreeLayoutType } from "@/lib/theme-config";
import { themes, applyThemeVars } from "@/lib/theme-config";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

interface AppState {
  activeView:
    | "login"
    | "register"
    | "home"
    | "tree"
    | "persons"
    | "person-detail"
    | "person-form"
    | "marriages"
    | "users"
    | "backup"
    | "audit-logs"
    | "dashboard"
    | "password";
  selectedPersonId: string | null;
  editingPersonId: string | null;
  userRole: Role | null;
  appTheme: AppTheme;
  treeLayout: TreeLayoutType;
  setActiveView: (view: AppState["activeView"]) => void;
  setSelectedPersonId: (id: string | null) => void;
  setEditingPersonId: (id: string | null) => void;
  setUserRole: (role: Role | null) => void;
  setAppTheme: (theme: AppTheme) => void;
  setTreeLayout: (layout: TreeLayoutType) => void;
  canCreate: () => boolean;
  canUpdate: () => boolean;
  canDelete: () => boolean;
  canManageUsers: () => boolean;
}

const ROLE_LEVELS: Record<Role, number> = {
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "batak-toba";
  return (localStorage.getItem("tarombo-theme") as AppTheme) || "batak-toba";
}

function getStoredLayout(): TreeLayoutType {
  if (typeof window === "undefined") return "vertical";
  return (localStorage.getItem("tarombo-layout") as TreeLayoutType) || "vertical";
}

export const useAppStore = create<AppState>((set, get) => ({
  activeView: "login",
  selectedPersonId: null,
  editingPersonId: null,
  userRole: null,
  appTheme: "batak-toba",
  treeLayout: "vertical",
  setActiveView: (view) => set({ activeView: view }),
  setSelectedPersonId: (id) => set({ selectedPersonId: id }),
  setEditingPersonId: (id) => set({ editingPersonId: id }),
  setUserRole: (role) => set({ userRole: role }),
  setAppTheme: (theme) => {
    localStorage.setItem("tarombo-theme", theme);
    applyThemeVars(themes[theme]);
    set({ appTheme: theme });
  },
  setTreeLayout: (layout) => {
    localStorage.setItem("tarombo-layout", layout);
    set({ treeLayout: layout });
  },
  canCreate: () => {
    const role = get().userRole;
    if (!role) return false;
    return ROLE_LEVELS[role] >= 2;
  },
  canUpdate: () => {
    const role = get().userRole;
    if (!role) return false;
    return ROLE_LEVELS[role] >= 2;
  },
  canDelete: () => {
    const role = get().userRole;
    if (!role) return false;
    return ROLE_LEVELS[role] >= 3;
  },
  canManageUsers: () => {
    const role = get().userRole;
    if (!role) return false;
    return ROLE_LEVELS[role] >= 3;
  },
}));

// Initialize theme on client
if (typeof window !== "undefined") {
  const stored = getStoredTheme();
  applyThemeVars(themes[stored]);
  // Initialize layout from storage
  useAppStore.setState({ appTheme: stored, treeLayout: getStoredLayout() });
}

// Hook to sync session with store - only runs on client
export function useSessionSync() {
  const { data: session, status } = useSession();
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setUserRole = useAppStore((s) => s.setUserRole);

  useEffect(() => {
    if (status === "loading") return;

    const role = session
      ? ((session.user as Record<string, unknown>)?.role as Role | undefined) ?? null
      : null;

    setUserRole(role);

    const activeView = useAppStore.getState().activeView;

    if (session && role) {
      if (activeView === "login" || activeView === "register") {
        setActiveView("home");
      }
    } else if (!session) {
      if (activeView !== "login" && activeView !== "register") {
        setActiveView("login");
      }
    }
  }, [session, status, setActiveView, setUserRole]);
}