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
    const slug = String(req.query.slug ?? '').trim();
    if (!slug) return res.status(400).json({ status: false, error: 'Parameter "slug" diperlukan' });
    const data = await axlyFetch(`/detail?slug=${encodeURIComponent(slug)}`).catch(() => null);
    if (!data?.result) {
      const scraped = await scrapeAnichinSeriesEpisodes(slug);
      if (!scraped) return res.status(404).json({ status: false, error: data?.error ?? 'Not found' });
      return res.json({
        status: true,
        result: {
          title: scraped.title, alternative: '', rating: '', status: '', type: 'Donghua',
          studio: '', network: '', releaseDate: '', duration: '', season: '', country: '',
          totalEpisodes: scraped.episodes.length, subber: '', genres: [], sinopsis: '',
          cover: scraped.cover, episodes: scraped.episodes, source: 'anichin-self-scrape',
        },
      });
    }
    const r = data.result;
    const rawEpisodes = (r.episodes ?? []).map((ep, idx) => {
      const url = ep.url ?? '';
      const fullUrl = url.startsWith('http') ? url : `https://anichin.moe${url}`;
      return { number: ep.number ?? idx + 1, title: ep.title ?? '', url: fullUrl, slug: ep.slug ?? slugFromUrl(url), date: ep.date ?? null };
    });
    const episodes = await withDailymotionEpisodes(slug, rawEpisodes);
    res.json({
      status: true,
      result: {
        title: r.title ?? '', alternative: r.alternative ?? '', rating: r.rating ?? '',
        status: r.status ?? '', type: r.type ?? '', studio: r.studio ?? '',
        network: r.network ?? '', releaseDate: r.releaseDate ?? '', duration: r.duration ?? '',
        season: r.season ?? '', country: r.country ?? '',
        totalEpisodes: Math.max(Number(r.totalEpisodes) || 0, episodes.length) || episodes.length,
        subber: r.subber ?? '', genres: Array.isArray(r.genres) ? r.genres : [],
        sinopsis: r.sinopsis ?? '', cover: r.cover ?? null, episodes,
      },
    });
  } catch (err) { res.status(500).json({ status: false, error: err.message }); }
}
