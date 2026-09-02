import rateLimit from "express-rate-limit";

// Brute-force protection on login/register: 10 attempts per 15 minutes per IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

// Anti-spam on comment posting: 15 comments per 5 minutes per IP.
export const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're posting too fast. Please slow down." },
});
