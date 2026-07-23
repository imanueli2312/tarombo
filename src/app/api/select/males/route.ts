import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  const males = await db.select({
    id: users.id,
    nickname: users.nickname,
    name: users.name,
  }).from(users).where(eq(users.genderId, 1)).orderBy(asc(users.name));

  return NextResponse.json(males);
}