import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAllPermissions, updatePermission, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { readJsonBody, assertSameOrigin } from '@/lib/http';
import { permissionUpdateSchema, firstIssueMessage } from '@/lib/schemas';

async function GETHandler(request: NextRequest) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'manage_permissions')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const permissions = getAllPermissions(db);
    return NextResponse.json(permissions);
  } catch (error) {
    console.error('[api/rbac/permissions]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

async function PUTHandler(request: NextRequest) {
  try {
    // Lapis kedua CSRF (audit S-13)
    const originErr = assertSameOrigin(request);
    if (originErr) return originErr;

    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'manage_permissions')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Audit S-03: guard JSON 400/413 (dulunya malformed JSON → 500)
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = permissionUpdateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }
    const { id, allowed } = validated.data;

    const permission = updatePermission(db, id, allowed);
    return NextResponse.json(permission);
  } catch (error) {
    console.error('[api/rbac/permissions]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const GET = withApiLogging(GETHandler, 'GET /rbac/permissions');
export const PUT = withApiLogging(PUTHandler, 'PUT /rbac/permissions');
