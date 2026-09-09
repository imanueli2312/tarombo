"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, RefreshCw, History } from "lucide-react";
import { toast } from "sonner";
import { useActiveUser } from "@/lib/tarombo/use-permissions";
import { formatDateShort } from "@/lib/tarombo/types";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  LogIn,
  LogOut,
  Sparkles,
  AlertCircle,
  Download,
  Database,
  type LucideIcon,
} from "lucide-react";

interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Mapping action → { icon, label warna (warm palette), verb text } */
const ACTION_META: Record<
  string,
  { icon: LucideIcon; tint: string; verb: string }
> = {
  create: {
    icon: Plus,
    tint: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    verb: "menambah",
  },
  update: {
    icon: Pencil,
    tint: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    verb: "memperbarui",
  },
  delete: {
    icon: Trash2,
    tint: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    verb: "menghapus",
  },
  restore: {
    icon: RotateCcw,
    tint: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    verb: "memulihkan",
  },
  login: {
    icon: LogIn,
    tint: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    verb: "masuk sebagai",
  },
  logout: {
    icon: LogOut,
    tint: "bg-stone-500/15 text-stone-700 dark:text-stone-300",
    verb: "keluar dari",
  },
  seed: {
    icon: Sparkles,
    tint: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    verb: "memuat data contoh",
  },
  reset: {
    icon: AlertCircle,
    tint: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    verb: "mereset",
  },
  export: {
    icon: Download,
    tint: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    verb: "mengekspor",
  },
  backup_restore: {
    icon: Database,
    tint: "bg-primary/15 text-primary",
    verb: "memulihkan backup",
  },
};

const DEFAULT_META: { icon: LucideIcon; tint: string; verb: string } = {
  icon: Clock,
  tint: "bg-stone-500/15 text-stone-700 dark:text-stone-300",
  verb: "melakukan aksi pada",
};

function entityLabel(t: string): string {
  switch (t) {
    case "person":
      return "orang";
    case "partnership":
      return "pasangan";
    case "user":
      return "pengguna";
    case "role":
      return "role";
    case "data":
      return "data";
    default:
      return t;
  }
}

function relativeTime(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return formatDateShort(d);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return formatDateShort(d);
}

function describe(entry: ActivityLogEntry): string {
  const meta = ACTION_META[entry.action] ?? DEFAULT_META;
  const user = entry.user_name ?? "Sistem";
  const entity = entry.entity_name ?? entry.entity_id ?? entityLabel(entry.entity_type);
  switch (entry.action) {
    case "login":
    case "logout":
      return `${user} ${meta.verb}`;
    case "seed":
      return `${user} ${meta.verb}`;
    case "backup_restore":
      return `${user} ${meta.verb}`;
    case "export":
      return `${user} ${meta.verb} ${entityLabel(entry.entity_type)}: ${entity}`;
    default:
      return `${user} ${meta.verb} ${entityLabel(entry.entity_type)}: ${entity}`;
  }
}

export function ActivityLogSheet({ open, onOpenChange }: Props) {
  const { can } = useActiveUser();
  const canView = can("user:view");

  const q = useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      const res = await fetch("/api/activity-log?limit=100", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body && typeof body === "object" && "error" in body && (body.error as string)) ||
            `Gagal memuat aktivitas (${res.status})`,
        );
      }
      const data = (await res.json()) as { data: ActivityLogEntry[] };
      return data.data;
    },
    enabled: open && canView,
  });

  const entries = q.data ?? [];

  const groupedByDay = useMemo(() => {
    const groups: { label: string; items: ActivityLogEntry[] }[] = [];
    let lastLabel = "";
    for (const e of entries) {
      const date = new Date(e.created_at);
      const label = isNaN(date.getTime())
        ? "Tanpa tanggal"
        : date.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
      if (label !== lastLabel) {
        groups.push({ label, items: [e] });
        lastLabel = label;
      } else {
        groups[groups.length - 1].items.push(e);
      }
    }
    return groups;
  }, [entries]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b gap-2">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-primary" />
              Riwayat Aktivitas
            </SheetTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] gap-1"
              onClick={() => {
                void q.refetch().then((r) => {
                  if (r.isError) {
                    toast.error(`Gagal memuat: ${(r.error as Error).message}`);
                  } else {
                    toast.success("Daftar aktivitas diperbarui.");
                  }
                });
              }}
              disabled={q.isFetching}
            >
              {q.isFetching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>
          <SheetDescription className="text-xs">
            Catatan 100 aktivitas terakhir (tambah, ubah, hapus, login, export,
            dll).
          </SheetDescription>
        </SheetHeader>

        <div className="tarombo-scroll flex-1 min-h-0 overflow-y-auto">
          {q.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat…
            </div>
          ) : q.isError ? (
            <div className="px-5 py-8 text-center text-xs text-destructive">
              Gagal memuat: {(q.error as Error).message}
            </div>
          ) : entries.length === 0 ? (
            <div className="grid place-items-center py-12 px-5 text-center">
              <History className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Belum ada aktivitas tercatat.
              </p>
            </div>
          ) : (
            <div className="px-3 py-3 space-y-4">
              {groupedByDay.map((g, gi) => (
                <div key={gi} className="space-y-1.5">
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.label}
                  </p>
                  <div className="space-y-1">
                    {g.items.map((e) => {
                      const meta = ACTION_META[e.action] ?? DEFAULT_META;
                      const Icon = meta.icon;
                      const desc = describe(e);
                      let detailsStr: string | null = null;
                      if (e.details) {
                        try {
                          const parsed = JSON.parse(e.details) as unknown;
                          const compact = JSON.stringify(parsed);
                          if (compact && compact !== "{}" && compact !== "null") {
                            detailsStr =
                              compact.length > 140
                                ? compact.slice(0, 140) + "…"
                                : compact;
                          }
                        } catch {
                          detailsStr = null;
                        }
                      }
                      return (
                        <div
                          key={e.id}
                          className="flex items-start gap-2.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-2 hover:bg-accent/30 transition-colors"
                        >
                          <div
                            className={cn(
                              "grid size-7 place-items-center rounded-full shrink-0 mt-0.5",
                              meta.tint,
                            )}
                          >
                            <Icon className="size-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] leading-tight">
                              {desc}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 h-4 font-medium uppercase tracking-wide"
                              >
                                {e.action}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {relativeTime(e.created_at)}
                              </span>
                            </div>
                            {detailsStr && (
                              <p className="text-[10px] text-muted-foreground/80 mt-1 truncate font-mono">
                                {detailsStr}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
