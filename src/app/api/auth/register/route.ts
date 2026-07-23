import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, createSessionCookie } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nickname, name, genderId, email, password, passwordConfirmation } = body;

    if (!nickname || !genderId || !password) {
      return NextResponse.json({ error: 'Nickname, gender, and password are required' }, { status: 400 });
    }

    if (password !== passwordConfirmation) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (email) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    const hashedPassword = hashPassword(password);
    const newUser = await db.insert(users).values({
      nickname,
      name: name || null,
      genderId,
      email: email || null,
      password: hashedPassword,
    }).returning();

    const user = newUser[0];
    const { password: _, ...userWithoutPassword } = user;
    const response = NextResponse.json({ user: userWithoutPassword }, { status: 201 });
    response.headers.set('Set-Cookie', createSessionCookie(user.id));
    return response;
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}