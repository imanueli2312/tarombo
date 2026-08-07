// Shared type definitions for the Hariandja family tree application

export type Gender = "male" | "female";

export type MaritalStatus =
  | "single"
  | "married"
  | "widowed"
  | "divorced";

export interface Person {
  id: string;
  name: string;
  nickname: string | null;
  place_of_birth: string | null;
  date_of_birth: string | null;
  date_of_death: string | null;
  birth_order: number;
  gender: Gender;
  residential_address: string | null;
  religion: string | null;
  phone_number: string | null;
  photo: string | null;
  marital_status: MaritalStatus | null;
  generation: number;
  father_id: string | null;
  mother_id: string | null;
  parent_id: string | null;
  burial_name: string | null;
  burial_address: string | null;
  burial_lat: number | null;
  burial_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface Spouse {
  id: string;
  husband_id: string;
  wife_id: string;
  marriage_date: string | null;
  divorce_date: string | null;
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permissions;
  is_system: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role_id: string;
  person_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// User object returned to the client (no password hash)
export interface SafeUser extends Omit<User, never> {
  role?: Role;
  person?: Person | null;
}

export interface Permissions {
  pages: {
    familyTree: boolean;
    familyChart: boolean;
    birthdays: boolean;
    weddings: boolean;
    profile: boolean;
  };
  actions: {
    managePersons: boolean;
    manageSpouses: boolean;
    manageUsers: boolean;
    manageRoles: boolean;
    exportData: boolean;
  };
}

export type PageKey = keyof Permissions["pages"];
export type ActionKey = keyof Permissions["actions"];

// Default permission sets for built-in roles
export const VIEWER_PERMISSIONS: Permissions = {
  pages: {
    familyTree: true,
    familyChart: false,
    birthdays: false,
    weddings: false,
    profile: false,
  },
  actions: {
    managePersons: false,
    manageSpouses: false,
    manageUsers: false,
    manageRoles: false,
    exportData: false,
  },
};

export const EDITOR_PERMISSIONS: Permissions = {
  pages: {
    familyTree: true,
    familyChart: true,
    birthdays: true,
    weddings: true,
    profile: true,
  },
  actions: {
    managePersons: true,
    manageSpouses: true,
    manageUsers: false,
    manageRoles: false,
    exportData: true,
  },
};

export const ADMIN_PERMISSIONS: Permissions = {
  pages: {
    familyTree: true,
    familyChart: true,
    birthdays: true,
    weddings: true,
    profile: true,
  },
  actions: {
    managePersons: true,
    manageSpouses: true,
    manageUsers: true,
    manageRoles: true,
    exportData: true,
  },
};

export const ALL_PAGE_KEYS: PageKey[] = [
  "familyTree",
  "familyChart",
  "birthdays",
  "weddings",
  "profile",
];

export const ALL_ACTION_KEYS: ActionKey[] = [
  "managePersons",
  "manageSpouses",
  "manageUsers",
  "manageRoles",
  "exportData",
];
