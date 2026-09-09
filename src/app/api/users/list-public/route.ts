import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

/** GET /api/users/list-public
 *  Publik (tanpa login). Mengembalikan daftar user minimal (id, name, roleName, roleColor)
 *  untuk dropdown login. Tidak mengembalikan email/password/data sensitif.
 */
export async function GET() {
  try {
    const rows = sqlite
      .prepare(
        `SELECT u.id, u.name, r.name AS role_name, r.color AS role_color
         FROM user u
         LEFT JOIN role r ON u.role_id = r.id
         ORDER BY r.sort_order ASC, u.created_at ASC`,
      )
      .all() as {
      id: string;
      name: string;
      role_name: string | null;
      role_color: string | null;
    }[];

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        roleName: r.role_name,
        roleColor: r.role_color,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
