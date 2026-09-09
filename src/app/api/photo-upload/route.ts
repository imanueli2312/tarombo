import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  PermissionDeniedError,
  requirePermission,
} from "@/lib/tarombo/auth";
import { logActivity } from "@/lib/tarombo/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

/** POST /api/photo-upload
 *  Body: FormData dengan field "file" (gambar).
 *  Output: { url: "/uploads/<filename>" }
 *  Gambar di-resize ke max 400x400, format webp untuk efisiensi.
 *  Butuh permission person:create atau person:edit.
 */
export async function POST(req: NextRequest) {
  try {
    let me;
    try {
      me = await requirePermission("person:edit");
    } catch {
      me = await requirePermission("person:create");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File gambar wajib diupload (field: file)." },
        { status: 400 },
      );
    }

    // Validasi tipe
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File harus berupa gambar." },
        { status: 400 },
      );
    }
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB." },
        { status: 400 },
      );
    }

    mkdirSync(UPLOAD_DIR, { recursive: true });

    const buf = Buffer.from(await file.arrayBuffer());
    const filename = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const filepath = join(UPLOAD_DIR, filename);

    // Resize ke max 400x400, convert webp
    await sharp(buf)
      .resize(400, 400, { fit: "cover", position: "center" })
      .webp({ quality: 85 })
      .toFile(filepath);

    const url = `/uploads/${filename}`;

    logActivity({
      userId: me.id,
      userName: me.name,
      action: "create",
      entityType: "person",
      entityName: `Photo upload: ${filename}`,
      details: { url, size: file.size },
    });

    return NextResponse.json({ url }, { status: 201 });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
