import { sqlite } from "./database";

export interface AuditEntry {
  user_id: string | null;
  user_name: string | null;
  action: "create" | "update" | "delete";
  entity_type: "person" | "spouse" | "user" | "role";
  entity_id: string | null;
  entity_name: string | null;
  changes?: Record<string, { from: any; to: any }>;
}

export function logAudit(entry: AuditEntry): void {
  try {
    sqlite
      .prepare(
        `INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, entity_name, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.user_id,
        entry.user_name,
        entry.action,
        entry.entity_type,
        entry.entity_id,
        entry.entity_name,
        entry.changes ? JSON.stringify(entry.changes) : null
      );
  } catch (e) {
    // Don't let audit logging break the main operation
    console.error("[audit] Failed to log:", e);
  }
}

export function getAuditLog(limit = 100): any[] {
  return sqlite
    .prepare(
      `SELECT * FROM audit_log ORDER BY created_at DESC, id DESC LIMIT ?`
    )
    .all(limit) as any[];
}

// Compute field-level changes between old and new objects
export function diffChanges(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  fields: string[]
): Record<string, { from: any; to: any }> | undefined {
  const changes: Record<string, { from: any; to: any }> = {};
  for (const f of fields) {
    const oldVal = oldObj[f] ?? null;
    const newVal = newObj[f] ?? null;
    if (String(oldVal) !== String(newVal)) {
      changes[f] = { from: oldVal, to: newVal };
    }
  }
  return Object.keys(changes).length > 0 ? changes : undefined;
}
