import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  PermissionDeniedError,
  requirePermission,
} from "@/lib/tarombo/auth";
import {
  serializePerson,
  serializePartnership,
  type PersonRow,
  type PartnershipRow,
} from "@/lib/tarombo/queries";
import { now } from "@/lib/tarombo/queries";
import { logActivity } from "@/lib/tarombo/security";

/** GET /api/trash — daftar person & partnership yang soft-deleted. */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("person:delete");
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "all";

    let persons: PersonRow[] = [];
    let partnerships: PartnershipRow[] = [];

    if (type === "all" || type === "person") {
      persons = sqlite
        .prepare("SELECT * FROM person WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
        .all() as PersonRow[];
    }
    if (type === "all" || type === "partnership") {
      partnerships = sqlite
        .prepare("SELECT * FROM partnership WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
        .all() as PartnershipRow[];
    }

    return NextResponse.json({
      data: {
        persons: persons.map(serializePerson),
        partnerships: partnerships.map(serializePartnership),
      },
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/trash — empty trash (permanent delete semua soft-deleted). */
export async function DELETE() {
  try {
    const me = await requirePermission("person:delete");
    const personCount = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM person WHERE deleted_at IS NOT NULL")
        .get() as { c: number }
    ).c;
    const partnershipCount = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM partnership WHERE deleted_at IS NOT NULL")
        .get() as { c: number }
    ).c;

    sqlite.prepare("DELETE FROM partnership WHERE deleted_at IS NOT NULL").run();
    sqlite.prepare("DELETE FROM person WHERE deleted_at IS NOT NULL").run();

    logActivity({
      userId: me.id,
      userName: me.name,
      action: "delete",
      entityType: "data",
      entityName: "Empty trash",
      details: { persons: personCount, partnerships: partnershipCount },
    });

    return NextResponse.json({
      success: true,
      message: `Trash dikosongkan (${personCount} orang, ${partnershipCount} pasangan dihapus permanen).`,
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
