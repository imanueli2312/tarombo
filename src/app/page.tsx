"use client";

import { useSession } from "next-auth/react";
import { useAppStore, useSessionSync } from "@/store/app-store";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TreeVisualization } from "@/components/tarombo/TreeVisualization";
import { PersonList } from "@/components/tarombo/PersonList";
import { PersonDetail } from "@/components/tarombo/PersonDetail";
import { PersonForm } from "@/components/tarombo/PersonForm";
import { MarriageList } from "@/components/tarombo/MarriageList";
import { UserManagement } from "@/components/tarombo/UserManagement";
import { BackupRestore } from "@/components/tarombo/BackupRestore";
import { AuditLogViewer } from "@/components/tarombo/AuditLogViewer";
import { DashboardStats } from "@/components/tarombo/DashboardStats";
import { PasswordChange } from "@/components/tarombo/PasswordChange";
import { FamilySearch } from "@/components/tarombo/FamilySearch";

function AppContent() {
  const activeView = useAppStore((s) => s.activeView);

  if (activeView === "login") return <LoginForm />;
  if (activeView === "register") return <RegisterForm />;
  if (activeView === "home") return <MainLayout><FamilySearch /></MainLayout>;
  if (activeView === "tree") return <TreeView />;
  if (activeView === "persons") return <MainLayout><PersonList /></MainLayout>;
  if (activeView === "person-detail") return <MainLayout><PersonDetail /></MainLayout>;
  if (activeView === "person-form") return <MainLayout><PersonForm /></MainLayout>;
  if (activeView === "marriages") return <MainLayout><MarriageList /></MainLayout>;
  if (activeView === "users") return <MainLayout><UserManagement /></MainLayout>;
  if (activeView === "backup") return <MainLayout><BackupRestore /></MainLayout>;
  if (activeView === "audit-logs") return <MainLayout><AuditLogViewer /></MainLayout>;
  if (activeView === "dashboard") return <MainLayout><DashboardStats /></MainLayout>;
  if (activeView === "password") return <MainLayout><PasswordChange /></MainLayout>;

  return <LoginForm />;
}

function TreeView() {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-hidden bg-gradient-to-b from-[var(--t-bg-cream)]/30 to-[var(--t-bg-card)]">
        <TreeVisualization />
      </main>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[var(--t-bg-cream)]/30 to-[var(--t-bg-card)]">
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 p-4 lg:p-6 lg:ml-0 mt-12 lg:mt-0 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <div className="gorga-divider" />
      <footer className="bg-[var(--t-sidebar)] py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-[var(--t-secondary)]/80">
          Tarombo Marga Hariandja — Sistem Pohon Keluarga Digital Marga Hariandja
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--t-bg-cream)] via-[var(--t-bg-warm)] to-[var(--t-bg-card)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--t-border)] border-t-[var(--t-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--t-primary)]">Memuat...</p>
        </div>
      </div>
    );
  }

  return <ErrorBoundary><AppContent /></ErrorBoundary>;
}