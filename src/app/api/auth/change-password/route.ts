import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/api/session';
import { verifyPassword, hashPassword } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword, newPasswordConfirmation } = body;

    if (!oldPassword || !newPassword || !newPasswordConfirmation) {
      return NextResponse.json({ error: 'All password fields are required' }, { status: 400 });
    }

    if (newPassword !== newPasswordConfirmation) {
      return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id),
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'User has no password set' }, { status: 400 });
    }

    if (!verifyPassword(oldPassword, user.password)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const hashed = hashPassword(newPassword);
    await db.update(users).set({ password: hashed }).where(eq(users.id, session.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Password change failed' }, { status: 500 });
  }
}