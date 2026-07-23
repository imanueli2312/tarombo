import { NextRequest, NextResponse } from 'next/server';
import { searchUsers } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!q.trim()) {
    return NextResponse.json({ users: [], total: 0, page: 1, perPage: 24, totalPages: 0 });
  }

  const result = await searchUsers(q, page, 24);
  return NextResponse.json(result);
}