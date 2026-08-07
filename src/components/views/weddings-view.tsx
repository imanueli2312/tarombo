"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, CalendarHeart, Church } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

interface WeddingRow {
  id: string;
  husband_id: string;
  wife_id: string;
  husband_name: string;
  wife_name: string;
  husband_photo: string | null;
  wife_photo: string | null;
  marriage_date: string | null;
  divorce_date: string | null;
  is_active: number;
  years_anniversary: number;
  days_until: number;
}

export function WeddingsView() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<WeddingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/weddings");
        if (!res.ok) throw new Error("Failed");
        setRows(await res.json());
      } catch (e: any) {
        toast.error(e?.message || t("weddings.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const upcoming = rows.filter((r) => r.days_until <= 60);
  const later = rows.filter((r) => r.days_until > 60);

  return (
    <div className="scroll-area-thin h-full overflow-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Heart className="h-6 w-6 text-primary" />
            {t("weddings.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("weddings.subtitle")}
          </p>
        </header>

        {rows.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("weddings.empty")}
            </CardContent>
          </Card>
        )}

        {upcoming.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("weddings.upcoming")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((r) => (
                <WeddingCard key={r.id} row={r} />
              ))}
            </div>
          </section>
        )}

        {later.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("weddings.later")}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {later.map((r) => (
                <WeddingCard key={r.id} row={r} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function WeddingCard({ row, compact }: { row: WeddingRow; compact?: boolean }) {
  const { t, lang } = useLanguage();
  const md = row.marriage_date ? new Date(row.marriage_date) : null;
  const mdStr = md
    ? md.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const mdShort = md
    ? md.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" })
    : "";
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + row.days_until);
  const nextStr = nextDate.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  const isActive = row.is_active === 1;

  return (
    <Card>
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-center gap-3">
          {/* couple avatars */}
          <div className="flex shrink-0 items-center">
            <Avatar photo={row.husband_photo} name={row.husband_name} />
            <div className="-ml-3">
              <Avatar photo={row.wife_photo} name={row.wife_name} ring />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {row.husband_name} <span className="text-muted-foreground">&amp;</span> {row.wife_name}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {mdShort && (
                <span className="flex items-center gap-1">
                  <CalendarHeart className="h-3 w-3" /> {mdShort}
                </span>
              )}
              {!isActive && row.divorce_date && (
                <Badge variant="outline" className="text-[10px]">{t("weddings.ended")}</Badge>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {row.days_until === 0 ? (
              <Badge className="bg-primary text-primary-foreground">{t("weddings.todayExclaim")}</Badge>
            ) : (
              <div className="text-xs">
                <div className="font-semibold text-foreground">{t("birthdays.inDays", { days: row.days_until })}</div>
                {!compact && <div className="text-muted-foreground">{nextStr}</div>}
              </div>
            )}
            <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              <Church className="h-3 w-3" />
              {t("weddings.years", { n: row.years_anniversary })}
            </div>
          </div>
        </div>
        {!compact && mdStr && (
          <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
            {t("weddings.marriedOn", { date: mdStr })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Avatar({ photo, name, ring }: { photo: string | null; name: string; ring?: boolean }) {
  return (
    <div
      className={`h-10 w-10 overflow-hidden rounded-full border-2 bg-muted ${ring ? "border-background" : "border-border"}`}
    >
      {photo ? (
         
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
          {name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
        </div>
      )}
    </div>
  );
}
