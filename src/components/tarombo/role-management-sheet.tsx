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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "./confirm-dialog";
import {
  createRole,
  deleteRole,
  fetchRoles,
  updateRole,
} from "@/lib/tarombo/api-client";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  permissionDescription,
  permissionGroup,
  permissionLabel,
} from "@/lib/tarombo/permissions";
import type { RolePublic } from "@/lib/tarombo/types";
import { useActiveUser } from "@/lib/tarombo/use-permissions";
import { toast } from "sonner";
import { KeyRound, Plus, Save, Shield, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Swatch warna standar tema hangat Tarombo. */
const COLOR_SWATCHES = [
  "#7a1f1f", // marun
  "#d97706", // amber
  "#059669", // emerald
  "#e11d48", // rose
  "#78716c", // stone
];

/** Cek apakah draft berbeda dari data role di server (dirty check).
 *  Permission dibandingkan sebagai set (urutan tidak mempengaruhi dirty). */
function isDirty(original: RolePublic, draft: RolePublic): boolean {
  if (draft.name !== original.name) return true;
  if ((draft.description ?? "") !== (original.description ?? "")) return true;
  if (draft.color !== original.color) return true;
  if (draft.permissions.length !== original.permissions.length) return true;
  const originalSet = new Set(original.permissions);
  for (const k of draft.permissions) {
    if (!originalSet.has(k)) return true;
  }
  return false;
}

export function RoleManagementSheet({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { can } = useActiveUser();
  const canManage = can("role:manage");

  const rolesQ = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    enabled: open,
  });

  const roles = rolesQ.data?.roles ?? [];

  // selectedId null = belum ada klik user → fallback ke role pertama via derived.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Map draft per-role.id (menyimpan perubahan yang belum disimpan).
  const [edits, setEdits] = useState<Record<string, RolePublic>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Effective selected id — falls back to first role if selection invalid.
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && roles.some((r) => r.id === selectedId)) {
      return selectedId;
    }
    return roles[0]?.id ?? null;
  }, [selectedId, roles]);

  const selected = useMemo(
    () => roles.find((r) => r.id === effectiveSelectedId) ?? null,
    [roles, effectiveSelectedId],
  );

  // Draft = pending edits jika ada, kalau tidak derive salinan baru dari selected.
  const draft = useMemo<RolePublic | null>(() => {
    if (!selected) return null;
    if (edits[selected.id]) return edits[selected.id];
    return { ...selected, permissions: [...selected.permissions] };
  }, [selected, edits]);

  const dirty =
    selected && edits[selected.id]
      ? isDirty(selected, edits[selected.id] as RolePublic)
      : false;

  /** Update draft untuk role yang sedang dipilih. */
  const setDraft = (updater: (prev: RolePublic) => RolePublic) => {
    if (!selected) return;
    setEdits((prev) => {
      const current: RolePublic =
        prev[selected.id] ?? {
          ...selected,
          permissions: [...selected.permissions],
        };
      return { ...prev, [selected.id]: updater(current) };
    });
  };

  // ---- Mutations ----
  const createMut = useMutation({
    mutationFn: () =>
      createRole({
        name: "Role Baru",
        description: "",
        color: COLOR_SWATCHES[0],
        permissions: [],
        sortOrder: roles.length,
      }),
    onSuccess: async (created) => {
      toast.success("Role baru ditambahkan.");
      await qc.invalidateQueries({ queryKey: ["roles"] });
      setSelectedId(created.id);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateMut = useMutation({
    mutationFn: (input: {
      id: string;
      data: {
        name?: string;
        description?: string | null;
        color?: string;
        permissions?: string[];
      };
    }) => updateRole(input.id, input.data),
    onSuccess: async (updated) => {
      // Bersihkan pending edits karena server sudah punya data terbaru.
      setEdits((prev) => {
        const next = { ...prev };
        delete next[updated.id];
        return next;
      });
      toast.success("Perubahan role disimpan.");
      await qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation<void, Error, string>({
    mutationFn: (id) => deleteRole(id),
    onSuccess: async (_data, id) => {
      setEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Role dihapus.");
      setDeleteTarget(null);
      if (selectedId === id) setSelectedId(null);
      await qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // ---- Handlers ----
  const handleSave = () => {
    if (!draft || !selected) return;
    if (!draft.name.trim()) {
      toast.error("Nama role tidak boleh kosong.");
      return;
    }
    updateMut.mutate({
      id: draft.id,
      data: {
        name: draft.name,
        description: draft.description ?? "",
        color: draft.color,
        permissions: draft.permissions,
      },
    });
  };

  const togglePermission = (key: string, enabled: boolean) => {
    setDraft((prev) => {
      if (enabled) {
        if (prev.permissions.includes(key)) return prev;
        return { ...prev, permissions: [...prev.permissions, key] };
      }
      return {
        ...prev,
        permissions: prev.permissions.filter((p) => p !== key),
      };
    });
  };

  // Swatch: 5 warna standar + warna saat ini (dedupe).
  const swatches = Array.from(
    new Set([...COLOR_SWATCHES, ...(draft ? [draft.color] : [])]),
  );

  const canDelete =
    !!draft && !draft.isSystem && draft.userCount === 0 && canManage;

  const isLoading = rolesQ.isLoading;
  const isEmpty = !isLoading && roles.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-primary" />
            Kelola Role &amp; Permission
          </SheetTitle>
          <SheetDescription className="text-xs">
            Admin dapat mengustomisasi role dan menetapkan permission
            (RBAC) sesuai kebutuhan aplikasi.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 p-5 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex-1 p-5">
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Shield className="size-8 mx-auto text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium">Belum ada role</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tambahkan role pertama untuk mulai mengelola permission.
              </p>
              {canManage && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending}
                >
                  <Plus className="size-3.5 mr-1" />
                  Tambah Role
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="tarombo-scroll flex-1">
            <div className="flex gap-3 p-4">
              {/* ============== LEFT: Daftar role ============== */}
              <div className="w-[240px] shrink-0 space-y-2">
                {canManage && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => createMut.mutate()}
                    disabled={createMut.isPending}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Tambah Role
                  </Button>
                )}

                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">
                  Daftar Role ({roles.length})
                </p>

                <div className="space-y-1.5">
                  {roles.map((r) => {
                    const isActive = r.id === effectiveSelectedId;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={cn(
                          "w-full text-left rounded-md border p-2.5 transition-colors",
                          isActive
                            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                            : "hover:bg-accent/50",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="truncate text-[12px] font-medium flex-1">
                            {r.name}
                          </span>
                          {r.isSystem && (
                            <Badge className="text-[9px] h-[15px] px-1 bg-amber-500/15 text-amber-700 border-amber-500/30">
                              Sistem
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <KeyRound className="size-2.5" />
                            {r.permissions.length} permission
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Users className="size-2.5" />
                            {r.userCount} user
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ============== RIGHT: Editor ============== */}
              <div className="flex-1 min-w-0">
                {!draft ? (
                  <div className="rounded-md border border-dashed p-10 text-center text-xs text-muted-foreground">
                    Pilih role di sebelah kiri untuk mengelola permission.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Header: nama, deskripsi, color picker, save */}
                    <Card className="gap-0 p-3">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full shrink-0"
                            style={{ backgroundColor: draft.color }}
                          />
                          {draft.isSystem || !canManage ? (
                            <p className="text-sm font-semibold flex-1 truncate">
                              {draft.name}
                            </p>
                          ) : (
                            <Input
                              value={draft.name}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="h-8 text-sm font-semibold"
                              placeholder="Nama role"
                            />
                          )}
                          {draft.isSystem && (
                            <Badge className="text-[9px] h-[15px] px-1 bg-amber-500/15 text-amber-700 border-amber-500/30">
                              Sistem
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Deskripsi
                          </Label>
                          {canManage ? (
                            <Input
                              value={draft.description ?? ""}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  description: e.target.value || null,
                                }))
                              }
                              placeholder="Deskripsi singkat role…"
                              className="h-8 text-[12px]"
                            />
                          ) : (
                            <p className="text-[12px] text-muted-foreground">
                              {draft.description || "—"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Warna
                          </Label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {swatches.map((c) => {
                              const isSel =
                                draft.color.toLowerCase() === c.toLowerCase();
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  disabled={!canManage}
                                  onClick={() =>
                                    setDraft((prev) => ({ ...prev, color: c }))
                                  }
                                  className={cn(
                                    "size-5 rounded-full border transition-all",
                                    isSel
                                      ? "ring-2 ring-offset-1 ring-primary"
                                      : "border-border hover:scale-110",
                                    !canManage &&
                                      "cursor-not-allowed opacity-60",
                                  )}
                                  style={{ backgroundColor: c }}
                                  aria-label={`Pilih warna ${c}`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {canManage && dirty && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={handleSave}
                            disabled={updateMut.isPending}
                          >
                            <Save className="size-3.5 mr-1" />
                            Simpan Perubahan
                          </Button>
                        )}
                      </div>
                    </Card>

                    {/* Matriks permission */}
                    <Card className="gap-0 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                          Matriks Permission
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[9.5px] h-[16px] px-1.5"
                        >
                          {draft.permissions.length}/{PERMISSIONS.length}
                        </Badge>
                      </div>

                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-3 pr-2">
                          {PERMISSION_GROUPS.map((group) => {
                            const perms = PERMISSIONS.filter(
                              (p) => permissionGroup(p.key) === group,
                            );
                            const granted = draft.permissions.filter(
                              (p) => permissionGroup(p) === group,
                            ).length;
                            return (
                              <div key={group} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] font-semibold text-foreground/80">
                                    {group}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground">
                                    {granted}/{perms.length}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {perms.map((p) => {
                                    const enabled =
                                      draft.permissions.includes(p.key);
                                    return (
                                      <Tooltip key={p.key}>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={cn(
                                              "flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors",
                                              enabled
                                                ? "border-primary/30 bg-primary/5"
                                                : "border-border hover:bg-accent/40",
                                              !canManage && "opacity-70",
                                            )}
                                          >
                                            <Switch
                                              checked={enabled}
                                              disabled={!canManage}
                                              onCheckedChange={(v) =>
                                                togglePermission(p.key, v)
                                              }
                                            />
                                            <div className="min-w-0 flex-1">
                                              <p className="text-[11.5px] font-medium leading-tight">
                                                {permissionLabel(p.key)}
                                              </p>
                                            </div>
                                            <code className="text-[9px] text-muted-foreground/70 font-mono shrink-0">
                                              {p.key}
                                            </code>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="left"
                                          className="max-w-xs"
                                        >
                                          <p className="font-medium text-[11px]">
                                            {permissionLabel(p.key)}
                                          </p>
                                          <p className="text-[10px] opacity-90 mt-0.5">
                                            {permissionDescription(p.key)}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </Card>

                    {/* Footer kanan: delete + hint */}
                    {canManage && (
                      <div className="space-y-1">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive hover:bg-destructive/5"
                            disabled={
                              !canDelete ||
                              deleteMut.isPending ||
                              draft.isSystem ||
                              draft.userCount > 0
                            }
                            onClick={() => setDeleteTarget(draft.id)}
                          >
                            <Trash2 className="size-3.5 mr-1" />
                            Hapus Role
                          </Button>
                        </div>
                        <Separator />
                        {draft.isSystem ? (
                          <p className="text-[10px] text-muted-foreground text-right">
                            Role sistem tidak dapat dihapus.
                          </p>
                        ) : draft.userCount > 0 ? (
                          <p className="text-[10px] text-muted-foreground text-right">
                            Role sedang digunakan {draft.userCount} user —
                            tidak dapat dihapus.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        <SheetFooter className="border-t px-5 py-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Tutup
          </Button>
        </SheetFooter>
      </SheetContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus role ini?"
        description="Role akan dihapus permanen. Pastikan tidak ada user yang masih menggunakan role ini sebelum menghapus."
        confirmText="Hapus"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget);
        }}
      />
    </Sheet>
  );
}
