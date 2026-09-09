import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  PermissionDeniedError,
  requirePermission,
} from "@/lib/tarombo/auth";
import { now } from "@/lib/tarombo/queries";
import { logActivity } from "@/lib/tarombo/security";

/** POST /api/trash/[id]/restore — restore soft-deleted person atau partnership.
 *  Body: { type: "person" | "partnership" }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requirePermission("person:delete");
    const { id } = await params;
    const body = await req.json();
    const type: string = body.type ?? "person";

    if (type === "person") {
      const res = sqlite
        .prepare("UPDATE person SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL")
        .run(now(), id);
      if (res.changes === 0) {
        return NextResponse.json({ error: "Item tidak ditemukan di trash." }, { status: 404 });
      }
      logActivity({
        userId: me.id,
        userName: me.name,
        action: "restore",
        entityType: "person",
        entityId: id,
      });
    } else if (type === "partnership") {
      const res = sqlite
        .prepare("UPDATE partnership SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL")
        .run(now(), id);
      if (res.changes === 0) {
        return NextResponse.json({ error: "Item tidak ditemukan di trash." }, { status: 404 });
      }
      logActivity({
        userId: me.id,
        userName: me.name,
        action: "restore",
        entityType: "partnership",
        entityId: id,
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
