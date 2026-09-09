import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/stats — ringkasan statistik untuk dashboard. */
export async function GET() {
  try {
    const totalPersons = await db.person.count();
    const alive = await db.person.count({ where: { deathDate: null } });
    const deceased = await db.person.count({ where: { deathDate: { not: null } } });
    const males = await db.person.count({ where: { gender: "MALE" } });
    const females = await db.person.count({ where: { gender: "FEMALE" } });
    const totalPartnerships = await db.partnership.count();
    const activePartnerships = await db.partnership.count({
      where: { status: "ACTIVE" },
    });
    const widowed = await db.partnership.count({
      where: { status: "WIDOWED" },
    });
    const divorced = await db.partnership.count({
      where: { status: "DIVORCED" },
    });

    // Distribusi generasi
    const generations = await db.person.groupBy({
      by: ["generationNumber"],
      _count: { _all: true },
      orderBy: { generationNumber: "asc" },
    });

    return NextResponse.json({
      totalPersons,
      alive,
      deceased,
      males,
      females,
      totalPartnerships,
      activePartnerships,
      widowed,
      divorced,
      generations: generations.map((g) => ({
        generation: g.generationNumber,
        count: g._count._all,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
