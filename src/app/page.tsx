"use client";

import { useState } from "react";
import { NavBar, type ViewKey } from "@/components/nav-bar";
import { FamilyTreeView } from "@/components/views/family-tree-view";
import { FamilyChartView } from "@/components/views/family-chart-view";
import { BirthdaysView } from "@/components/views/birthdays-view";
import { WeddingsView } from "@/components/views/weddings-view";
import { ProfileView } from "@/components/views/profile-view";
import { AdminView } from "@/components/views/admin-view";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const VIEWER_PERMISSIONS = {
  pages: { familyTree: true, familyChart: false, birthdays: false, weddings: false, profile: false },
  actions: { managePersons: false, manageSpouses: false, manageUsers: false, manageRoles: false, exportData: false },
};

export default function Home() {
  const auth = useAuth();
  const [view, setView] = useState<ViewKey>("familyTree");

  const permissions = auth.permissions ?? VIEWER_PERMISSIONS;

  // Derive the effective view: if the selected view is inaccessible, fall back to familyTree.
  const viewAccessible: Record<ViewKey, boolean> = {
    familyTree: true,
    familyChart: permissions.pages.familyChart,
    birthdays: permissions.pages.birthdays,
    weddings: permissions.pages.weddings,
    profile: permissions.pages.profile,
    admin: permissions.actions.manageUsers || permissions.actions.manageRoles,
  };
  const effectiveView: ViewKey = viewAccessible[view] ? view : "familyTree";

  return (
    <div className="tarombo-bg relative flex min-h-screen flex-col">
      {/* Soft overlay so background is subtle and text stays readable */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-[2px]" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <NavBar
          permissions={permissions}
          currentView={effectiveView}
          onViewChange={setView}
          isLoggedIn={auth.isLoggedIn}
          userName={auth.user?.name}
          userEmail={auth.user?.email}
          roleName={auth.user?.role_name}
          onLogin={auth.refresh}
          onLogout={auth.logout}
        />

        <main className="flex-1">
          {auth.loading ? (
            <div className="flex h-[60vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mx-auto h-[calc(100vh-4rem-3rem)] max-w-7xl animate-soft-fade">
              {effectiveView === "familyTree" && (
                <FamilyTreeView
                  canEdit={permissions.actions.managePersons}
                  canExport={permissions.actions.exportData}
                />
              )}
              {effectiveView === "familyChart" && permissions.pages.familyChart && (
                <FamilyChartView canEdit={permissions.actions.managePersons} />
              )}
              {effectiveView === "birthdays" && permissions.pages.birthdays && <BirthdaysView />}
              {effectiveView === "weddings" && permissions.pages.weddings && <WeddingsView />}
              {effectiveView === "profile" && permissions.pages.profile && (
                <ProfileView onRefresh={auth.refresh} />
              )}
              {effectiveView === "admin" &&
                (permissions.actions.manageUsers || permissions.actions.manageRoles) && (
                  <AdminView
                    canManageUsers={permissions.actions.manageUsers}
                    canManageRoles={permissions.actions.manageRoles}
                  />
                )}
            </div>
          )}
        </main>

        <footer className="mt-auto border-t border-border/60 bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              <img src="/tarombo-ikon02.png" alt="" className="h-5 w-5 object-contain opacity-70" />
              <span>
                <span className="font-medium text-foreground">Tarombo Hariandja</span> · Marga Hariandja Clan
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>
                {auth.isLoggedIn
                  ? `Signed in as ${auth.user?.role_name}`
                  : "Viewing as guest (Viewer)"}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Preserving our lineage, generation to generation.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
