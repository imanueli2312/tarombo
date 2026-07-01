import { db } from "@/lib/db";

interface AuditLogEntry {
  userId?: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        userName: entry.userName ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit logging should never break the main operation
    console.error("Failed to write audit log:", err);
  }
}

// Helper to get user info from session
export function getSessionUserInfo(session: unknown): { userId: string; userName: string } | null {
  if (!session || typeof session !== "object" || !("user" in session)) return null;
  const user = session.user as Record<string, unknown>;
  const userId = user?.userId as string;
  const userName = (user?.name as string) || (user?.email as string) || "Unknown";
  if (!userId) return null;
  return { userId, userName };
}