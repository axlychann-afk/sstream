// Shared helper for Vercel serverless functions
// Proxies to axlyapi.qzz.io instead of scraping anichin.moe directly

export const AXLY_BASE = 'https://axlyapi.qzz.io/donghua';
const AXLY_ANIMASU_BASE = 'https://axlyapi.qzz.io/anime/animasu';
const ANIMASU_REQUEST_TIMEOUT = 8000;

// Servers confirmed to block iframe embedding entirely unless verified via
// our own dongchindopro Dailymotion lookup (see _dailymotion.js, which tags
// its own entries with the "dcsrc=dongchindopro" marker below).
const BLOCKED_SERVERS = ['dailymotion'];
const TRUSTED_DAILYMOTION_MARKER = 'dcsrc=dongchindopro';
export function isServerBlocked(name, url) {
  const h = `${name} ${url}`.toLowerCase();
  if (h.includes('dailymotion') && url.includes(TRUSTED_DAILYMOTION_MARKER)) return false;
  return BLOCKED_SERVERS.some((b) => h.includes(b));
}

/**
 * Replace wrapped embed URLs with their direct equivalent.
 * e.g. anichin-player.web.id/index.php?ok=ID → //ok.ru/videoembed/ID
 */
export function unwrapEmbedUrl(url) {
  try {
    const u = new URL(url.startsWith('//') ? `https:${url}` : url);
    if (u.hostname === 'anichin-player.web.id') {
      const okId = u.searchParams.get('ok');
      if (okId) return `//ok.ru/videoembed/${okId}`;
    }
  } catch { /* ignore */ }
  return url;
}

/** Merge two server lists, deduplicating by embed_url */
export function mergeServers(primary, secondary) {
  const seen = new Set(primary.map((s) => s.embed_url));
  const extras = secondary.filter((s) => !seen.has(s.embed_url));
  return [...primary, ...extras];
}

/**
 * Convert an anichin episode slug to Animasu's URL format.
 * anichin: "apotheosis-episode-01-subtitle-indonesia"
 * animasu: "nonton-apotheosis-episode-1"
 */
function toAnimasuSlug(slug) {
  if (slug.startsWith('nonton-')) return slug;
  const m = slug.match(/^(.+?)-episode-0*(\d+)(?:-subtitle.*)?$/i);
  if (m) return `nonton-${m[1]}-episode-${parseInt(m[2], 10)}`;
  return `nonton-${slug}`;
}

/**
 * Fetch servers from Animasu (via axly) for an episode slug. Returns an
 * empty array on any failure/timeout so it never breaks the main flow —
 * Animasu's upstream is frequently slow/erroring.
 */
export async function scrapeAnimasuServersForSlug(slug) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANIMASU_REQUEST_TIMEOUT);
  try {
    const animasuSlug = toAnimasuSlug(slug);
    const animasuUrl = `https://v1.animasu.work/${animasuSlug}/`;
    const res = await fetch(`${AXLY_ANIMASU_BASE}/stream?url=${encodeURIComponent(animasuUrl)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.status || !data?.result?.dropdown_servers) return [];
    const servers = [];
    for (const s of data.result.dropdown_servers) {
      const name = typeof s.label === 'string' ? s.label.trim() : '';
      const embed_url = unwrapEmbedUrl(typeof s.embed_url === 'string' ? s.embed_url.trim() : '');
      if (name && embed_url && !isServerBlocked(name, embed_url)) {
        servers.push({ name: `[Animasu] ${name}`, embed_url });
      }
    }
    return servers;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Self-scrape anichin.cafe series page for the episode list. Used as a
 * fallback when axlyapi is down. Episodes live under /seri/<slug>/ in
 * anchor tags with titles like "... Episode N Subtitle Indonesia".
 */
export async function scrapeAnichinSeriesEpisodes(slug) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`https://anichin.cafe/seri/${slug}/`, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const titleMatch = /<h1\b[^>]*>([^<]+)<\/h1>/i.exec(html);
    const posterMatch = /ts-post-image[^>]*src=["']([^"']+)["']/i.exec(html);
    const episodes = [];
    const re = /<a\s+href=["']([^"']*?episode-(\d+)[^"']*?)["'][^>]*title=["']([^"']+)["']/gi;
    let m;
    const seen = new Set();
    while ((m = re.exec(html)) !== null) {
      const url = m[1].startsWith('http') ? m[1] : `https://anichin.cafe${m[1]}`;
      if (seen.has(url)) continue;
      seen.add(url);
      episodes.push({
        number: parseInt(m[2], 10),
        title: m[3].trim(),
        url,
        slug: slugFromUrl(url),
        date: null,
      });
    }
    episodes.sort((a, b) => b.number - a.number);
    return {
      title: titleMatch ? titleMatch[1].trim() : slug,
      cover: posterMatch ? posterMatch[1] : null,
      episodes,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Self-scrape anichin.cafe for an episode slug. Returns array of servers
 * [{ name, embed_url }, ...] or [] on failure.
 *
 * Episode page contains:
 *   <option value="<base64(iframe)>" data-index="N">Label</option>
 * where the base64 decodes to:
 *   <iframe src="https://ok.ru/videoembed/<id>" ...></iframe>
 *
 * Used as a fallback when axlyapi.qzz.io is unavailable or returns nothing.
 */
export async function scrapeAnichinServersForSlug(slug) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const url = `https://anichin.cafe/${slug}/`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const servers = [];
    const re = /<option\s+value=["']([^"']+)["'][^>]*>\s*([^<]+?)\s*<\/option>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const b64 = m[1];
      const label = m[2].trim();
      if (!b64 || !label) continue;
      let decoded;
      try {
        decoded = Buffer.from(b64, 'base64').toString('utf-8');
      } catch {
        continue;
      }
      const src = decoded.match(/src=["']([^"']+)["']/i)?.[1];
      if (!src) continue;
      const cleanSrc = unwrapEmbedUrl(src);
      if (!cleanSrc) continue;
      if (isServerBlocked(label, cleanSrc)) continue;
      servers.push({ name: label, embed_url: cleanSrc });
    }
    return servers;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Remove duplicated title text like "Foo BarFoo Bar" → "Foo Bar" */
export function dedupeTitle(title) {
  if (typeof title !== 'string') return '';
  const half = Math.floor(title.length / 2);
  if (title.length > 0 && title.length % 2 === 0 && title.slice(0, half) === title.slice(half)) {
    return title.slice(0, half);
  }
  return title;
}

export function slugFromUrl(url) {
  if (!url) return '';
  return url
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/\/$/, '')
    .replace(/^\//, '');
}

/** Fetch from axlyapi with timeout */
export async function axlyFetch(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${AXLY_BASE}${path}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DonghuaStream-Vercel/1.0' },
    });
    if (!res.ok) throw new Error(`Axly API error: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Map a raw axly list item to clean shape */
export function mapItem(item) {
  return {
    title: dedupeTitle(item.title),
    slug: item.slug ?? '',
    url: item.url ?? '',
    type: item.type ?? '',
    status: item.status ?? '',
    sub: item.sub ?? '',
    thumbnail: item.thumbnail ?? null,
  };
}
