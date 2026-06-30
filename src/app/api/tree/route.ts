import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface TreeNode {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: "MALE" | "FEMALE";
  birthDate: string | null;
  deathDate: string | null;
  isDeceased: boolean;
  photoPath: string | null;
  birthPlace: string | null;
  maritalStatus: string;
  spouse: {
    id: string;
    fullName: string;
    nickname: string | null;
    gender: "MALE" | "FEMALE";
    birthDate: string | null;
    deathDate: string | null;
    isDeceased: boolean;
    photoPath: string | null;
    maritalStatus: string;
  } | null;
  children: TreeNode[];
  birthOrder: number | null;
}

// GET /api/tree - Get the full tree structure for D3.js
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all persons with their relations
    const persons = await db.person.findMany({
      include: {
        father: { select: { id: true } },
        mother: { select: { id: true } },
        marriagesAsHusband: {
          where: { isActive: true },
          include: {
            wife: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
                gender: true,
                birthDate: true,
                deathDate: true,
                isDeceased: true,
                photoPath: true,
                maritalStatus: true,
              },
            },
          },
        },
        marriagesAsWife: {
          where: { isActive: true },
          include: {
            husband: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
                gender: true,
                birthDate: true,
                deathDate: true,
                isDeceased: true,
                photoPath: true,
                maritalStatus: true,
              },
            },
          },
        },
      },
    });

    // Build a map of person ID to person data
    const personMap = new Map<string, (typeof persons)[0]>();
    for (const person of persons) {
      personMap.set(person.id, person);
    }

    // Find root ancestors (persons with no father)
    // In Batak tarombo, we follow the male lineage
    // Root = male person with no fatherId
    const roots = persons.filter(
      (p) => !p.fatherId && p.gender === "MALE"
    );

    // If no male roots, find any person with no parents
    if (roots.length === 0) {
      const anyRoots = persons.filter((p) => !p.fatherId && !p.motherId);
      if (anyRoots.length > 0) {
        // Build tree from first available root
        const tree = buildTree(anyRoots[0].id, personMap, persons);
        return NextResponse.json(tree);
      }
      return NextResponse.json(null);
    }

    // Build tree from each root
    const trees = roots.map((root) => buildTree(root.id, personMap, persons));

    // If multiple roots, create a virtual root
    if (trees.length === 1) {
      return NextResponse.json(trees[0]);
    }

    // Create a virtual root combining all trees
    const virtualRoot: TreeNode = {
      id: "virtual-root",
      fullName: "Marga Hariandja",
      nickname: "Turunan",
      gender: "MALE",
      birthDate: null,
      deathDate: null,
      isDeceased: false,
      photoPath: null,
      birthPlace: null,
      maritalStatus: "SINGLE",
      spouse: null,
      children: trees,
      birthOrder: null,
    };

    return NextResponse.json(virtualRoot);
  } catch (error) {
    console.error("Get tree error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

function buildTree(
  personId: string,
  personMap: Map<string, (typeof personMap extends Map<string, infer V> ? V : never)>,
  allPersons: (typeof personMap extends Map<string, infer V> ? V : never)[]
): TreeNode {
  const person = personMap.get(personId);
  if (!person) {
    return {
      id: personId,
      fullName: "Tidak Diketahui",
      nickname: null,
      gender: "MALE",
      birthDate: null,
      deathDate: null,
      isDeceased: false,
      photoPath: null,
      birthPlace: null,
      maritalStatus: "SINGLE",
      spouse: null,
      children: [],
      birthOrder: null,
    };
  }

  // Get active spouse
  let spouse: TreeNode["spouse"] = null;
  if (person.marriagesAsHusband.length > 0 && person.marriagesAsHusband[0].isActive) {
    const w = person.marriagesAsHusband[0].wife;
    spouse = {
      id: w.id,
      fullName: w.fullName,
      nickname: w.nickname,
      gender: w.gender,
      birthDate: w.birthDate?.toISOString() ?? null,
      deathDate: w.deathDate?.toISOString() ?? null,
      isDeceased: w.isDeceased,
      photoPath: w.photoPath,
      maritalStatus: w.maritalStatus,
    };
  } else if (person.marriagesAsWife.length > 0 && person.marriagesAsWife[0].isActive) {
    const h = person.marriagesAsWife[0].husband;
    spouse = {
      id: h.id,
      fullName: h.fullName,
      nickname: h.nickname,
      gender: h.gender,
      birthDate: h.birthDate?.toISOString() ?? null,
      deathDate: h.deathDate?.toISOString() ?? null,
      isDeceased: h.isDeceased,
      photoPath: h.photoPath,
      maritalStatus: h.maritalStatus,
    };
  }

  // Find children: persons whose fatherId matches this person
  // In Batak tarombo, children are traced through the father
  const children = allPersons
    .filter((p) => p.fatherId === personId)
    .sort((a, b) => (a.birthOrder ?? 999) - (b.birthOrder ?? 999))
    .map((child) => buildTree(child.id, personMap, allPersons));

  return {
    id: person.id,
    fullName: person.fullName,
    nickname: person.nickname,
    gender: person.gender,
    birthDate: person.birthDate?.toISOString() ?? null,
    deathDate: person.deathDate?.toISOString() ?? null,
    isDeceased: person.isDeceased,
    photoPath: person.photoPath,
    birthPlace: person.birthPlace,
    maritalStatus: person.maritalStatus,
    spouse,
    children,
    birthOrder: person.birthOrder,
  };
}