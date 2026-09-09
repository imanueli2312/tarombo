"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateShort, genderLabel } from "@/lib/tarombo/types";
import type { TreeNodePerson } from "@/lib/tarombo/types";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  person: TreeNodePerson;
  selected?: boolean;
  isSpouse?: boolean;
  onClick?: () => void;
}

export function PersonNodeCard({ person, selected, isSpouse, onClick }: Props) {
  const isMale = person.gender === "MALE";
  const alive = person.alive;

  return (
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "w-[150px] sm:w-[168px] cursor-pointer transition-all p-2.5 text-left relative overflow-hidden group",
        "hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "ring-2 ring-primary shadow-md",
        !alive && "opacity-90",
      )}
    >
      {/* strip warna atas: biru dilarang → gunakan marun (laki) / emas (perempuan) */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          isMale ? "bg-primary" : "bg-amber-500",
          !alive && "bg-muted-foreground/40",
        )}
      />

      <div className="flex items-center gap-2.5 mt-1">
        <div className="relative shrink-0">
          <Avatar className="size-9 border border-border">
            {person.photo ? (
               
              <img
                src={person.photo}
                alt={person.fullName}
                className="size-full object-cover"
              />
            ) : (
              <AvatarFallback
                className={cn(
                  "text-[11px] font-semibold",
                  isMale
                    ? "bg-primary/15 text-primary"
                    : "bg-amber-500/20 text-amber-700",
                )}
              >
                {initials(person.fullName)}
              </AvatarFallback>
            )}
          </Avatar>
          {/* indikator hidup / wafat */}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card",
              alive ? "bg-emerald-500 alive-dot" : "bg-stone-400",
            )}
            aria-label={alive ? "Masih hidup" : "Telah wafat"}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-tight truncate text-foreground">
            {person.fullName}
          </p>
          {person.nickname && (
            <p className="text-[10.5px] text-muted-foreground truncate">
              “{person.nickname}”
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <Badge
            variant="outline"
            className={cn(
              "px-1.5 py-0 h-[18px] text-[9.5px] font-medium",
              isMale
                ? "border-primary/30 text-primary bg-primary/5"
                : "border-amber-500/40 text-amber-700 bg-amber-500/10",
            )}
          >
            {isMale ? "♂ L" : "♀ P"}
          </Badge>
          <span className="text-[9.5px] text-muted-foreground">
            Gen {person.generationNumber ?? "?"}
          </span>
        </div>
        <p className="text-[9.5px] text-muted-foreground leading-tight">
          {person.birthDate ? `♀ ${formatDateShort(person.birthDate)}` : "♀ -"}
        </p>
        {!alive && person.deathDate && (
          <p className="text-[9.5px] text-stone-500 leading-tight">
            ✝ {formatDateShort(person.deathDate)}
          </p>
        )}
        {isSpouse && (
          <span className="inline-block text-[9px] font-medium text-amber-700 bg-amber-500/10 rounded px-1 py-0.5">
            Pasangan
          </span>
        )}
      </div>
    </Card>
  );
}

// Re-export label agar mudah dipakai di komponen lain
export { genderLabel };
