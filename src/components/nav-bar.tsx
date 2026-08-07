"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { LoginDialog } from "@/components/login-dialog";
import {
  TreePine,
  Network,
  Cake,
  Heart,
  User,
  Shield,
  Menu,
  LogIn,
  LogOut,
  ChevronDown,
} from "lucide-react";
import type { Permissions } from "@/lib/types";

export type ViewKey =
  | "familyTree"
  | "familyChart"
  | "birthdays"
  | "weddings"
  | "profile"
  | "admin";

interface NavBarProps {
  permissions: Permissions | null;
  currentView: ViewKey;
  onViewChange: (v: ViewKey) => void;
  isLoggedIn: boolean;
  userName?: string;
  userEmail?: string;
  roleName?: string;
  onLogin: () => void;
  onLogout: () => void;
}

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ReactNode;
  requires?: (p: Permissions) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "familyTree", label: "Family Tree", icon: <TreePine className="h-4 w-4" /> },
  {
    key: "familyChart",
    label: "Family Chart",
    icon: <Network className="h-4 w-4" />,
    requires: (p) => p.pages.familyChart,
  },
  {
    key: "birthdays",
    label: "Birthdays",
    icon: <Cake className="h-4 w-4" />,
    requires: (p) => p.pages.birthdays,
  },
  {
    key: "weddings",
    label: "Weddings",
    icon: <Heart className="h-4 w-4" />,
    requires: (p) => p.pages.weddings,
  },
  {
    key: "profile",
    label: "Profile",
    icon: <User className="h-4 w-4" />,
    requires: (p) => p.pages.profile,
  },
  {
    key: "admin",
    label: "Admin",
    icon: <Shield className="h-4 w-4" />,
    requires: (p) => p.actions.manageUsers || p.actions.manageRoles,
  },
];

export function NavBar(props: NavBarProps) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.requires || (props.permissions && item.requires(props.permissions))
  );

  function handleNav(v: ViewKey) {
    props.onViewChange(v);
    setMobileOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          {/* Logo + title */}
          <button
            onClick={() => handleNav("familyTree")}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            { }
            <img
              src="/tarombo-ikon02.png"
              alt="Marga Hariandja emblem"
              className="h-9 w-9 rounded-lg object-contain"
            />
            <div className="hidden flex-col leading-none sm:flex">
              <span className="text-sm font-semibold tracking-tight">Tarombo Hariandja</span>
              <span className="text-[10px] text-muted-foreground">Marga Hariandja Clan</span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="ml-4 hidden items-center gap-0.5 md:flex">
            {visibleItems.map((item) => (
              <Button
                key={item.key}
                variant={props.currentView === item.key ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleNav(item.key)}
                className="gap-2"
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetTitle className="mb-2 flex items-center gap-2 px-1">
                  { }
                  <img src="/tarombo-ikon02.png" alt="" className="h-7 w-7 object-contain" />
                  Tarombo Hariandja
                </SheetTitle>
                <nav className="flex flex-col gap-1">
                  {visibleItems.map((item) => (
                    <Button
                      key={item.key}
                      variant={props.currentView === item.key ? "secondary" : "ghost"}
                      onClick={() => handleNav(item.key)}
                      className="justify-start gap-3"
                    >
                      {item.icon}
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Auth */}
            {props.isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {props.userName?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm sm:inline">{props.userName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{props.userName}</span>
                      <span className="text-xs font-normal text-muted-foreground">{props.userEmail}</span>
                      {props.roleName && (
                        <span className="mt-1 inline-block w-fit rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                          {props.roleName}
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {props.permissions?.pages.profile && (
                    <DropdownMenuItem onClick={() => handleNav("profile")}>
                      <User className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={props.onLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => setLoginOpen(true)} className="gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Editor / Admin login</span>
                <span className="sm:hidden">Login</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={props.onLogin}
      />
    </>
  );
}
