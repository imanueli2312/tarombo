"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Sparkles,
  MoreVertical,
  Trash2,
  Heart,
  Download,
  Lock,
} from "lucide-react";
import { UserMenuButton } from "./user-management-sheet";
import { useActiveUser } from "@/lib/tarombo/use-permissions";

interface Props {
  totalPersons: number;
  onAddPerson: () => void;
  onAddPartnership: () => void;
  onSeed: () => void;
  onReset: () => void;
  onExport: () => void;
  onManageUsers: () => void;
  onManageRoles: () => void;
}

export function AppHeader({
  totalPersons,
  onAddPerson,
  onAddPartnership,
  onSeed,
  onReset,
  onExport,
  onManageUsers,
  onManageRoles,
}: Props) {
  const { can } = useActiveUser();
  const canAddPerson = can("person:create");
  const canAddPartnership = can("partnership:create");
  const canExport = can("export:view");
  const canSeed = can("data:seed");
  const canReset = can("data:reset");
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur-md">
      <div className="uis-pattern absolute inset-0 opacity-60 pointer-events-none" />
      <div className="relative mx-auto flex max-w-[1600px] items-center gap-2 sm:gap-3 px-4 py-2.5 sm:px-6">
        {/* Logo + judul */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm shrink-0">
            <Users className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg">
              Tarombo
            </h1>
            <p className="hidden text-[10.5px] text-muted-foreground leading-none sm:block">
              Silsilah Keluarga Batak
            </p>
          </div>
        </div>

        <Badge
          variant="secondary"
          className="ml-1 hidden md:inline-flex bg-accent/60 text-accent-foreground border-accent-foreground/15"
        >
          <Sparkles className="size-3 mr-1" />
          {totalPersons} orang
        </Badge>

        {/* Aksi */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {canExport && (
            <Button
              size="sm"
              variant="outline"
              className="hidden md:inline-flex"
              onClick={onExport}
            >
              <Download className="size-4 mr-1.5" />
              Export
            </Button>
          )}
          {canAddPartnership && (
            <Button
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={onAddPartnership}
            >
              <Heart className="size-4 mr-1.5" />
              Pasangan
            </Button>
          )}
          {canAddPerson && (
            <Button size="sm" onClick={onAddPerson}>
              <UserPlus className="size-4 mr-1.5" />
              <span className="hidden xs:inline sm:inline">Tambah Orang</span>
              <span className="xs:hidden sm:hidden">Orang</span>
            </Button>
          )}

          {/* User menu (akun pengguna — terpisah dari Person) */}
          <UserMenuButton
            onOpenManage={onManageUsers}
            onOpenManageRoles={onManageRoles}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-9">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {canExport && (
                <DropdownMenuItem onClick={onExport} className="md:hidden">
                  <Download className="size-4 mr-2 text-primary" />
                  Export pohon
                </DropdownMenuItem>
              )}
              {canSeed && (
                <DropdownMenuItem onClick={onSeed}>
                  <Sparkles className="size-4 mr-2 text-amber-600" />
                  Muat data contoh
                </DropdownMenuItem>
              )}
              {canAddPartnership && (
                <DropdownMenuItem onClick={onAddPartnership} className="sm:hidden">
                  <Heart className="size-4 mr-2 text-rose-600" />
                  Tambah pasangan
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canReset ? (
                <DropdownMenuItem
                  onClick={onReset}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  Reset semua data
                </DropdownMenuItem>
              ) : (
                <div className="px-2 py-1.5 text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                  <Lock className="size-3" />
                  Reset butuh permission
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
