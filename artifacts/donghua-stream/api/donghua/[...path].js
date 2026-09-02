// Single catch-all serverless function for every /api/donghua/* route.
//
// WHY: Vercel's Hobby plan caps a deployment at 12 Serverless Functions.
// This app used to ship one file per route (detail.js, servers.js,
// stream.js, ongoing.js, completed.js, drop.js, upcoming.js, trending.js,
// popular.js, schedule.js, search.js — 11 files, plus healthz.js and
// image-proxy.js at the top level = 13 total). Adding the new servers.js
// endpoint (for Dailymotion) pushed the count to 13, one over the limit —
// Vercel silently dropped that route from the deployment (404, no build
// error) rather than failing loudly. Collapsing all /api/donghua/* routes
// into this single dynamic function keeps the public URLs identical while
// using only one function slot, with plenty of headroom to add more routes
// later without hitting the cap again.
import {
  axlyFetch,
  AXLY_BASE,
  mapItem,
  slugFromUrl,
  setCors,
  unwrapEmbedUrl,
  isServerBlocked,
  mergeServers,
  scrapeAnimasuServersForSlug,
  scrapeAnichinServersForSlug,
  scrapeAnichinSeriesEpisodes,
} from '../_scraper.js';
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
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The dongchindopro Dailymotion channel often uploads an episode before
 * anichin.moe's own episode page for it exists. Append synthetic entries for
 * any episode number Dailymotion has that isn't in the anichin-sourced list
 * yet, so it shows up in the playlist immediately. No-op for series without
 * a confirmed Dailymotion alias.
 */
async function withDailymotionEpisodes(seriesSlug, episodes) {
  const dmEpisodes = await listDailymotionEpisodes(seriesSlug);
  if (dmEpisodes.length === 0) return episodes;

  const known = new Set(episodes.map((e) => e.number));
  const extra = dmEpisodes
    .filter((e) => !known.has(e.episodeNumber))
    .map((e) => ({
      number: e.episodeNumber,
      title: `Episode ${e.episodeNumber}`,
      url: '',
      slug: `${seriesSlug}-episode-${String(e.episodeNumber).padStart(2, '0')}-subtitle-indonesia`,
      date: new Date(e.createdTime * 1000).toISOString(),
    }));
  if (extra.length === 0) return episodes;

  return [...episodes, ...extra].sort((a, b) => a.number - b.number);
}

async function handleOngoing(req, res) {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const data = await axlyFetch(`/ongoing?page=${page}`);
  const results = (data.results ?? []).map(mapItem);
  res.json({ status: true, total: results.length, page, hasMore: results.length >= 30, results });
}

async function handleCompleted(req, res) {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const data = await axlyFetch(`/completed?page=${page}`);
  const results = (data.results ?? []).map(mapItem);
  res.json({ status: true, total: results.length, page, hasMore: results.length >= 30, results });
}

async function handleDrop(req, res) {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const data = await axlyFetch(`/drop?page=${page}`);
  const results = (data.results ?? []).map(mapItem);
  res.json({ status: true, total: results.length, page, hasMore: results.length >= 30, results });
}

async function handleUpcoming(req, res) {
  const data = await axlyFetch('/upcoming');
  const results = (data.results ?? []).map(mapItem);
  res.json({ status: true, total: results.length, page: 1, hasMore: false, results });
}

async function handleTrending(req, res) {
  const [ongoingResult, completedResult, upcomingResult] = await Promise.allSettled([
    axlyFetch('/ongoing?page=1'),
    axlyFetch('/completed?page=1'),
    axlyFetch('/upcoming'),
  ]);

  const ongoing =
    ongoingResult.status === 'fulfilled' ? (ongoingResult.value.results ?? []).map(mapItem).slice(0, 12) : [];
  const completed =
    completedResult.status === 'fulfilled' ? (completedResult.value.results ?? []).map(mapItem).slice(0, 12) : [];
  const upcoming =
    upcomingResult.status === 'fulfilled' ? (upcomingResult.value.results ?? []).map(mapItem).slice(0, 8) : [];

  res.json({ status: true, ongoing, completed, upcoming });
}

