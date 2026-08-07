import { sqlite } from "./database";
import bcrypt from "bcryptjs";
import {
  VIEWER_PERMISSIONS,
  EDITOR_PERMISSIONS,
  ADMIN_PERMISSIONS,
  type Permissions,
} from "./types";

function uid(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(4, "0")}`;
}

export function seedDatabase(): void {
  // Check if already seeded
  const roleCount = sqlite
    .prepare("SELECT COUNT(*) as c FROM roles")
    .get() as { c: number };

  if (roleCount.c > 0) {
    return;
  }

  // ---- Roles ----
  const insertRole = sqlite.prepare(`
    INSERT INTO roles (id, name, description, permissions, is_system)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertRole.run(
    "role_viewer",
    "Viewer",
    "Read-only access to the family tree. No account required.",
    JSON.stringify(VIEWER_PERMISSIONS),
    1
  );
  insertRole.run(
    "role_editor",
    "Editor",
    "Can view all pages and manage family genealogy data.",
    JSON.stringify(EDITOR_PERMISSIONS),
    1
  );
  insertRole.run(
    "role_admin",
    "Admin",
    "Full access including user and role management.",
    JSON.stringify(ADMIN_PERMISSIONS),
    1
  );

  // ---- Persons (Hariandja clan sample genealogy) ----
  // The Hariandja is a Batak (Toba) marga. We build a multi-generation tree.
  const insertPerson = sqlite.prepare(`
    INSERT INTO persons (
      id, name, nickname, place_of_birth, date_of_birth, date_of_death,
      birth_order, gender, residential_address, religion, phone_number,
      photo, marital_status, generation, father_id, mother_id, parent_id,
      burial_name, burial_address, burial_lat, burial_lng
    ) VALUES (
      @id, @name, @nickname, @place_of_birth, @date_of_birth, @date_of_death,
      @birth_order, @gender, @residential_address, @religion, @phone_number,
      @photo, @marital_status, @generation, @father_id, @mother_id, @parent_id,
      @burial_name, @burial_address, @burial_lat, @burial_lng
    )
  `);

  interface P {
    id: string;
    name: string;
    nickname?: string;
    place_of_birth?: string;
    date_of_birth?: string;
    date_of_death?: string;
    birth_order?: number;
    gender: "male" | "female";
    residential_address?: string;
    religion?: string;
    phone_number?: string;
    photo?: string;
    marital_status?: string;
    generation: number;
    father_id?: string;
    mother_id?: string;
    parent_id?: string;
    burial_name?: string;
    burial_address?: string;
    burial_lat?: number;
    burial_lng?: number;
  }

  const persons: P[] = [
    // Generation 1 - the founding ancestor
    {
      id: uid("p", 1),
      name: "Raja Hariandja",
      nickname: "Si Raja Hariandja",
      place_of_birth: "Bakkara, Tapanuli",
      date_of_birth: "1780-01-01",
      date_of_death: "1855-06-15",
      birth_order: 1,
      gender: "male",
      residential_address: "Bakkara, Tapanuli",
      religion: "Parmalim (traditional)",
      generation: 1,
      marital_status: "married",
      burial_name: "Tanah Persemayaman Raja Hariandja",
      burial_address: "Bakkara, Tapanuli",
      burial_lat: 2.5833,
      burial_lng: 98.7167,
    },
    {
      id: uid("p", 2),
      name: "Boru Pasogit",
      nickname: "Nai Pasogit",
      place_of_birth: "Tarutung, Tapanuli",
      date_of_birth: "1790-03-12",
      date_of_death: "1860-09-20",
      birth_order: 1,
      gender: "female",
      residential_address: "Bakkara, Tapanuli",
      religion: "Parmalim (traditional)",
      generation: 1,
      marital_status: "married",
      burial_name: "Tanah Persemayaman Boru Pasogit",
      burial_address: "Bakkara, Tapanuli",
      burial_lat: 2.5833,
      burial_lng: 98.7167,
    },

    // Generation 2 - children of Raja Hariandja & Boru Pasogit
    {
      id: uid("p", 3),
      name: "Tuan Guru Hariandja",
      nickname: "Guru",
      place_of_birth: "Bakkara, Tapanuli",
      date_of_birth: "1810-05-10",
      date_of_death: "1880-12-01",
      birth_order: 1,
      gender: "male",
      residential_address: "Balige, Tapanuli",
      religion: "Kristen Protestan",
      generation: 2,
      father_id: uid("p", 1),
      mother_id: uid("p", 2),
      parent_id: uid("p", 1),
      marital_status: "married",
      burial_name: "TPA Balige",
      burial_address: "Balige, Tapanuli",
      burial_lat: 2.6333,
      burial_lng: 98.8667,
    },
    {
      id: uid("p", 4),
      name: "Boru Sianipar",
      nickname: "Opung Boru",
      place_of_birth: "Sipirok, Tapanuli",
      date_of_birth: "1818-07-22",
      date_of_death: "1885-03-14",
      birth_order: 1,
      gender: "female",
      residential_address: "Balige, Tapanuli",
      religion: "Kristen Protestan",
      generation: 2,
      marital_status: "married",
    },
    {
      id: uid("p", 5),
      name: "Raja Naipospos",
      nickname: "Raja Naposo",
      place_of_birth: "Bakkara, Tapanuli",
      date_of_birth: "1815-02-18",
      date_of_death: "1878-11-30",
      birth_order: 2,
      gender: "male",
      residential_address: "Naipospos, Tapanuli",
      religion: "Parmalim (traditional)",
      generation: 2,
      father_id: uid("p", 1),
      mother_id: uid("p", 2),
      parent_id: uid("p", 1),
      marital_status: "married",
    },
    {
      id: uid("p", 6),
      name: "Boru Hutapea",
      nickname: "Inang Hutapea",
      place_of_birth: "Hutapea, Tapanuli",
      date_of_birth: "1822-09-05",
      date_of_death: "1890-08-25",
      birth_order: 1,
      gender: "female",
      residential_address: "Naipospos, Tapanuli",
      religion: "Kristen Protestan",
      generation: 2,
      marital_status: "married",
    },

    // Generation 3 - children of Tuan Guru Hariandja & Boru Sianipar
    {
      id: uid("p", 7),
      name: "Johannes Hariandja",
      nickname: "Jopi",
      place_of_birth: "Balige, Tapanuli",
      date_of_birth: "1840-04-15",
      date_of_death: "1910-10-22",
      birth_order: 1,
      gender: "male",
      residential_address: "Balige, Tapanuli",
      religion: "Kristen Protestan",
      generation: 3,
      father_id: uid("p", 3),
      mother_id: uid("p", 4),
      parent_id: uid("p", 3),
      marital_status: "married",
      phone_number: null,
    },
    {
      id: uid("p", 8),
      name: "Christina Lumbantoruan",
      nickname: "Inang Tina",
      place_of_birth: "Lumbantoruan, Tapanuli",
      date_of_birth: "1845-08-30",
      date_of_death: "1915-02-10",
      birth_order: 1,
      gender: "female",
      residential_address: "Balige, Tapanuli",
      religion: "Kristen Protestan",
      generation: 3,
      marital_status: "married",
    },
    {
      id: uid("p", 9),
      name: "Marthen Hariandja",
      nickname: "Tinendra",
      place_of_birth: "Balige, Tapanuli",
      date_of_birth: "1845-11-20",
      date_of_death: "1920-06-05",
      birth_order: 2,
      gender: "male",
      residential_address: "Tarutung, Tapanuli",
      religion: "Kristen Protestan",
      generation: 3,
      father_id: uid("p", 3),
      mother_id: uid("p", 4),
      parent_id: uid("p", 3),
      marital_status: "married",
    },
    {
      id: uid("p", 10),
      name: "Boru Simanjuntak",
      nickname: "Inang Marta",
      place_of_birth: "Simanjuntak, Tapanuli",
      date_of_birth: "1850-03-12",
      date_of_death: "1925-09-18",
      birth_order: 1,
      gender: "female",
      residential_address: "Tarutung, Tapanuli",
      religion: "Kristen Protestan",
      generation: 3,
      marital_status: "married",
    },

    // children of Raja Naipospos & Boru Hutapea
    {
      id: uid("p", 11),
      name: "Andreas Hariandja",
      nickname: "Deng",
      place_of_birth: "Naipospos, Tapanuli",
      date_of_birth: "1848-06-08",
      date_of_death: "1912-12-15",
      birth_order: 1,
      gender: "male",
      residential_address: "Sipirok, Tapanuli",
      religion: "Kristen Protestan",
      generation: 3,
      father_id: uid("p", 5),
      mother_id: uid("p", 6),
      parent_id: uid("p", 5),
      marital_status: "married",
    },
    {
      id: uid("p", 12),
      name: "Maria Manik",
      nickname: "Inang Ria",
      place_of_birth: "Manik, Tapanuli",
      date_of_birth: "1855-01-25",
      date_of_death: "1918-07-30",
      birth_order: 1,
      gender: "female",
      residential_address: "Sipirok, Tapanuli",
      religion: "Kristen Protestan",
      generation: 3,
      marital_status: "married",
    },

    // Generation 4 - children of Johannes & Christina
    {
      id: uid("p", 13),
      name: "Wilhelm Hariandja",
      nickname: "Wili",
      place_of_birth: "Balige, Tapanuli",
      date_of_birth: "1870-02-14",
      date_of_death: "1940-05-20",
      birth_order: 1,
      gender: "male",
      residential_address: "Medan, Sumatera Utara",
      religion: "Kristen Protestan",
      generation: 4,
      father_id: uid("p", 7),
      mother_id: uid("p", 8),
      parent_id: uid("p", 7),
      marital_status: "married",
    },
    {
      id: uid("p", 14),
      name: "Erna Situmorang",
      nickname: "Inang Erna",
      place_of_birth: "Situmorang, Tapanuli",
      date_of_birth: "1878-10-10",
      date_of_death: "1945-11-15",
      birth_order: 1,
      gender: "female",
      residential_address: "Medan, Sumatera Utara",
      religion: "Kristen Protestan",
      generation: 4,
      marital_status: "married",
    },
    {
      id: uid("p", 15),
      name: "Friedrich Hariandja",
      nickname: "Fred",
      place_of_birth: "Balige, Tapanuli",
      date_of_birth: "1875-07-22",
      date_of_death: "1948-03-08",
      birth_order: 2,
      gender: "male",
      residential_address: "Jakarta",
      religion: "Kristen Protestan",
      generation: 4,
      father_id: uid("p", 7),
      mother_id: uid("p", 8),
      parent_id: uid("p", 7),
      marital_status: "married",
    },
    {
      id: uid("p", 16),
      name: "Anna Hutagalung",
      nickname: "Inang Anne",
      place_of_birth: "Hutagalung, Tapanuli",
      date_of_birth: "1882-04-18",
      date_of_death: "1950-08-22",
      birth_order: 1,
      gender: "female",
      residential_address: "Jakarta",
      religion: "Kristen Protestan",
      generation: 4,
      marital_status: "married",
    },
    // child of Marthen & Boru Simanjuntak
    {
      id: uid("p", 17),
      name: "August Hariandja",
      nickname: "Ogut",
      place_of_birth: "Tarutung, Tapanuli",
      date_of_birth: "1878-12-05",
      date_of_death: "1952-01-30",
      birth_order: 1,
      gender: "male",
      residential_address: "Bandung, Jawa Barat",
      religion: "Kristen Protestan",
      generation: 4,
      father_id: uid("p", 9),
      mother_id: uid("p", 10),
      parent_id: uid("p", 9),
      marital_status: "married",
    },
    {
      id: uid("p", 18),
      name: "Lina Pardede",
      nickname: "Inang Lina",
      place_of_birth: "Pardede, Tapanuli",
      date_of_birth: "1885-05-15",
      date_of_death: "1955-10-12",
      birth_order: 1,
      gender: "female",
      residential_address: "Bandung, Jawa Barat",
      religion: "Kristen Protestan",
      generation: 4,
      marital_status: "married",
    },
    // children of Andreas & Maria
    {
      id: uid("p", 19),
      name: "Cornelis Hariandja",
      nickname: "Cor",
      place_of_birth: "Sipirok, Tapanuli",
      date_of_birth: "1880-09-30",
      date_of_death: "1958-04-18",
      birth_order: 1,
      gender: "male",
      residential_address: "Surabaya, Jawa Timur",
      religion: "Kristen Protestan",
      generation: 4,
      father_id: uid("p", 11),
      mother_id: uid("p", 12),
      parent_id: uid("p", 11),
      marital_status: "married",
    },
    {
      id: uid("p", 20),
      name: "Sophia Nababan",
      nickname: "Inang Sophia",
      place_of_birth: "Nababan, Tapanuli",
      date_of_birth: "1888-02-20",
      date_of_death: "1960-07-05",
      birth_order: 1,
      gender: "female",
      residential_address: "Surabaya, Jawa Timur",
      religion: "Kristen Protestan",
      generation: 4,
      marital_status: "married",
    },

    // Generation 5 - children of Wilhelm & Erna
    {
      id: uid("p", 21),
      name: "Rudolf Hariandja",
      nickname: "Rudi",
      place_of_birth: "Medan, Sumatera Utara",
      date_of_birth: "1900-03-15",
      date_of_death: "1975-08-10",
      birth_order: 1,
      gender: "male",
      residential_address: "Medan, Sumatera Utara",
      religion: "Kristen Protestan",
      generation: 5,
      father_id: uid("p", 13),
      mother_id: uid("p", 14),
      parent_id: uid("p", 13),
      marital_status: "married",
      phone_number: null,
    },
    {
      id: uid("p", 22),
      name: "Martha Sihotang",
      nickname: "Inang Martha",
      place_of_birth: "Sihotang, Tapanuli",
      date_of_birth: "1905-07-08",
      date_of_death: "1980-12-22",
      birth_order: 1,
      gender: "female",
      residential_address: "Medan, Sumatera Utara",
      religion: "Kristen Protestan",
      generation: 5,
      marital_status: "married",
    },
    {
      id: uid("p", 23),
      name: "Helen Hariandja",
      nickname: "Len",
      place_of_birth: "Medan, Sumatera Utara",
      date_of_birth: "1908-11-25",
      date_of_death: "1990-04-15",
      birth_order: 2,
      gender: "female",
      residential_address: "Jakarta",
      religion: "Kristen Protestan",
      generation: 5,
      father_id: uid("p", 13),
      mother_id: uid("p", 14),
      parent_id: uid("p", 13),
      marital_status: "married",
    },
    {
      id: uid("p", 24),
      name: "Eduard Tampubolon",
      nickname: "Ed",
      place_of_birth: "Tampubolon, Tapanuli",
      date_of_birth: "1902-06-12",
      date_of_death: "1985-09-30",
      birth_order: 1,
      gender: "male",
      residential_address: "Jakarta",
      religion: "Kristen Protestan",
      generation: 5,
      marital_status: "married",
    },
    // children of Friedrich & Anna
    {
      id: uid("p", 25),
      name: "Victor Hariandja",
      nickname: "Vic",
      place_of_birth: "Jakarta",
      date_of_birth: "1910-04-20",
      date_of_death: "1988-02-14",
      birth_order: 1,
      gender: "male",
      residential_address: "Jakarta",
      religion: "Kristen Protestan",
      generation: 5,
      father_id: uid("p", 15),
      mother_id: uid("p", 16),
      parent_id: uid("p", 15),
      marital_status: "married",
    },
    {
      id: uid("p", 26),
      name: "Clara Gultom",
      nickname: "Inang Clara",
      place_of_birth: "Gultom, Tapanuli",
      date_of_birth: "1915-09-18",
      date_of_death: "1992-11-08",
      birth_order: 1,
      gender: "female",
      residential_address: "Jakarta",
      religion: "Kristen Protestan",
      generation: 5,
      marital_status: "married",
    },

    // Generation 6 - children of Rudolf & Martha
    {
      id: uid("p", 27),
      name: "Paul Hariandja",
      nickname: "Pak Paul",
      place_of_birth: "Medan, Sumatera Utara",
      date_of_birth: "1930-05-10",
      date_of_death: null,
      birth_order: 1,
      gender: "male",
      residential_address: "Jl. Imam Bonjol No. 15, Medan",
      religion: "Kristen Protestan",
      phone_number: "+62 811-6123-4567",
      generation: 6,
      father_id: uid("p", 21),
      mother_id: uid("p", 22),
      parent_id: uid("p", 21),
      marital_status: "married",
    },
    {
      id: uid("p", 28),
      name: "Ruth Lumbanraja",
      nickname: "Ibu Ruth",
      place_of_birth: "Lumbanraja, Tapanuli",
      date_of_birth: "1935-08-22",
      date_of_death: null,
      birth_order: 1,
      gender: "female",
      residential_address: "Jl. Imam Bonjol No. 15, Medan",
      religion: "Kristen Protestan",
      phone_number: "+62 811-6123-4568",
      generation: 6,
      marital_status: "married",
    },
    {
      id: uid("p", 29),
      name: "Linda Hariandja",
      nickname: "Ibu Linda",
      place_of_birth: "Medan, Sumatera Utara",
      date_of_birth: "1938-12-03",
      date_of_death: null,
      birth_order: 2,
      gender: "female",
      residential_address: "Jl. Diponegoro No. 8, Jakarta",
      religion: "Kristen Protestan",
      phone_number: "+62 811-6789-0123",
      generation: 6,
      father_id: uid("p", 21),
      mother_id: uid("p", 22),
      parent_id: uid("p", 21),
      marital_status: "married",
    },
    {
      id: uid("p", 30),
      name: "Sintua Panggabean",
      nickname: "Pak Sintua",
      place_of_birth: "Panggabean, Tapanuli",
      date_of_birth: "1933-04-17",
      date_of_death: null,
      birth_order: 1,
      gender: "male",
      residential_address: "Jl. Diponegoro No. 8, Jakarta",
      religion: "Kristen Protestan",
      phone_number: "+62 811-6789-0124",
      generation: 6,
      marital_status: "married",
    },

    // Generation 7 - children of Paul & Ruth
    {
      id: uid("p", 31),
      name: "Daniel Hariandja",
      nickname: "Dani",
      place_of_birth: "Medan, Sumatera Utara",
      date_of_birth: "1960-02-28",
      date_of_death: null,
      birth_order: 1,
      gender: "male",
      residential_address: "Jl. Cendana No. 5, Jakarta",
      religion: "Kristen Protestan",
      phone_number: "+62 812-3456-7890",
      generation: 7,
      father_id: uid("p", 27),
      mother_id: uid("p", 28),
      parent_id: uid("p", 27),
      marital_status: "married",
    },
    {
      id: uid("p", 32),
      name: "Sarah Hutapea",
      nickname: "Ibu Sarah",
      place_of_birth: "Hutapea, Tapanuli",
      date_of_birth: "1963-06-14",
      date_of_death: null,
      birth_order: 1,
      gender: "female",
      residential_address: "Jl. Cendana No. 5, Jakarta",
      religion: "Kristen Protestan",
      phone_number: "+62 812-3456-7891",
      generation: 7,
      marital_status: "married",
    },
    {
      id: uid("p", 33),
      name: "Esther Hariandja",
      nickname: "Es",
      place_of_birth: "Medan, Sumatera Utara",
      date_of_birth: "1965-09-30",
      date_of_death: null,
      birth_order: 2,
      gender: "female",
      residential_address: "Jl. Melati No. 12, Bandung",
      religion: "Kristen Protestan",
      phone_number: "+62 813-9876-5432",
      generation: 7,
      father_id: uid("p", 27),
      mother_id: uid("p", 28),
      parent_id: uid("p", 27),
      marital_status: "single",
    },
    {
      id: uid("p", 34),
      name: "Michael Hariandja",
      nickname: "Mike",
      place_of_birth: "Medan, Sumatera Utara",
      date_of_birth: "1968-11-11",
      date_of_death: null,
      birth_order: 3,
      gender: "male",
      residential_address: "Jl. Anggrek No. 7, Surabaya",
      religion: "Kristen Protestan",
      phone_number: "+62 814-1122-3344",
      generation: 7,
      father_id: uid("p", 27),
      mother_id: uid("p", 28),
      parent_id: uid("p", 27),
      marital_status: "married",
    },
    {
      id: uid("p", 35),
      name: "Grace Simarmata",
      nickname: "Ibu Grace",
      place_of_birth: "Simarmata, Tapanuli",
      date_of_birth: "1970-03-25",
      date_of_death: null,
      birth_order: 1,
      gender: "female",
      residential_address: "Jl. Anggrek No. 7, Surabaya",
      religion: "Kristen Protestan",
      phone_number: "+62 814-1122-3345",
      generation: 7,
      marital_status: "married",
    },

    // Generation 8 - children of Daniel & Sarah
    {
      id: uid("p", 36),
      name: "Joshua Hariandja",
      nickname: "Josh",
      place_of_birth: "Jakarta",
      date_of_birth: "1990-07-15",
      date_of_death: null,
      birth_order: 1,
      gender: "male",
      residential_address: "Jl. Kemang Raya No. 20, Jakarta",
      religion: "Kristen Protestan",
      phone_number: "+62 815-5566-7788",
      generation: 8,
      father_id: uid("p", 31),
      mother_id: uid("p", 32),
      parent_id: uid("p", 31),
      marital_status: "single",
    },
    {
      id: uid("p", 37),
      name: "Naomi Hariandja",
      nickname: "Nomi",
      place_of_birth: "Jakarta",
      date_of_birth: "1993-12-08",
      date_of_death: null,
      birth_order: 2,
      gender: "female",
      residential_address: "Jl. Cendana No. 5, Jakarta",
      religion: "Kristen Protestan",
      phone_number: "+62 816-9988-7766",
      generation: 8,
      father_id: uid("p", 31),
      mother_id: uid("p", 32),
      parent_id: uid("p", 31),
      marital_status: "single",
    },
    {
      id: uid("p", 38),
      name: "Samuel Hariandja",
      nickname: "Sam",
      place_of_birth: "Jakarta",
      date_of_birth: "1996-04-22",
      date_of_death: null,
      birth_order: 3,
      gender: "male",
      residential_address: "Jl. Cendana No. 5, Jakarta",
      religion: "Kristen Protestan",
      phone_number: "+62 817-3344-5566",
      generation: 8,
      father_id: uid("p", 31),
      mother_id: uid("p", 32),
      parent_id: uid("p", 31),
      marital_status: "single",
    },
    // children of Michael & Grace
    {
      id: uid("p", 39),
      name: "Rebecca Hariandja",
      nickname: "Becca",
      place_of_birth: "Surabaya",
      date_of_birth: "1995-08-19",
      date_of_death: null,
      birth_order: 1,
      gender: "female",
      residential_address: "Jl. Anggrek No. 7, Surabaya",
      religion: "Kristen Protestan",
      phone_number: "+62 818-7788-9900",
      generation: 8,
      father_id: uid("p", 34),
      mother_id: uid("p", 35),
      parent_id: uid("p", 34),
      marital_status: "single",
    },
    {
      id: uid("p", 40),
      name: "Nathan Hariandja",
      nickname: "Nat",
      place_of_birth: "Surabaya",
      date_of_birth: "1998-01-30",
      date_of_death: null,
      birth_order: 2,
      gender: "male",
      residential_address: "Jl. Anggrek No. 7, Surabaya",
      religion: "Kristen Protestan",
      phone_number: "+62 819-1122-5566",
      generation: 8,
      father_id: uid("p", 34),
      mother_id: uid("p", 35),
      parent_id: uid("p", 34),
      marital_status: "single",
    },
  ];

  const insertAll = sqlite.transaction((items: P[]) => {
    for (const p of items) {
      insertPerson.run({
        id: p.id,
        name: p.name,
        nickname: p.nickname ?? null,
        place_of_birth: p.place_of_birth ?? null,
        date_of_birth: p.date_of_birth ?? null,
        date_of_death: p.date_of_death ?? null,
        birth_order: p.birth_order ?? 0,
        gender: p.gender,
        residential_address: p.residential_address ?? null,
        religion: p.religion ?? null,
        phone_number: p.phone_number ?? null,
        photo: p.photo ?? null,
        marital_status: p.marital_status ?? null,
        generation: p.generation,
        father_id: p.father_id ?? null,
        mother_id: p.mother_id ?? null,
        parent_id: p.parent_id ?? null,
        burial_name: p.burial_name ?? null,
        burial_address: p.burial_address ?? null,
        burial_lat: p.burial_lat ?? null,
        burial_lng: p.burial_lng ?? null,
      });
    }
  });
  insertAll(persons);

  // ---- Spouses ----
  const insertSpouse = sqlite.prepare(`
    INSERT INTO spouses (id, husband_id, wife_id, marriage_date, divorce_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const spouses: Array<{
    id: string;
    husband_id: string;
    wife_id: string;
    marriage_date: string | null;
    divorce_date: string | null;
    is_active: number;
  }> = [
    {
      id: uid("s", 1),
      husband_id: uid("p", 1),
      wife_id: uid("p", 2),
      marriage_date: "1805-06-01",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 2),
      husband_id: uid("p", 3),
      wife_id: uid("p", 4),
      marriage_date: "1838-12-10",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 3),
      husband_id: uid("p", 5),
      wife_id: uid("p", 6),
      marriage_date: "1845-05-20",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 4),
      husband_id: uid("p", 7),
      wife_id: uid("p", 8),
      marriage_date: "1868-11-15",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 5),
      husband_id: uid("p", 9),
      wife_id: uid("p", 10),
      marriage_date: "1872-03-08",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 6),
      husband_id: uid("p", 11),
      wife_id: uid("p", 12),
      marriage_date: "1875-09-22",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 7),
      husband_id: uid("p", 13),
      wife_id: uid("p", 14),
      marriage_date: "1896-06-18",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 8),
      husband_id: uid("p", 15),
      wife_id: uid("p", 16),
      marriage_date: "1902-10-25",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 9),
      husband_id: uid("p", 17),
      wife_id: uid("p", 18),
      marriage_date: "1905-04-12",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 10),
      husband_id: uid("p", 19),
      wife_id: uid("p", 20),
      marriage_date: "1908-08-30",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 11),
      husband_id: uid("p", 21),
      wife_id: uid("p", 22),
      marriage_date: "1928-02-14",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 12),
      husband_id: uid("p", 24),
      wife_id: uid("p", 23),
      marriage_date: "1929-09-20",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 13),
      husband_id: uid("p", 25),
      wife_id: uid("p", 26),
      marriage_date: "1935-12-05",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 14),
      husband_id: uid("p", 27),
      wife_id: uid("p", 28),
      marriage_date: "1958-06-22",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 15),
      husband_id: uid("p", 30),
      wife_id: uid("p", 29),
      marriage_date: "1962-10-08",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 16),
      husband_id: uid("p", 31),
      wife_id: uid("p", 32),
      marriage_date: "1988-12-03",
      divorce_date: null,
      is_active: 1,
    },
    {
      id: uid("s", 17),
      husband_id: uid("p", 34),
      wife_id: uid("p", 35),
      marriage_date: "1993-05-15",
      divorce_date: null,
      is_active: 1,
    },
  ];

  const insertAllSpouses = sqlite.transaction((items: typeof spouses) => {
    for (const s of items) {
      insertSpouse.run(
        s.id,
        s.husband_id,
        s.wife_id,
        s.marriage_date,
        s.divorce_date,
        s.is_active
      );
    }
  });
  insertAllSpouses(spouses);

  // ---- Users ----
  const insertUser = sqlite.prepare(`
    INSERT INTO users (id, email, password_hash, name, role_id, person_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminHash = bcrypt.hashSync("admin123", 10);
  const editorHash = bcrypt.hashSync("editor123", 10);

  insertUser.run(
    uid("u", 1),
    "admin@hariandja.id",
    adminHash,
    "Administrator",
    "role_admin",
    uid("p", 31),
    1
  );
  insertUser.run(
    uid("u", 2),
    "editor@hariandja.id",
    editorHash,
    "Editor Keluarga",
    "role_editor",
    uid("p", 34),
    1
  );
}

// Run seed automatically when this module is imported in a server context
export function ensureSeeded(): void {
  try {
    seedDatabase();
  } catch (e) {
    console.error("[seed] error:", e);
  }
}
