import { sqlite } from "@/lib/database";
import { handleApi, json } from "@/lib/api";
import { getRequestContext, assertAction } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const issues: any[] = [];
    const persons = sqlite.prepare("SELECT * FROM persons").all() as any[];

    for (const p of persons) {
      if (!p.date_of_birth) {
        issues.push({
          type: "missingBirth",
          person_id: p.id,
          person_name: p.name,
          details: "No birth date recorded",
        });
      }
      if (!p.parent_id && p.generation > 1) {
        issues.push({
          type: "missingParent",
          person_id: p.id,
          person_name: p.name,
          details: `Generation ${p.generation} with no parent`,
        });
      }
      if (!p.place_of_birth) {
        issues.push({
          type: "missingPlace",
          person_id: p.id,
          person_name: p.name,
          details: "No place of birth recorded",
        });
      }
      if (
        p.date_of_death &&
        p.date_of_birth &&
        p.date_of_death < p.date_of_birth
      ) {
        issues.push({
          type: "deathBeforeBirth",
          person_id: p.id,
          person_name: p.name,
          details: `Death (${p.date_of_death}) before birth (${p.date_of_birth})`,
        });
      }
      if (p.parent_id) {
        const parent = persons.find((x) => x.id === p.parent_id);
        if (
          parent &&
          parent.date_of_birth &&
          p.date_of_birth &&
          p.date_of_birth < parent.date_of_birth
        ) {
          issues.push({
            type: "childOlderThanParent",
            person_id: p.id,
            person_name: p.name,
            details: `Child born ${p.date_of_birth}, parent (${parent.name}) born ${parent.date_of_birth}`,
          });
        }
      }
    }

    // Check for duplicates (same name + same birth year)
    const byNameYear = new Map<string, any[]>();
    for (const p of persons) {
      const year = p.date_of_birth ? p.date_of_birth.substring(0, 4) : "?";
      const key = `${p.name.toLowerCase()}|${year}`;
      if (!byNameYear.has(key)) byNameYear.set(key, []);
      byNameYear.get(key)!.push(p);
    }
    for (const [, dups] of byNameYear) {
      if (dups.length > 1) {
        for (const p of dups) {
          issues.push({
            type: "potentialDup",
            person_id: p.id,
            person_name: p.name,
            details: `Possible duplicate of: ${dups
              .filter((x) => x.id !== p.id)
              .map((x) => x.name)
              .join(", ")}`,
          });
        }
      }
    }

    return json(issues);
  });
}
