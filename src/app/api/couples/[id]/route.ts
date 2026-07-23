import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, couples } from '@/db/schema';
import { eq, sql, asc } from 'drizzle-orm';

function extractId(pathname: string): string {
  const parts = pathname.split('/');
  return parts[parts.length - 1];
}

export async function GET(request: NextRequest) {
  const id = extractId(request.nextUrl.pathname);

  const couple = await db.query.couples.findFirst({ where: eq(couples.id, id) });
  if (!couple) {
    return NextResponse.json({ error: 'Couple not found' }, { status: 404 });
  }

  const husband = await db.query.users.findFirst({ where: eq(users.id, couple.husbandId) });
  const wife = await db.query.users.findFirst({ where: eq(users.id, couple.wifeId) });

  // Get children of this couple
  const children = await db.select().from(users)
    .where(eq(users.parentId, id))
    .orderBy(asc(users.birthOrder));

  // Get grandchildren
  const grandchildren = await Promise.all(
    children.map(async (child) => {
      const childField = child.genderId === 1 ? users.fatherId : users.motherId;
      const gc = await db.select().from(users).where(eq(childField, child.id)).orderBy(asc(users.birthOrder));
      return gc;
    })
  );

  return NextResponse.json({
    ...couple,
    husband,
    wife,
    children,
    grandchildren: grandchildren.flat(),
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const id = extractId(request.nextUrl.pathname);
    const body = await request.json();

    const couple = await db.query.couples.findFirst({ where: eq(couples.id, id) });
    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` };

    if (body.marriageDate !== undefined) updateData.marriageDate = body.marriageDate || null;
    if (body.divorceDate !== undefined) updateData.divorceDate = body.divorceDate || null;

    const updated = await db.update(couples).set(updateData).where(eq(couples.id, id)).returning();

    return NextResponse.json({ couple: updated[0] });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}