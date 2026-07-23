import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, userMetadata } from '@/db/schema';
import { eq } from 'drizzle-orm';

function extractIdFromPath(pathname: string): string {
  const parts = pathname.split('/');
  return parts[3];
}

export async function GET(request: NextRequest) {
  const id = extractIdFromPath(request.nextUrl.pathname);

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, nickname: true, name: true, dod: true, yod: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const metadata = await db.select().from(userMetadata).where(eq(userMetadata.userId, id));

  const metadataMap: Record<string, string | null> = {};
  for (const m of metadata) {
    metadataMap[m.key] = m.value;
  }

  return NextResponse.json({
    ...user,
    cemeteryLocationName: metadataMap['cemetery_location_name'] || null,
    cemeteryLocationAddress: metadataMap['cemetery_location_address'] || null,
    cemeteryLocationLatitude: metadataMap['cemetery_location_latitude'] || null,
    cemeteryLocationLongitude: metadataMap['cemetery_location_longitude'] || null,
  });
}