"use client";

import { useAppStore } from "@/store/app-store";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  TreePine,
  Users,
  Heart,
  UserCog,
  LogOut,
  Menu,
  X,
  Database,
} from "lucide-react";
import { getRoleLabel } from "@/lib/rbac";
import { useState } from "react";

interface NavItem {
  id: "tree" | "persons" | "marriages" | "users";
  label: string;
  icon: React.ReactNode;
  minRole: number;
}

const navItems: NavItem[] = [
  { id: "tree", label: "Pohon Tarombo", icon: <TreePine className="w-5 h-5" />, minRole: 1 },
  { id: "persons", label: "Data Anggota", icon: <Users className="w-5 h-5" />, minRole: 1 },
  { id: "marriages", label: "Data Pernikahan", icon: <Heart className="w-5 h-5" />, minRole: 1 },
  { id: "users", label: "Kelola Pengguna", icon: <UserCog className="w-5 h-5" />, minRole: 3 },
];

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const { data: session } = useSession();

  const userRole = (session?.user as Record<string, unknown>)?.role as
    | string
    | undefined;
  const roleLevel = userRole === "ADMIN" ? 3 : userRole === "EDITOR" ? 2 : 1;
  const userName = session?.user?.name || "Pengguna";
  const userEmail = session?.user?.email || "";

  const handleNav = (view: NavItem["id"]) => {
    setActiveView(view);
    setMobileOpen(false);
  };

  const handleSeed = async () => {
    if (!confirm("Ini akan membuat data awal termasuk akun admin default (admin@hariandja.id / admin123). Lanjutkan?")) return;
    await fetch("/api/seed");
    alert("Data awal berhasil dibuat! Silakan login dengan:\nEmail: admin@hariandja.id\nPassword: admin123");
  };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-amber-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <TreePine className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="font-bold text-amber-900 text-sm">Tarombo</h1>
            <p className="text-xs text-amber-600">Marga Hariandja</p>
          </div>
          <button
            className="ml-auto lg:hidden p-1 hover:bg-amber-100 rounded"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          if (roleLevel < item.minRole) return null;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-100 text-amber-900"
                  : "text-amber-700/70 hover:bg-amber-50 hover:text-amber-900"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}

        {/* Seed Data Button (only for setup) */}
        <div className="pt-4 mt-4 border-t border-amber-200/50">
          <button
            onClick={handleSeed}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-amber-50 hover:text-amber-700 transition-colors"
          >
            <Database className="w-5 h-5" />
            Seed Data Awal
          </button>
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-amber-200/50">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="w-9 h-9 bg-amber-100">
            <AvatarFallback className="text-amber-700 text-xs font-bold">
              {userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900 truncate">
              {userName}
            </p>
            <p className="text-xs text-amber-600/70 truncate">{userEmail}</p>
          </div>
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0"
          >
            {userRole ? getRoleLabel(userRole as "ADMIN" | "EDITOR" | "VIEWER") : "—"}
          </Badge>
        </div>
        <Button
          variant="ghost"
          className="w-full mt-2 justify-start text-amber-700/70 hover:text-red-600 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Keluar
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-amber-100 rounded-lg shadow-md"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5 text-amber-700" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block w-64 bg-white border-r border-amber-200/50 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Sidebar - Mobile */}
      {mobileOpen && (
        <aside className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-amber-200/50 z-50 shadow-xl">
          {navContent}
        </aside>
      )}
    </>
  );
}