async function handlePopular(req, res) {
  const data = await axlyFetch('/popular');
  const list = data?.result?.list ?? [];
  const host = `https://${req.headers.host}`;
  const results = list.map((item) => {
    const rawSlug = typeof item.slug === 'string' ? item.slug : '';
    const seriesSlug = rawSlug.replace(/-episode-\d+.*$/, '');
    return {
      title:
        typeof item.short_title === 'string' && item.short_title
          ? item.short_title
          : typeof item.title === 'string'
            ? item.title
            : '',
      short_title: typeof item.short_title === 'string' ? item.short_title : '',
      slug: seriesSlug,
      url: typeof item.url === 'string' ? item.url : '',
      episode: typeof item.episode === 'string' ? item.episode : '',
      type: typeof item.type === 'string' ? item.type : '',
      sub_status: typeof item.sub_status === 'string' ? item.sub_status : '',
      is_hot: typeof item.is_hot === 'boolean' ? item.is_hot : false,
      image:
        typeof item.image === 'string' ? `${host}/api/image-proxy?url=${encodeURIComponent(item.image)}` : null,
      image_alt: typeof item.image_alt === 'string' ? item.image_alt : '',
      rel: typeof item.rel === 'string' ? item.rel : '',
    };
  });
  res.json({ status: true, total: results.length, results });
}

async function handleSchedule(req, res) {
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
}

async function handleSearch(req, res) {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });
  const data = await axlyFetch(`/search?q=${encodeURIComponent(q)}`);
  const results = (data.results ?? []).map(mapItem);
  res.json({ status: true, total: results.length, page: 1, hasMore: false, results });
}

async function handleDetail(req, res) {
  const slug = String(req.query.slug ?? '').trim();
  if (!slug) return res.status(400).json({ status: false, error: 'Parameter "slug" diperlukan' });
  const data = await axlyFetch(`/detail?slug=${encodeURIComponent(slug)}`).catch(() => null);
  if (!data?.result) {
    const scraped = await scrapeAnichinSeriesEpisodes(slug);
    if (!scraped) {
      return res.status(404).json({ status: false, error: data?.error ?? 'Not found' });
    }
    return res.json({
      status: true,
      result: {
        title: scraped.title,
        alternative: '',
        rating: '',
        status: '',
        type: 'Donghua',
        studio: '',
        network: '',
        releaseDate: '',
        duration: '',
        season: '',
        country: '',
        totalEpisodes: scraped.episodes.length,
        subber: '',
        genres: [],
        sinopsis: '',
        cover: scraped.cover,
        episodes: scraped.episodes,
        source: 'anichin-self-scrape',
      },
    });
  }
  if (!data?.result) {
    return res.status(404).json({ status: false, error: data?.error ?? 'Not found' });
  }
  const r = data.result;
  const rawEpisodes = (r.episodes ?? []).map((ep, idx) => {
    const url = ep.url ?? '';
    const fullUrl = url.startsWith('http') ? url : `https://anichin.moe${url}`;
    return {
      number: ep.number ?? idx + 1,
      title: ep.title ?? '',
      url: fullUrl,
      slug: ep.slug ?? slugFromUrl(url),
      date: ep.date ?? null,
    };
  });
  const episodes = await withDailymotionEpisodes(slug, rawEpisodes);
  res.json({
    status: true,
    result: {
      title: r.title ?? '',
      alternative: r.alternative ?? '',
      rating: r.rating ?? '',
      status: r.status ?? '',
      type: r.type ?? '',
      studio: r.studio ?? '',
      network: r.network ?? '',
      releaseDate: r.releaseDate ?? '',
      duration: r.duration ?? '',
      season: r.season ?? '',
      country: r.country ?? '',
      totalEpisodes: Math.max(Number(r.totalEpisodes) || 0, episodes.length) || episodes.length,
      subber: r.subber ?? '',
      genres: Array.isArray(r.genres) ? r.genres : [],
      sinopsis: r.sinopsis ?? '',
      cover: r.cover ?? null,
      episodes,
    },
  });
}

