"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Trash2, RotateCcw, History, Heart, User } from "lucide-react";
import { toast } from "sonner";
import { useActiveUser } from "@/lib/tarombo/use-permissions";
import { formatDateShort, type TreeNodePerson, type TreePartnership } from "@/lib/tarombo/types";
import { ConfirmDialog } from "./confirm-dialog";
import { cn } from "@/lib/utils";

interface TrashData {
  persons: TreeNodePerson[];
  partnerships: TreePartnership[];
}

/** Trash row (server still returns deleted_at & updated_at di raw, tapi kita
 *  andalkan struktur TreeNodePerson + field deleted_at). */
interface TrashPerson extends TreeNodePerson {
  deletedAt?: string | null;
}
interface TrashPartnership extends TreePartnership {
  deletedAt?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchTrash(): Promise<TrashData> {
  const res = await fetch("/api/trash?type=all", { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body && typeof body === "object" && "error" in body && (body.error as string)) ||
        `Gagal memuat trash (${res.status})`,
    );
  }
  const data = (await res.json()) as { data: TrashData };
  return data.data;
}

async function restoreItem(id: string, type: "person" | "partnership") {
  const res = await fetch(`/api/trash/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body && typeof body === "object" && "error" in body && (body.error as string)) ||
        `Gagal memulihkan (${res.status})`,
    );
  }
  return res.json();
}

async function permanentDeleteItem(id: string, type: "person" | "partnership") {
  const res = await fetch(`/api/trash/${id}/permanent`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body && typeof body === "object" && "error" in body && (body.error as string)) ||
        `Gagal menghapus permanen (${res.status})`,
    );
  }
  return res.json();
}

async function emptyTrash() {
  const res = await fetch("/api/trash", { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body && typeof body === "object" && "error" in body && (body.error as string)) ||
        `Gagal mengosongkan trash (${res.status})`,
    );
  }
  return res.json();
}

function deletedAtOf(row: unknown): string | null {
  if (row && typeof row === "object") {
    const r = row as Record<string, unknown>;
    const v = r["deletedAt"] ?? r["deleted_at"];
    return typeof v === "string" ? v : null;
  }
  return null;
}

export function TrashSheet({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { can } = useActiveUser();
  const canDelete = can("person:delete");

  const q = useQuery({
    queryKey: ["trash"],
    queryFn: fetchTrash,
    enabled: open && canDelete,
  });

  const persons = (q.data?.persons ?? []) as TrashPerson[];
  const partnerships = (q.data?.partnerships ?? []) as TrashPartnership[];

  const [activeTab, setActiveTab] = useState<"persons" | "partnerships">("persons");
  const [confirmRestore, setConfirmRestore] = useState<
    | { id: string; type: "person" | "partnership"; label: string }
    | null
  >(null);
  const [confirmPermanent, setConfirmPermanent] = useState<
    | { id: string; type: "person" | "partnership"; label: string }
    | null
  >(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const restoreMut = useMutation({
    mutationFn: (vars: { id: string; type: "person" | "partnership" }) =>
      restoreItem(vars.id, vars.type),
    onSuccess: async (_d, vars) => {
      toast.success(
        vars.type === "person" ? "Orang dipulihkan." : "Pasangan dipulihkan.",
      );
      await qc.invalidateQueries({ queryKey: ["trash"] });
      await qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const permanentMut = useMutation({
    mutationFn: (vars: { id: string; type: "person" | "partnership" }) =>
      permanentDeleteItem(vars.id, vars.type),
    onSuccess: async (_d, vars) => {
      toast.success(
        vars.type === "person"
          ? "Orang dihapus permanen."
          : "Pasangan dihapus permanen.",
      );
      await qc.invalidateQueries({ queryKey: ["trash"] });
      await qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const emptyMut = useMutation({
    mutationFn: emptyTrash,
    onSuccess: async () => {
      toast.success("Trash dikosongkan.");
      await qc.invalidateQueries({ queryKey: ["trash"] });
      await qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const total = persons.length + partnerships.length;

  const personRows = useMemo(
    () =>
      persons
        .map((p) => ({
          id: p.id,
          name: p.fullName,
          subtitle: p.nickname ?? null,
          deletedAt: deletedAtOf(p),
        }))
        .sort((a, b) => (a.deletedAt ?? "").localeCompare(b.deletedAt ?? "")),
    [persons],
  );

  const partnershipRows = useMemo(
    () =>
      partnerships
        .map((p) => ({
          id: p.id,
          name:
            [p.husband?.fullName, p.wife?.fullName]
              .filter(Boolean)
              .join(" ❤ ") || "Pasangan",
          subtitle: null,
          deletedAt: deletedAtOf(p),
        }))
        .sort((a, b) => (a.deletedAt ?? "").localeCompare(b.deletedAt ?? "")),
    [partnerships],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b gap-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Trash2 className="size-4 text-primary" />
            Tempat Sampah
          </SheetTitle>
          <SheetDescription className="text-xs">
            Item yang dihapus akan masuk ke sini. Bisa dipulihkan atau dihapus
            permanen.
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
          ) : total === 0 ? (
            <div className="grid place-items-center py-12 px-5 text-center">
              <History className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Tempat sampah kosong.
              </p>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as "persons" | "partnerships")
              }
              className="flex h-full min-h-0 flex-col"
            >
              <div className="px-3 pt-3">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="persons" className="text-xs gap-1.5">
                    <User className="size-3.5" />
                    Orang
                    <Badge
                      variant="secondary"
                      className="ml-1 h-4 px-1 text-[9px]"
                    >
                      {persons.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="partnerships" className="text-xs gap-1.5">
                    <Heart className="size-3.5" />
                    Pasangan
                    <Badge
                      variant="secondary"
                      className="ml-1 h-4 px-1 text-[9px]"
                    >
                      {partnerships.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="persons"
                className="flex-1 min-h-0 overflow-hidden m-0 mt-0 p-3"
              >
                {personRows.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">
                    Tidak ada orang di trash.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {personRows.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-md border border-border/60 bg-card/60 px-3 py-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                            <User className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-medium leading-tight truncate">
                              {p.name}
                            </p>
                            {p.subtitle && (
                              <p className="text-[10.5px] text-muted-foreground truncate">
                                “{p.subtitle}”
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Dihapus: {formatDateShort(p.deletedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 flex-1"
                            onClick={() =>
                              setConfirmRestore({
                                id: p.id,
                                type: "person",
                                label: p.name,
                              })
                            }
                          >
                            <RotateCcw className="size-3.5" />
                            Pulihkan
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setConfirmPermanent({
                                id: p.id,
                                type: "person",
                                label: p.name,
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                            Hapus Permanen
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent
                value="partnerships"
                className="flex-1 min-h-0 overflow-hidden m-0 mt-0 p-3"
              >
                {partnershipRows.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">
                    Tidak ada pasangan di trash.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {partnershipRows.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-md border border-border/60 bg-card/60 px-3 py-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="grid size-8 place-items-center rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 shrink-0">
                            <Heart className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-medium leading-tight truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Dihapus: {formatDateShort(p.deletedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 flex-1"
                            onClick={() =>
                              setConfirmRestore({
                                id: p.id,
                                type: "partnership",
                                label: p.name,
                              })
                            }
                          >
                            <RotateCcw className="size-3.5" />
                            Pulihkan
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setConfirmPermanent({
                                id: p.id,
                                type: "partnership",
                                label: p.name,
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                            Hapus Permanen
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {total > 0 && (
          <SheetFooter className="border-t px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30",
              )}
              onClick={() => setConfirmEmpty(true)}
              disabled={emptyMut.isPending}
            >
              {emptyMut.isPending ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="size-4 mr-1.5" />
              )}
              Kosongkan Trash ({total})
            </Button>
          </SheetFooter>
        )}
      </SheetContent>

      <ConfirmDialog
        open={!!confirmRestore}
        onOpenChange={(o) => !o && setConfirmRestore(null)}
        title="Pulihkan item ini?"
        description={`“${confirmRestore?.label ?? ""}” akan dikembalikan ke daftar aktif.`}
        confirmText="Pulihkan"
        onConfirm={() => {
          if (!confirmRestore) return;
          return restoreMut.mutateAsync(confirmRestore);
        }}
      />

      <ConfirmDialog
        open={!!confirmPermanent}
        onOpenChange={(o) => !o && setConfirmPermanent(null)}
        title="Hapus permanen?"
        description={`“${confirmPermanent?.label ?? ""}” akan dihapus permanen dan tidak dapat dipulihkan.`}
        confirmText="Hapus Permanen"
        destructive
        onConfirm={() => {
          if (!confirmPermanent) return;
          return permanentMut.mutateAsync(confirmPermanent);
        }}
      />

      <ConfirmDialog
        open={confirmEmpty}
        onOpenChange={setConfirmEmpty}
        title="Kosongkan trash?"
        description={`Semua ${total} item di trash akan dihapus permanen dan tidak dapat dipulihkan.`}
        confirmText="Kosongkan Trash"
        destructive
        onConfirm={() => emptyMut.mutateAsync()}
      />
    </Sheet>
  );
}
