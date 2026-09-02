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
    const data = await axlyFetch('/popular');
    const list = data?.result?.list ?? [];
    const host = `https://${req.headers.host}`;
    const results = list.map((item) => {
      const rawSlug = typeof item.slug === 'string' ? item.slug : '';
      const seriesSlug = rawSlug.replace(/-episode-\d+.*$/, '');
      return {
        title: typeof item.short_title === 'string' && item.short_title ? item.short_title : (typeof item.title === 'string' ? item.title : ''),
        short_title: typeof item.short_title === 'string' ? item.short_title : '',
        slug: seriesSlug,
        url: typeof item.url === 'string' ? item.url : '',
        episode: typeof item.episode === 'string' ? item.episode : '',
        type: typeof item.type === 'string' ? item.type : '',
        sub_status: typeof item.sub_status === 'string' ? item.sub_status : '',
        is_hot: typeof item.is_hot === 'boolean' ? item.is_hot : false,
        image: typeof item.image === 'string' ? `${host}/api/image-proxy?url=${encodeURIComponent(item.image)}` : null,
        image_alt: typeof item.image_alt === 'string' ? item.image_alt : '',
        rel: typeof item.rel === 'string' ? item.rel : '',
      };
    });
    res.json({ status: true, total: results.length, results });
  } catch (err) { res.status(500).json({ status: false, error: err.message }); }
}
