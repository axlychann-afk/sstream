import { Router } from "express";
import {
  scrapeOngoing,
  scrapeCompleted,
  scrapeDropped,
  scrapeUpcoming,
  scrapeSearch,
  scrapeDetail,
  scrapeStream,
  scrapeServers,
  scrapeDownload,
  scrapeSchedule,
  scrapePopular,
} from "./scraper.js";

const router = Router();

// Rewrite thumbnail/cover URLs to go through our image proxy (bypasses hotlink protection)
function proxyImg(url: string | null | undefined): string | null {
  if (!url) return null;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function proxyItems<T extends { thumbnail: string | null }>(items: T[]): T[] {
  return items.map((item) => ({ ...item, thumbnail: proxyImg(item.thumbnail) }));
}

// Stale-while-revalidate cache
// staleAt  = serve from cache but kick off a background refresh
// expiresAt = hard expiry, must wait for fresh data
const cache = new Map<string, { data: unknown; staleAt: number; expiresAt: number }>();
const revalidating = new Set<string>();

function getCached<T>(key: string): { data: T; isStale: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) return null; // hard expired, must refetch
  return { data: entry.data as T, isStale: now > entry.staleAt };
}

function setCache(key: string, data: unknown, ttlSeconds = 600): void {
  // Fresh for half the TTL, stale-but-usable for the full TTL
  const now = Date.now();
  cache.set(key, {
    data,
    staleAt: now + (ttlSeconds / 2) * 1000,
    expiresAt: now + ttlSeconds * 1000,
  });
}

/** Run a background revalidation for a cache key without blocking the response. */
function revalidate(key: string, fetcher: () => Promise<unknown>, ttlSeconds: number): void {
  if (revalidating.has(key)) return;
  revalidating.add(key);
  fetcher()
    .then((data) => setCache(key, data, ttlSeconds))
    .catch(() => { /* silently keep stale */ })
    .finally(() => revalidating.delete(key));
}

/** Warm up the most-requested cache keys at startup so users never hit a cold cache. */
export async function warmCache(): Promise<void> {
  const keys: Array<{ key: string; fetcher: () => Promise<unknown> }> = [
    {
      key: "trending",
      fetcher: async () => {
        const [ongoingData, completedData, upcomingData] = await Promise.all([
          scrapeOngoing(1),
          scrapeCompleted(1),
          scrapeUpcoming(),
        ]);
        return {
          status: true,
          ongoing: ongoingData.results.slice(0, 12),
          completed: completedData.results.slice(0, 12),
          upcoming: upcomingData.results.slice(0, 8),
        };
      },
    },
    {
      key: "ongoing:1",
      fetcher: async () => {
        const { results, hasMore } = await scrapeOngoing(1);
        return { status: true, total: results.length, page: 1, hasMore, results };
      },
    },
    {
      key: "schedule",
      fetcher: async () => {
        const schedule = await scrapeSchedule();
        return { status: true, result: schedule };
      },
    },
  ];

  await Promise.allSettled(keys.map(({ key, fetcher }) =>
    fetcher().then((data) => setCache(key, data)).catch(() => {})
  ));
}

// GET /api/donghua/ongoing?page=1
// ── Helper: serve from cache with stale-while-revalidate ──────────────────────
function swr<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): (res: import("express").Response, log: import("pino").Logger) => Promise<void> {
  return async (res, log) => {
    const hit = getCached<T>(cacheKey);
    if (hit) {
      res.json(hit.data);
      if (hit.isStale) revalidate(cacheKey, fetcher, ttlSeconds);
      return;
    }
    try {
      const data = await fetcher();
      setCache(cacheKey, data, ttlSeconds);
      res.json(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      log.error({ err }, `Cache miss + fetch failed for ${cacheKey}`);
      res.status(500).json({ status: false, error: message });
    }
  };
}

router.get("/ongoing", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  await swr(
    `ongoing:${page}`,
    async () => {
      const { results, hasMore } = await scrapeOngoing(page);
      return { status: true, total: results.length, page, hasMore, results: proxyItems(results) };
    },
    600
  )(res, req.log);
});

router.get("/completed", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  await swr(
    `completed:${page}`,
    async () => {
      const { results, hasMore } = await scrapeCompleted(page);
      return { status: true, total: results.length, page, hasMore, results: proxyItems(results) };
    },
    600
  )(res, req.log);
});

router.get("/drop", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  await swr(
    `drop:${page}`,
    async () => {
      const { results, hasMore } = await scrapeDropped(page);
      return { status: true, total: results.length, page, hasMore, results: proxyItems(results) };
    },
    600
  )(res, req.log);
});

