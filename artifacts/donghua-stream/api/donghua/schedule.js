import { axlyFetch, AXLY_BASE, mapItem, slugFromUrl, setCors, unwrapEmbedUrl, isServerBlocked, mergeServers, scrapeAnimasuServersForSlug, scrapeAnichinServersForSlug, scrapeAnichinSeriesEpisodes } from '../_scraper.js';
import { listDailymotionEpisodes, getDailymotionServer } from '../_dailymotion.js';

async function fetchAnichinServers(slug) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${AXLY_BASE}/servers?slug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DonghuaStream-Vercel/1.0' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; } finally { clearTimeout(timer); }
}

async function withDailymotionEpisodes(seriesSlug, episodes) {
  const dmEpisodes = await listDailymotionEpisodes(seriesSlug);
  if (dmEpisodes.length === 0) return episodes;
  const known = new Set(episodes.map((e) => e.number));
  const extra = dmEpisodes.filter((e) => !known.has(e.episodeNumber)).map((e) => ({
    number: e.episodeNumber,
    title: `Episode ${e.episodeNumber}`,
    url: '',
    slug: `${seriesSlug}-episode-${String(e.episodeNumber).padStart(2, '0')}-subtitle-indonesia`,
    date: new Date(e.createdTime * 1000).toISOString(),
  }));
  if (extra.length === 0) return episodes;
  return [...episodes, ...extra].sort((a, b) => a.number - b.number);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const data = await axlyFetch('/schedule');
    const raw = data?.result ?? {};
    const schedule = {};
    for (const [day, items] of Object.entries(raw)) {
      if (!Array.isArray(items)) continue;
      schedule[day] = items.map((item) => ({
        title: item.title ?? '',
        slug: item.slug ?? slugFromUrl(item.url ?? ''),
        url: item.url ?? '',
        is_vip: item.is_vip ?? false,
      }));
    }
    res.json({ status: true, result: schedule });
  } catch (err) { res.status(500).json({ status: false, error: err.message }); }
}
