import { setCors } from './_scraper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Invalid url parameter' });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Referer': 'https://anichin.moe/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream image fetch failed' });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).end(buffer);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch image' });
  }
}
