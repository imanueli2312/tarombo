"use client";

import { Card } from "@/components/ui/card";
import {
  Users,
  Heart,
  Baby,
  Skull,
  Sparkles,
} from "lucide-react";
import type { Stats } from "@/lib/tarombo/api-client";
import { cn } from "@/lib/utils";

interface Props {
  stats: Stats | undefined;
  isLoading: boolean;
}

const SKELETON: Stats = {
  totalPersons: 0,
  alive: 0,
  deceased: 0,
  males: 0,
  females: 0,
  totalPartnerships: 0,
  activePartnerships: 0,
  widowed: 0,
  divorced: 0,
  generations: [],
};

export function StatsCards({ stats, isLoading }: Props) {
  const s = stats ?? SKELETON;
  const items = [
    {
      label: "Total Orang",
      value: s.totalPersons,
      icon: Users,
      tint: "text-primary bg-primary/10",
    },
    {
      label: "Pasangan Aktif",
      value: s.activePartnerships,
      icon: Heart,
      tint: "text-emerald-600 bg-emerald-500/10",
    },
    {
      label: "Janda / Duda",
      value: s.widowed,
      icon: Sparkles,
      tint: "text-amber-600 bg-amber-500/10",
    },
    {
      label: "Masih Hidup",
      value: s.alive,
      icon: Baby,
      tint: "text-teal-600 bg-teal-500/10",
    },
    {
      label: "Telah Wafat",
      value: s.deceased,
      icon: Skull,
      tint: "text-stone-500 bg-stone-400/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <Card
          key={it.label}
          className={cn(
            "p-3 flex items-center gap-2.5 relative overflow-hidden",
            isLoading && "animate-pulse",
          )}
        >
          <div className={cn("grid size-9 place-items-center rounded-lg", it.tint)}>
            <it.icon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-none tabular-nums">{it.value}</p>
            <p className="text-[10.5px] text-muted-foreground truncate mt-0.5">
              {it.label}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
