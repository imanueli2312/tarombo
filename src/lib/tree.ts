import { sqlite } from "@/lib/database";
import type { Person, Spouse } from "@/lib/types";
import type { TreeNode, TreeData } from "@/lib/types-tree";

export type { TreeNode, TreeData };

export function getTreeData(): TreeData {
  const personRows = sqlite.prepare("SELECT * FROM persons ORDER BY generation, birth_order, name").all() as Person[];
  const spouseRows = sqlite.prepare("SELECT * FROM spouses").all() as Spouse[];

  const personsMap = new Map<string, Person>();
  for (const p of personRows) {
    personsMap.set(p.id, p);
  }

  // For each couple, determine the "primary" (the one positioned in the tree)
  // and the "attached" spouse (shown as text on the primary's card, not as a
  // separate node). Convention (patrilineal): husband is primary, EXCEPT when
  // the wife has a parent_id (bloodline) and the husband does not — then the
  // wife is primary.
  const attachedSpouseIds = new Set<string>();
  // primaryId -> { spouse, relation }
  const spouseOf = new Map<string, { spouse: Person; relation: Spouse }>();

  for (const s of spouseRows) {
    const husband = personsMap.get(s.husband_id);
    const wife = personsMap.get(s.wife_id);
    if (!husband || !wife) continue;

    const husbandHasParent = !!husband.parent_id;
    const wifeHasParent = !!wife.parent_id;
    // Wife is primary only if she has a parent and husband doesn't.
    const wifeIsPrimary = wifeHasParent && !husbandHasParent;

    if (wifeIsPrimary) {
      attachedSpouseIds.add(husband.id);
      spouseOf.set(wife.id, { spouse: husband, relation: s });
    } else {
      attachedSpouseIds.add(wife.id);
      spouseOf.set(husband.id, { spouse: wife, relation: s });
    }
  }

  // Create TreeNode wrappers only for "primary" persons (not attached spouses)
  const nodeMap = new Map<string, TreeNode>();
  for (const p of personRows) {
    if (attachedSpouseIds.has(p.id)) continue; // skip attached spouses
    const sp = spouseOf.get(p.id);
    nodeMap.set(p.id, {
      ...p,
      father: p.father_id ? personsMap.get(p.father_id) ?? null : null,
      mother: p.mother_id ? personsMap.get(p.mother_id) ?? null : null,
      parent: p.parent_id ? personsMap.get(p.parent_id) ?? null : null,
      spouse: sp?.spouse ?? null,
      spouse_relation: sp?.relation ?? null,
      children: [],
    });
  }

  // Populate children arrays (only among primary nodes)
  for (const p of personRows) {
    if (attachedSpouseIds.has(p.id)) continue;
    const parentId = p.parent_id;
    if (!parentId) continue;
    const parentNode = nodeMap.get(parentId);
    const childNode = nodeMap.get(p.id);
    if (parentNode && childNode) {
      parentNode.children.push(childNode);
    }
  }

  // Roots = primary nodes with no parent_id
  const roots: TreeNode[] = [];
  for (const p of personRows) {
    if (attachedSpouseIds.has(p.id)) continue;
    if (!p.parent_id) {
      const node = nodeMap.get(p.id);
      if (node) roots.push(node);
    }
  }
  roots.sort(
    (a, b) =>
      a.generation - b.generation || a.birth_order - b.birth_order
  );

  return { roots, persons: personRows, spouses: spouseRows };
}

// Flatten tree for chart view
export function flattenTree(roots: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (node: TreeNode) => {
    out.push(node);
    for (const c of node.children) walk(c);
  };
  for (const r of roots) walk(r);
  return out;
}
