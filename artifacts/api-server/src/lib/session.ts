import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const PgSession = connectPgSimple(session);

// Dedicated pool for the session store (separate from the app's Drizzle pool)
// so session store errors/backpressure can't starve normal query traffic.
const sessionPool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error("SESSION_SECRET must be set to enable login sessions.");
}

export const sessionMiddleware = session({
  store: sessionPool
    ? new PgSession({ pool: sessionPool, tableName: "user_sessions", createTableIfMissing: true })
    : undefined,
  secret,
  name: "donghua.sid",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    // Only require HTTPS-only cookies in production — dev runs over plain HTTP.
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});
