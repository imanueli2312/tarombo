"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { D3Tree } from "@/components/family-tree/d3-tree";
import { PersonDialog } from "@/components/family-tree/person-dialog";
import { SpouseDialog } from "@/components/family-tree/spouse-dialog";
import { ExportDialog } from "@/components/family-tree/export-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Plus, ZoomIn, ZoomOut, Maximize2, UserPlus, Heart, Loader2, TreePine, Search } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import type { Person, Spouse } from "@/lib/types";
import type { TreeData, TreeNode } from "@/lib/types-tree";

interface FamilyTreeViewProps {
  canEdit: boolean;
  canExport: boolean;
}

export function FamilyTreeView({ canEdit, canExport }: FamilyTreeViewProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TreeNode | Person | null>(null);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [spouseDialogOpen, setSpouseDialogOpen] = useState(false);
  const [editingSpouse, setEditingSpouse] = useState<Spouse | null>(null);
  const [defaultHusband, setDefaultHusband] = useState<string | undefined>();
  const [defaultWife, setDefaultWife] = useState<string | undefined>();
  const [exportOpen, setExportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);
  const [treeDims, setTreeDims] = useState({ width: 800, height: 600 });
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tree");
      if (!res.ok) throw new Error(t("tree.loadFailed"));
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      toast.error(e?.message || t("tree.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSelect(personId: string) {
    if (!data) return;
    const person = data.persons.find((p) => p.id === personId) || null;
    if (person) {
      const node = findNode(data.roots, personId);
      setSelected(node ?? person);
      setPersonDialogOpen(true);
    }
  }

  function findNode(roots: TreeNode[], id: string): TreeNode | null {
    for (const r of roots) {
      if (r.id === id) return r;
      if (r.spouse?.id === id) return r.spouse as TreeNode;
      const found = findNode(r.children, id);
      if (found) return found;
    }
    return null;
  }

  function handleAddPerson() {
    setSelected(null);
    setPersonDialogOpen(true);
  }

  function handleAddSpouse() {
    setEditingSpouse(null);
    setDefaultHusband(undefined);
    setDefaultWife(undefined);
    setSpouseDialogOpen(true);
  }

  function zoomBy(factor: number) {
    const svg = svgEl;
    if (!svg) return;
    const event = new WheelEvent("wheel", { deltaY: factor, bubbles: true });
    svg.dispatchEvent(event);
  }

  function fitView() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("resize"));
    }
  }

  // Search matches for the dropdown
  const searchMatches = (() => {
    if (!search || !data) return [];
    const q = search.toLowerCase();
    return data.persons
      .filter((p) => p.name.toLowerCase().includes(q) || (p.nickname?.toLowerCase().includes(q)))
      .slice(0, 8);
  })();

  function focusOnPerson(personId: string) {
    setFocusPersonId(personId);
    setSelected(data.persons.find((p) => p.id === personId) ?? null);
    setSearch("");
  }

  const totalPeople = data?.persons.length ?? 0;
  const totalGenerations = data?.persons.reduce((m, p) => Math.max(m, p.generation), 0) ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-card/60 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <TreePine className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t("tree.title")}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t("tree.stats", { people: totalPeople, generations: totalGenerations })}
          </span>
        </div>

        <div className="relative ml-auto hidden sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("tree.searchPlaceholder")}
            className="h-8 w-44 rounded-md border bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          {searchMatches.length > 0 && (
            <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border bg-popover shadow-soft-lg">
              {searchMatches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => focusOnPerson(p.id)}
                  className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
                >
                  <span
                    className="h-6 w-1 rounded-full"
                    style={{ background: p.gender === "male" ? "oklch(0.6 0.08 200)" : "oklch(0.65 0.12 25)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    {p.nickname && <div className="truncate text-xs text-muted-foreground">"{p.nickname}"</div>}
                  </div>
                  <span className="text-xs text-muted-foreground">Gen {p.generation}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title={t("tree.zoomOut")} onClick={() => zoomBy(100)}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title={t("tree.zoomIn")} onClick={() => zoomBy(-100)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title={t("tree.fitScreen")} onClick={fitView}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {canExport && (
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            {t("tree.export")}
          </Button>
        )}

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {t("tree.add")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("tree.newRecord")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAddPerson}>
                <UserPlus className="mr-2 h-4 w-4" /> {t("tree.person")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddSpouse}>
                <Heart className="mr-2 h-4 w-4" /> {t("tree.marriage")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* tree canvas */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && data && data.roots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TreePine className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p>{t("tree.empty")}</p>
              {canEdit && (
                <Button className="mt-3" size="sm" onClick={handleAddPerson}>
                  <Plus className="mr-2 h-4 w-4" /> {t("tree.addFirstAncestor")}
                </Button>
              )}
            </div>
          </div>
        )}
        {data && data.roots.length > 0 && (
          <D3Tree
            data={data}
            selectedId={selected?.id}
            focusPersonId={focusPersonId}
            onSelect={handleSelect}
            onReady={(svg, w, h) => {
              setSvgEl(svg);
              setTreeDims({ width: w, height: h });
            }}
          />
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-card/60 px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-1 rounded" style={{ background: "oklch(0.6 0.08 200)" }} />
          {t("tree.legendMale")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-1 rounded" style={{ background: "oklch(0.65 0.12 25)" }} />
          {t("tree.legendFemale")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border bg-[oklch(0.96_0.008_70)]" />
          {t("tree.legendDeceased")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: "oklch(0.65 0.05 60)" }} />
          {t("tree.legendMarriage")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: "oklch(0.65 0.05 60)" }} />
          {t("tree.legendInactive")}
        </span>
        <span className="ml-auto hidden md:inline">{t("tree.legendHint")}</span>
      </div>

      {/* dialogs */}
      <PersonDialog
        open={personDialogOpen}
        onOpenChange={setPersonDialogOpen}
        person={selected}
        allPersons={data?.persons ?? []}
        canEdit={canEdit}
        onSaved={load}
        onDeleted={load}
      />
      <SpouseDialog
        open={spouseDialogOpen}
        onOpenChange={setSpouseDialogOpen}
        spouse={editingSpouse}
        allPersons={data?.persons ?? []}
        defaultHusbandId={defaultHusband}
        defaultWifeId={defaultWife}
        onSaved={load}
        onDeleted={load}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        svg={svgEl}
        width={treeDims.width}
        height={treeDims.height}
      />
    </div>
  );
}
