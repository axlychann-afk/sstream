// /api/donghua/servers — returns list of embed servers for an episode.
// Falls back to direct anichin.cafe scrape if axlyapi is unreachable.

import {
  axlyFetch,
  AXLY_BASE,
  unwrapEmbedUrl,
  isServerBlocked,
  mergeServers,
  scrapeAnimasuServersForSlug,
  scrapeAnichinServersForSlug,
  setCors,
} from '../_scraper.js';
import { getDailymotionServer } from '../_dailymotion.js';

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

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
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

    if (servers.length === 0) {
      servers = await scrapeAnichinServersForSlug(slug);
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
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
}