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
    const [streamData, serversData, animasuServers, dailymotionServer] = await Promise.all([
      axlyFetch(`/stream?slug=${encodeURIComponent(slug)}`).catch(() => null),
      fetchAnichinServers(slug),
      scrapeAnimasuServersForSlug(slug),
      getDailymotionServer(slug),
    ]);
    let title = 'Donghua Episode', source = '', video_id = null;
    let watch_url = `https://anichin.moe/${slug}/`;
    if (streamData?.status && streamData?.result) {
      const r = streamData.result;
      title = typeof r.title === 'string' ? r.title : title;
      source = typeof r.source === 'string' ? r.source : '';
      video_id = typeof r.video_id === 'string' ? r.video_id : null;
      watch_url = typeof r.watch_url === 'string' ? r.watch_url : watch_url;
    }
    const anichinServers = [];
    if (serversData?.status && serversData?.result?.servers) {
      for (const s of serversData.result.servers) {
        const name = typeof s.label === 'string' ? s.label.trim() : '';
        const embed_url = unwrapEmbedUrl(typeof s.embed_url === 'string' ? s.embed_url.trim() : '');
        if (name && embed_url && !isServerBlocked(name, embed_url)) anichinServers.push({ name, embed_url });
      }
      if (title === 'Donghua Episode' && serversData.result.title) title = String(serversData.result.title);
    }
    let servers = mergeServers(anichinServers, animasuServers);
    if (dailymotionServer) servers.push(dailymotionServer);
    if (servers.length === 0) {
      servers = await scrapeAnichinServersForSlug(slug);
      if (servers.length && title === 'Donghua Episode') {
        title = slug.replace(/-episode-\d+.*$/, '').replace(/-/g, ' ');
      }
    }
    const streamEmbed = typeof streamData?.result?.embed_url === 'string' ? streamData.result.embed_url : '';
    const embed_url = servers[0]?.embed_url || streamEmbed;
    if (!embed_url && servers.length === 0) {
      return res.status(404).json({ status: false, error: `Stream not found for slug: ${slug}` });
    }
    res.json({
      status: true,
      result: { title, source, video_id, embed_url, watch_url,
        servers: servers.map((s) => ({ name: s.name, embed_url: s.embed_url })) },
    });
  } catch (err) { res.status(500).json({ status: false, error: err.message }); }
}
