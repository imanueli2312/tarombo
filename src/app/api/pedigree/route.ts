import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/auth";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    // Anyone with search access can view pedigree
    if (!permissions.pages.search) return errorResponse(403, "Access denied");
    const url = new URL(req.url);
    const personId = url.searchParams.get("personId");
    if (!personId) return errorResponse(400, "personId is required");

    const ancestors: (Person & { depth: number })[] = [];
    const visited = new Set<string>();

    function walk(id: string, depth: number) {
      if (visited.has(id)) return;
      visited.add(id);
      const person = sqlite.prepare("SELECT * FROM persons WHERE id = ?").get(id) as Person | undefined;
      if (!person) return;
      ancestors.push({ ...person, depth });
      // Follow parent_id (official parent), father_id, mother_id
      if (person.parent_id) walk(person.parent_id, depth + 1);
    }

    walk(personId, 0);
    return json(ancestors);
  });
}
