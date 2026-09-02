import axios from "axios";
import type { VideoServer } from "./scraper.js";

const DM_CHANNEL = "dongchindopro";
const DM_API = `https://api.dailymotion.com/user/${DM_CHANNEL}/videos`;
const REQUEST_TIMEOUT = 15000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_PAGES = 10;
// On a cold cache, fetching all MAX_PAGES sequentially can take up to
// MAX_PAGES * REQUEST_TIMEOUT. getDailymotionServer is raced against this
// budget so a slow/cold lookup never holds up the anichin/Animasu servers
// response — the underlying fetch keeps running in the background and
// populates the cache for the next request regardless of whether this call
// waited for it.
const LOOKUP_BUDGET_MS = 8000;

interface DmVideo {
  id: string;
  title: string;
  created_time: number;
}

interface DmEntry {
  code: string;
  epStart: number;
  epEnd: number;
  videoId: string;
  createdTime: number;
}

let cache: { entries: DmEntry[]; fetchedAt: number } | null = null;
let inflight: Promise<DmEntry[]> | null = null;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Stop words excluded from token-based slug matching.
 * These are common English words that appear in both slugs and channel titles
 * and would create false positives if included.
 */
const STOP_WORDS = new Set([
  "sub", "the", "and", "but", "for", "nor", "not", "yet", "its", "indo",
  "end", "eps", "season", "special",
]);

/**
 * Manual overrides for series whose site slugs are in a completely different
 * language or use abbreviations that can't be derived from the slug words.
 * Keep this list minimal — the token-based auto-matching handles most cases.
 */
const SERIES_ALIASES: Record<string, string[]> = {
  // Site slug is the Indonesian machine-translated title; channel uses "BTTH" / "BTTH5".
  "oyen-pertempuran-akhir-sekte-misty-cloud": ["btth", "btth5", "doupocangqiong5"],
  // Channel uses the typo "allone" as well as correct "alone" and "allalone".
  "walking-the-way-all-alone": ["walkingthewayalone", "walkingthewayallone", "walkingthewayallalone"],
  // "shrounding" is a persistent typo in older anichin episode slugs.
  "shrounding-the-heavens": ["shroudingtheheavens", "sthshroudingtheheavens", "zhetian"],
  "shrouding-the-heavens": ["shroudingtheheavens", "sthshroudingtheheavens", "zhetian"],
  // Channel uses Chinese pinyin title "Ze Tian Ji" alongside "Way of Choices".
  "way-of-choices": ["wayofchoices", "zetianji"],
  // Channel uses Chinese pinyin title "Da Zhu Zai" alongside "The Great Ruler".
  "the-great-ruler": ["thegreatruler", "dazhuzai", "thegreatruler2"],
};

/**
 * Parses a dongchindopro upload title into {code, epStart, epEnd}.
 * Handles the two formats seen on the channel:
 *   "| Coiling Dragon | EP 8 - 14"  /  "Indo Sub | Ze Tian Ji | EP 23 - 26 End"
 *   "BTTH 5_Eps 207"  /  "Way of Choices_Eps 26 End"
 * Returns null if the title doesn't match either shape.
 */
function parseTitle(raw: string): { code: string; epStart: number; epEnd: number } | null {
  const title = raw.replace(/^\s*\|?\s*(Indo Sub\s*\|)?\s*/i, "").trim();

  let m = title.match(/^\|?\s*(.+?)\s*\|\s*EP\.?\s*(\d+)\s*(?:-\s*(\d+))?/i);
  if (!m) {
    m = title.match(/^(.+?)[\s_]+Eps?\.?\s*(\d+)\s*(?:-\s*(\d+))?/i);
  }
  if (!m) return null;

  const code = normalize(m[1]);
  const epStart = parseInt(m[2], 10);
  const epEnd = m[3] ? parseInt(m[3], 10) : epStart;
  if (!code || Number.isNaN(epStart)) return null;
  return { code, epStart, epEnd };
}

async function fetchChannelVideos(): Promise<DmEntry[]> {
  const entries: DmEntry[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await axios.get(DM_API, {
      params: { fields: "id,title,created_time", limit: 100, page, sort: "recent" },
      timeout: REQUEST_TIMEOUT,
    });
    const list: DmVideo[] = Array.isArray(data?.list) ? data.list : [];
    for (const v of list) {
      const parsed = parseTitle(v.title);
      if (parsed) entries.push({ ...parsed, videoId: v.id, createdTime: v.created_time });
    }
    if (!data?.has_more) break;
  }
  return entries;
}

