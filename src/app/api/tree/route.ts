import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getTreeData, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';

async function GETHandler(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'view_tree')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const tree = getTreeData(db);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('[api/tree]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /tree');
