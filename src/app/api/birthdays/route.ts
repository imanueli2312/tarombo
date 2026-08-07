import { sqlite } from "@/lib/database";
import { handleApi, json } from "@/lib/api";
import { getRequestContext, assertPageAccess } from "@/lib/auth";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";

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

// GET /api/birthdays - upcoming birthdays sorted by next occurrence
export function GET(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertPageAccess(permissions, "birthdays");

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    const persons = sqlite
      .prepare("SELECT id, name, nickname, date_of_birth, place_of_birth, gender, photo, generation, date_of_death FROM persons WHERE date_of_birth IS NOT NULL AND date_of_death IS NULL")
      .all() as Person[];

    const now = new Date();
    const thisYear = now.getFullYear();
    const rows: BirthdayRow[] = [];

    for (const p of persons) {
      if (!p.date_of_birth) continue;
      const dob = new Date(p.date_of_birth);
      if (isNaN(dob.getTime())) continue;

      // next occurrence
      let next = new Date(thisYear, dob.getMonth(), dob.getDate());
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (next < todayMidnight) {
        next = new Date(thisYear + 1, dob.getMonth(), dob.getDate());
      }
      const diffMs = next.getTime() - todayMidnight.getTime();
      const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const upcomingAge = next.getFullYear() - dob.getFullYear();

      rows.push({
        id: p.id,
        name: p.name,
        nickname: p.nickname,
        date_of_birth: p.date_of_birth,
        place_of_birth: p.place_of_birth,
        gender: p.gender,
        photo: p.photo,
        generation: p.generation,
        days_until: daysUntil,
        upcoming_age: upcomingAge,
      });
    }

    rows.sort((a, b) => a.days_until - b.days_until);
    return json(rows.slice(0, limit));
  });
}
