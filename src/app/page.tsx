"use client";

import { useSession } from "next-auth/react";
import { useAppStore, useSessionSync } from "@/store/app-store";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TreeVisualization } from "@/components/tarombo/TreeVisualization";
import { PersonList } from "@/components/tarombo/PersonList";
import { PersonDetail } from "@/components/tarombo/PersonDetail";
import { PersonForm } from "@/components/tarombo/PersonForm";
import { MarriageList } from "@/components/tarombo/MarriageList";
import { UserManagement } from "@/components/tarombo/UserManagement";

function AppContent() {
  const activeView = useAppStore((s) => s.activeView);

  if (activeView === "login") return <LoginForm />;
  if (activeView === "register") return <RegisterForm />;
  if (activeView === "tree") return <TreeView />;
  if (activeView === "persons") return <MainLayout><PersonList /></MainLayout>;
  if (activeView === "person-detail") return <MainLayout><PersonDetail /></MainLayout>;
  if (activeView === "person-form") return <MainLayout><PersonForm /></MainLayout>;
  if (activeView === "marriages") return <MainLayout><MarriageList /></MainLayout>;
  if (activeView === "users") return <MainLayout><UserManagement /></MainLayout>;

  return <LoginForm />;
}

function TreeView() {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-hidden bg-gradient-to-b from-amber-50/30 to-white">
        <TreeVisualization />
      </main>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50/30 to-white">
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 p-4 lg:p-6 lg:ml-0 mt-12 lg:mt-0 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <footer className="bg-white border-t border-amber-200/50 py-3 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-muted-foreground">
          Tarombo Marga Hariandja — Sistem Pohon Keluarga Digital
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  useSessionSync();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-700">Memuat...</p>
        </div>
      </div>
    );
  }

  return <AppContent />;
}