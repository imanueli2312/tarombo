import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/seed - Seed the database with admin user and sample data
export async function GET() {
  try {
    const userCount = await db.user.count();

    if (userCount > 0) {
      return NextResponse.json({
        message: "Database sudah memiliki data pengguna",
        userCount,
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const admin = await db.user.create({
      data: {
        email: "admin@hariandja.id",
        name: "Administrator Hariandja",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    // Create sample family tree data
    // Root ancestor
    const ancestor = await db.person.create({
      data: {
        fullName: "Raja Hariandja",
        nickname: "Ompu Hariandja",
        gender: "MALE",
        birthPlace: "Samosir",
        birthDate: new Date("1850-01-01"),
        deathPlace: "Samosir",
        deathDate: new Date("1920-06-15"),
        isDeceased: true,
        maritalStatus: "MARRIED",
        religion: "Kristen Protestan",
        birthOrder: 1,
      },
    });

    // Ancestor's wife
    const wife1 = await db.person.create({
      data: {
        fullName: "Boru Hariandja I",
        nickname: "Ibu Boru",
        gender: "FEMALE",
        birthPlace: "Samosir",
        birthDate: new Date("1855-03-15"),
        deathPlace: "Samosir",
        deathDate: new Date("1925-09-20"),
        isDeceased: true,
        maritalStatus: "MARRIED",
        religion: "Kristen Protestan",
      },
    });

    // Marriage between ancestor and wife
    await db.marriage.create({
      data: {
        husbandId: ancestor.id,
        wifeId: wife1.id,
        marriageDate: new Date("1875-01-01"),
        isActive: true,
      },
    });

    // Children
    const child1 = await db.person.create({
      data: {
        fullName: "Raja Hariandja Jr. I",
        nickname: "Aman I",
        gender: "MALE",
        birthPlace: "Samosir",
        birthDate: new Date("1876-05-10"),
        deathDate: new Date("1950-03-01"),
        isDeceased: true,
        maritalStatus: "MARRIED",
        religion: "Kristen Protestan",
        birthOrder: 1,
        fatherId: ancestor.id,
        motherId: wife1.id,
      },
    });

    const child2 = await db.person.create({
      data: {
        fullName: "Raja Hariandja Jr. II",
        nickname: "Aman II",
        gender: "MALE",
        birthPlace: "Samosir",
        birthDate: new Date("1878-11-22"),
        deathDate: new Date("1960-07-14"),
        isDeceased: true,
        maritalStatus: "SINGLE",
        religion: "Kristen Protestan",
        birthOrder: 2,
        fatherId: ancestor.id,
        motherId: wife1.id,
      },
    });

    const child3 = await db.person.create({
      data: {
        fullName: "Boru Hariandja II",
        nickname: "Ita",
        gender: "FEMALE",
        birthPlace: "Samosir",
        birthDate: new Date("1880-02-14"),
        deathDate: new Date("1945-12-30"),
        isDeceased: true,
        maritalStatus: "MARRIED",
        religion: "Kristen Protestan",
        birthOrder: 3,
        fatherId: ancestor.id,
        motherId: wife1.id,
      },
    });

    // Child 1's wife
    const child1Wife = await db.person.create({
      data: {
        fullName: "Boru Sianturi",
        nickname: "Ibu Sianturi",
        gender: "FEMALE",
        birthPlace: "Toba",
        birthDate: new Date("1880-07-20"),
        deathDate: new Date("1955-04-10"),
        isDeceased: true,
        maritalStatus: "MARRIED",
        religion: "Kristen Protestan",
      },
    });

    await db.marriage.create({
      data: {
        husbandId: child1.id,
        wifeId: child1Wife.id,
        marriageDate: new Date("1900-06-15"),
        isActive: true,
      },
    });

    // Grandchild
    const grandchild1 = await db.person.create({
      data: {
        fullName: "Hariandja III",
        nickname: "Opung III",
        gender: "MALE",
        birthPlace: "Medan",
        birthDate: new Date("1905-01-01"),
        deathDate: new Date("1980-05-20"),
        isDeceased: true,
        maritalStatus: "MARRIED",
        religion: "Kristen Protestan",
        birthOrder: 1,
        fatherId: child1.id,
        motherId: child1Wife.id,
      },
    });

    // Grandchild's wife
    const grandchild1Wife = await db.person.create({
      data: {
        fullName: "Boru Simatupang",
        nickname: "Nenek Simatupang",
        gender: "FEMALE",
        birthPlace: "Pematang Siantar",
        birthDate: new Date("1908-09-12"),
        deathDate: new Date("1985-11-03"),
        isDeceased: true,
        maritalStatus: "MARRIED",
        religion: "Kristen Protestan",
      },
    });

    await db.marriage.create({
      data: {
        husbandId: grandchild1.id,
        wifeId: grandchild1Wife.id,
        marriageDate: new Date("1928-12-25"),
        isActive: true,
      },
    });

    // Great grandchild
    const greatgrandchild1 = await db.person.create({
      data: {
        fullName: "Hariandja IV",
        nickname: "Aman IV",
        gender: "MALE",
        birthPlace: "Medan",
        birthDate: new Date("1935-04-18"),
        deathDate: new Date("2010-08-25"),
        isDeceased: true,
        maritalStatus: "MARRIED",
        religion: "Kristen Protestan",
        birthOrder: 1,
        fatherId: grandchild1.id,
        motherId: grandchild1Wife.id,
      },
    });

    const greatgrandchildWife = await db.person.create({
      data: {
        fullName: "Boru Hutapea",
        nickname: "Nenek Hutapea",
        gender: "FEMALE",
        birthPlace: "Balige",
        birthDate: new Date("1938-06-30"),
        deathDate: null,
        isDeceased: false,
        maritalStatus: "WIDOWED",
        religion: "Kristen Protestan",
        address: "Jl. Sisingamangaraja No. 10, Medan",
        phone: "+6281234567890",
      },
    });

    // Marriage for great grandchild (now properly linked)
    await db.marriage.create({
      data: {
        husbandId: greatgrandchild1.id,
        wifeId: greatgrandchildWife.id,
        marriageDate: new Date("1958-06-10"),
        isActive: false,
        divorceDate: new Date("2010-08-25"), // Auto-divorced on husband's death
      },
    });

    return NextResponse.json({
      message: "Database berhasil di-seed dengan data awal",
      admin: {
        email: admin.email,
        password: "admin123",
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat seeding" },
      { status: 500 }
    );
  }
}