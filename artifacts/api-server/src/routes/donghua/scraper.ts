import axios from "axios";
import * as cheerio from "cheerio";
import { getDailymotionServer, listDailymotionEpisodes } from "./dailymotion.js";

const AXLY_BASE = "https://axlyapi.qzz.io/donghua";
const AXLY_ANIMASU_BASE = "https://axlyapi.qzz.io/anime/animasu";
const ANIMASU_EPISODE_BASE = "https://v1.animasu.work";
const ANICHIN_BASE = "https://anichin.moe";
const REQUEST_TIMEOUT = 20000;

// Servers blocked from appearing in the player (confirmed to block iframe embedding)
const BLOCKED_SERVERS = ["dailymotion"];
export function isServerBlocked(name: string, url: string): boolean {
  const haystack = `${name} ${url}`.toLowerCase();
  return BLOCKED_SERVERS.some((b) => haystack.includes(b));
}

/**
 * Replace wrapped embed URLs with their direct equivalent.
 * e.g. anichin-player.web.id/index.php?ok=ID → //ok.ru/videoembed/ID
 * This bypasses domain-whitelist checks inside the wrapper player.
 */
export function unwrapEmbedUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("//") ? `https:${url}` : url);
    // anichin-player.web.id/?ok=VIDEO_ID → direct OK.ru embed
    if (u.hostname === "anichin-player.web.id") {
      const okId = u.searchParams.get("ok");
      if (okId) return `//ok.ru/videoembed/${okId}`;
    }
  } catch { /* ignore */ }
  return url;
}

const http = axios.create({
  baseURL: AXLY_BASE,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "User-Agent": "DonghuaStream/1.0",
  },
});

// The Animasu upstream (v1.animasu.work, via axly) is frequently slow or
// erroring (observed: ~30s before a 500) — bounding its timeout well below
// the shared REQUEST_TIMEOUT keeps a flaky Animasu response from gating the
// whole /servers or /stream response when anichin and Dailymotion have
// already resolved.
const ANIMASU_REQUEST_TIMEOUT = 8000;

const httpAnimasu = axios.create({
  baseURL: AXLY_ANIMASU_BASE,
  timeout: ANIMASU_REQUEST_TIMEOUT,
  headers: {
    "User-Agent": "DonghuaStream/1.0",
  },
});

const httpDirect = axios.create({
  baseURL: ANICHIN_BASE,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "Referer": "https://anichin.moe/",
  },
});

// ──────────────────────────────────────────────
// Types (kept identical so route handlers don't change)
// ──────────────────────────────────────────────

export interface DonghuaItem {
  title: string;
  slug: string;
  url: string;
  type: string;
  status: string;
  sub: string;
  thumbnail: string | null;
}

export interface Episode {
  number: number;
  title: string;
  url: string;
  slug: string;
  date: string | null;
}

export interface DonghuaDetail {
  title: string;
  alternative: string;
  rating: string;
  status: string;
  type: string;
  studio: string;
  network: string;
  releaseDate: string;
  duration: string;
  season: string;
  country: string;
  totalEpisodes: string | number;
  subber: string;
  genres: string[];
  sinopsis: string;
  cover: string | null;
  episodes: Episode[];
}

export interface VideoServer {
  name: string;
  embed_url: string;
}

export interface StreamInfo {
  title: string;
  source: string;
  video_id: string | null;
  embed_url: string;
  watch_url: string;
  servers: VideoServer[];
}

export interface ServersInfo {
  title: string;
  slug: string;
  total_servers: number;
  servers: VideoServer[];
}

export interface DownloadLink {
  label: string;
  url: string;
}

export interface DownloadQuality {
  quality: string;
  size: string;
  links: DownloadLink[];
}

export interface DownloadInfo {
  title: string;
  slug: string;
  downloads: DownloadQuality[];
}

export interface ScheduleItem {
  title: string;
  slug: string;
  url: string;
  is_vip: boolean;
}

