import { NextRequest, NextResponse } from 'next/server';
import { deleteSessionCookie } from '@/lib/auth-server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', deleteSessionCookie());
  return response;
}