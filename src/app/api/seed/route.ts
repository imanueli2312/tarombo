import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  ADMIN_DEFAULT_PERMISSIONS,
  MEMBER_DEFAULT_PERMISSIONS,
  serializePermissions,
} from "@/lib/tarombo/permissions";
import {
  PermissionDeniedError,
  requirePermission,
} from "@/lib/tarombo/auth";
import {
  newId,
  now,
  serializePerson,
  type PersonRow,
  type RoleRow,
} from "@/lib/tarombo/queries";

/**
 * POST /api/seed — isi data keluarga contoh bila DB kosong.
 *  Butuh permission data:seed (kecuali first-run tanpa user).
 */
export async function POST(_req: NextRequest) {
  try {
    const userCount = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM user").get() as { c: number }
    ).c;
    if (userCount > 0) {
      await requirePermission("data:seed");
    }

    // --- Role default ---
    let adminRole = sqlite
      .prepare("SELECT * FROM role WHERE name = 'Administrator'")
      .get() as RoleRow | undefined;
    if (!adminRole) {
      const id = newId();
      const ts = now();
      sqlite
        .prepare(
          `INSERT INTO role (id, name, description, color, icon, permissions, is_system, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        )
        .run(
          id,
          "Administrator",
          "Akses penuh ke seluruh fitur aplikasi.",
          "#7a1f1f",
          "shield",
          serializePermissions(ADMIN_DEFAULT_PERMISSIONS),
          0,
          ts,
          ts,
        );
      adminRole = sqlite
        .prepare("SELECT * FROM role WHERE id = ?")
        .get(id) as RoleRow;
    } else {
      sqlite
        .prepare("UPDATE role SET permissions = ?, updated_at = ? WHERE id = ?")
        .run(serializePermissions(ADMIN_DEFAULT_PERMISSIONS), now(), adminRole.id);
    }

    let memberRole = sqlite
      .prepare("SELECT * FROM role WHERE name = 'Anggota'")
      .get() as RoleRow | undefined;
    if (!memberRole) {
      const id = newId();
      const ts = now();
      sqlite
        .prepare(
          `INSERT INTO role (id, name, description, color, icon, permissions, is_system, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        )
        .run(
          id,
          "Anggota",
          "Hanya bisa melihat pohon, menambah pasangan, dan export.",
          "#d97706",
          "user",
          serializePermissions(MEMBER_DEFAULT_PERMISSIONS),
          1,
          ts,
          ts,
        );
      memberRole = sqlite
        .prepare("SELECT * FROM role WHERE id = ?")
        .get(id) as RoleRow;
    }

    // --- User admin default ---
    let adminUser = sqlite
      .prepare("SELECT * FROM user WHERE role_id = ?")
      .get(adminRole.id) as
      | { id: string; email: string; name: string; password: string; photo: string | null; phone: string | null; role_id: string | null; linked_person_id: string | null; last_login_at: string | null; created_at: string; updated_at: string }
      | undefined;
    if (!adminUser) {
      const id = newId();
      const ts = now();
      sqlite
        .prepare(
          `INSERT INTO user (id, email, name, password, photo, phone, role_id, linked_person_id, last_login_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, ?, ?)`,
        )
        .run(
          id,
          "admin@tarombo.id",
          "Administrator Tarombo",
          "admin123",
          adminRole.id,
          ts,
          ts,
        );
      adminUser = sqlite
        .prepare("SELECT * FROM user WHERE id = ?")
        .get(id) as typeof adminUser;
    }

    const memberUser = sqlite
      .prepare("SELECT * FROM user WHERE email = 'robby@tarombo.id'")
      .get() as
      | { id: string; email: string; name: string; password: string; photo: string | null; phone: string | null; role_id: string | null; linked_person_id: string | null; last_login_at: string | null; created_at: string; updated_at: string }
      | undefined;

    const personCount = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM person").get() as { c: number }
    ).c;
    if (personCount > 0 && memberUser) {
      return NextResponse.json({
        seeded: false,
        message: "Database sudah berisi data keluarga. Seed dilewati.",
        count: personCount,
        users: (
          sqlite.prepare("SELECT COUNT(*) AS c FROM user").get() as { c: number }
        ).c,
        roles: (
          sqlite.prepare("SELECT COUNT(*) AS c FROM role").get() as { c: number }
        ).c,
      });
    }

    // helper
    const insertPerson = (data: {
      fullName: string;
      nickname?: string;
      birthPlace?: string;
      birthDate?: string;
      deathDate?: string;
      birthOrder?: number;
      gender: string;
      address?: string;
      religion?: string;
      phone?: string;
      maritalStatus?: string;
      generationNumber?: number;
      burialName?: string;
      burialAddress?: string;
      burialLat?: number;
      burialLng?: number;
      fatherId?: string;
      motherId?: string;
    }): PersonRow => {
      const id = newId();
      const ts = now();
      sqlite
        .prepare(
          `INSERT INTO person (id, full_name, nickname, birth_place, birth_date, death_date, birth_order,
             gender, address, religion, phone, photo, marital_status, generation_number,
             burial_name, burial_address, burial_lat, burial_lng, father_id, mother_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          data.fullName,
          data.nickname ?? null,
          data.birthPlace ?? null,
          data.birthDate ?? null,
          data.deathDate ?? null,
          data.birthOrder ?? null,
          data.gender,
          data.address ?? null,
          data.religion ?? null,
          data.phone ?? null,
          data.maritalStatus ?? "SINGLE",
          data.generationNumber ?? null,
          data.burialName ?? null,
          data.burialAddress ?? null,
          data.burialLat ?? null,
          data.burialLng ?? null,
          data.fatherId ?? null,
          data.motherId ?? null,
          ts,
          ts,
        );
      return sqlite
        .prepare("SELECT * FROM person WHERE id = ?")
        .get(id) as PersonRow;
    };

    const insertPartnership = (
      husbandId: string,
      wifeId: string,
      marriageDate: string | null,
      status: string,
      divorceDate: string | null,
    ) => {
      const id = newId();
      const ts = now();
      sqlite
        .prepare(
          `INSERT INTO partnership (id, husband_id, wife_id, marriage_date, divorce_date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, husbandId, wifeId, marriageDate, divorceDate, status, ts, ts);
      return id;
    };

    // ====================== GENERASI 1 ======================
    const grandfather = insertPerson({
      fullName: "Raja Mangatur Sianipar",
      nickname: "Tuan Mangatur",
      birthPlace: "Balige, Toba Samosir",
      birthDate: "1920-03-15",
      deathDate: "1995-08-22",
      birthOrder: 1,
      gender: "MALE",
      address: "Jl. Lumban Dolok, Balige",
      religion: "Kristen Protestan",
      maritalStatus: "MARRIED",
      generationNumber: 1,
      burialName: "TPU Lumban Dolok",
      burialAddress: "Balige, Toba Samosir",
      burialLat: 2.3359,
      burialLng: 99.0687,
    });

    const grandmother = insertPerson({
      fullName: "Boru Lumban Toruan Naiborhu",
      nickname: "Inang Boru",
      birthPlace: "Tarutung, Tapanuli Utara",
      birthDate: "1925-07-02",
      deathDate: "2002-01-10",
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
    });

    insertPartnership(
      grandfather.id,
      grandmother.id,
      "1945-06-10",
      "WIDOWED",
      "1995-08-22",
    );

    // ====================== GENERASI 2 ======================
    const son1 = insertPerson({
      fullName: "Dompu Arvin Sianipar",
      nickname: "Pak Arvin",
      birthPlace: "Balige, Toba Samosir",
      birthDate: "1948-09-01",
      birthOrder: 1,
      gender: "MALE",
      address: "Jl. Sisingamangaraja, Medan",
      religion: "Kristen Protestan",
      phone: "081234560001",
      maritalStatus: "MARRIED",
      generationNumber: 2,
      fatherId: grandfather.id,
      motherId: grandmother.id,
    });

    const son1Wife = insertPerson({
      fullName: "Siti Rohana Hutapea",
      nickname: "Ibu Roha",
      birthPlace: "Sipirok, Tapanuli Selatan",
      birthDate: "1952-12-20",
      birthOrder: 3,
      gender: "FEMALE",
      address: "Jl. Sisingamangaraja, Medan",
      religion: "Kristen Protestan",
      phone: "081234560002",
      maritalStatus: "MARRIED",
      generationNumber: 2,
    });

    insertPartnership(son1.id, son1Wife.id, "1972-11-15", "ACTIVE", null);

    const daughter1 = insertPerson({
      fullName: "Boru Margana Sianipar",
      nickname: "Ibu Margana",
      birthPlace: "Balige, Toba Samosir",
      birthDate: "1951-04-12",
      deathDate: "2018-06-30",
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
    });

    const daughter1Husband = insertPerson({
      fullName: "Amir Manik",
      nickname: "Pak Amir",
      birthPlace: "Pematangsiantar",
      birthDate: "1949-02-08",
      deathDate: "2010-03-14",
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
    });

    insertPartnership(
      daughter1Husband.id,
      daughter1.id,
      "1973-05-20",
      "WIDOWED",
      "2010-03-14",
    );

    const son2 = insertPerson({
      fullName: "Jamahir Sianipar",
      nickname: "Om Jamahir",
      birthPlace: "Balige, Toba Samosir",
      birthDate: "1955-10-30",
      birthOrder: 3,
      gender: "MALE",
      address: "Jl. Asahan, Medan",
      religion: "Kristen Katolik",
      phone: "081234560003",
      maritalStatus: "SINGLE",
      generationNumber: 2,
      fatherId: grandfather.id,
      motherId: grandmother.id,
    });

    // ====================== GENERASI 3 ======================
    const grandChild1 = insertPerson({
      fullName: "Robby Adithama Sianipar",
      nickname: "Robby",
      birthPlace: "Medan",
      birthDate: "1978-07-14",
      birthOrder: 1,
      gender: "MALE",
      address: "Jl. Setia Budi, Jakarta",
      religion: "Kristen Protestan",
      phone: "081234560004",
      maritalStatus: "MARRIED",
      generationNumber: 3,
      fatherId: son1.id,
      motherId: son1Wife.id,
    });

    const grandChild1Wife = insertPerson({
      fullName: "Lina Simanjuntak",
      nickname: "Lina",
      birthPlace: "Bandung",
      birthDate: "1982-03-05",
      birthOrder: 1,
      gender: "FEMALE",
      address: "Jl. Setia Budi, Jakarta",
      religion: "Kristen Protestan",
      phone: "081234560005",
      maritalStatus: "MARRIED",
      generationNumber: 3,
    });

    insertPartnership(grandChild1.id, grandChild1Wife.id, "2005-09-10", "ACTIVE", null);

    const grandChild2 = insertPerson({
      fullName: "Boru Sarah Avissa Sianipar",
      nickname: "Sarah",
      birthPlace: "Medan",
      birthDate: "1981-11-22",
      birthOrder: 2,
      gender: "FEMALE",
      address: "Jl. Ciputra, Surabaya",
      religion: "Kristen Protestan",
      phone: "081234560006",
      maritalStatus: "SINGLE",
      generationNumber: 3,
      fatherId: son1.id,
      motherId: son1Wife.id,
    });

    const grandChild3 = insertPerson({
      fullName: "Thomas Manik",
      nickname: "Thomas",
      birthPlace: "Pematangsiantar",
      birthDate: "1976-08-18",
      birthOrder: 1,
      gender: "MALE",
      address: "Jl. Gajah Mada, Pematangsiantar",
      religion: "Kristen Protestan",
      phone: "081234560007",
      maritalStatus: "MARRIED",
      generationNumber: 3,
      fatherId: daughter1Husband.id,
      motherId: daughter1.id,
    });

    // ====================== GENERASI 4 ======================
    const ggChild1 = insertPerson({
      fullName: "Kezia Sianipar",
      nickname: "Kezia",
      birthPlace: "Jakarta",
      birthDate: "2010-01-25",
      birthOrder: 1,
      gender: "FEMALE",
      address: "Jl. Setia Budi, Jakarta",
      religion: "Kristen Protestan",
      maritalStatus: "SINGLE",
      generationNumber: 4,
      fatherId: grandChild1.id,
      motherId: grandChild1Wife.id,
    });

    const ggChild2 = insertPerson({
      fullName: "Nathan Sianipar",
      nickname: "Nathan",
      birthPlace: "Jakarta",
      birthDate: "2013-05-10",
      birthOrder: 2,
      gender: "MALE",
      address: "Jl. Setia Budi, Jakarta",
      religion: "Kristen Protestan",
      maritalStatus: "SINGLE",
      generationNumber: 4,
      fatherId: grandChild1.id,
      motherId: grandChild1Wife.id,
    });

    // --- Buat User member ter-link ke Robby ---
    if (!memberUser) {
      const id = newId();
      const ts = now();
      sqlite
        .prepare(
          `INSERT INTO user (id, email, name, password, photo, phone, role_id, linked_person_id, last_login_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, NULL, ?, ?)`,
        )
        .run(
          id,
          "robby@tarombo.id",
          "Robby Adithama Sianipar",
          "robby123",
          memberRole.id,
          grandChild1.id,
          ts,
          ts,
        );
    } else {
      sqlite
        .prepare(
          "UPDATE user SET role_id = ?, linked_person_id = COALESCE(linked_person_id, ?), updated_at = ? WHERE id = ?",
        )
        .run(memberRole.id, grandChild1.id, now(), memberUser.id);
    }

    // gunakan variabel agar linter tidak warning unused
    void serializePerson;
    void son2;
    void grandChild2;
    void grandChild3;
    void ggChild1;
    void ggChild2;

    const finalPersons = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM person").get() as { c: number }
    ).c;
    const finalPartnerships = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM partnership").get() as {
        c: number;
      }
    ).c;
    const finalUsers = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM user").get() as { c: number }
    ).c;
    const finalRoles = (
      sqlite.prepare("SELECT COUNT(*) AS c FROM role").get() as { c: number }
    ).c;

    return NextResponse.json({
      seeded: true,
      message: "Data keluarga contoh berhasil dimuat.",
      persons: finalPersons,
      partnerships: finalPartnerships,
      users: finalUsers,
      roles: finalRoles,
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/seed — hapus SEMUA data. Butuh data:reset. */
export async function DELETE(_req: NextRequest) {
  try {
    await requirePermission("data:reset");
    sqlite.prepare("DELETE FROM partnership").run();
    sqlite
      .prepare("UPDATE user SET linked_person_id = NULL, role_id = NULL")
      .run();
    sqlite.prepare("DELETE FROM person").run();
    sqlite.prepare("DELETE FROM user").run();
    sqlite.prepare("DELETE FROM role").run();
    return NextResponse.json({ success: true, message: "Semua data dihapus." });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
