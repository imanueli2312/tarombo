import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  const females = await db.select({
    id: users.id,
    nickname: users.nickname,
    name: users.name,
  }).from(users).where(eq(users.genderId, 2)).orderBy(asc(users.name));

  return NextResponse.json(females);
}