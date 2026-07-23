import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, userMetadata } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getSessionFromRequest, getFullUserFromRequest } from '@/lib/api/session';
import { getUserWithRelations, hashPassword, isAdmin } from '@/lib/auth-server';

function extractIdFromPath(pathname: string): string {
  const parts = pathname.split('/');
  return parts[parts.length - 1];
}

export async function GET(request: NextRequest) {
  const id = extractIdFromPath(request.nextUrl.pathname);
  const result = await getUserWithRelations(id);

  if (!result) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = extractIdFromPath(request.nextUrl.pathname);
    const body = await request.json();

    const updateData: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` };

    if (body.nickname !== undefined) updateData.nickname = body.nickname;
    if (body.name !== undefined) updateData.name = body.name || null;
    if (body.genderId !== undefined) updateData.genderId = body.genderId;
    if (body.dob !== undefined) updateData.dob = body.dob || null;
    if (body.yob !== undefined) {
      updateData.yob = body.yob || null;
    } else if (body.dob) {
      updateData.yob = body.dob.substring(0, 4);
    }
    if (body.dod !== undefined) updateData.dod = body.dod || null;
    if (body.yod !== undefined) {
      updateData.yod = body.yod || null;
    } else if (body.dod) {
      updateData.yod = body.dod.substring(0, 4);
    }
    if (body.birthOrder !== undefined) updateData.birthOrder = body.birthOrder || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.city !== undefined) updateData.city = body.city || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.password) {
      updateData.password = hashPassword(body.password);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    // Handle metadata fields (cemetery location)
    const metadataKeys = [
      'cemetery_location_name',
      'cemetery_location_address',
      'cemetery_location_latitude',
      'cemetery_location_longitude',
    ];

    for (const key of metadataKeys) {
      if (body[key] !== undefined) {
        const existing = await db.query.userMetadata.findFirst({
          where: (m, { and: and2 }) => and2(eq(userMetadata.userId, id), eq(userMetadata.key, key)),
        });
        if (existing) {
          await db.update(userMetadata)
            .set({ value: body[key] || null, updatedAt: sql`(datetime('now'))` })
            .where(eq(userMetadata.id, existing.id));
        } else if (body[key]) {
          await db.insert(userMetadata).values({
            userId: id,
            key,
            value: body[key],
          });
        }
      }
    }

    const updated = await getUserWithRelations(id);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fullUser = await getFullUserFromRequest(request);
    if (!fullUser || !(isAdmin(fullUser.email) || fullUser.managerId)) {
      return NextResponse.json({ error: 'Forbidden: only admin or manager can delete users' }, { status: 403 });
    }

    const id = extractIdFromPath(request.nextUrl.pathname);

    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}