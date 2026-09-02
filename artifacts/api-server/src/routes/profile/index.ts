import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, updateProfileSchema } from "@workspace/db";
import { moderateText } from "../../lib/moderation.js";
import { requireAuth } from "../../middlewares/auth.js";

const router: IRouter = Router();

router.patch("/", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { displayName, bio, avatarSeed } = parsed.data;

  for (const [label, value] of [
    ["Display name", displayName],
    ["Bio", bio],
  ] as const) {
    if (value) {
      const issue = moderateText(value, label);
      if (issue) {
        res.status(400).json({ error: issue });
        return;
      }
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarSeed !== undefined ? { avatarSeed } : {}),
    })
    .where(eq(usersTable.id, req.session.userId!))
    .returning();

  res.json({
    user: {
      id: updated.id,
      displayName: updated.displayName,
      avatarSeed: updated.avatarSeed,
      bio: updated.bio ?? "",
    },
  });
});

export default router;
