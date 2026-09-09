import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

/** GET /api/stats — ringkasan statistik untuk dashboard. */
export async function GET() {
  try {
    const totalPersons = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM person").get() as { c: number }
    ).c;
    const alive = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM person WHERE death_date IS NULL")
        .get() as { c: number }
    ).c;
    const deceased = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM person WHERE death_date IS NOT NULL")
        .get() as { c: number }
    ).c;
    const males = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM person WHERE gender = 'MALE'").get() as {
        c: number;
      }
    ).c;
    const females = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM person WHERE gender = 'FEMALE'")
        .get() as { c: number }
    ).c;
    const totalPartnerships = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM partnership").get() as { c: number }
    ).c;
    const activePartnerships = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM partnership WHERE status = 'ACTIVE'")
        .get() as { c: number }
    ).c;
    const widowed = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM partnership WHERE status = 'WIDOWED'")
        .get() as { c: number }
    ).c;
    const divorced = (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM partnership WHERE status = 'DIVORCED'")
        .get() as { c: number }
    ).c;

    const generations = sqlite
      .prepare(
        `SELECT generation_number AS g, COUNT(*) AS c
         FROM person GROUP BY generation_number
         ORDER BY generation_number ASC NULLS LAST`,
      )
      .all() as { g: number | null; c: number }[];

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
      generations: generations.map((row) => ({
        generation: row.g,
        count: row.c,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
