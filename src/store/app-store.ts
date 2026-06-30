import { create } from "zustand";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

interface AppState {
  activeView:
    | "login"
    | "register"
    | "tree"
    | "persons"
    | "person-detail"
    | "person-form"
    | "marriages"
    | "users";
  selectedPersonId: string | null;
  editingPersonId: string | null;
  userRole: Role | null;
  setActiveView: (view: AppState["activeView"]) => void;
  setSelectedPersonId: (id: string | null) => void;
  setEditingPersonId: (id: string | null) => void;
  setUserRole: (role: Role | null) => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  activeView: "login",
  selectedPersonId: null,
  editingPersonId: null,
  userRole: null,
  setActiveView: (view) => set({ activeView: view }),
  setSelectedPersonId: (id) => set({ selectedPersonId: id }),
  setEditingPersonId: (id) => set({ editingPersonId: id }),
  setUserRole: (role) => set({ userRole: role }),
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
        setActiveView("tree");
      }
    } else if (!session) {
      if (activeView !== "login" && activeView !== "register") {
        setActiveView("login");
      }
    }
  }, [session, status, setActiveView, setUserRole]);
}