async function getEntries(): Promise<DmEntry[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.entries;
  if (inflight) return inflight;

  inflight = fetchChannelVideos()
    .then((entries) => {
      cache = { entries, fetchedAt: Date.now() };
      return entries;
    })
    .catch((err) => {
      if (cache) return cache.entries; // serve stale on transient failure
      throw err;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * Finds all channel codes that match a given series slug.
 *
 * Strategy (applied in order, results merged):
 * 1. Manual SERIES_ALIASES override for non-derivable cases (e.g. Indonesian
 *    slug → BTTH abbreviation, persistent typos).
 * 2. Exact normalized slug match: normalize("coiling-dragon") = "coilingdragon"
 *    which is exactly what the channel uses for most series.
 * 3. Token-based fuzzy match: split the slug into meaningful words (≥3 chars,
 *    not a stop word), then find every channel code that contains enough of
 *    those words as substrings. This handles:
 *      - dropped prepositions ("The Gate of Mystical Realm" → "thegatemysticalrealm")
 *      - pluralisation differences ("tales-of-herding-god" → "talesofherdinggods")
 *      - extra words in channel title ("Soul Land 2" for "soul-land-season-2")
 *      - abbreviation prefixes ("[MSBS] My Senior Brother Steady" → "msbsmyseniorbrothersteady")
 *    Threshold: ≥55% of slug tokens must appear in the channel code, minimum 2.
 *
 * This is exact-match per individual code (never substring on the wrong show),
 * so a series the channel doesn't carry simply matches nothing instead of
 * showing the wrong show's video.
 */
function findCandidateCodes(seriesSlug: string, entries: DmEntry[]): string[] {
  const manual = SERIES_ALIASES[seriesSlug] ?? [];
  const exact = normalize(seriesSlug);

  // Token-based: split slug by hyphens, keep meaningful words only
  const words = seriesSlug.split("-").filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const allCodes = new Set(entries.map((e) => e.code));
  const fuzzy: string[] = [];

  if (words.length >= 2) {
    const threshold = Math.max(2, Math.ceil(words.length * 0.55));
    for (const code of allCodes) {
      const hits = words.filter((w) => code.includes(w)).length;
      if (hits >= threshold) fuzzy.push(code);
    }
  }

  // Prefix matching: handles season-numbered uploads like "immortality1",
  // "immortality3", "soulland2" when the slug is just "immortality" / "soul-land".
  // Only match codes that are at most 2 characters longer than the exact slug
  // (covers single or double-digit season suffixes without over-matching).
  for (const code of allCodes) {
    if (code.startsWith(exact) && code.length <= exact.length + 2) {
      fuzzy.push(code);
    }
  }

  // Season-slug pattern: "series-name-season-N" → also try normalizedBase + N.
  // Handles slugs like "immortality-season-1" → "immortality1",
  // "great-king-of-the-grave-season-2" → "greatkingofthegrave2", etc.
  const seasonMatch = seriesSlug.match(/^(.+)-season-(\d+)$/i);
  if (seasonMatch) {
    const base = normalize(seasonMatch[1]);
    const num = seasonMatch[2];
    fuzzy.push(base + num);
    // Also try any channel code that starts with base and ends with this number
    for (const code of allCodes) {
      if (code.startsWith(base) && code.length <= base.length + 2) {
        fuzzy.push(code);
      }
    }
  }

  return [...new Set([...manual, exact, ...fuzzy])];
}

/**
 * Lists every episode number the dongchindopro channel has uploaded for a
 * series, with each episode's newest matching upload. Used to surface
 * episodes Dailymotion has published ahead of anichin.moe listing them —
 * dongchindopro often uploads before anichin's own episode page goes up.
 * Returns [] (never throws) if nothing matches or the channel lookup fails.
 */
export async function listDailymotionEpisodes(
  seriesSlug: string
): Promise<Array<{ episodeNumber: number; videoId: string; createdTime: number }>> {
  try {
    const entries = await Promise.race([
      getEntries(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_BUDGET_MS)),
    ]);
    if (!entries) return [];

    const codes = findCandidateCodes(seriesSlug, entries);
    const relevant = entries.filter((e) => codes.includes(e.code));
    const byEpisode = new Map<number, { videoId: string; createdTime: number }>();
    for (const e of relevant) {
      for (let ep = e.epStart; ep <= e.epEnd; ep++) {
        const existing = byEpisode.get(ep);
        if (!existing || e.createdTime > existing.createdTime) {
          byEpisode.set(ep, { videoId: e.videoId, createdTime: e.createdTime });
        }
      }
    }
    return Array.from(byEpisode.entries())
      .map(([episodeNumber, v]) => ({ episodeNumber, ...v }))
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  } catch {
    return [];
  }
}

/**
 * Extracts {seriesSlug, episodeNumber} from an anichin-style episode slug,
 * e.g. "coiling-dragon-episode-14-subtitle-indonesia" -> { seriesSlug: "coiling-dragon", episodeNumber: 14 }.
 */
export function parseEpisodeSlug(slug: string): { seriesSlug: string; episodeNumber: number } | null {
  const m = slug.match(/^(.+?)-episode-0*(\d+)(?:-|$)/i);
  if (!m) return null;
  return { seriesSlug: m[1], episodeNumber: parseInt(m[2], 10) };
}

/**
 * Best-effort Dailymotion embed lookup for a given episode slug. Returns null
 * (never throws) whenever the channel has no matching upload yet, or the
 * Dailymotion API is unreachable — so callers can always treat this as an
 * optional extra server.
 */
export async function getDailymotionServer(episodeSlug: string): Promise<VideoServer | null> {
  const parsed = parseEpisodeSlug(episodeSlug);
  if (!parsed) return null;

  try {
    // Race against LOOKUP_BUDGET_MS instead of awaiting getEntries() directly:
    // getEntries() keeps running (and will populate the cache) even if we give
    // up waiting on it here, so a cold-cache lookup costs at most this budget
    // on the caller instead of the full multi-page fetch time.
    const entries = await Promise.race([
      getEntries(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_BUDGET_MS)),
    ]);
    if (!entries) return null;

    const codes = findCandidateCodes(parsed.seriesSlug, entries);
    const matches = entries.filter(
      (e) => codes.includes(e.code) && parsed.episodeNumber >= e.epStart && parsed.episodeNumber <= e.epEnd
    );
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.createdTime - a.createdTime);
    const best = matches[0];
    // The "dcsrc=dongchindopro" marker lets the frontend distinguish this
    // verified channel lookup from the generic Dailymotion links anichin/Animasu
    // scraping sometimes surfaces (those are blocked — see BLOCKED_SERVERS above
    // and the frontend's isServerBlocked in watch.tsx).
    return {
      name: "Dailymotion",
      embed_url: `https://geo.dailymotion.com/player.html?video=${best.videoId}&autoplay=0&mute=0&loop=0&controls=1&showinfo=1&dcsrc=dongchindopro`,
    };
  } catch {
    return null;
  }
}
