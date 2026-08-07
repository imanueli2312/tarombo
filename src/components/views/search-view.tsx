"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonDialog } from "@/components/family-tree/person-dialog";
import { Loader2, Search as SearchIcon, MapPin, Calendar, Cross, Heart, Users } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import type { Person } from "@/lib/types";
import type { TreeData, TreeNode } from "@/lib/types-tree";

type GenderFilter = "all" | "male" | "female";
type StatusFilter = "all" | "living" | "deceased";

export function SearchView() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<TreeNode | Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tree");
      if (!res.ok) throw new Error(t("search.loadFailed"));
      const json: TreeData = await res.json();
      setData(json);
    } catch (e: any) {
      toast.error(e?.message || t("search.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Build spouse lookup: personId → spouse name
  const spouseMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!data) return map;
    for (const s of data.spouses) {
      const husband = data.persons.find((p) => p.id === s.husband_id);
      const wife = data.persons.find((p) => p.id === s.wife_id);
      if (husband && wife) {
        map.set(husband.id, wife.name);
        map.set(wife.id, husband.name);
      }
    }
    return map;
  }, [data]);

  // Filter and search
  const results = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.persons.filter((p) => {
      // Text search
      if (q) {
        const name = p.name.toLowerCase();
        const nick = p.nickname?.toLowerCase() ?? "";
        const pob = p.place_of_birth?.toLowerCase() ?? "";
        if (!name.includes(q) && !nick.includes(q) && !pob.includes(q)) {
          return false;
        }
      }
      // Gender filter
      if (genderFilter !== "all" && p.gender !== genderFilter) return false;
      // Status filter
      if (statusFilter === "living" && p.date_of_death) return false;
      if (statusFilter === "deceased" && !p.date_of_death) return false;
      return true;
    });
  }, [data, query, genderFilter, statusFilter]);

  function handleSelect(person: Person) {
    if (!data) return;
    // Find the tree node version (with spouse/children)
    const node = findNode(data.roots, person.id);
    setSelected(node ?? person);
    setDialogOpen(true);
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

  const locale = lang === "id" ? "id-ID" : "en-US";

  function fmtDate(d: string | null | undefined): string {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
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
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <SearchIcon className="h-6 w-6 text-primary" />
            {t("search.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("search.subtitle")}</p>
        </header>

        {/* Search bar + filters */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as GenderFilter)}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("search.filterAll")}</SelectItem>
                  <SelectItem value="male">{t("search.filterMale")}</SelectItem>
                  <SelectItem value="female">{t("search.filterFemale")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("search.filterAll")}</SelectItem>
                  <SelectItem value="living">{t("search.filterLiving")}</SelectItem>
                  <SelectItem value="deceased">{t("search.filterDeceased")}</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-auto text-xs text-muted-foreground">
                {t("search.resultsCount", { count: results.length })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("search.noResults")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {results.map((p) => (
              <ResultCard
                key={p.id}
                person={p}
                spouseName={spouseMap.get(p.id) ?? null}
                locale={locale}
                onSelect={() => handleSelect(p)}
              />
            ))}
          </div>
        )}
      </div>

      <PersonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        person={selected}
        allPersons={data?.persons ?? []}
        canEdit={false}
        onSaved={load}
        onDeleted={load}
      />
    </div>
  );
}

function ResultCard({
  person,
  spouseName,
  locale,
  onSelect,
}: {
  person: Person;
  spouseName: string | null;
  locale: string;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const isMale = person.gender === "male";
  const isDeceased = !!person.date_of_death;
  const deceasedMark = t("tree.deceasedMark");

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <Card className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-soft" >
      <CardContent className="p-0">
        <button
          onClick={onSelect}
          className="flex w-full items-center gap-3 p-3 text-left"
        >
          {/* Gender stripe */}
          <span
            className="h-12 w-1 shrink-0 rounded-full"
            style={{
              background: isMale ? "oklch(0.6 0.08 200)" : "oklch(0.65 0.12 25)",
              opacity: isDeceased ? 0.5 : 0.85,
            }}
          />
          {/* Avatar */}
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border bg-muted">
            {person.photo ? (
              <img src={person.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                {person.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
            )}
          </div>
          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {person.name}
                {isDeceased && <span className="ml-1 text-muted-foreground">{deceasedMark}</span>}
              </span>
              {person.nickname && (
                <span className="truncate text-xs text-muted-foreground">"{person.nickname}"</span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{t("search.gen", { n: person.generation })}</span>
              {person.date_of_birth && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {fmtDate(person.date_of_birth)}
                </span>
              )}
              {isDeceased && person.date_of_death && (
                <span className="flex items-center gap-1">
                  <Cross className="h-3 w-3" /> {fmtDate(person.date_of_death)}
                </span>
              )}
              {person.place_of_birth && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {person.place_of_birth}
                </span>
              )}
            </div>
            {spouseName && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="h-3 w-3" /> {t("search.spouse")}: {spouseName}
                {spouseName && person.date_of_death && deceasedMark}
              </div>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 capitalize">
            {isMale ? t("search.filterMale") : t("search.filterFemale")}
          </Badge>
        </button>
      </CardContent>
    </Card>
  );
}
