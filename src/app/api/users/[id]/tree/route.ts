import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { User } from '@/db/schema';

interface TreeNode {
  user: User;
  children: TreeNode[];
}

function extractIdFromPath(pathname: string): string {
  const parts = pathname.split('/');
  return parts[3];
}

async function buildTree(userId: string, depth: number, maxDepth: number): Promise<TreeNode | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;

  let children: TreeNode[] = [];

  if (depth < maxDepth) {
    const childField = user.genderId === 1 ? users.fatherId : users.motherId;
    const childResults = await db.select().from(users)
      .where(eq(childField, userId))
      .orderBy(asc(users.birthOrder));

    for (const child of childResults) {
      const childTree = await buildTree(child.id, depth + 1, maxDepth);
      if (childTree) children.push(childTree);
    }
  }

  return { user, children };
}

export async function GET(request: NextRequest) {
  const id = extractIdFromPath(request.nextUrl.pathname);
  const tree = await buildTree(id, 0, 6);

  if (!tree) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(tree);
}