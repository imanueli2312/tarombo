import { sqlite } from "@/lib/database";
import { handleApi, json } from "@/lib/api";
import { getRequestContext, assertPageAccess } from "@/lib/auth";
import type { Person, Spouse } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertPageAccess(permissions, "weddings");

    const spouses = sqlite
      .prepare("SELECT * FROM spouses WHERE marriage_date IS NOT NULL ORDER BY marriage_date")
      .all() as Spouse[];

    const now = new Date();
    const thisYear = now.getFullYear();
    const rows: WeddingRow[] = [];

    for (const s of spouses) {
      if (!s.marriage_date) continue;
      const md = new Date(s.marriage_date);
      if (isNaN(md.getTime())) continue;

      const husband = sqlite
        .prepare("SELECT * FROM persons WHERE id = ?")
        .get(s.husband_id) as Person | undefined;
      const wife = sqlite
        .prepare("SELECT * FROM persons WHERE id = ?")
        .get(s.wife_id) as Person | undefined;
      if (!husband || !wife) continue;

      let next = new Date(thisYear, md.getMonth(), md.getDate());
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (next < todayMidnight) {
        next = new Date(thisYear + 1, md.getMonth(), md.getDate());
      }
      const diffMs = next.getTime() - todayMidnight.getTime();
      const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const yearsAnniversary = next.getFullYear() - md.getFullYear();

      rows.push({
        id: s.id,
        husband_id: s.husband_id,
        wife_id: s.wife_id,
        husband_name: husband.name,
        wife_name: wife.name,
        husband_photo: husband.photo,
        wife_photo: wife.photo,
        marriage_date: s.marriage_date,
        divorce_date: s.divorce_date,
        is_active: s.is_active,
        years_anniversary: yearsAnniversary,
        days_until: daysUntil,
      });
    }

    rows.sort((a, b) => a.days_until - b.days_until);
    return json(rows);
  });
}