router.get("/upcoming", async (req, res) => {
  await swr(
    "upcoming",
    async () => {
      const { results, hasMore } = await scrapeUpcoming();
      return { status: true, total: results.length, page: 1, hasMore, results: proxyItems(results) };
    },
    1200
  )(res, req.log);
});

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });
    return;
  }
  await swr(
    `search:${q.toLowerCase()}`,
    async () => {
      const { results } = await scrapeSearch(q);
      return { status: true, total: results.length, page: 1, hasMore: false, results: proxyItems(results) };
    },
    300
  )(res, req.log);
});

router.get("/schedule", async (req, res) => {
  await swr(
    "schedule",
    async () => {
      const schedule = await scrapeSchedule();
      return { status: true, result: schedule };
    },
    7200
  )(res, req.log);
});

router.get("/detail", async (req, res) => {
  const slug = String(req.query.slug ?? "").trim();
  if (!slug) {
    res.status(400).json({ status: false, error: 'Parameter "slug" diperlukan' });
    return;
  }
  const hit = getCached<unknown>(`detail:${slug}`);
  if (hit) {
    res.json(hit.data);
    return;
  }
  try {
    const detail = await scrapeDetail(slug);
    const response = { status: true, result: { ...detail, cover: proxyImg(detail.cover) } };
    setCache(`detail:${slug}`, response, 600);
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to scrape detail");
    res.status(404).json({ status: false, error: message });
  }
});

router.get("/servers", async (req, res) => {
  const slug = String(req.query.slug ?? "").trim();
  if (!slug) {
    res.status(400).json({ status: false, error: 'Parameter "slug" diperlukan' });
    return;
  }
  const hit = getCached<unknown>(`servers:${slug}`);
  if (hit) {
    res.json(hit.data);
    if (hit.isStale) revalidate(`servers:${slug}`, async () => {
      const info = await scrapeServers(slug);
      return { status: true, result: info };
    }, 3600);
    return;
  }
  try {
    const info = await scrapeServers(slug);
    const response = { status: true, result: info };
    setCache(`servers:${slug}`, response, 3600);
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to scrape servers");
    res.status(404).json({ status: false, error: message });
  }
});

router.get("/download", async (req, res) => {
  const slug = String(req.query.slug ?? "").trim();
  if (!slug) {
    res.status(400).json({ status: false, error: 'Parameter "slug" diperlukan' });
    return;
  }
  const hit = getCached<unknown>(`download:${slug}`);
  if (hit) {
    res.json(hit.data);
    if (hit.isStale) revalidate(`download:${slug}`, async () => {
      const info = await scrapeDownload(slug);
      return { status: true, result: info };
    }, 3600);
    return;
  }
  try {
    const info = await scrapeDownload(slug);
    const response = { status: true, result: info };
    setCache(`download:${slug}`, response, 3600);
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to scrape download");
    res.status(404).json({ status: false, error: message });
  }
});

router.get("/stream", async (req, res) => {
  const slug = String(req.query.slug ?? "").trim();
  if (!slug) {
    res.status(400).json({ status: false, error: 'Parameter "slug" diperlukan' });
    return;
  }
  const hit = getCached<unknown>(`stream:${slug}`);
  if (hit) {
    res.json(hit.data);
    return;
  }
  try {
    const stream = await scrapeStream(slug);
    const response = { status: true, result: stream };
    setCache(`stream:${slug}`, response, 7200);
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to scrape stream");
    res.status(404).json({ status: false, error: message });
  }
});

// GET /api/donghua/popular — popular today from axly API
router.get("/popular", async (req, res) => {
  await swr(
    "popular",
    async () => {
      const results = await scrapePopular();
      // Rewrite image URLs to go through our image proxy (bypasses hotlink protection)
      const proxied = results.map((item) => ({
        ...item,
        image: item.image
          ? `/api/image-proxy?url=${encodeURIComponent(item.image)}`
          : null,
      }));
      return { status: true, total: proxied.length, results: proxied };
    },
    300
  )(res, req.log);
});

// GET /api/donghua/trending — homepage hero data
router.get("/trending", async (req, res) => {
  await swr(
    "trending",
    async () => {
      const [ongoingData, completedData, upcomingData] = await Promise.all([
        scrapeOngoing(1),
        scrapeCompleted(1),
        scrapeUpcoming(),
      ]);
      return {
        status: true,
        ongoing: proxyItems(ongoingData.results.slice(0, 12)),
        completed: proxyItems(completedData.results.slice(0, 12)),
        upcoming: proxyItems(upcomingData.results.slice(0, 8)),
      };
    },
    600
  )(res, req.log);
});

export default router;
