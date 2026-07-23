import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, couples, userMetadata } from '@/db/schema';
import { eq, or, and, like, sql, asc } from 'drizzle-orm';
import type { User, Couple, UserMetadata } from '@/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth';

// Re-export for API routes
export { hashPassword, verifyPassword };

// Session management
const SESSION_COOKIE = 'silsilah_session';

export interface SessionUser {
  id: string;
  nickname: string;
  name: string | null;
  genderId: number;
  email: string | null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionId),
    columns: { id: true, nickname: true, name: true, genderId: true, email: true },
  });
  return user ?? null;
}

export function createSessionCookie(userId: string) {
  return `${SESSION_COOKIE}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

export function deleteSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Admin check
const ADMIN_EMAILS = process.env.SYSTEM_ADMIN_EMAILS
  ? process.env.SYSTEM_ADMIN_EMAILS.split(';').map(e => e.trim())
  : ['admin@silsilah.id'];

export function isAdmin(email: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}

// User queries
export async function getUserWithRelations(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return null;

  let father: User | null = null;
  let mother: User | null = null;
  let parentCouple: Couple | null = null;
  let children: User[] = [];
  let marriages: (Couple & { husband: User; wife: User })[] = [];
  let siblings: User[] = [];
  let metadata: UserMetadata[] = [];

  if (user.fatherId) {
    father = await db.query.users.findFirst({ where: eq(users.id, user.fatherId) }) ?? null;
  }
  if (user.motherId) {
    mother = await db.query.users.findFirst({ where: eq(users.id, user.motherId) }) ?? null;
  }
  if (user.parentId) {
    parentCouple = await db.query.couples.findFirst({ where: eq(couples.id, user.parentId) }) ?? null;
  }

  if (user.genderId === 1) {
    children = await db.select().from(users).where(eq(users.fatherId, userId)).orderBy(asc(users.birthOrder));
  } else if (user.genderId === 2) {
    children = await db.select().from(users).where(eq(users.motherId, userId)).orderBy(asc(users.birthOrder));
  }

  if (user.genderId === 1) {
    const m = await db.select().from(couples).where(eq(couples.husbandId, userId)).orderBy(asc(couples.marriageDate));
    for (const c of m) {
      const wife = await db.query.users.findFirst({ where: eq(users.id, c.wifeId) });
      const husband = await db.query.users.findFirst({ where: eq(users.id, c.husbandId) });
      if (wife && husband) marriages.push({ ...c, husband, wife });
    }
  } else if (user.genderId === 2) {
    const m = await db.select().from(couples).where(eq(couples.wifeId, userId)).orderBy(asc(couples.marriageDate));
    for (const c of m) {
      const wife = await db.query.users.findFirst({ where: eq(users.id, c.wifeId) });
      const husband = await db.query.users.findFirst({ where: eq(users.id, c.husbandId) });
      if (wife && husband) marriages.push({ ...c, husband, wife });
    }
  }

  const conditions: any[] = [];
  if (user.fatherId) conditions.push(eq(users.fatherId, user.fatherId));
  if (user.motherId) conditions.push(eq(users.motherId, user.motherId));
  if (user.parentId) conditions.push(eq(users.parentId, user.parentId));

  if (conditions.length > 0) {
    siblings = await db.select().from(users).where(
      and(or(...conditions), sql`${users.id} != ${userId}`)
    ).orderBy(asc(users.birthOrder));
  }

  metadata = await db.select().from(userMetadata).where(eq(userMetadata.userId, userId));

  return { user, father, mother, parentCouple, children, marriages, siblings, metadata };
}

// Search users
export async function searchUsers(query: string, page: number = 1, perPage: number = 24) {
  const whereClause = or(
    like(users.name, `%${query}%`),
    like(users.nickname, `%${query}%`),
    like(users.email, `%${query}%`)
  );

  const [results, countResult] = await Promise.all([
    db.select().from(users).where(whereClause).limit(perPage).offset((page - 1) * perPage).orderBy(asc(users.name)),
    db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  return { users: results, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

// Get upcoming birthdays
export async function getUpcomingBirthdays(days: number = 60) {
  const allUsers = await db.select().from(users).where(sql`${users.dob} IS NOT NULL`);
  const today = new Date();
  const upcoming: (User & { daysRemaining: number; nextBirthday: Date; nextAge: number })[] = [];

  for (const user of allUsers) {
    if (!user.dob) continue;
    const birthDate = new Date(user.dob);
    let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBirthday < today) {
      nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
    }
    const diffMs = nextBirthday.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysRemaining <= days) {
      upcoming.push({
        ...user,
        daysRemaining,
        nextBirthday,
        nextAge: nextBirthday.getFullYear() - birthDate.getFullYear(),
      });
    }
  }

  return upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// Get family chart data
export async function getFamilyChartData(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;

  let paternalGrandfather: User | null = null;
  let paternalGrandmother: User | null = null;
  let maternalGrandfather: User | null = null;
  let maternalGrandmother: User | null = null;

  if (user.fatherId) {
    const father = await db.query.users.findFirst({ where: eq(users.id, user.fatherId) });
    if (father) {
      if (father.fatherId) paternalGrandfather = await db.query.users.findFirst({ where: eq(users.id, father.fatherId) }) ?? null;
      if (father.motherId) paternalGrandmother = await db.query.users.findFirst({ where: eq(users.id, father.motherId) }) ?? null;
    }
  }

  if (user.motherId) {
    const mother = await db.query.users.findFirst({ where: eq(users.id, user.motherId) });
    if (mother) {
      if (mother.fatherId) maternalGrandfather = await db.query.users.findFirst({ where: eq(users.id, mother.fatherId) }) ?? null;
      if (mother.motherId) maternalGrandmother = await db.query.users.findFirst({ where: eq(users.id, mother.motherId) }) ?? null;
    }
  }

  let father: User | null = null;
  let mother: User | null = null;
  if (user.fatherId) father = await db.query.users.findFirst({ where: eq(users.id, user.fatherId) }) ?? null;
  if (user.motherId) mother = await db.query.users.findFirst({ where: eq(users.id, user.motherId) }) ?? null;

  const childrenResult = await db.select().from(users).where(
    user.genderId === 1 ? eq(users.fatherId, userId) : eq(users.motherId, userId)
  ).orderBy(asc(users.birthOrder));

  const childrenWithGrandchildren = await Promise.all(
    childrenResult.map(async (child) => {
      const grandchildren = await db.select().from(users).where(
        child.genderId === 1 ? eq(users.fatherId, child.id) : eq(users.motherId, child.id)
      ).orderBy(asc(users.birthOrder));
      return { child, grandchildren };
    })
  );

  const conditions: any[] = [];
  if (user.fatherId) conditions.push(eq(users.fatherId, user.fatherId));
  if (user.motherId) conditions.push(eq(users.motherId, user.motherId));
  if (user.parentId) conditions.push(eq(users.parentId, user.parentId));

  let siblingsWithDesc: { sibling: User; children: User[]; grandchildren: User[] }[] = [];
  if (conditions.length > 0) {
    const siblingResults = await db.select().from(users).where(
      and(or(...conditions), sql`${users.id} != ${userId}`)
    ).orderBy(asc(users.birthOrder));

    siblingsWithDesc = await Promise.all(
      siblingResults.map(async (sibling) => {
        const sibChildren = await db.select().from(users).where(
          sibling.genderId === 1 ? eq(users.fatherId, sibling.id) : eq(users.motherId, sibling.id)
        ).orderBy(asc(users.birthOrder));

        const sibGrandchildren = await Promise.all(
          sibChildren.map(async (sc) => {
            return db.select().from(users).where(
              sc.genderId === 1 ? eq(users.fatherId, sc.id) : eq(users.motherId, sc.id)
            ).orderBy(asc(users.birthOrder));
          })
        );

        return { sibling, children: sibChildren, grandchildren: sibGrandchildren.flat() };
      })
    );
  }

  return {
    user,
    paternalGrandfather,
    paternalGrandmother,
    maternalGrandfather,
    maternalGrandmother,
    father,
    mother,
    childrenWithGrandchildren,
    siblingsWithDesc,
  };
}