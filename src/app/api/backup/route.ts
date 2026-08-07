import { sqlite } from "@/lib/database";
import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext, assertAction } from "@/lib/auth";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

export const dynamic = "force-dynamic";

const DB_PATH = path.join(process.cwd(), "db", "hariandja.db");

export function GET() {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    if (!fs.existsSync(DB_PATH)) return errorResponse(404, "Database not found");
    const data = fs.readFileSync(DB_PATH);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="hariandja-backup-${date}.db"`,
      },
    });
  });
}

export function POST(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "manageUsers");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return errorResponse(400, "No file provided");
    const buf = Buffer.from(await file.arrayBuffer());
    // Write to temp file, validate, then swap
    const tmpPath = DB_PATH + ".restore-tmp";
    fs.writeFileSync(tmpPath, buf);
    // Validate it's a valid SQLite db
    try {
      const testDb = new Database(tmpPath, { readonly: true });
      testDb.close();
    } catch {
      try { fs.unlinkSync(tmpPath); } catch {}
      return errorResponse(400, "Invalid database file");
    }
    // Close WAL files, swap, reopen
    try { fs.unlinkSync(DB_PATH + "-wal"); } catch {}
    try { fs.unlinkSync(DB_PATH + "-shm"); } catch {}
    fs.renameSync(tmpPath, DB_PATH);
    // Touch the live connection so it picks up the new data on next request
    try { sqlite.pragma("wal_checkpoint(FULL)"); } catch {}
    return json({ ok: true, message: "Database restored" });
  });
}
