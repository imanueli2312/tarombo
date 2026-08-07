import { sqlite } from "@/lib/database";
import { handleApi, json } from "@/lib/api";
import { getRequestContext } from "@/lib/auth";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    if (!permissions.pages.map) return json([]);
    const rows = sqlite.prepare("SELECT id, name, nickname, gender, date_of_birth, date_of_death, generation, burial_name, burial_address, burial_lat, burial_lng FROM persons WHERE burial_lat IS NOT NULL AND burial_lng IS NOT NULL").all() as any[];
    return json(rows);
  });
}
