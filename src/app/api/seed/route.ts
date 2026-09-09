import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** POST /api/seed — isi data keluarga contoh (Batak-style) bila DB kosong.
 *  Idempoten: bila sudah ada data, tidak melakukan apa-apa.
 */
export async function POST(_req: NextRequest) {
  try {
    const count = await db.person.count();
    if (count > 0) {
      return NextResponse.json({
        seeded: false,
        message: "Database sudah berisi data. Seed dilewati.",
        count,
      });
    }

    // ====================== GENERASI 1 (leluhur) ======================
    // Leluhur utama: Raja Mangatur Sianipar & istrinya
    const grandfather = await db.person.create({
      data: {
        fullName: "Raja Mangatur Sianipar",
        nickname: "Tuan Mangatur",
        birthPlace: "Balige, Toba Samosir",
        birthDate: new Date("1920-03-15"),
        deathDate: new Date("1995-08-22"),
        birthOrder: 1,
        gender: "MALE",
        address: "Jl. Lumban Dolok, Balige",
        religion: "Kristen Protestan",
        phone: null,
        maritalStatus: "MARRIED",
        generationNumber: 1,
        burialName: "TPU Lumban Dolok",
        burialAddress: "Balige, Toba Samosir",
        burialLat: 2.3359,
        burialLng: 99.0687,
      },
    });

    const grandmother = await db.person.create({
      data: {
        fullName: "Boru Lumban Toruan Naiborhu",
        nickname: "Inang Boru",
        birthPlace: "Tarutung, Tapanuli Utara",
        birthDate: new Date("1925-07-02"),
        deathDate: new Date("2002-01-10"),
        birthOrder: 2,
        gender: "FEMALE",
        address: "Jl. Lumban Dolok, Balige",
        religion: "Kristen Protestan",
        maritalStatus: "MARRIED",
        generationNumber: 1,
        burialName: "TPU Lumban Dolok",
        burialAddress: "Balige, Toba Samosir",
        burialLat: 2.3359,
        burialLng: 99.0687,
      },
    });

    // Pasangan generasi 1
    const partnership1 = await db.partnership.create({
      data: {
        husbandId: grandfather.id,
        wifeId: grandmother.id,
        marriageDate: new Date("1945-06-10"),
        // Karena keduanya sudah meninggal, status WIDOWED & divorceDate = tanggal kematian suami
        status: "WIDOWED",
        divorceDate: new Date("1995-08-22"),
      },
    });

    // ====================== GENERASI 2 ======================
    // Anak pertama (laki-laki)
    const son1 = await db.person.create({
      data: {
        fullName: "Dompu Arvin Sianipar",
        nickname: "Pak Arvin",
        birthPlace: "Balige, Toba Samosir",
        birthDate: new Date("1948-09-01"),
        birthOrder: 1,
        gender: "MALE",
        address: "Jl. Sisingamangaraja, Medan",
        religion: "Kristen Protestan",
        phone: "081234560001",
        maritalStatus: "MARRIED",
        generationNumber: 2,
        fatherId: grandfather.id,
        motherId: grandmother.id,
      },
    });

    const son1Wife = await db.person.create({
      data: {
        fullName: "Siti Rohana Hutapea",
        nickname: "Ibu Roha",
        birthPlace: "Sipirok, Tapanuli Selatan",
        birthDate: new Date("1952-12-20"),
        birthOrder: 3,
        gender: "FEMALE",
        address: "Jl. Sisingamangaraja, Medan",
        religion: "Kristen Protestan",
        phone: "081234560002",
        maritalStatus: "MARRIED",
        generationNumber: 2,
      },
    });

    await db.partnership.create({
      data: {
        husbandId: son1.id,
        wifeId: son1Wife.id,
        marriageDate: new Date("1972-11-15"),
        status: "ACTIVE",
      },
    });

    // Anak kedua (perempuan)
    const daughter1 = await db.person.create({
      data: {
        fullName: "Boru Margana Sianipar",
        nickname: "Ibu Margana",
        birthPlace: "Balige, Toba Samosir",
        birthDate: new Date("1951-04-12"),
        deathDate: new Date("2018-06-30"),
        birthOrder: 2,
        gender: "FEMALE",
        address: "Jl. Diponegoro, Pematangsiantar",
        religion: "Kristen Protestan",
        maritalStatus: "WIDOWED",
        generationNumber: 2,
        fatherId: grandfather.id,
        motherId: grandmother.id,
        burialName: "TPU Simalungun",
        burialAddress: "Pematangsiantar",
        burialLat: 2.9587,
        burialLng: 99.0643,
      },
    });

    const daughter1Husband = await db.person.create({
      data: {
        fullName: "Amir Manik",
        nickname: "Pak Amir",
        birthPlace: "Pematangsiantar",
        birthDate: new Date("1949-02-08"),
        deathDate: new Date("2010-03-14"),
        birthOrder: 1,
        gender: "MALE",
        address: "Jl. Diponegoro, Pematangsiantar",
        religion: "Kristen Protestan",
        maritalStatus: "WIDOWED",
        generationNumber: 2,
        burialName: "TPU Simalungun",
        burialAddress: "Pematangsiantar",
        burialLat: 2.9587,
        burialLng: 99.0643,
      },
    });

    // Pasangan ini — suami meninggal 2010, istri meninggal 2018
    // Status WIDOWED sejak suami meninggal
    await db.partnership.create({
      data: {
        husbandId: daughter1Husband.id,
        wifeId: daughter1.id,
        marriageDate: new Date("1973-05-20"),
        status: "WIDOWED",
        divorceDate: new Date("2010-03-14"), // = tanggal kematian suami
      },
    });

    // Anak ketiga (laki-laki) — masih lajang
    const son2 = await db.person.create({
      data: {
        fullName: "Jamahir Sianipar",
        nickname: "Om Jamahir",
        birthPlace: "Balige, Toba Samosir",
        birthDate: new Date("1955-10-30"),
        birthOrder: 3,
        gender: "MALE",
        address: "Jl. Asahan, Medan",
        religion: "Kristen Katolik",
        phone: "081234560003",
        maritalStatus: "SINGLE",
        generationNumber: 2,
        fatherId: grandfather.id,
        motherId: grandmother.id,
      },
    });

    // ====================== GENERASI 3 ======================
    // Anak dari son1 & son1Wife
    const grandChild1 = await db.person.create({
      data: {
        fullName: "Robby Adithama Sianipar",
        nickname: "Robby",
        birthPlace: "Medan",
        birthDate: new Date("1978-07-14"),
        birthOrder: 1,
        gender: "MALE",
        address: "Jl. Setia Budi, Jakarta",
        religion: "Kristen Protestan",
        phone: "081234560004",
        maritalStatus: "MARRIED",
        generationNumber: 3,
        fatherId: son1.id,
        motherId: son1Wife.id,
      },
    });

    const grandChild1Wife = await db.person.create({
      data: {
        fullName: "Lina Simanjuntak",
        nickname: "Lina",
        birthPlace: "Bandung",
        birthDate: new Date("1982-03-05"),
        birthOrder: 1,
        gender: "FEMALE",
        address: "Jl. Setia Budi, Jakarta",
        religion: "Kristen Protestan",
        phone: "081234560005",
        maritalStatus: "MARRIED",
        generationNumber: 3,
      },
    });

    await db.partnership.create({
      data: {
        husbandId: grandChild1.id,
        wifeId: grandChild1Wife.id,
        marriageDate: new Date("2005-09-10"),
        status: "ACTIVE",
      },
    });

    const grandChild2 = await db.person.create({
      data: {
        fullName: "Boru Sarah Avissa Sianipar",
        nickname: "Sarah",
        birthPlace: "Medan",
        birthDate: new Date("1981-11-22"),
        birthOrder: 2,
        gender: "FEMALE",
        address: "Jl. Ciputra, Surabaya",
        religion: "Kristen Protestan",
        phone: "081234560006",
        maritalStatus: "SINGLE",
        generationNumber: 3,
        fatherId: son1.id,
        motherId: son1Wife.id,
      },
    });

    // Anak dari daughter1 & daughter1Husband
    const grandChild3 = await db.person.create({
      data: {
        fullName: "Thomas Manik",
        nickname: "Thomas",
        birthPlace: "Pematangsiantar",
        birthDate: new Date("1976-08-18"),
        birthOrder: 1,
        gender: "MALE",
        address: "Jl. Gajah Mada, Pematangsiantar",
        religion: "Kristen Protestan",
        phone: "081234560007",
        maritalStatus: "MARRIED",
        generationNumber: 3,
        fatherId: daughter1Husband.id,
        motherId: daughter1.id,
      },
    });

    // ====================== GENERASI 4 ======================
    const ggChild1 = await db.person.create({
      data: {
        fullName: "Kezia Sianipar",
        nickname: "Kezia",
        birthPlace: "Jakarta",
        birthDate: new Date("2010-01-25"),
        birthOrder: 1,
        gender: "FEMALE",
        address: "Jl. Setia Budi, Jakarta",
        religion: "Kristen Protestan",
        maritalStatus: "SINGLE",
        generationNumber: 4,
        fatherId: grandChild1.id,
        motherId: grandChild1Wife.id,
      },
    });

    const ggChild2 = await db.person.create({
      data: {
        fullName: "Nathan Sianipar",
        nickname: "Nathan",
        birthPlace: "Jakarta",
        birthDate: new Date("2013-05-10"),
        birthOrder: 2,
        gender: "MALE",
        address: "Jl. Setia Budi, Jakarta",
        religion: "Kristen Protestan",
        maritalStatus: "SINGLE",
        generationNumber: 4,
        fatherId: grandChild1.id,
        motherId: grandChild1Wife.id,
      },
    });

    const finalCount = await db.person.count();
    const partnershipCount = await db.partnership.count();

    return NextResponse.json({
      seeded: true,
      message: "Data keluarga contoh berhasil dimuat.",
      persons: finalCount,
      partnerships: partnershipCount,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/seed — hapus SEMUA data (reset). */
export async function DELETE(_req: NextRequest) {
  try {
    await db.partnership.deleteMany();
    await db.person.deleteMany();
    return NextResponse.json({ success: true, message: "Semua data dihapus." });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