async function handleServers(req, res) {
  const slug = String(req.query.slug ?? '').trim();
  if (!slug) return res.status(400).json({ status: false, error: 'Parameter "slug" diperlukan' });

  const [anichinData, animasuServers, dailymotionServer] = await Promise.all([
    fetchAnichinServers(slug),
    scrapeAnimasuServersForSlug(slug),
    getDailymotionServer(slug),
  ]);

  const anichinServers = [];
  let title = '';
  let titleSlug = slug;
  if (anichinData?.status && anichinData?.result) {
    const r = anichinData.result;
    title = typeof r.title === 'string' ? r.title : '';
    titleSlug = typeof r.slug === 'string' ? r.slug : slug;
    for (const s of r.servers ?? []) {
      const name = typeof s.label === 'string' ? s.label.trim() : '';
      const embed_url = unwrapEmbedUrl(typeof s.embed_url === 'string' ? s.embed_url.trim() : '');
      if (name && embed_url && !isServerBlocked(name, embed_url)) anichinServers.push({ name, embed_url });
    }
  }

  let servers = mergeServers(anichinServers, animasuServers);
  if (dailymotionServer) servers.push(dailymotionServer);

  // fallback: axly down -> scrape anichin.cafe directly (decode base64 iframe)
  if (servers.length === 0) {
    const selfScraped = await scrapeAnichinServersForSlug(slug);
    servers = selfScraped;
  }

  if (servers.length === 0) {
    return res.status(404).json({ status: false, error: `Servers not found for slug: ${slug}` });
  }

  res.json({
    status: true,
    result: {
      title,
      slug: titleSlug,
      total_servers: servers.length,
      servers: servers.map((s) => ({ label: s.name, embed_url: s.embed_url })),
    },
  });
}

async function handleStream(req, res) {
  const slug = String(req.query.slug ?? '').trim();
  if (!slug) return res.status(400).json({ status: false, error: 'Parameter "slug" diperlukan' });

  const [streamData, serversData, animasuServers, dailymotionServer] = await Promise.all([
    axlyFetch(`/stream?slug=${encodeURIComponent(slug)}`).catch(() => null),
    fetchAnichinServers(slug),
    scrapeAnimasuServersForSlug(slug),
    getDailymotionServer(slug),
  ]);

  let title = 'Donghua Episode';
  let source = '';
  let video_id = null;
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
    if (title === 'Donghua Episode' && serversData.result.title) {
      title = String(serversData.result.title);
    }
  }

  const servers = mergeServers(anichinServers, animasuServers);
  if (dailymotionServer) servers.push(dailymotionServer);

  // fallback: scrape anichin.cafe directly when axly/animasu give nothing
  if (servers.length === 0) {
    const selfScraped = await scrapeAnichinServersForSlug(slug);
    servers = selfScraped;
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
    result: {
      title,
      source,
      video_id,
      embed_url,
      watch_url,
      servers: servers.map((s) => ({ name: s.name, embed_url: s.embed_url })),
    },
  });
}

const ROUTES = {
  ongoing: handleOngoing,
  completed: handleCompleted,
  drop: handleDrop,
  upcoming: handleUpcoming,
  trending: handleTrending,
  popular: handlePopular,
  schedule: handleSchedule,
  search: handleSearch,
  detail: handleDetail,
  servers: handleServers,
  stream: handleStream,
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Don't rely on req.query.path for the dynamic segment — parse it
  // directly from the request URL instead, since it's been unreliable
  // across Vercel runtime versions for catch-all API routes outside
  // Next.js. This works regardless of how (or whether) Vercel populates
  // route params into req.query.
  let segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  if (segments.length === 0) {
    const pathname = (req.url || '').split('?')[0];
    const match = pathname.match(/\/api\/donghua\/(.*)/);
    if (match) segments = match[1].split('/').filter(Boolean);
  }
  const route = segments[0];
  const fn = route ? ROUTES[route] : undefined;
  if (!fn) {
    return res.status(404).json({ status: false, error: `Unknown route: /api/donghua/${segments.join('/')}` });
  }

  try {
    await fn(req, res);
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
}
