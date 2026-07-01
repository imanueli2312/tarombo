import { db } from "@/lib/db";

/**
 * Get all ancestor IDs of a person (recursive upward traversal through fatherId).
 * Used to prevent circular references when setting parent-child relationships.
 */
export async function getAncestorIds(personId: string): Promise<Set<string>> {
  const ancestors = new Set<string>();
  let currentId: string | null | undefined = personId;
  const visited = new Set<string>();
  let safetyCounter = 0;
  const MAX_DEPTH = 50; // Safety limit

  while (currentId && !visited.has(currentId) && safetyCounter < MAX_DEPTH) {
    visited.add(currentId);
    const person = await db.person.findUnique({
      where: { id: currentId },
      select: { fatherId: true, motherId: true },
    });

    if (!person) break;

    // Add father to ancestor set
    if (person.fatherId) {
      ancestors.add(person.fatherId);
      currentId = person.fatherId;
    } else {
      break;
    }

    safetyCounter++;
  }

  return ancestors;
}

/**
 * Get all descendant IDs of a person (recursive downward traversal).
 * Used to prevent setting a descendant as a parent.
 */
export async function getDescendantIds(personId: string): Promise<Set<string>> {
  const descendants = new Set<string>();

  async function traverse(id: string, visited: Set<string>, depth: number): Promise<void> {
    if (visited.has(id) || depth > 50) return;
    visited.add(id);

    const children = await db.person.findMany({
      where: {
        OR: [
          { fatherId: id },
          { motherId: id },
        ],
      },
      select: { id: true },
    });

    for (const child of children) {
      descendants.add(child.id);
      await traverse(child.id, visited, depth + 1);
    }
  }

  await traverse(personId, new Set<string>(), 0);
  return descendants;
}

/**
 * Check if setting parentId on targetPersonId would create a circular reference.
 * Returns error message if circular, null if safe.
 */
export async function checkCircularReference(
  targetPersonId: string,
  parentId: string,
  parentRole: "father" | "mother"
): Promise<string | null> {
  // Self-reference
  if (targetPersonId === parentId) {
    return `Seseorang tidak bisa menjadi ${parentRole === "father" ? "ayah" : "ibu"} dari dirinya sendiri`;
  }

  // Check if parentId is a descendant of targetPersonId
  const descendants = await getDescendantIds(targetPersonId);
  if (descendants.has(parentId)) {
    return `Tidak dapat menetapkan keturunan sebagai ${parentRole === "father" ? "ayah" : "ibu"} — akan terjadi referensi melingkar (circular reference)`;
  }

  // For father role, also check ancestor chain to prevent multi-level loops
  if (parentRole === "father") {
    const ancestors = await getAncestorIds(parentId);
    if (ancestors.has(targetPersonId)) {
      return `Tidak dapat menetapkan — akan terjadi referensi melingkar dalam rantai keturunan`;
    }
  }

  return null;
}