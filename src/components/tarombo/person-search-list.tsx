"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserRound, Users as UsersIcon } from "lucide-react";
import type { TreeNodePerson } from "@/lib/tarombo/types";
import { cn } from "@/lib/utils";

interface Props {
  persons: TreeNodePerson[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onJumpToTree: (id: string) => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PersonSearchList({
  persons,
  selectedId,
  onSelect,
  onJumpToTree,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return persons;
    const needle = q.toLowerCase();
    return persons.filter(
      (p) =>
        p.fullName.toLowerCase().includes(needle) ||
        (p.nickname ?? "").toLowerCase().includes(needle) ||
        (p.birthPlace ?? "").toLowerCase().includes(needle),
    );
  }, [persons, q]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / nama panggilan / tempat lahir…"
          className="h-9 pl-8"
        />
      </div>

      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] text-muted-foreground">
          {filtered.length} orang
        </p>
        {q && (
          <button
            onClick={() => setQ("")}
            className="text-[11px] text-primary hover:underline"
          >
            bersihkan
          </button>
        )}
      </div>

      <div className="tarombo-scroll flex-1 min-h-0 overflow-y-scroll -mx-1 px-1">
        <div className="space-y-1 pr-2">
          {filtered.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              <UserRound className="mx-auto mb-2 size-7 opacity-40" />
              {q ? "Tidak ada hasil." : "Belum ada orang terdaftar."}
            </div>
          )}
          {filtered.map((p) => {
            const isMale = p.gender === "MALE";
            return (
              <div
                key={p.id}
                onClick={() => onSelect(p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(p.id);
                  }
                }}
                className={cn(
                  "group flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent p-2 transition-colors",
                  "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedId === p.id && "bg-accent border-border ring-1 ring-primary/40",
                )}
              >
                <Avatar className="size-8 border border-border">
                  {p.photo ? (
                     
                    <img
                      src={p.photo}
                      alt={p.fullName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <AvatarFallback
                      className={cn(
                        "text-[10px] font-semibold",
                        isMale
                          ? "bg-primary/15 text-primary"
                          : "bg-amber-500/20 text-amber-700",
                      )}
                    >
                      {initials(p.fullName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium leading-tight">
                    {p.fullName}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {p.nickname ? `“${p.nickname}” · ` : ""}
                    Gen {p.generationNumber ?? "?"}
                    {!p.alive ? " · ✝ wafat" : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJumpToTree(p.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center size-6 rounded hover:bg-background text-primary"
                  title="Lompat ke pohon"
                >
                  <UsersIcon className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
