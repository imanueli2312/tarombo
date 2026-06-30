import { db } from "@/lib/db";

// Handle auto-divorce when a person dies
export async function handleDeathAutoDivorce(personId: string, gender: string) {
  const now = new Date();

  if (gender === "MALE") {
    // Deactivate all active marriages where this person is the husband
    await db.marriage.updateMany({
      where: {
        husbandId: personId,
        isActive: true,
        divorceDate: null,
      },
      data: {
        isActive: false,
        divorceDate: now,
      },
    });

    // Update wives' marital status to WIDOWED
    const activeMarriages = await db.marriage.findMany({
      where: {
        husbandId: personId,
        isActive: false,
      },
      include: { wife: { select: { id: true } } },
    });

    for (const marriage of activeMarriages.filter(m => m.divorceDate?.getTime() === now.getTime())) {
      await db.person.update({
        where: { id: marriage.wifeId },
        data: { maritalStatus: "WIDOWED" },
      });
    }
  } else if (gender === "FEMALE") {
    // Deactivate all active marriages where this person is the wife
    await db.marriage.updateMany({
      where: {
        wifeId: personId,
        isActive: true,
        divorceDate: null,
      },
      data: {
        isActive: false,
        divorceDate: now,
      },
    });

    // Update husbands' marital status to WIDOWED
    const activeMarriages = await db.marriage.findMany({
      where: {
        wifeId: personId,
        isActive: false,
      },
      include: { husband: { select: { id: true } } },
    });

    for (const marriage of activeMarriages.filter(m => m.divorceDate?.getTime() === now.getTime())) {
      await db.person.update({
        where: { id: marriage.husbandId },
        data: { maritalStatus: "WIDOWED" },
      });
    }
  }
}