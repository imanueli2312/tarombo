import { db } from "@/lib/db";

/**
 * Handle auto-divorce when a person dies.
 * Deactivates all active marriages and sets the spouse's marital status to WIDOWED.
 *
 * Uses the return value from updateMany (count) + a targeted re-query
 * instead of fragile timestamp comparison.
 */
export async function handleDeathAutoDivorce(personId: string, gender: string) {
  const now = new Date();

  if (gender === "MALE") {
    // Find active marriages BEFORE deactivating (to get spouse IDs)
    const activeMarriages = await db.marriage.findMany({
      where: {
        husbandId: personId,
        isActive: true,
      },
      select: { id: true, wifeId: true },
    });

    if (activeMarriages.length === 0) return;

    const wifeIds = activeMarriages.map((m) => m.wifeId);

    // Deactivate all at once
    await db.marriage.updateMany({
      where: {
        id: { in: activeMarriages.map((m) => m.id) },
      },
      data: {
        isActive: false,
        divorceDate: now,
      },
    });

    // Update wives' marital status to WIDOWED
    await db.person.updateMany({
      where: { id: { in: wifeIds } },
      data: { maritalStatus: "WIDOWED" },
    });
  } else if (gender === "FEMALE") {
    // Find active marriages BEFORE deactivating (to get spouse IDs)
    const activeMarriages = await db.marriage.findMany({
      where: {
        wifeId: personId,
        isActive: true,
      },
      select: { id: true, husbandId: true },
    });

    if (activeMarriages.length === 0) return;

    const husbandIds = activeMarriages.map((m) => m.husbandId);

    // Deactivate all at once
    await db.marriage.updateMany({
      where: {
        id: { in: activeMarriages.map((m) => m.id) },
      },
      data: {
        isActive: false,
        divorceDate: now,
      },
    });

    // Update husbands' marital status to WIDOWED
    await db.person.updateMany({
      where: { id: { in: husbandIds } },
      data: { maritalStatus: "WIDOWED" },
    });
  }
}