// ──────────────────────────────────────────────
// Internal API response shapes
// ──────────────────────────────────────────────

interface AxlyListResponse {
  status: boolean;
  total?: number;
  results?: unknown[];
}

interface AxlyListItem {
  title?: unknown;
  slug?: unknown;
  url?: unknown;
  type?: unknown;
  status?: unknown;
  sub?: unknown;
  thumbnail?: unknown;
}

interface AxlyDetailResponse {
  status: boolean;
  error?: string;
  result?: {
    title?: unknown;
    alternative?: unknown;
    rating?: unknown;
    status?: unknown;
    type?: unknown;
    studio?: unknown;
    network?: unknown;
    releaseDate?: unknown;
    duration?: unknown;
    season?: unknown;
    country?: unknown;
    totalEpisodes?: unknown;
    subber?: unknown;
    genres?: unknown;
    sinopsis?: unknown;
    cover?: unknown;
    episodes?: unknown[];
  };
}

interface AxlyStreamResponse {
  status: boolean;
  error?: string;
  result?: {
    title?: unknown;
    source?: unknown;
    video_id?: unknown;
    embed_url?: unknown;
    watch_url?: unknown;
  };
}

interface AxlyServersResponse {
  status: boolean;
  error?: string;
  result?: {
    title?: unknown;
    slug?: unknown;
    total_servers?: number;
    servers?: Array<{
      label?: unknown;
      embed_url?: unknown;
      is_ads?: unknown;
    }>;
  };
}

interface AxlyDownloadResponse {
  status: boolean;
  error?: string;
  result?: {
    title?: unknown;
    slug?: unknown;
    downloads?: Array<{
      quality?: unknown;
      size?: unknown;
      links?: Array<{
        label?: unknown;
        url?: unknown;
      }>;
    }>;
  };
}

interface AxlyAnimasuResponse {
  status: boolean;
  error?: string;
  result?: {
    title?: unknown;
    dropdown_servers?: Array<{
      label?: unknown;
      platform?: unknown;
      embed_url?: unknown;
      decoded_html?: unknown;
    }>;
  };
}

interface AxlyScheduleResponse {
  status: boolean;
  result?: Record<string, unknown[]>;
}

