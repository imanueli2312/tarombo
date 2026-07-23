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

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let spouseId: string;

    if (body.existingUserId) {
      const spouse = await db.query.users.findFirst({ where: eq(users.id, body.existingUserId) });
      if (!spouse) {
        return NextResponse.json({ error: 'Spouse user not found' }, { status: 404 });
      }
      // Spouse must be opposite gender
      if (spouse.genderId === user.genderId) {
        return NextResponse.json({ error: 'Spouse must be of opposite gender' }, { status: 400 });
      }
      spouseId = spouse.id;
    } else if (body.nickname) {
      // Create new user with opposite gender
      const newGenderId = user.genderId === 1 ? 2 : 1;
      const newSpouse = await db.insert(users).values({
        nickname: body.nickname,
        name: body.name || null,
        genderId: newGenderId,
      }).returning();
      spouseId = newSpouse[0].id;
    } else {
      return NextResponse.json({ error: 'Provide existingUserId or nickname' }, { status: 400 });
    }

    // Check if couple already exists
    let husbandId: string;
    let wifeId: string;
    if (user.genderId === 1) {
      husbandId = user.id;
      wifeId = spouseId;
    } else {
      husbandId = spouseId;
      wifeId = user.id;
    }

    const existingCouple = await db.query.couples.findFirst({
      where: and(eq(couples.husbandId, husbandId), eq(couples.wifeId, wifeId)),
    });

    if (existingCouple) {
      return NextResponse.json({ error: 'This couple already exists', couple: existingCouple }, { status: 409 });
    }

    const newCouple = await db.insert(couples).values({
      husbandId,
      wifeId,
      marriageDate: body.marriageDate || null,
    }).returning();

    return NextResponse.json({ couple: newCouple[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add spouse' }, { status: 500 });
  }
}