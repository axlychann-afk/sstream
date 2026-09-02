// Lightweight text moderation: blocks profanity/toxic language and 18+/NSFW
// terms in user-supplied text (display names, bios, comments). This is a
// wordlist-based filter — fast, no external dependency/API call, good enough
// as a first line of defense. It intentionally errs on the side of blocking
// borderline matches; a future iteration could layer in an ML-based service.
//
// Covers common English and Indonesian profanity/NSFW terms since the app's
// audience is primarily Indonesian.
const BLOCKED_TERMS = [
  // English profanity / slurs (kept generic, not exhaustive)
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "pussy",
  "whore", "slut", "nigger", "faggot", "retard",
  // English NSFW / 18+
  "porn", "nsfw", "xxx", "nude", "naked", "sex tape", "onlyfans", "hentai",
  "camgirl", "escort service",
  // Indonesian profanity
  "anjing", "bangsat", "kontol", "memek", "ngentot", "goblok", "tolol",
  "babi", "bego", "brengsek", "asu", "jancok", "cuk", "peler", "pepek",
  "kimak", "monyet",
  // Indonesian NSFW / 18+
  "bokep", "telanjang", "ngewe", "colmek", "toket", "vcs",
];

const BLOCKED_REGEX = new RegExp(
  `(${BLOCKED_TERMS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "i",
);

/** Returns true if the given text contains blocked profanity/NSFW terms. */
export function containsBlockedContent(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  return BLOCKED_REGEX.test(normalized);
}

/** Throws-free validator: returns an error message, or null if the text is clean. */
export function moderateText(text: string, fieldLabel = "Text"): string | null {
  if (containsBlockedContent(text)) {
    return `${fieldLabel} contains language that isn't allowed here (profanity or 18+ content).`;
  }
  return null;
}
