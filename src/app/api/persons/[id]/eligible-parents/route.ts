import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDescendantIds } from "@/lib/ancestor-utils";

// GET /api/persons/[id]/eligible-parents?role=father|mother
// Returns persons eligible to be set as parent (excludes self and descendants)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get all descendants of this person to exclude them
    const descendantIds = await getDescendantIds(id);
    descendantIds.add(id); // Also exclude self

    // Get males for father selection, females for mother selection
    const { searchParams } = new URL(_request.url);
    const role = searchParams.get("role") || "father";

    const genderFilter = role === "mother" ? "FEMALE" : "MALE";

    const candidates = await db.person.findMany({
      where: {
        gender: genderFilter,
        id: { notIn: Array.from(descendantIds) },
      },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        gender: true,
        birthOrder: true,
      },
      orderBy: [{ fullName: "asc" }],
    });

    return NextResponse.json(candidates);
  } catch (error) {
    console.error("Get eligible parents error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}