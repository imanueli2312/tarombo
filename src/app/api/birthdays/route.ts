import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingBirthdays } from '@/lib/auth-server';

export async function GET() {
  const birthdays = await getUpcomingBirthdays(60);
  return NextResponse.json(birthdays);
}