import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext, assertAction, generateId } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const { permissions, session } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const { id } = await params;
    const body = await req.json();
    const { status, password } = body;
    if (status !== "approved" && status !== "rejected") return errorResponse(400, "Invalid status");
    const reqRow = sqlite.prepare("SELECT * FROM registration_requests WHERE id = ?").get(id) as any;
    if (!reqRow) return errorResponse(404, "Request not found");
    if (reqRow.status !== "pending") return errorResponse(400, "Request already processed");

    if (status === "approved") {
      if (!password) return errorResponse(400, "Password required for approval");
      const userId = generateId("u");
      const hash = bcrypt.hashSync(password, 10);
      sqlite.prepare("INSERT INTO users (id, email, password_hash, name, role_id, person_id, is_active) VALUES (?, ?, ?, ?, 'role_editor', ?, 1)").run(userId, reqRow.email, hash, reqRow.name, reqRow.person_id);
      logAudit({ user_id: session?.id ?? null, user_name: session?.name ?? null, action: "create", entity_type: "user", entity_id: userId, entity_name: reqRow.email });
    }

    sqlite.prepare("UPDATE registration_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?").run(status, session?.id ?? null, id);
    return json({ ok: true });
  });
}
