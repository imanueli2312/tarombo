import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { canManageUsers, hasPermission } from "@/lib/rbac";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().email("Email tidak valid"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
});

// POST /api/auth/register - Register a new user (ADMIN only, or open registration for first user)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userCount = await db.user.count();

    // Allow registration if no users exist (first admin setup)
    // or if the requester is an ADMIN
    if (userCount > 0 && !session) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }

    if (userCount > 0 && session) {
      const userRole = (session.user as Record<string, unknown>)?.role as
        | string
        | undefined;
      if (!canManageUsers(userRole as "ADMIN" | "EDITOR" | "VIEWER")) {
        return NextResponse.json(
          { error: "Forbidden - Hanya Administrator yang dapat menambahkan pengguna" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Determine role
    let role: "ADMIN" | "EDITOR" | "VIEWER" = "VIEWER";
    if (userCount === 0) {
      role = "ADMIN"; // First user is always admin
    } else if (validated.role && session) {
      const userRole = (session.user as Record<string, unknown>)?.role as
        | string
        | undefined;
      // Can only assign roles at or below own level
      if (validated.role === "VIEWER") {
        role = "VIEWER";
      } else if (
        validated.role === "EDITOR" &&
        hasPermission(userRole as "ADMIN" | "EDITOR" | "VIEWER", "ADMIN")
      ) {
        role = "EDITOR";
      } else if (
        validated.role === "ADMIN" &&
        hasPermission(userRole as "ADMIN" | "EDITOR" | "VIEWER", "ADMIN")
      ) {
        role = "ADMIN";
      }
    }

    const user = await db.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        password: hashedPassword,
        role,
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// GET /api/auth/register - Get all users (ADMIN only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>)?.role as
      | string
      | undefined;
    if (!canManageUsers(userRole as "ADMIN" | "EDITOR" | "VIEWER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}