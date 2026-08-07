"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonDialog } from "@/components/family-tree/person-dialog";
import { Loader2, Network } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import type { Person } from "@/lib/types";
import type { TreeData, TreeNode } from "@/lib/types-tree";

interface FamilyChartViewProps {
  canEdit: boolean;
}

export function FamilyChartView({ canEdit }: FamilyChartViewProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TreeNode | Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tree");
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        toast.error(e?.message || t("chart.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function selectNode(id: string) {
    if (!data) return;
    const node = findNode(data.roots, id);
    const person = data.persons.find((p) => p.id === id);
    setSelected(node ?? person ?? null);
    setDialogOpen(true);
  }

  function findNode(roots: TreeNode[], id: string): TreeNode | null {
    for (const r of roots) {
      if (r.id === id) return r;
      if (r.spouse?.id === id) return r.spouse as TreeNode;
      const f = findNode(r.children, id);
      if (f) return f;
    }
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.roots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Network className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p>{t("chart.empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card/60 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t("chart.title")}</span>
          <span className="text-xs text-muted-foreground">
            {t("chart.subtitle")}
          </span>
        </div>
      </div>

      <div className="scroll-area-thin flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-4xl space-y-1">
          {data.roots.map((root) => (
            <ChartNode
              key={root.id}
              node={root}
              depth={0}
              onSelect={selectNode}
            />
          ))}
        </div>
      </div>

      <PersonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        person={selected}
        allPersons={data.persons}
        canEdit={canEdit}
        onSaved={() => {
          (async () => {
            const res = await fetch("/api/tree");
            setData(await res.json());
          })();
        }}
        onDeleted={() => {
          (async () => {
            const res = await fetch("/api/tree");
            setData(await res.json());
          })();
        }}
      />
    </div>
  );
}

function ChartNode({
  node,
  depth,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  onSelect: (id: string) => void;
}) {
  const { t } = useLanguage();
  const isMale = node.gender === "male";
  const isDeceased = !!node.date_of_death;
  const year = (d: string | null) =>
    d ? new Date(d).getFullYear() : "";

  return (
    <div style={{ paddingLeft: depth * 22 }} className="relative">
      {depth > 0 && (
        <span
          className="absolute left-0 top-0 h-full w-px bg-border"
          style={{ left: depth * 22 - 12 }}
        />
      )}
      <div className="flex items-stretch gap-2 py-1">
        <button
          onClick={() => onSelect(node.id)}
          className="group flex flex-1 items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-all hover:border-primary/40 hover:shadow-soft"
        >
          <span
            className="h-10 w-1 shrink-0 rounded-full"
            style={{
              background: isMale ? "oklch(0.6 0.08 200)" : "oklch(0.65 0.12 25)",
              opacity: isDeceased ? 0.5 : 1,
            }}
          />
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border bg-muted">
            {node.photo ? (
               
              <img src={node.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
                {node.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{node.name}</span>
              {isDeceased && <span className="text-xs text-muted-foreground">✝</span>}
              {node.nickname && (
                <span className="truncate text-xs text-muted-foreground">"{node.nickname}"</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Gen {node.generation}
              {(year(node.date_of_birth) || year(node.date_of_death)) && (
                <span>
                  {" · "}
                  {year(node.date_of_birth) || "?"} – {year(node.date_of_death) || (isDeceased ? "?" : t("chart.kini"))}
                </span>
              )}
              {node.place_of_birth && <span> · {node.place_of_birth}</span>}
            </div>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {node.children.length} {node.children.length === 1 ? t("chart.child") : t("chart.children")}
          </span>
        </button>

        {node.spouse && (
          <button
            onClick={() => onSelect(node.spouse!.id)}
            className="flex w-56 items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-2.5 text-left transition-all hover:border-primary/40"
          >
            <span
              className="h-8 w-1 shrink-0 rounded-full"
              style={{
                background: node.spouse.gender === "male" ? "oklch(0.6 0.08 200)" : "oklch(0.65 0.12 25)",
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{node.spouse.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {node.spouse_relation?.marriage_date
                  ? `m. ${new Date(node.spouse_relation.marriage_date).getFullYear()}`
                  : t("chart.spouse")}
              </div>
            </div>
          </button>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {node.children
            .slice()
            .sort((a, b) => a.birth_order - b.birth_order)
            .map((child) => (
              <ChartNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
            ))}
        </div>
      )}
    </div>
  );
}
