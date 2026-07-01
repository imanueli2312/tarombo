import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUpdate } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "persons");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getUserRole(session: unknown): Role | undefined {
  if (!session || typeof session !== "object" || !("user" in session)) return undefined;
  return (session.user as Record<string, unknown>)?.role as Role | undefined;
}

// POST /api/upload - Upload a photo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getUserRole(session);
    if (!canUpdate(role)) {
      return NextResponse.json(
        { error: "Forbidden - Anda tidak memiliki izin untuk mengunggah" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5MB" },
        { status: 400 }
      );
    }

    // Generate unique filename (always .jpg since sharp converts to JPEG)
    const filename = `${crypto.randomBytes(16).toString("hex")}.jpg`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    writeFileSync(filePath, Buffer.from(bytes));

    // Compress/resize image for web display
    try {
      const MAX_DIMENSION = 800;
      const QUALITY = 80;

      await sharp(filePath)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: QUALITY })
        .toFile(filePath);
    } catch (compressErr) {
      // If compression fails, the original file is still saved
      console.error("Image compression failed, keeping original:", compressErr);
    }

    const photoPath = `/uploads/persons/${filename}`;

    return NextResponse.json({ photoPath }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengunggah file" },
      { status: 500 }
    );
  }
}