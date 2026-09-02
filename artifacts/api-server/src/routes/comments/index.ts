import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, usersTable, commentsTable, createCommentSchema } from "@workspace/db";
import { moderateText } from "../../lib/moderation.js";
import { requireAuth } from "../../middlewares/auth.js";
import { commentLimiter } from "../../middlewares/rateLimit.js";

const router: IRouter = Router();

// GET /api/comments?seriesSlug=...&episodeSlug=...
router.get("/", async (req, res) => {
  const seriesSlug = String(req.query.seriesSlug ?? "").trim();
  const episodeSlug = String(req.query.episodeSlug ?? "").trim();
  if (!seriesSlug || !episodeSlug) {
    res.status(400).json({ error: "seriesSlug and episodeSlug are required." });
    return;
  }

  const rows = await db
    .select({
      id: commentsTable.id,
      content: commentsTable.content,
      createdAt: commentsTable.createdAt,
      userId: usersTable.id,
      displayName: usersTable.displayName,
      avatarSeed: usersTable.avatarSeed,
    })
    .from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(and(eq(commentsTable.seriesSlug, seriesSlug), eq(commentsTable.episodeSlug, episodeSlug)))
    .orderBy(desc(commentsTable.createdAt))
    .limit(200);

  res.json({ comments: rows });
});

router.post("/", requireAuth, commentLimiter, async (req, res) => {
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { seriesSlug, episodeSlug, content } = parsed.data;

  const issue = moderateText(content, "Comment");
  if (issue) {
    res.status(400).json({ error: issue });
    return;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({ userId: req.session.userId!, seriesSlug, episodeSlug, content })
    .returning();

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.session.userId!) });

  res.status(201).json({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      userId: user!.id,
      displayName: user!.displayName,
      avatarSeed: user!.avatarSeed,
    },
  });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid comment id." });
    return;
  }

  const existing = await db.query.commentsTable.findFirst({ where: eq(commentsTable.id, id) });
  if (!existing) {
    res.status(404).json({ error: "Comment not found." });
    return;
  }
  // Users may only delete their own comments.
  if (existing.userId !== req.session.userId) {
    res.status(403).json({ error: "You can only delete your own comments." });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, id));
  res.status(204).end();
});

export default router;
