import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext, assertAction, generateId, HTTPError } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const rows = sqlite.prepare("SELECT r.*, p.name as person_name FROM registration_requests r LEFT JOIN persons p ON p.id = r.person_id ORDER BY r.created_at DESC").all();
    return json(rows);
  });
}

export function POST(req: Request) {
  return handleApi(async () => {
    const body = await req.json();
    const { email, name, person_id } = body;
    if (!email || !name) return errorResponse(400, "Email and name are required");
    // Check if email already exists in users
    const existingUser = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existingUser) return errorResponse(409, "Email already registered as a user");
    // Check if there's already a pending request
    const existingReq = sqlite.prepare("SELECT id FROM registration_requests WHERE email = ? AND status = 'pending'").get(email);
    if (existingReq) return errorResponse(409, "A pending request already exists for this email");
    const id = generateId("reg");
    sqlite.prepare("INSERT INTO registration_requests (id, email, name, person_id, status) VALUES (?, ?, ?, ?, 'pending')").run(id, email, name, person_id || null);
    return json({ ok: true, id }, 201);
  });
}
