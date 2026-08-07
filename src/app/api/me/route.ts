import { handleApi, json } from "@/lib/api";
import { getCurrentSession, getSafeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/me - current session info (or null if anonymous viewer)
export function GET() {
  return handleApi(async () => {
    const session = await getCurrentSession();
    if (!session) {
      return json({ user: null, permissions: null });
    }
    const safe = getSafeUser(session.id);
    return json({
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        role_id: session.role_id,
        role_name: session.role_name,
        person_id: session.person_id,
        person: safe?.person ?? null,
      },
      permissions: session.permissions,
    });
  });
}
