import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const commentsTable = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // Comments are scoped per-episode: same series can have many episodes,
    // each with its own independent thread.
    seriesSlug: text("series_slug").notNull(),
    episodeSlug: text("episode_slug").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_episode_idx").on(t.seriesSlug, t.episodeSlug)],
);

export type Comment = typeof commentsTable.$inferSelect;

// Plain text only — no HTML/markdown rendering on the frontend, so no XSS vector,
// but we still strip tags defensively and cap length to prevent spam walls of text.
export const createCommentSchema = z.object({
  seriesSlug: z.string().trim().min(1).max(128),
  episodeSlug: z.string().trim().min(1).max(128),
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(500, "Comment is too long (max 500 characters)")
    .refine((v) => !/<[^>]*>/.test(v), "HTML is not allowed in comments"),
});
