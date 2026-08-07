import { sqlite } from "@/lib/database";
import { handleApi, json } from "@/lib/api";
import { getRequestContext, assertAction } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const rows = sqlite
      .prepare("SELECT * FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 200")
      .all();
    return json(rows);
  });
}
