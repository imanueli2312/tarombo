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
import { Users, UserPlus, Sparkles, MoreVertical, Trash2, Heart } from "lucide-react";

interface Props {
  totalPersons: number;
  onAddPerson: () => void;
  onAddPartnership: () => void;
  onSeed: () => void;
  onReset: () => void;
}

export function AppHeader({
  totalPersons,
  onAddPerson,
  onAddPartnership,
  onSeed,
  onReset,
}: Props) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur-md">
      <div className="uis-pattern absolute inset-0 opacity-60 pointer-events-none" />
      <div className="relative mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-6">
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
          <Button
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex"
            onClick={onAddPartnership}
          >
            <Heart className="size-4 mr-1.5" />
            Pasangan
          </Button>
          <Button size="sm" onClick={onAddPerson}>
            <UserPlus className="size-4 mr-1.5" />
            <span className="hidden xs:inline sm:inline">Tambah Orang</span>
            <span className="xs:hidden sm:hidden">Orang</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-9">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onSeed}>
                <Sparkles className="size-4 mr-2 text-amber-600" />
                Muat data contoh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddPartnership} className="sm:hidden">
                <Heart className="size-4 mr-2 text-rose-600" />
                Tambah pasangan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onReset}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Reset semua data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
