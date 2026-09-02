import { NextResponse } from 'next/server';
import { getDb, getTreeData } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const tree = getTreeData(db);
    return NextResponse.json(tree);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
