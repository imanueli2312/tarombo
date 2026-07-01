import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/stats - Family statistics dashboard data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalPersons,
      males,
      females,
      latestPerson,
      activeMarriages,
      allBirthDates,
      maritalStatusCounts,
    ] = await Promise.all([
      // Total persons
      db.person.count(),

      // Males
      db.person.count({ where: { gender: "MALE" } }),

      // Females
      db.person.count({ where: { gender: "FEMALE" } }),

      // Latest person added
      db.person.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          nickname: true,
          gender: true,
          createdAt: true,
        },
      }),

      // Active marriages
      db.marriage.count({ where: { isActive: true } }),

      // All birth dates for average age calculation
      db.person.findMany({
        where: { birthDate: { not: null } },
        select: { birthDate: true, deathDate: true },
      }),

      // Marital status breakdown
      db.person.groupBy({
        by: ["maritalStatus"],
        _count: { maritalStatus: true },
      }),
    ]);

    // Calculate average age
    let avgAge = 0;
    if (allBirthDates.length > 0) {
      const now = new Date();
      const totalAge = allBirthDates.reduce((sum, p) => {
        const birth = new Date(p.birthDate!);
        const end = p.deathDate ? new Date(p.deathDate) : now;
        const age = end.getFullYear() - birth.getFullYear();
        return sum + age;
      }, 0);
      avgAge = Math.round(totalAge / allBirthDates.length);
    }

    // Calculate generations (max depth from roots)
    const roots = await db.person.findMany({
      where: { fatherId: null, gender: "MALE" },
      select: { id: true },
    });

    let maxGenerations = 0;
    if (roots.length > 0) {
      const allPersons = await db.person.findMany({
        select: { id: true, fatherId: true },
      });

      const childrenMap = new Map<string, string[]>();
      for (const p of allPersons) {
        if (p.fatherId) {
          const siblings = childrenMap.get(p.fatherId) || [];
          siblings.push(p.id);
          childrenMap.set(p.fatherId, siblings);
        }
      }

      const rootIds = roots.map((r) => r.id);

      const calcDepth = (id: string, depth: number): number => {
        const children = childrenMap.get(id) || [];
        if (children.length === 0) return depth;
        return Math.max(...children.map((c) => calcDepth(c, depth + 1)));
      };

      maxGenerations = Math.max(...rootIds.map((id) => calcDepth(id, 1)));
    }

    return NextResponse.json({
      totalPersons,
      males,
      females,
      generations: maxGenerations,
      avgAge,
      activeMarriages,
      latestPerson,
      maritalStatus: maritalStatusCounts.map((m) => ({
        status: m.maritalStatus,
        count: m._count.maritalStatus,
      })),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}