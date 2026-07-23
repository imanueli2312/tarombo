import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

    let motherId: string;

    if (body.existingUserId) {
      const mother = await db.query.users.findFirst({ where: eq(users.id, body.existingUserId) });
      if (!mother) {
        return NextResponse.json({ error: 'Mother user not found' }, { status: 404 });
      }
      if (mother.genderId !== 2) {
        return NextResponse.json({ error: 'Selected user is not female' }, { status: 400 });
      }
      motherId = mother.id;
    } else if (body.nickname) {
      const newMother = await db.insert(users).values({
        nickname: body.nickname,
        name: body.name || null,
        genderId: 2,
      }).returning();
      motherId = newMother[0].id;
    } else {
      return NextResponse.json({ error: 'Provide existingUserId or nickname' }, { status: 400 });
    }

    await db.update(users).set({ motherId }).where(eq(users.id, userId));

    return NextResponse.json({ success: true, motherId });
  } catch {
    return NextResponse.json({ error: 'Failed to set mother' }, { status: 500 });
  }
}