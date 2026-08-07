import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/auth";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    if (!permissions.pages.search) return errorResponse(403, "Access denied");
    const url = new URL(req.url);
    const personId = url.searchParams.get("personId");
    if (!personId) return errorResponse(400, "personId is required");

    const descendants: (Person & { depth: number })[] = [];
    const visited = new Set<string>();

    function walk(id: string, depth: number) {
      if (visited.has(id)) return;
      visited.add(id);
      const person = sqlite.prepare("SELECT * FROM persons WHERE id = ?").get(id) as Person | undefined;
      if (!person) return;
      descendants.push({ ...person, depth });
      // Find children (persons whose parent_id = this person)
      const children = sqlite.prepare("SELECT * FROM persons WHERE parent_id = ? ORDER BY birth_order, name").all(id) as Person[];
      for (const child of children) {
        walk(child.id, depth + 1);
      }
    }

    walk(personId, 0);
    return json(descendants);
  });
}
