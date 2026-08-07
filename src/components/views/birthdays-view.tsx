"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Cake, CalendarDays, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

interface BirthdayRow {
  id: string;
  name: string;
  nickname: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  gender: string;
  photo: string | null;
  generation: number;
  days_until: number;
  upcoming_age: number;
}

export function BirthdaysView() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<BirthdayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/birthdays");
        if (!res.ok) throw new Error("Failed");
        setRows(await res.json());
      } catch (e: any) {
        toast.error(e?.message || t("birthdays.loadFailed"));
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

  const today = rows.filter((r) => r.days_until === 0);
  const upcoming = rows.filter((r) => r.days_until > 0 && r.days_until <= 30);
  const later = rows.filter((r) => r.days_until > 30);

  return (
    <div className="scroll-area-thin h-full overflow-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Cake className="h-6 w-6 text-primary" />
            {t("birthdays.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("birthdays.subtitle")}
          </p>
        </header>

        {rows.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("birthdays.empty")}
            </CardContent>
          </Card>
        )}

        {today.length > 0 && (
          <Section title={t("birthdays.today")} badge={t("birthdays.todayBadge", { count: today.length })} highlight>
            <div className="grid gap-3 sm:grid-cols-2">
              {today.map((r) => (
                <BirthdayCard key={r.id} row={r} />
              ))}
            </div>
          </Section>
        )}

        {upcoming.length > 0 && (
          <Section title={t("birthdays.upcoming")} badge={`${upcoming.length}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((r) => (
                <BirthdayCard key={r.id} row={r} />
              ))}
            </div>
          </Section>
        )}

        {later.length > 0 && (
          <Section title={t("birthdays.later")} badge={`${later.length}`}>
            <div className="grid gap-2 sm:grid-cols-2">
              {later.map((r) => (
                <BirthdayCard key={r.id} row={r} compact />
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  badge,
  highlight,
  children,
}: {
  title: string;
  badge?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {badge && (
          <Badge variant={highlight ? "default" : "secondary"}>{badge}</Badge>
        )}
      </div>
      {children}
    </section>
  );
}

function BirthdayCard({ row, compact }: { row: BirthdayRow; compact?: boolean }) {
  const { t, lang } = useLanguage();
  const isMale = row.gender === "male";
  const dob = row.date_of_birth ? new Date(row.date_of_birth) : null;
  const dobStr = dob
    ? dob.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long" })
    : "";
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + row.days_until);
  const nextStr = nextDate.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Card className={compact ? "p-3" : ""}>
      <CardContent className={compact ? "p-0" : "p-4"}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border bg-muted">
            {row.photo ? (
               
              <img src={row.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                {row.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{row.name}</span>
              {row.nickname && (
                <span className="truncate text-xs text-muted-foreground">"{row.nickname}"</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: isMale ? "oklch(0.6 0.08 200)" : "oklch(0.65 0.12 25)" }}
              />
              <span>{t("birthdays.gen", { n: row.generation })}</span>
              {dobStr && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {dobStr}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {row.days_until === 0 ? (
              <Badge className="bg-primary text-primary-foreground">{t("birthdays.todayExclaim")}</Badge>
            ) : (
              <div className="text-xs">
                <div className="font-semibold text-foreground">{t("birthdays.inDays", { days: row.days_until })}</div>
                {!compact && <div className="text-muted-foreground">{nextStr}</div>}
              </div>
            )}
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {t("birthdays.turnsAge", { age: row.upcoming_age })}
            </div>
          </div>
        </div>
        {!compact && row.place_of_birth && (
          <div className="mt-2 flex items-center gap-1 border-t pt-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {t("birthdays.bornIn", { place: row.place_of_birth })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
