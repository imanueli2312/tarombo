import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-static";

const UPLOAD_DIR = "/home/z/my-project/upload";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return (async () => {
    const { path: parts } = await params;
    const filename = parts.join("/");
    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Not found", { status: 404 });
    }
    const filepath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return new NextResponse("Not found", { status: 404 });
    }
    const ext = path.extname(filename).toLowerCase();
    const mime = MIME[ext] ?? "application/octet-stream";
    const buf = fs.readFileSync(filepath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  })();
}
