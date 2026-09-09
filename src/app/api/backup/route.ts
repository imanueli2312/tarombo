import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  getActiveUserWithPermissions,
  PermissionDeniedError,
  requirePermission,
} from "@/lib/tarombo/auth";
import { logActivity } from "@/lib/tarombo/security";
import type { PersonRow, PartnershipRow, RoleRow, UserRow } from "@/lib/tarombo/queries";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * GET /api/backup — export seluruh data sebagai JSON (untuk backup).
 *  Butuh permission data:reset (admin only) karena mengandung user data.
 *  Format: { version, exportedAt, exportedBy, data: { persons, partnerships, users, roles, activityLog } }
 */
export async function GET() {
  try {
    const me = await requirePermission("data:reset");

    const persons = sqlite
      .prepare("SELECT * FROM person WHERE deleted_at IS NULL")
      .all() as PersonRow[];
    const partnerships = sqlite
      .prepare("SELECT * FROM partnership WHERE deleted_at IS NULL")
      .all() as PartnershipRow[];
    const roles = sqlite.prepare("SELECT * FROM role").all() as RoleRow[];
    const users = sqlite
      .prepare(
        "SELECT id, email, name, password, photo, phone, role_id, linked_person_id, last_login_at, created_at, updated_at FROM user",
      )
      .all() as UserRow[];
    const activityLog = sqlite
      .prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 500")
      .all();

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: me.name,
      data: { persons, partnerships, users, roles, activityLog },
    };

    logActivity({
      userId: me.id,
      userName: me.name,
      action: "export",
      entityType: "data",
      entityName: "Backup JSON",
    });

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tarombo-backup-${stamp}.json"`,
      },
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/backup — import/restore dari file JSON backup.
 *  Body: JSON backup file content.
 *  Mode merge: bila ID sudah ada, skip. Bila belum ada, insert.
 *  Password user tetap pakai hash dari backup (atau plain-text yang akan
 *  di-upgrade saat login berikutnya).
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requirePermission("data:reset");
    const body = await req.json();

    if (!body || !body.data) {
      return NextResponse.json(
        { error: "Format backup tidak valid: field 'data' tidak ditemukan." },
        { status: 400 },
      );
    }

    const data = body.data;
    const stats = {
      persons: 0,
      partnerships: 0,
      users: 0,
      roles: 0,
      skipped: 0,
    };

    const insertPerson = sqlite.prepare(
      `INSERT OR IGNORE INTO person (id, full_name, nickname, birth_place, birth_date, death_date,
         birth_order, gender, address, religion, phone, photo, marital_status, generation_number,
         burial_name, burial_address, burial_lat, burial_lng, father_id, mother_id, created_at, updated_at)
       VALUES (@id, @full_name, @nickname, @birth_place, @birth_date, @death_date,
         @birth_order, @gender, @address, @religion, @phone, @photo, @marital_status, @generation_number,
         @burial_name, @burial_address, @burial_lat, @burial_lng, @father_id, @mother_id, @created_at, @updated_at)`,
    );
    const insertPartnership = sqlite.prepare(
      `INSERT OR IGNORE INTO partnership (id, husband_id, wife_id, marriage_date, divorce_date, status, created_at, updated_at)
       VALUES (@id, @husband_id, @wife_id, @marriage_date, @divorce_date, @status, @created_at, @updated_at)`,
    );
    const insertRole = sqlite.prepare(
      `INSERT OR IGNORE INTO role (id, name, description, color, icon, permissions, is_system, sort_order, created_at, updated_at)
       VALUES (@id, @name, @description, @color, @icon, @permissions, @is_system, @sort_order, @created_at, @updated_at)`,
    );
    const insertUser = sqlite.prepare(
      `INSERT OR IGNORE INTO user (id, email, name, password, photo, phone, role_id, linked_person_id, last_login_at, created_at, updated_at)
       VALUES (@id, @email, @name, @password, @photo, @phone, @role_id, @linked_person_id, @last_login_at, @created_at, @updated_at)`,
    );

    // Insert dalam transaction
    const tx = sqlite.transaction(() => {
      // roles dulu (karena user merefer ke role)
      for (const r of data.roles ?? []) {
        const res = insertRole.run(r);
        if (res.changes > 0) stats.roles++;
        else stats.skipped++;
      }
      // persons
      for (const p of data.persons ?? []) {
        const res = insertPerson.run(p);
        if (res.changes > 0) stats.persons++;
        else stats.skipped++;
      }
      // partnerships
      for (const p of data.partnerships ?? []) {
        const res = insertPartnership.run(p);
        if (res.changes > 0) stats.partnerships++;
        else stats.skipped++;
      }
      // users
      for (const u of data.users ?? []) {
        const res = insertUser.run(u);
        if (res.changes > 0) stats.users++;
        else stats.skipped++;
      }
    });
    tx();

    logActivity({
      userId: me.id,
      userName: me.name,
      action: "backup_restore",
      entityType: "data",
      entityName: "Import backup JSON",
      details: stats,
    });

    return NextResponse.json({
      success: true,
      message: "Backup berhasil dipulihkan.",
      stats,
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
