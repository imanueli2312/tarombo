import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nickname: text('nickname').notNull(),
  name: text('name'),
  genderId: integer('gender_id').notNull(), // 1 = Male, 2 = Female
  fatherId: text('father_id').references(() => users.id),
  motherId: text('mother_id').references(() => users.id),
  parentId: text('parent_id').references(() => couples.id),
  dob: text('dob'), // YYYY-MM-DD format
  yob: text('yob'), // YYYY format
  birthOrder: integer('birth_order'),
  dod: text('dod'), // YYYY-MM-DD format
  yod: text('yod'), // YYYY format
  email: text('email').unique(),
  password: text('password'),
  address: text('address'),
  city: text('city'),
  phone: text('phone'),
  photoPath: text('photo_path'),
  managerId: text('manager_id').references(() => users.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Couples table
export const couples = sqliteTable('couples', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  husbandId: text('husband_id').notNull().references(() => users.id),
  wifeId: text('wife_id').notNull().references(() => users.id),
  marriageDate: text('marriage_date'),
  divorceDate: text('divorce_date'),
  managerId: text('manager_id').references(() => users.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// User Metadata table (EAV pattern)
export const userMetadata = sqliteTable('user_metadata', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Password Reset Tokens table
export const passwordResets = sqliteTable('password_resets', {
  email: text('email').notNull(),
  token: text('token').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Couple = typeof couples.$inferSelect;
export type NewCouple = typeof couples.$inferInsert;
export type UserMetadata = typeof userMetadata.$inferSelect;
export type NewUserMetadata = typeof userMetadata.$inferInsert;