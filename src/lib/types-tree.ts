// Client-safe tree types (no server imports)
import type { Person, Spouse } from "./types";

export interface TreeNode extends Person {
  father?: Person | null;
  mother?: Person | null;
  parent?: Person | null;
  spouse?: Person | null;
  spouse_relation?: Spouse | null;
  children: TreeNode[];
}

export interface TreeData {
  roots: TreeNode[];
  persons: Person[];
  spouses: Spouse[];
}
