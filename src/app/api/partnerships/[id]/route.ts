import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partnershipSchema } from "@/lib/tarombo/types";
import {
  assertNoActivePartner,
  deriveMaritalStatus,
  serializePartnership,
  serializePerson,
} from "@/lib/tarombo/queries";
import { PermissionDeniedError, requirePermission } from "@/lib/tarombo/auth";

/** GET /api/partnerships/[id] — butuh person:view */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("person:view");
    const { id } = await params;
    const partnership = await db.partnership.findUnique({
      where: { id },
      include: { husband: true, wife: true },
    });
    if (!partnership)
      return NextResponse.json({ error: "Pasangan tidak ditemukan" }, { status: 404 });

    return NextResponse.json({
      data: {
        ...serializePartnership(partnership),
        husband: serializePerson(partnership.husband),
        wife: serializePerson(partnership.wife),
      },
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/partnerships/[id] — butuh partnership:edit
 *  Validasi: bila status diubah menjadi ACTIVE, pastikan keduanya belum
 *  memiliki pasangan aktif lain.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("partnership:edit");
    const { id } = await params;
    const existing = await db.partnership.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Pasangan tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const parsed = partnershipSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (data.husbandId && data.wifeId && data.husbandId === data.wifeId) {
      return NextResponse.json(
        { error: "Suami dan istri tidak boleh orang yang sama" },
        { status: 400 },
      );
    }

    // Validasi pasangan aktif jika status berubah menjadi ACTIVE
    const willBeActive = data.status === "ACTIVE" && existing.status !== "ACTIVE";
    if (willBeActive) {
      await assertNoActivePartner(existing.husbandId, id);
      await assertNoActivePartner(existing.wifeId, id);
    }

    const updated = await db.partnership.update({
      where: { id },
      data,
      include: { husband: true, wife: true },
    });

    // Sinkronkan marital status kedua pihak
    for (const personId of [updated.husbandId, updated.wifeId]) {
      const ps = await db.partnership.findMany({
        where: { OR: [{ husbandId: personId }, { wifeId: personId }] },
        select: { status: true },
      });
      const person = await db.person.findUnique({ where: { id: personId } });
      if (person) {
        const ms = deriveMaritalStatus(ps, person.deathDate !== null);
        await db.person.update({ where: { id: personId }, data: { maritalStatus: ms } });
      }
    }

    return NextResponse.json({
      data: {
        ...serializePartnership(updated),
        husband: serializePerson(updated.husband),
        wife: serializePerson(updated.wife),
      },
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** DELETE /api/partnerships/[id] — butuh partnership:delete */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("partnership:delete");
    const { id } = await params;
    const existing = await db.partnership.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Pasangan tidak ditemukan" }, { status: 404 });

    await db.partnership.delete({ where: { id } });

    // Recompute marital status kedua pihak
    for (const personId of [existing.husbandId, existing.wifeId]) {
      const ps = await db.partnership.findMany({
        where: { OR: [{ husbandId: personId }, { wifeId: personId }] },
        select: { status: true },
      });
      const person = await db.person.findUnique({ where: { id: personId } });
      if (person) {
        const ms = deriveMaritalStatus(ps, person.deathDate !== null);
        await db.person.update({ where: { id: personId }, data: { maritalStatus: ms } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
