import { handleApi, json, errorResponse } from "@/lib/api";
import { getRequestContext, assertAction, generateId } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = "/home/z/my-project/upload";
const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

export function POST(req: Request) {
  return handleApi(async () => {
    const { permissions } = await getRequestContext();
    assertAction(permissions, "managePersons");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return errorResponse(400, "No file provided");
    if (!ALLOWED_MIME.includes(file.type)) {
      return errorResponse(400, "Unsupported file type. Use PNG, JPG, WebP or GIF.");
    }
    if (file.size > MAX_SIZE) {
      return errorResponse(400, "File too large (max 8MB).");
    }
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const id = generateId("f");
    const filename = `${id}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buf);
    return json({
      filename,
      url: `/api/files/${filename}`,
      size: file.size,
      mime: file.type,
    });
  });
}
