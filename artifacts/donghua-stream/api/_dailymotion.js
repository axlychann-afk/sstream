// Best-effort Dailymotion (dongchindopro channel) lookup, ported from
// artifacts/api-server/src/routes/donghua/dailymotion.ts so the Vercel
// serverless functions (the ones actually serving donghuastream.my.id) get
// the same "Dailymotion often uploads before anichin.moe lists it" behavior.
//
// Keep this file's logic in sync with the api-server TS version when either
// changes — SERIES_ALIASES in particular.

const DM_CHANNEL = "dongchindopro";
const DM_API = `https://api.dailymotion.com/user/${DM_CHANNEL}/videos`;
const REQUEST_TIMEOUT = 15000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PAGES = 3;
// On a cold cache (e.g. a fresh serverless invocation), fetching all pages
// sequentially can take a while. getDailymotionServer/listDailymotionEpisodes
// race against this budget so a slow/cold lookup never holds up the response
// — the underlying fetch keeps running in the background and populates the
// (function-instance-local) cache for the next warm invocation regardless.
const LOOKUP_BUDGET_MS = 8000;

let cache = null; // { entries, fetchedAt }
let inflight = null;

function normalize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Manually maintained aliases: our site's series slug -> the normalized show
 * code that the `dongchindopro` Dailymotion channel uses in its upload titles.
 * Keep in sync with artifacts/api-server/src/routes/donghua/dailymotion.ts.
 */
const SERIES_ALIASES = {
  // Site's actual slug for "BTTH Season 5" is this odd machine-translated
  // string, not "btth-season-5" — the old key never matched any real
  // episode slug, so this series silently never got Dailymotion coverage.
  "oyen-pertempuran-akhir-sekte-misty-cloud": ["btth", "btth5", "doupocangqiong5"],
  "coiling-dragon": ["coilingdragon"],
  "ever-night": ["evernight"],
  "perfect-world": ["perfectworld"],
  "azure-legacy": ["azurelegacy"],
  "my-senior-brother-is-too-steady": ["msbs"],
  "way-of-choices": ["wayofchoices"],
  "renegade-immortal": ["renegadeimmortal"],
  "swallowed-star": ["swallowedstar"],
  "shrounding-the-heavens": ["shroudingtheheavens"],
  "shrouding-the-heavens": ["shroudingtheheavens"],
  "tomb-of-fallen-gods-season-3": ["tomboffallengods3"],
  "the-great-ruler": ["thegreatruler"],
  "walking-the-way-all-alone": ["walkingthewayalone"],
  "in-search-of-gods": ["insearchofgods"],
  "tales-of-herding-god": ["talesofherdinggods"],
  "purple-river-season-2": ["purpleriver2"],
  "slay-the-gods-season-2": ["slaythegods2"],
  "the-other-side-of-deep-space": ["theothersidedeepspace"],
  "eclipse-of-illusion-special-the-miasma-war": ["eclipseofillusionspecialthemiasmawar"],
  "100-000-years-of-refining-qi": ["100000refiningqi"],
  "beyond-times-gaze": ["beyondtimesgaze"],
  "dragons-triumph-in-the-celestial-realm": ["dragonstriumphcelestialrealm"],
};

/**
 * Parses a dongchindopro upload title into {code, epStart, epEnd}.
 */
function parseTitle(raw) {
  const title = String(raw).replace(/^\s*\|?\s*(Indo Sub\s*\|)?\s*/i, "").trim();

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

async function fetchWithTimeout(url, params, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${qs}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Dailymotion API error: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchChannelVideos() {
  const entries = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchWithTimeout(
      DM_API,
      { fields: "id,title,created_time", limit: 100, page },
      REQUEST_TIMEOUT
    );
    const list = Array.isArray(data?.list) ? data.list : [];
    for (const v of list) {
      const parsed = parseTitle(v.title);
      if (parsed) entries.push({ ...parsed, videoId: v.id, createdTime: v.created_time });
    }
    if (!data?.has_more) break;
  }
  return entries;
}

async function getEntries() {
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
 * Candidate dongchindopro show codes for a series slug: any manually
 * curated aliases (for series whose upload naming doesn't match their own
 * slug), plus the normalized slug itself as a fallback. Most of the
 * channel's uploads are titled with the show name squashed together
 * (e.g. "beyond-times-gaze" -> "beyondtimesgaze"), which is exactly
 * normalize(seriesSlug) — so this extends coverage to every series
 * automatically without needing a manual entry per show, while staying an
 * exact-match lookup (never fuzzy) so a series the channel doesn't cover
 * simply matches nothing instead of risking a wrong-episode mismatch.
 */
function candidateCodes(seriesSlug) {
  const aliases = SERIES_ALIASES[seriesSlug] ?? [];
  const fallback = normalize(seriesSlug);
  return aliases.includes(fallback) ? aliases : [...aliases, fallback];
}

/**
 * Lists every episode number the dongchindopro channel has uploaded for a
 * series, with each episode's newest matching upload. Used to surface
 * episodes Dailymotion has published ahead of anichin.moe listing them.
 * Returns [] (never throws) if nothing matches or the channel lookup fails.
 */
export async function listDailymotionEpisodes(seriesSlug) {
  const codes = candidateCodes(seriesSlug);

  try {
    const entries = await Promise.race([
      getEntries(),
      new Promise((resolve) => setTimeout(() => resolve(null), LOOKUP_BUDGET_MS)),
    ]);
    if (!entries) return [];

    const relevant = entries.filter((e) => codes.includes(e.code));
    const byEpisode = new Map();
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
 * Extracts {seriesSlug, episodeNumber} from an anichin-style episode slug.
 */
export function parseEpisodeSlug(slug) {
  const m = String(slug).match(/^(.+?)-episode-0*(\d+)(?:-|$)/i);
  if (!m) return null;
  return { seriesSlug: m[1], episodeNumber: parseInt(m[2], 10) };
}

/**
 * Best-effort Dailymotion embed lookup for a given episode slug. Returns null
 * (never throws) whenever nothing matches or the Dailymotion API is
 * unreachable.
 */
export async function getDailymotionServer(episodeSlug) {
  const parsed = parseEpisodeSlug(episodeSlug);
  if (!parsed) return null;
  const codes = candidateCodes(parsed.seriesSlug);

  try {
    const entries = await Promise.race([
      getEntries(),
      new Promise((resolve) => setTimeout(() => resolve(null), LOOKUP_BUDGET_MS)),
    ]);
    if (!entries) return null;
    const matches = entries.filter(
      (e) => codes.includes(e.code) && parsed.episodeNumber >= e.epStart && parsed.episodeNumber <= e.epEnd
    );
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.createdTime - a.createdTime);
    const best = matches[0];
    // The "dcsrc=dongchindopro" marker lets the frontend distinguish this
    // verified channel lookup from generic Dailymotion links anichin/Animasu
    // scraping sometimes surfaces (those are blocked client-side).
    return {
      name: "Dailymotion",
      embed_url: `https://geo.dailymotion.com/player.html?video=${best.videoId}&autoplay=0&mute=0&loop=0&controls=1&showinfo=1&dcsrc=dongchindopro`,
    };
  } catch {
    return null;
  }
}
