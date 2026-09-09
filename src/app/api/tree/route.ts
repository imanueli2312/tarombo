import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildFamilyTree, findRootAncestors, serializePerson } from "@/lib/tarombo/queries";

/** GET /api/tree
 *  - Tanpa param: kembalikan semua leluhur root + pohon masing-masing.
 *  - ?rootId=<id>: pohon dari orang tertentu.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rootId = searchParams.get("rootId");

    if (rootId) {
      const tree = await buildFamilyTree(rootId);
      return NextResponse.json({ data: tree });
    }

    const roots = await findRootAncestors();
    if (roots.length === 0) {
      return NextResponse.json({ data: [], roots: [] });
    }

    const trees = [];
    for (const root of roots) {
      const tree = await buildFamilyTree(root.id);
      if (tree) trees.push(tree);
    }

    return NextResponse.json({
      data: trees,
      roots: roots.map(serializePerson),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
