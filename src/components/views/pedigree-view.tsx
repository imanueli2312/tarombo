"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PersonDialog } from "@/components/family-tree/person-dialog";
import { Loader2, GitBranch, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import type { Person } from "@/lib/types";

interface AncestorPerson extends Person {
  depth: number;
}

export function PedigreeView() {
  const { t } = useLanguage();
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [ancestors, setAncestors] = useState<AncestorPerson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/persons");
        if (!res.ok) throw new Error();
        const persons: Person[] = await res.json();
        setAllPersons(persons);
      } catch {
        toast.error(t("pedigree.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  useEffect(() => {
    if (!selectedId) {
      setAncestors([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/pedigree?personId=${selectedId}`);
        if (!res.ok) throw new Error();
        setAncestors(await res.json());
      } catch {
        toast.error(t("pedigree.loadFailed"));
      }
    })();
  }, [selectedId, t]);

  const filteredPersons = useMemo(() => {
    if (!search) return allPersons.slice(0, 50);
    const q = search.toLowerCase();
    return allPersons.filter(p => p.name.toLowerCase().includes(q) || (p.nickname?.toLowerCase().includes(q))).slice(0, 50);
  }, [allPersons, search]);

  function handleSelectPerson(p: Person) {
    setSelectedPerson(p);
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="scroll-area-thin h-full overflow-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <GitBranch className="h-6 w-6 text-primary" />
            {t("pedigree.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pedigree.subtitle")}</p>
        </header>

        <Card>
          <CardContent className="p-4">
            <div className="relative mb-2">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pedigree.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <div className="scroll-area-thin max-h-60 overflow-auto">
              {filteredPersons.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent ${selectedId === p.id ? "bg-accent" : ""}`}
                >
                  <span className="font-medium">{p.name}</span>
                  {p.nickname && <span className="text-xs text-muted-foreground">"{p.nickname}"</span>}
                  <span className="ml-auto text-xs text-muted-foreground">Gen {p.generation}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {!selectedId ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("pedigree.selectPerson")}
            </CardContent>
          </Card>
        ) : ancestors.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("pedigree.empty")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {ancestors.map(a => (
              <div
                key={a.id}
                style={{ paddingLeft: a.depth * 24 }}
                className="relative"
              >
                {a.depth > 0 && (
                  <span
                    className="absolute left-0 top-0 h-full w-px bg-border"
                    style={{ left: a.depth * 24 - 12 }}
                  />
                )}
                <button
                  onClick={() => handleSelectPerson(a)}
                  className="group flex w-full items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-all hover:border-primary/40 hover:shadow-soft"
                >
                  <span
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{
                      background: a.gender === "male" ? "oklch(0.6 0.08 200)" : "oklch(0.65 0.12 25)",
                      opacity: a.date_of_death ? 0.5 : 1,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{a.name}</span>
                      {a.date_of_death && <span className="text-xs text-muted-foreground">✝</span>}
                      {a.nickname && <span className="truncate text-xs text-muted-foreground">"{a.nickname}"</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Gen {a.generation} {a.depth > 0 ? `· ${a.depth === 1 ? "Parent" : a.depth === 2 ? "Grandparent" : `+${a.depth} gen`}` : ""}
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PersonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        person={selectedPerson}
        allPersons={allPersons}
        canEdit={false}
      />
    </div>
  );
}
