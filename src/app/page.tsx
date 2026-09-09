"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/tarombo/app-header";
import { StatsCards } from "@/components/tarombo/stats-cards";
import { FamilyTree } from "@/components/tarombo/family-tree";
import { PersonSearchList } from "@/components/tarombo/person-search-list";
import { PersonDetailPanel } from "@/components/tarombo/person-detail-panel";
import { PersonFormSheet } from "@/components/tarombo/person-form-sheet";
import { PartnershipFormDialog } from "@/components/tarombo/partnership-form-dialog";
import { ConfirmDialog } from "@/components/tarombo/confirm-dialog";
import { EmptyState } from "@/components/tarombo/empty-state";
import { UserManagementSheet } from "@/components/tarombo/user-management-sheet";
import { ExportDialog } from "@/components/tarombo/export-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  deletePerson,
  fetchPersons,
  fetchStats,
  fetchTree,
  resetAllData,
  seedSampleData,
} from "@/lib/tarombo/api-client";
import type { PersonInput, TreeNodePerson } from "@/lib/tarombo/types";
import { toast } from "sonner";
import { TreePine, List, Info, Heart } from "lucide-react";

export default function Home() {
  const qc = useQueryClient();

  // ----- state UI -----
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rootFilterId, setRootFilterId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"list" | "detail">("list");

  // dialog person
  const [personSheetOpen, setPersonSheetOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<TreeNodePerson | null>(null);
  const [personDefaults, setPersonDefaults] = useState<
    (Partial<PersonInput> & { labelHint?: string }) | null
  >(null);

  // dialog partnership
  const [partnershipOpen, setPartnershipOpen] = useState(false);
  const [presetPersonId, setPresetPersonId] = useState<string | null>(null);
  const [presetRole, setPresetRole] = useState<"husband" | "wife" | null>(null);

  // dialog delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  // dialog user management & export
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // ----- data -----
  const statsQ = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const personsQ = useQuery({
    queryKey: ["persons"],
    queryFn: () => fetchPersons(),
  });
  const treeQ = useQuery({
    queryKey: ["tree", rootFilterId],
    queryFn: () => fetchTree(rootFilterId ?? undefined),
  });

  const trees = treeQ.data?.trees ?? [];
  const allPersons = personsQ.data ?? [];

  // ----- mutations -----
  const seedMut = useMutation({
    mutationFn: seedSampleData,
    onSuccess: async (d) => {
      toast.success(d.message);
      await qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const resetMut = useMutation({
    mutationFn: resetAllData,
    onSuccess: async () => {
      toast.success("Semua data berhasil dihapus.");
      setSelectedId(null);
      setRootFilterId(null);
      await qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: async () => {
      toast.success("Orang berhasil dihapus.");
      setSelectedId(null);
      await qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleInvalidate = async () => {
    await qc.invalidateQueries();
  };

  // ----- handlers -----
  const openAddPerson = () => {
    setEditPerson(null);
    setPersonDefaults(null);
    setPersonSheetOpen(true);
  };

  const openEdit = (id: string) => {
    const person = allPersons.find((p) => p.id === id);
    setEditPerson(person ?? null);
    setPersonDefaults(null);
    setPersonSheetOpen(true);
  };

  const openAddChild = (parentId: string) => {
    const parent = allPersons.find((p) => p.id === parentId);
    if (!parent) return;
    const isMale = parent.gender === "MALE";
    const childGen =
      parent.generationNumber != null ? parent.generationNumber + 1 : null;
    setEditPerson(null);
    setPersonDefaults({
      fatherId: isMale ? parentId : null,
      motherId: isMale ? null : parentId,
      generationNumber: childGen,
      maritalStatus: "SINGLE",
      labelHint: `Menambahkan anak dari ${parent.fullName}.`,
    });
    setPersonSheetOpen(true);
  };

  const openAddPartner = (id?: string) => {
    const person = id ? allPersons.find((p) => p.id === id) : null;
    if (person) {
      setPresetPersonId(person.id);
      setPresetRole(person.gender === "MALE" ? "husband" : "wife");
    } else {
      setPresetPersonId(null);
      setPresetRole(null);
    }
    setPartnershipOpen(true);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSidebarTab("detail");
  };

  const handleJumpToTree = (id: string) => {
    // Lompat ke pohon yang memuat orang ini.
    // Bila orang ini bukan root, set rootFilter ke root leluhur-nya.
    setSelectedId(id);
    setSidebarTab("detail");
    setRootFilterId(null); // tampilkan semua root; pohon lengkap
    // scroll ke atas
    requestAnimationFrame(() => {
      document
        .getElementById("tree-area")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const isEmpty = allPersons.length === 0;

  const selectedPerson = useMemo(
    () => allPersons.find((p) => p.id === selectedId) ?? null,
    [allPersons, selectedId],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader
        totalPersons={allPersons.length}
        onAddPerson={openAddPerson}
        onAddPartnership={() => openAddPartner()}
        onSeed={() => seedMut.mutate()}
        onReset={() => setResetOpen(true)}
        onExport={() => setExportOpen(true)}
        onManageUsers={() => setUserSheetOpen(true)}
      />

      <main className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
        {/* ===== KIRI: Tree area ===== */}
        <section className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {/* Stat strip */}
          <div className="border-b border-border/60 bg-card/40 px-3 py-2 sm:px-5 sm:py-3 shrink-0">
            <StatsCards stats={statsQ.data} isLoading={statsQ.isLoading} />
          </div>

          {/* Root filter bar */}
          {!isEmpty && trees.length > 0 && (
            <div className="no-print flex items-center gap-2 border-b border-border/60 bg-background/60 px-3 py-1.5 sm:px-5 overflow-x-auto shrink-0">
              <TreePine className="size-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                Leluhur:
              </span>
              <Button
                size="sm"
                variant={rootFilterId === null ? "secondary" : "ghost"}
                className="h-6 px-2 text-[11px]"
                onClick={() => setRootFilterId(null)}
              >
                Semua ({trees.length})
              </Button>
              {treeQ.data?.roots.map((r) => (
                <Button
                  key={r.id}
                  size="sm"
                  variant={rootFilterId === r.id ? "secondary" : "ghost"}
                  className="h-6 px-2 text-[11px] whitespace-nowrap"
                  onClick={() => setRootFilterId(r.id)}
                >
                  {r.fullName}
                </Button>
              ))}
            </div>
          )}

          {/* Tree */}
          <div id="tree-area" className="relative flex-1 min-h-0 overflow-hidden">
            {isEmpty ? (
              <EmptyState
                onSeed={() => seedMut.mutate()}
                onAddPerson={openAddPerson}
              />
            ) : trees.length === 0 ? (
              <div className="grid h-full place-items-center p-8 text-center">
                <div>
                  <TreePine className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Tidak ada leluhur (orang tanpa ayah &amp; ibu) ditemukan.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setRootFilterId(null)}
                  >
                    Tampilkan semua
                  </Button>
                </div>
              </div>
            ) : (
              <FamilyTree
                trees={trees}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            )}
          </div>
        </section>

        {/* ===== KANAN: Sidebar ===== */}
        <aside className="flex w-full min-h-0 flex-col border-t border-border/60 bg-card/40 lg:w-[360px] lg:shrink-0 lg:border-l lg:border-t-0">
          <Tabs
            value={sidebarTab}
            onValueChange={(v) => setSidebarTab(v as "list" | "detail")}
            className="flex h-full min-h-0 flex-col"
          >
            <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5 shrink-0">
              <TabsList className="h-8">
                <TabsTrigger value="list" className="text-xs gap-1.5">
                  <List className="size-3.5" />
                  Daftar
                </TabsTrigger>
                <TabsTrigger value="detail" className="text-xs gap-1.5">
                  <Info className="size-3.5" />
                  Detail
                  {selectedPerson && (
                    <span className="ml-1 inline-block size-1.5 rounded-full bg-primary" />
                  )}
                </TabsTrigger>
              </TabsList>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] gap-1"
                  onClick={() => openAddPartner()}
                  disabled={allPersons.length < 2}
                  title="Tambah pasangan"
                >
                  <Heart className="size-3.5" />
                  Pasangan
                </Button>
              </div>
            </div>

            <TabsContent value="list" className="flex-1 min-h-0 overflow-hidden m-0 mt-0 p-2">
              <PersonSearchList
                persons={allPersons}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  setSidebarTab("detail");
                }}
                onJumpToTree={handleJumpToTree}
              />
            </TabsContent>

            <TabsContent value="detail" className="flex-1 min-h-0 overflow-hidden m-0 mt-0 p-0">
              <PersonDetailPanel
                personId={selectedId}
                onEdit={openEdit}
                onAddPartner={(id) => openAddPartner(id)}
                onAddChild={openAddChild}
                onDelete={(id) => setDeleteTarget(id)}
                onJumpToTree={handleJumpToTree}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </main>

      <footer className="no-print mt-auto border-t border-border/60 bg-card/60 px-4 py-2.5 text-center text-[11px] text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Tarombo</span> —
          Sistem Silsilah Keluarga Batak. Dibangun dengan Next.js, Prisma &amp;
          Tailwind CSS.
        </p>
      </footer>

      {/* ===== Dialogs ===== */}
      <PersonFormSheet
        open={personSheetOpen}
        onOpenChange={setPersonSheetOpen}
        editPerson={editPerson}
        defaults={personDefaults ?? undefined}
        onSaved={handleInvalidate}
      />

      <PartnershipFormDialog
        open={partnershipOpen}
        onOpenChange={setPartnershipOpen}
        presetPersonId={presetPersonId}
        presetRole={presetRole}
        onSaved={handleInvalidate}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus orang ini?"
        description="Orang ini akan dihapus permanen dari silsilah. Anak-anak yang berelasi dengannya akan kehilangan rujukan ayah/ibu (menjadi tanpa orang tua). Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        destructive
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset semua data?"
        description="Seluruh data pengguna, orang, dan pasangan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmText="Reset Sekarang"
        destructive
        onConfirm={() => resetMut.mutate()}
      />

      <UserManagementSheet
        open={userSheetOpen}
        onOpenChange={setUserSheetOpen}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        currentRootId={rootFilterId}
        currentRootName={
          rootFilterId
            ? treeQ.data?.roots.find((r) => r.id === rootFilterId)?.fullName ??
              null
            : null
        }
      />
    </div>
  );
}
