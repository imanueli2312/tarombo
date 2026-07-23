import { NextRequest, NextResponse } from 'next/server';
import { getFamilyChartData } from '@/lib/auth-server';

function extractIdFromPath(pathname: string): string {
  const parts = pathname.split('/');
  // /api/users/[id]/chart -> id is at index 3
  return parts[3];
}

export async function GET(request: NextRequest) {
  const id = extractIdFromPath(request.nextUrl.pathname);
  const data = await getFamilyChartData(id);

  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}