interface AxlyEpisode {
  number?: unknown;
  title?: unknown;
  url?: unknown;
  slug?: unknown;
  date?: unknown;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Convert an anichin episode slug to Animasu's URL format.
 * anichin: "apotheosis-episode-01-subtitle-indonesia"
 * animasu: "nonton-apotheosis-episode-1"
 */
function toAnimasuSlug(slug: string): string {
  if (slug.startsWith("nonton-")) return slug;
  const m = slug.match(/^(.+?)-episode-0*(\d+)(?:-subtitle.*)?$/i);
  if (m) return `nonton-${m[1]}-episode-${parseInt(m[2], 10)}`;
  return `nonton-${slug}`;
}

/**
 * Fetch servers from Animasu for an episode slug.
 * Converts the anichin slug to Animasu format automatically.
 * Returns an empty array on any failure so it never breaks the main flow.
 */
async function scrapeAnimasuServersForSlug(slug: string): Promise<VideoServer[]> {
  try {
    const animasuSlug = toAnimasuSlug(slug);
    const animasuUrl = `${ANIMASU_EPISODE_BASE}/${animasuSlug}/`;
    const { data } = await httpAnimasu.get<AxlyAnimasuResponse>(
      `/stream?url=${encodeURIComponent(animasuUrl)}`
    );
    if (!data?.status || !data?.result?.dropdown_servers) return [];

    const servers: VideoServer[] = [];
    for (const s of data.result.dropdown_servers) {
      const name = typeof s.label === "string" ? s.label.trim() : "";
      const embed_url = unwrapEmbedUrl(typeof s.embed_url === "string" ? s.embed_url.trim() : "");
      if (name && embed_url && !isServerBlocked(name, embed_url)) {
        servers.push({ name: `[Animasu] ${name}`, embed_url });
      }
    }
    return servers;
  } catch {
    return [];
  }
}

/** Merge two server lists, deduplicating by embed_url */
function mergeServers(primary: VideoServer[], secondary: VideoServer[]): VideoServer[] {
  const seen = new Set(primary.map((s) => s.embed_url));
  const extras = secondary.filter((s) => !seen.has(s.embed_url));
  return [...primary, ...extras];
}

/** Remove duplicated title text like "Foo BarFoo Bar" → "Foo Bar" */
function dedupeTitle(raw: unknown): string {
  const title = typeof raw === "string" ? raw : "";
  const half = Math.floor(title.length / 2);
  if (title.length > 0 && title.length % 2 === 0 && title.slice(0, half) === title.slice(half)) {
    return title.slice(0, half);
  }
  return title;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function slugFromUrl(url: string): string {
  return url
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\/$/, "")
    .replace(/^\//, "");
}

function mapItem(raw: unknown): DonghuaItem {
  const item = (typeof raw === "object" && raw !== null ? raw : {}) as AxlyListItem;
  return {
    title: dedupeTitle(item.title),
    slug: str(item.slug),
    url: str(item.url),
    type: str(item.type),
    status: str(item.status),
    sub: str(item.sub),
    thumbnail: typeof item.thumbnail === "string" ? item.thumbnail : null,
  };
}

/**
 * Derive hasMore from upstream metadata.
 * The axly API returns `total` = count of items on THIS page (not the grand total).
 * If the returned page is full (matches total on page), assume more pages exist.
 * We cap the page size assumption at 30 (observed from API).
 */
function computeHasMore(data: AxlyListResponse, pageSize = 30): boolean {
  const results = Array.isArray(data.results) ? data.results : [];
  // If this page returned a full set, assume there is a next page
  return results.length >= pageSize;
}

// ──────────────────────────────────────────────
// Exported scraper functions
// ──────────────────────────────────────────────

export async function scrapeOngoing(
  page = 1
): Promise<{ results: DonghuaItem[]; hasMore: boolean }> {
  const { data } = await http.get<AxlyListResponse>(`/ongoing?page=${page}`);
  const results = (Array.isArray(data.results) ? data.results : []).map(mapItem);
  return { results, hasMore: computeHasMore(data) };
}

export async function scrapeCompleted(
  page = 1
): Promise<{ results: DonghuaItem[]; hasMore: boolean }> {
  const { data } = await http.get<AxlyListResponse>(`/completed?page=${page}`);
  const results = (Array.isArray(data.results) ? data.results : []).map(mapItem);
  return { results, hasMore: computeHasMore(data) };
}

export async function scrapeDropped(
  page = 1
): Promise<{ results: DonghuaItem[]; hasMore: boolean }> {
  const { data } = await http.get<AxlyListResponse>(`/drop?page=${page}`);
  const results = (Array.isArray(data.results) ? data.results : []).map(mapItem);
  return { results, hasMore: computeHasMore(data) };
}

export async function scrapeUpcoming(): Promise<{
  results: DonghuaItem[];
  hasMore: boolean;
}> {
  const { data } = await http.get<AxlyListResponse>("/upcoming");
  const results = (Array.isArray(data.results) ? data.results : []).map(mapItem);
  return { results, hasMore: false };
}

export async function scrapeSearch(
  q: string
): Promise<{ results: DonghuaItem[] }> {
  const { data } = await http.get<AxlyListResponse>(
    `/search?q=${encodeURIComponent(q)}`
  );
  const results = (Array.isArray(data.results) ? data.results : []).map(mapItem);
  return { results };
}

/**
 * Fallback: scrape series detail directly from anichin.moe when Axly has no data.
 * Uses the AnimeStream WordPress theme HTML structure.
 */
async function scrapeDetailFromAnichin(slug: string): Promise<DonghuaDetail> {
  const { data } = await httpDirect.get<string>(`/${slug}/`, {
    responseType: "text",
    timeout: 15000,
  });
  const $ = cheerio.load(data);

  const title = $(".entry-title, h1.seriestitle").first().text().trim();
  if (!title) throw new Error(`Detail not found for slug: ${slug}`);

  const alternative = $(".alter").first().text().trim();
  const sinopsis = $(".bixbox.synp .desc, .entry-content .synopse, .synopse").first().text().trim();
  const cover =
    $(".bigcover img, .thumb img, .cover img").first().attr("src") ||
    $(".bigcover img, .thumb img, .cover img").first().attr("data-src") ||
    null;

  // Parse metadata from .spe spans or .info-content rows
  const getMeta = (label: string) => {
    let val = "";
    $(".spe span, .info-content .info-meta").each((_, el) => {
      const text = $(el).text();
      if (text.toLowerCase().includes(label.toLowerCase())) {
        val = $(el).find("a, span").last().text().trim() || text.replace(/[^:]+:/, "").trim();
      }
    });
    return val;
  };

  const genres: string[] = [];
  $(".genres-content a, .genre-list a, .spe a[href*='genre']").each((_, el) => {
    const g = $(el).text().trim();
    if (g) genres.push(g);
  });

  // Parse episodes from .eplister
  const episodes: Episode[] = [];
  $(".eplister ul li").each((idx, el) => {
    const linkEl = $(el).find("a");
    const href = linkEl.attr("href") ?? "";
    if (!href) return;
    const fullUrl = href.startsWith("http") ? href : `${ANICHIN_BASE}${href}`;
    const numText = $(el).find(".epl-num").text().trim();
    const num = parseFloat(numText) || idx + 1;
    const title = $(el).find(".epl-title").text().trim();
    const date = $(el).find(".epl-date").text().trim() || null;
    const epSlug = slugFromUrl(fullUrl);
    episodes.push({ number: num, title, url: fullUrl, slug: epSlug, date });
  });

  // anichin.moe lists episodes newest-first; reverse so ep 1 is at index 0
  episodes.reverse();

  // If we get 0 episodes the page is likely wrong (e.g. a tutorial or unrelated article).
  // Throw so the caller can fall back to a search-based slug redirect on the frontend.
  if (episodes.length === 0) {
    throw new Error(`Detail not found for slug: ${slug} (no episodes on anichin page)`);
  }

  const withDm = await withDailymotionEpisodes(slug, episodes);

  return {
    title,
    alternative,
    rating: getMeta("rating") || getMeta("skor"),
    status: getMeta("status"),
    type: getMeta("type") || getMeta("tipe"),
    studio: getMeta("studio"),
    network: getMeta("network") || getMeta("jaringan"),
    releaseDate: getMeta("aired") || getMeta("tayang"),
    duration: getMeta("duration") || getMeta("durasi"),
    season: getMeta("season"),
    country: getMeta("country") || getMeta("negara"),
    totalEpisodes: withDm.length || getMeta("episodes") || getMeta("episode"),
    subber: getMeta("subber"),
    genres,
    sinopsis,
    cover: cover && !cover.startsWith("data:") ? cover : null,
    episodes: withDm,
  };
}

/**
 * The dongchindopro Dailymotion channel (see dailymotion.ts) often uploads an
 * episode before anichin.moe's own episode page for it exists. Since anichin
 * is our only source for the episode *list*, a newly-uploaded episode would
 * otherwise be invisible on-site until anichin catches up — even though it's
 * already watchable via Dailymotion. This appends synthetic entries for any
 * episode number Dailymotion has that isn't in the anichin-sourced list yet,
 * so Dailymotion effectively gets priority for episode *availability* while
 * anichin/Animasu still win the tie when both have an episode indexed (see
 * scrapeServers/scrapeStream, which race all sources for the per-episode
 * server list). No-op for series without a confirmed Dailymotion alias.
 */
async function withDailymotionEpisodes(seriesSlug: string, episodes: Episode[]): Promise<Episode[]> {
  const dmEpisodes = await listDailymotionEpisodes(seriesSlug);
  if (dmEpisodes.length === 0) return episodes;

  const known = new Set(episodes.map((e) => e.number));
  const extra: Episode[] = dmEpisodes
    .filter((e) => !known.has(e.episodeNumber))
    .map((e) => ({
      number: e.episodeNumber,
      title: `Episode ${e.episodeNumber}`,
      url: "",
      slug: `${seriesSlug}-episode-${String(e.episodeNumber).padStart(2, "0")}-subtitle-indonesia`,
      date: new Date(e.createdTime * 1000).toISOString(),
    }));
  if (extra.length === 0) return episodes;

  return [...episodes, ...extra].sort((a, b) => a.number - b.number);
}

export async function scrapeDetail(slug: string): Promise<DonghuaDetail> {
  const { data } = await http.get<AxlyDetailResponse>(
    `/detail?slug=${encodeURIComponent(slug)}`
  );

  // Axly returns status:true with all-empty fields when the slug doesn't exist,
  // or may return status:false / missing result for unlisted series.
  // In both cases fall back to scraping anichin.moe directly.
  if (!data?.result || !data.result.title) {
    return scrapeDetailFromAnichin(slug);
  }

  const r = data.result;

  const rawEpisodes = Array.isArray(r.episodes) ? r.episodes : [];
  const episodes: Episode[] = rawEpisodes.map((raw, idx) => {
    const ep = (typeof raw === "object" && raw !== null ? raw : {}) as AxlyEpisode;
    const url = str(ep.url);
    const fullUrl = url.startsWith("http") ? url : `https://anichin.moe${url}`;
    return {
      number: typeof ep.number === "number" ? ep.number : idx + 1,
      title: str(ep.title),
      url: fullUrl,
      slug: str(ep.slug) || slugFromUrl(url),
      date: typeof ep.date === "string" ? ep.date : null,
    };
  });

  const withDm = await withDailymotionEpisodes(slug, episodes);

  const totalEps = r.totalEpisodes;
  const totalEpisodes: string | number =
    typeof totalEps === "string" || typeof totalEps === "number"
      ? Math.max(typeof totalEps === "number" ? totalEps : parseInt(totalEps, 10) || 0, withDm.length) ||
        totalEps
      : withDm.length;

  return {
    title: str(r.title),
    alternative: str(r.alternative),
    rating: str(r.rating),
    status: str(r.status),
    type: str(r.type),
    studio: str(r.studio),
    network: str(r.network),
    releaseDate: str(r.releaseDate),
    duration: str(r.duration),
    season: str(r.season),
    country: str(r.country),
    totalEpisodes,
    subber: str(r.subber),
    genres: Array.isArray(r.genres)
      ? r.genres.filter((g): g is string => typeof g === "string")
      : [],
    sinopsis: str(r.sinopsis),
    cover: typeof r.cover === "string" ? r.cover : null,
    episodes: withDm,
  };
}

/** Regex matching only genuine Vidio embed URLs (domain-anchored). */
const VIDIO_EMBED_RE = /https?:\/\/(?:www\.)?vidio\.com\/embed\/[^\s"'<>&]+/;

/** Returns true if a URL is a Vidio embed (domain-anchored check). */
function isVidioUrl(url: string): boolean {
  return VIDIO_EMBED_RE.test(url);
}

/**
 * Extract a Vidio embed URL from the anichin episode page HTML, if present.
 * Uses a short 5s timeout so it never significantly delays the servers response.
 */
async function scrapeVidioFromPage(slug: string): Promise<string | null> {
  try {
    const { data } = await httpDirect.get<string>(`/${slug}/`, {
      responseType: "text",
      timeout: 5000,
    });
    const $ = cheerio.load(data);

    // 1. Look for Vidio iframes embedded directly in the page
    const iframes = $("iframe").toArray();
    for (const el of iframes) {
      const src = $(el).attr("src") ?? "";
      if (isVidioUrl(src)) return src;
    }

    // 2. Look for Vidio embed URLs anywhere in the raw HTML
    const pageHtml = $.html();
    const match = VIDIO_EMBED_RE.exec(pageHtml);
    if (match) return match[0];

    // 3. Look in data-src / data-embed / data-url attributes
    const dataEls = $("[data-src],[data-embed],[data-url]").toArray();
    for (const el of dataEls) {
      const val =
        $(el).attr("data-src") ??
        $(el).attr("data-embed") ??
        $(el).attr("data-url") ??
        "";
      if (isVidioUrl(val)) return val;
    }
    return null;
  } catch {
    return null;
  }
}

export async function scrapeServers(slug: string): Promise<ServersInfo> {
  // Race all three sources at once (anichin, Animasu, Dailymotion) instead of
  // fetching Dailymotion sequentially afterwards. Sequential fetching used to
  // add the full Dailymotion channel-lookup latency (up to ~45s on a cold
  // cache across MAX_PAGES) on top of the anichin+Animasu latency, which
  // could make the whole servers response time out or arrive so late the
  // frontend request itself had already errored — from the user's point of
  // view "the server picker doesn't show up at all". Racing them means
  // whichever source(s) resolve within the bounded window make it into the
  // response; a slow/cold Dailymotion lookup no longer blocks the rest.
  const [anichinSettled, animasuServers, dailymotionServer] = await Promise.all([
    Promise.allSettled([http.get<AxlyServersResponse>(`/servers?slug=${encodeURIComponent(slug)}`)]).then((r) => r[0]),
    scrapeAnimasuServersForSlug(slug),
    getDailymotionServer(slug),
  ]);

  const anichinServers: VideoServer[] = [];
  let title = "";
  let titleSlug = slug;

  if (anichinSettled.status === "fulfilled") {
    const data = anichinSettled.value.data;
    if (data?.status && data?.result) {
      const r = data.result;
      title = str(r.title);
      titleSlug = str(r.slug, slug);
      for (const s of r.servers ?? []) {
        const name = typeof s.label === "string" ? s.label.trim() : "";
        const embed_url = unwrapEmbedUrl(typeof s.embed_url === "string" ? s.embed_url.trim() : "");
        if (name && embed_url && !isServerBlocked(name, embed_url)) anichinServers.push({ name, embed_url });
      }
    }
  }

  let servers = mergeServers(anichinServers, animasuServers);

  // NOTE: anichin's own /servers endpoint 404s (axios rejects, so
  // anichinSettled is "rejected") for episodes it hasn't indexed yet — e.g.
  // one dongchindopro already uploaded to Dailymotion ahead of anichin. We no
  // longer bail out early on that alone (see the check after Dailymotion is
  // appended below), so a brand-new episode that only exists on Dailymotion
  // still resolves successfully instead of erroring out.

  // Try to add Vidio from the episode page if not already present
  const hasVidio = servers.some((s) => s.name.toLowerCase().includes("vidio") || s.embed_url.includes("vidio.com"));
  if (!hasVidio) {
    const vidioUrl = await scrapeVidioFromPage(slug);
    if (vidioUrl) servers.push({ name: "Vidio", embed_url: vidioUrl });
  }

  // Extra server from the dongchindopro Dailymotion channel (opt-in per series,
  // see dailymotion.ts) — fetched in parallel above, appended here if it resolved.
  // If anichin/Animasu came back empty (e.g. a brand-new episode not indexed by
  // Axly yet) but Dailymotion already has it, this ends up being the only server
  // offered — which is the desired "whichever source has it first, wins" behavior.
  if (dailymotionServer) servers.push(dailymotionServer);

  // Only now — after Dailymotion has had a chance to fill in for an episode
  // anichin/Axly don't know about yet — do we treat "nothing at all" as an
  // error.
  if (servers.length === 0) {
    throw new Error(`Servers not found for slug: ${slug}`);
  }

  return {
    title,
    slug: titleSlug,
    total_servers: servers.length,
    servers,
  };
}

export async function scrapeDownload(slug: string): Promise<DownloadInfo> {
  const { data } = await http.get<AxlyDownloadResponse>(
    `/download?slug=${encodeURIComponent(slug)}`
  );

  if (!data?.status || !data?.result) {
    throw new Error(data?.error ?? `Download info not found for slug: ${slug}`);
  }

  const r = data.result;
  const downloads: DownloadQuality[] = [];

  for (const q of r.downloads ?? []) {
    const quality = typeof q.quality === "string" ? q.quality.trim() : "";
    const size = typeof q.size === "string" ? q.size.trim() : "";
    const links: DownloadLink[] = [];
    for (const l of q.links ?? []) {
      const label = typeof l.label === "string" ? l.label.trim() : "";
      const url = typeof l.url === "string" ? l.url.trim() : "";
      if (label && url) links.push({ label, url });
    }
    if (quality) downloads.push({ quality, size, links });
  }

  return {
    title: str(r.title),
    slug: str(r.slug, slug),
    downloads,
  };
}

export async function scrapeStream(slug: string): Promise<StreamInfo> {
  // Call anichin /stream, anichin /servers, Animasu, and Dailymotion all in
  // parallel (see scrapeServers above for why Dailymotion must not be
  // fetched sequentially after the others).
  const [streamRes, serversRes, animasuServers, dailymotionRes] = await Promise.allSettled([
    http.get<AxlyStreamResponse>(`/stream?slug=${encodeURIComponent(slug)}`),
    http.get<AxlyServersResponse>(`/servers?slug=${encodeURIComponent(slug)}`),
    scrapeAnimasuServersForSlug(slug),
    getDailymotionServer(slug),
  ]);

  // Basic metadata from /stream
  let title = "Donghua Episode";
  let source = "";
  let video_id: string | null = null;
  let watch_url = `${ANICHIN_BASE}/${slug}/`;

  if (streamRes.status === "fulfilled" && streamRes.value.data?.status && streamRes.value.data?.result) {
    const r = streamRes.value.data.result;
    title = str(r.title, "Donghua Episode");
    source = str(r.source);
    video_id = typeof r.video_id === "string" ? r.video_id : null;
    watch_url = str(r.watch_url) || watch_url;
  }

  // Build anichin servers list
  const anichinServers: VideoServer[] = [];
  if (serversRes.status === "fulfilled" && serversRes.value.data?.status && serversRes.value.data?.result?.servers) {
    for (const s of serversRes.value.data.result.servers) {
      const name = typeof s.label === "string" ? s.label.trim() : "";
      const embed_url = unwrapEmbedUrl(typeof s.embed_url === "string" ? s.embed_url.trim() : "");
      if (name && embed_url && !isServerBlocked(name, embed_url)) anichinServers.push({ name, embed_url });
    }
    // Use title from /servers if /stream failed
    if (title === "Donghua Episode" && serversRes.value.data.result.title) {
      title = str(serversRes.value.data.result.title, "Donghua Episode");
    }
  }

  // Merge anichin + Animasu servers (deduplicated by embed_url)
  const extras = animasuServers.status === "fulfilled" ? animasuServers.value : [];
  const servers = mergeServers(anichinServers, extras);

  // Extra server from the dongchindopro Dailymotion channel (opt-in per series,
  // see dailymotion.ts) — fetched in parallel above, appended here if it resolved.
  const dailymotionServer = dailymotionRes.status === "fulfilled" ? dailymotionRes.value : null;
  if (dailymotionServer) servers.push(dailymotionServer);

  // Primary embed_url: first server, fallback to /stream embed_url
  const streamEmbed = streamRes.status === "fulfilled"
    ? str(streamRes.value.data?.result?.embed_url)
    : "";
  const embed_url = servers[0]?.embed_url || streamEmbed;

  if (!embed_url && servers.length === 0) {
    throw new Error(`Stream not found for slug: ${slug}`);
  }

  return { title, source, video_id, embed_url, watch_url, servers };
}

export interface PopularItem {
  title: string;
  short_title: string;
  slug: string;
  url: string;
  episode: string;
  type: string;
  sub_status: string;
  is_hot: boolean;
  image: string | null;
  image_alt: string;
  rel: string;
}

/** Scrape latest/popular releases directly from anichin.moe homepage */
export async function scrapePopular(): Promise<PopularItem[]> {
  const { data } = await httpDirect.get<string>("/", { responseType: "text" });
  const $ = cheerio.load(data);
  const items: PopularItem[] = [];

  $(".listupd .bs").each((_, el) => {
    const linkEl = $(el).find(".bsx a");
    const href = linkEl.attr("href") ?? "";
    // Prefer anchor title attr; fall back to .tt text then deduplicate
    const rawTitle =
      linkEl.attr("title") ||
      $(el).find(".tt").contents().filter((_, n) => n.type === "text").first().text().trim() ||
      $(el).find(".tt").text().trim();
    const title = dedupeTitle(rawTitle);
    if (!title || !href) return;

    const fullUrl = href.startsWith("http") ? href : `${ANICHIN_BASE}${href}`;
    const slug = fullUrl
      .replace(/^https?:\/\/[^/]+\//, "")
      .replace(/\/$/, "");

    // Episode label (e.g. "Ep 148")
    const episode = $(el).find(".epx").text().trim();
    const sub = $(el).find(".sb").text().trim();
    const type = $(el).find(".typez").text().trim();

    // Try both src and data-src for thumbnail
    const imgEl = $(el).find("img");
    const image =
      imgEl.attr("src") ||
      imgEl.attr("data-src") ||
      imgEl.attr("data-lazy-src") ||
      null;

    // Shorten title for display (remove episode suffix for short_title)
    const short_title = title.replace(/\s+Episode\s+\d+.*/i, "").trim();

    items.push({
      title,
      short_title,
      slug,
      url: fullUrl,
      episode,
      type,
      sub_status: sub,
      is_hot: true,
      image: image && image.startsWith("data:") ? null : image,
      image_alt: title,
      rel: "",
    });
  });

  // Deduplicate by series slug (strip episode suffix so same series isn't shown twice)
  const seen = new Set<string>();
  return items.filter((item) => {
    const seriesSlug = item.slug.replace(/-episode-\d+.*$/i, "").replace(/-subtitle-.*$/i, "");
    if (seen.has(seriesSlug)) return false;
    seen.add(seriesSlug);
    return true;
  });
}

export async function scrapeSchedule(): Promise<
  Record<string, ScheduleItem[]>
> {
  const { data } = await http.get<AxlyScheduleResponse>("/schedule");

  const raw = typeof data?.result === "object" && data.result !== null
    ? data.result
    : {};

  const schedule: Record<string, ScheduleItem[]> = {};

  for (const [day, items] of Object.entries(raw)) {
    if (!Array.isArray(items)) continue;
    schedule[day] = items.map((raw) => {
      const item = (typeof raw === "object" && raw !== null ? raw : {}) as {
        title?: unknown; slug?: unknown; url?: unknown; is_vip?: unknown;
      };
      const url = str(item.url);
      return {
        title: str(item.title),
        slug: str(item.slug) || slugFromUrl(url),
        url,
        is_vip: typeof item.is_vip === "boolean" ? item.is_vip : false,
      };
    });
  }

  return schedule;
}
