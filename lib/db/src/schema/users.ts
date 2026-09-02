import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  // Avatars are chosen from a fixed, pre-approved preset list (see AVATAR_PRESETS
  // on the frontend) — never a free-form upload — so profile pictures can never
  // contain adult/NSFW content.
  avatarSeed: text("avatar_seed").notNull(),
  bio: text("bio").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const selectUserSchema = createSelectSchema(usersTable);
export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type User = typeof usersTable.$inferSelect;

// Public-safe user shape returned by the API (never leaks passwordHash/email to other users)
export type PublicUser = Pick<User, "id" | "displayName" | "avatarSeed">;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(32),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

// Must match the frontend's AVATAR_PRESETS list exactly (see
// artifacts/donghua-stream/src/lib/authApi.ts) — kept in sync manually since
// the two packages don't share a build step. Enforced here so a crafted
// request can't set an arbitrary avatar seed.
export const AVATAR_PRESETS = [
  "aurora", "blaze", "comet", "drift", "ember", "frost",
  "glow", "haze", "jade", "koi", "lotus", "nova",
] as const;

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(32).optional(),
  bio: z.string().trim().max(200).optional(),
  avatarSeed: z.enum(AVATAR_PRESETS).optional(),
});
