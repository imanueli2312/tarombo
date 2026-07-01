import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/notifications - Get recent changes since a timestamp
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    const where: Record<string, unknown> = {};
    if (since) {
      where.createdAt = { gt: new Date(since) };
    }

    const [personChanges, marriageChanges] = await Promise.all([
      db.person.count({ where: since ? { updatedAt: { gt: new Date(since) } } : {} }),
      db.marriage.count({ where: since ? { updatedAt: { gt: new Date(since) } } : {} }),
    ]);

    // Check if there were actual changes (updated != created)
    let changedPersons = 0;
    let changedMarriages = 0;

    if (since) {
      changedPersons = personChanges;
      changedMarriages = marriageChanges;
    }

    return NextResponse.json({
      hasChanges: (changedPersons + changedMarriages) > 0,
      changedPersons,
      changedMarriages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ hasChanges: false, changedPersons: 0, changedMarriages: 0, timestamp: new Date().toISOString() });
  }
}