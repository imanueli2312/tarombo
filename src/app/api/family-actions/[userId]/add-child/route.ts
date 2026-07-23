import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, couples } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/api/session';

function extractUserId(pathname: string): string {
  const parts = pathname.split('/');
  return parts[3];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = extractUserId(request.nextUrl.pathname);
    const body = await request.json();

    const parent = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!parent) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!body.nickname) {
      return NextResponse.json({ error: 'Child nickname is required' }, { status: 400 });
    }

    if (body.genderId !== 1 && body.genderId !== 2) {
      return NextResponse.json({ error: 'Valid genderId (1 or 2) is required' }, { status: 400 });
    }

    const isParentMale = parent.genderId === 1;

    // Determine spouse: find existing spouse or leave null
    let spouseId: string | null = null;
    if (isParentMale) {
      // Look for existing couple where this male is husband
      const existingCouple = await db.query.couples.findFirst({
        where: eq(couples.husbandId, userId),
      });
      if (existingCouple) {
        spouseId = existingCouple.wifeId;
      }
    } else {
      // Look for existing couple where this female is wife
      const existingCouple = await db.query.couples.findFirst({
        where: eq(couples.wifeId, userId),
      });
      if (existingCouple) {
        spouseId = existingCouple.husbandId;
      }
    }

    // Create child
    const newChild = await db.insert(users).values({
      nickname: body.nickname,
      name: body.name || null,
      genderId: body.genderId,
      fatherId: isParentMale ? userId : (spouseId || null),
      motherId: isParentMale ? (spouseId || null) : userId,
      birthOrder: body.birthOrder || null,
    }).returning();

    const child = newChild[0];

    // Create couple record if spouse exists but no couple record yet
    if (spouseId && isParentMale) {
      const existingCouple = await db.query.couples.findFirst({
        where: and(eq(couples.husbandId, userId), eq(couples.wifeId, spouseId)),
      });
      if (!existingCouple) {
        const newCouple = await db.insert(couples).values({
          husbandId: userId,
          wifeId: spouseId,
        }).returning();
        // Update child's parentId
        await db.update(users).set({ parentId: newCouple[0].id }).where(eq(users.id, child.id));
      } else {
        await db.update(users).set({ parentId: existingCouple.id }).where(eq(users.id, child.id));
      }
    } else if (spouseId && !isParentMale) {
      const existingCouple = await db.query.couples.findFirst({
        where: and(eq(couples.husbandId, spouseId), eq(couples.wifeId, userId)),
      });
      if (!existingCouple) {
        const newCouple = await db.insert(couples).values({
          husbandId: spouseId,
          wifeId: userId,
        }).returning();
        await db.update(users).set({ parentId: newCouple[0].id }).where(eq(users.id, child.id));
      } else {
        await db.update(users).set({ parentId: existingCouple.id }).where(eq(users.id, child.id));
      }
    }

    const { password: _, ...childWithoutPassword } = child;
    return NextResponse.json({ child: childWithoutPassword }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add child' }, { status: 500 });
  }
}