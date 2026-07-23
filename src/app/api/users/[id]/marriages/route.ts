import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, couples } from '@/db/schema';
import { eq, or, sql, asc } from 'drizzle-orm';

function extractIdFromPath(pathname: string): string {
  const parts = pathname.split('/');
  return parts[3];
}

export async function GET(request: NextRequest) {
  const userId = extractIdFromPath(request.nextUrl.pathname);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, genderId: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const whereClause = user.genderId === 1
    ? eq(couples.husbandId, userId)
    : eq(couples.wifeId, userId);

  const marriageRecords = await db.select().from(couples).where(whereClause).orderBy(asc(couples.marriageDate));

  const marriagesWithDetails = await Promise.all(
    marriageRecords.map(async (couple) => {
      const husband = await db.query.users.findFirst({
        where: eq(users.id, couple.husbandId),
        columns: { id: true, nickname: true, name: true },
      });
      const wife = await db.query.users.findFirst({
        where: eq(users.id, couple.wifeId),
        columns: { id: true, nickname: true, name: true },
      });

      const childCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(or(eq(users.fatherId, couple.husbandId), eq(users.motherId, couple.wifeId)));

      // More accurate: count children that belong to this specific couple
      const children = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.parentId, couple.id));

      return {
        ...couple,
        husband,
        wife,
        childCount: children.length,
      };
    })
  );

  return NextResponse.json({ marriages: marriagesWithDetails });
}