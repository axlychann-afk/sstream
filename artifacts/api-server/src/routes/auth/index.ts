import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, registerSchema, loginSchema, AVATAR_PRESETS } from "@workspace/db";
import { moderateText } from "../../lib/moderation.js";
import { authLimiter } from "../../middlewares/rateLimit.js";
import type { PublicUser } from "@workspace/db";

const router: IRouter = Router();

function toPublicUser(u: { id: number; displayName: string; avatarSeed: string }): PublicUser {
  return { id: u.id, displayName: u.displayName, avatarSeed: u.avatarSeed };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

router.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { email, password, displayName } = parsed.data;

  const nameIssue = moderateText(displayName, "Display name");
  if (nameIssue) {
    res.status(400).json({ error: nameIssue });
    return;
  }

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Deterministic-but-varied default avatar from the approved preset list —
  // user can change it later from their profile settings.
  const defaultAvatar = AVATAR_PRESETS[Math.abs(hashCode(email)) % AVATAR_PRESETS.length];
  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      displayName,
      avatarSeed: defaultAvatar,
    })
    .returning();

  // Regenerate the session id on registration too (same rationale as login)
  // to close a session-fixation window for the newly created account.
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Could not start session." });
      return;
    }
    req.session.userId = user.id;
    res.status(201).json({ user: toPublicUser(user) });
  });
});

router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password." });
    return;
  }
  const { email, password } = parsed.data;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  // Use the same error message whether the email doesn't exist or the
  // password is wrong, so login can't be used to enumerate registered emails.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Could not start session." });
      return;
    }
    req.session.userId = user.id;
    res.json({ user: toPublicUser(user) });
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("donghua.sid");
    res.status(204).end();
  });
});

router.get("/me", async (req, res) => {
  if (!req.session.userId) {
    res.status(200).json({ user: null });
    return;
  }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.session.userId) });
  if (!user) {
    res.status(200).json({ user: null });
    return;
  }
  res.json({ user: { ...toPublicUser(user), bio: user.bio ?? "" } });
});

export default router;
