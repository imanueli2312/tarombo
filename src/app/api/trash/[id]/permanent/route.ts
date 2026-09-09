import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  PermissionDeniedError,
  requirePermission,
} from "@/lib/tarombo/auth";
import { logActivity } from "@/lib/tarombo/security";

/** DELETE /api/trash/[id]/permanent — hapus permanen (hard delete).
 *  Body: { type: "person" | "partnership" }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requirePermission("person:delete");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const type: string = body.type ?? "person";

    if (type === "person") {
      sqlite.prepare("DELETE FROM person WHERE id = ? AND deleted_at IS NOT NULL").run(id);
      logActivity({
        userId: me.id,
        userName: me.name,
        action: "delete",
        entityType: "person",
        entityId: id,
        details: { permanent: true },
      });
    } else if (type === "partnership") {
      sqlite.prepare("DELETE FROM partnership WHERE id = ? AND deleted_at IS NOT NULL").run(id);
      logActivity({
        userId: me.id,
        userName: me.name,
        action: "delete",
        entityType: "partnership",
        entityId: id,
        details: { permanent: true },
      });
    } else {
      return NextResponse.json({ error: "type harus person atau partnership." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
