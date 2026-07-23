import { NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@/db/schema';

const SESSION_COOKIE = 'silsilah_session';

export interface SessionUser {
  id: string;
  nickname: string;
  name: string | null;
  genderId: number;
  email: string | null;
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionId),
    columns: { id: true, nickname: true, name: true, genderId: true, email: true },
  });
  return user ?? null;
}

export async function getFullUserFromRequest(request: NextRequest): Promise<User | null> {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionId),
  });
  return user ?? null;
}