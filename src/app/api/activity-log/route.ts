import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  PermissionDeniedError,
  requirePermission,
} from "@/lib/tarombo/auth";

/** GET /api/activity-log
 *  Query: ?limit=100&entityType=person&action=create
 *  Butuh permission user:view (admin/editor yang login).
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("user:view");
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");

    let sql = "SELECT * FROM activity_log WHERE 1=1";
    const params: (string | number)[] = [];
    if (entityType) {
      sql += " AND entity_type = ?";
      params.push(entityType);
    }
    if (action) {
      sql += " AND action = ?";
      params.push(action);
    }
    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);

    const rows = sqlite.prepare(sql).all(...params);
    return NextResponse.json({ data: rows });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
