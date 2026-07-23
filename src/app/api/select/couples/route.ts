import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, couples } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  const allCouples = await db.select().from(couples).orderBy(asc(couples.marriageDate));

  const result = await Promise.all(
    allCouples.map(async (couple) => {
      const husband = await db.query.users.findFirst({
        where: eq(users.id, couple.husbandId),
        columns: { id: true, nickname: true, name: true },
      });
      const wife = await db.query.users.findFirst({
        where: eq(users.id, couple.wifeId),
        columns: { id: true, nickname: true, name: true },
      });

      return {
        id: couple.id,
        husbandId: couple.husbandId,
        wifeId: couple.wifeId,
        husbandName: husband ? (husband.name || husband.nickname) : null,
        wifeName: wife ? (wife.name || wife.nickname) : null,
        marriageDate: couple.marriageDate,
        divorceDate: couple.divorceDate,
      };
    })
  );

  return NextResponse.json(result);
}