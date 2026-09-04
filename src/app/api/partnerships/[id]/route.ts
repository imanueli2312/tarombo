import { withApiLogging } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPartnershipById, updatePartnership, deletePartnership, hasPermission } from '@/lib/db';
import { getAuthUserAsync } from '@/lib/auth';
import { validateDivorceAfterMarriage } from '@/lib/validation';
import { readJsonBody, assertSameOrigin } from '@/lib/http';
import { partnershipUpdateSchema, firstIssueMessage } from '@/lib/schemas';

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lapis kedua CSRF (audit S-13)
    const originErr = assertSameOrigin(request);
    if (originErr) return originErr;

    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'edit_marriage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getPartnershipById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pernikahan tidak ditemukan' }, { status: 404 });
    }

    // Audit S-03 + R-01: guard JSON + zod menggantikan cast `as` mentah
    const parsed = await readJsonBody<unknown>(request);
    if (!parsed.ok) return parsed.response;
    const validated = partnershipUpdateSchema.safeParse(parsed.data);
    if (!validated.success) {
      return NextResponse.json({ error: firstIssueMessage(validated.error) }, { status: 400 });
    }
    const { marriage_date, divorce_date } = validated.data;

    // Validate divorce >= marriage (merge with existing values for partial updates)
    const effectiveMarriage = marriage_date ?? existing.marriage_date;
    const effectiveDivorce = divorce_date ?? existing.divorce_date;
    const dateErr = validateDivorceAfterMarriage(effectiveMarriage, effectiveDivorce);
    if (dateErr) return NextResponse.json({ error: dateErr }, { status: 400 });

    const partnership = updatePartnership(db, id, { marriage_date, divorce_date });
    return NextResponse.json(partnership);
  } catch (error) {
    console.error('[api/partnerships/:id]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthUserAsync(request);
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(db, session.role, 'delete_marriage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const existing = getPartnershipById(db, id);
    if (!existing) {
      return NextResponse.json({ error: 'Pernikahan tidak ditemukan' }, { status: 404 });
    }

    const result = deletePartnership(db, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/partnerships/:id]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const PUT = withApiLogging(PUTHandler, 'PUT /partnerships/[id]');
export const DELETE = withApiLogging(DELETEHandler, 'DELETE /partnerships/[id]');
