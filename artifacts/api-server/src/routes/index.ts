import { Router, type IRouter } from "express";
import axios from "axios";
import healthRouter from "./health";
import donghuaRouter from "./donghua/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/donghua", donghuaRouter);

// Image proxy — fetches CDN images server-side to bypass hotlink protection
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchImage(url: string, useReferer: boolean, timeout: number) {
  return axios.get(url, {
    responseType: "arraybuffer",
    timeout,
    headers: {
      ...(useReferer ? { Referer: "https://anichin.moe/" } : {}),
      "User-Agent": USER_AGENT,
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    },
    validateStatus: (status) => status >= 200 && status < 300,
  });
}

router.get("/image-proxy", async (req, res) => {
  const url = String(req.query.url ?? "").trim();
  if (!url || !/^https?:\/\//.test(url)) {
    res.status(400).json({ error: "Invalid url parameter" });
    return;
  }

  // wp.com's Photon CDN (i0/i1/i2/i3.wp.com) doesn't need — and sometimes
  // dislikes — a foreign Referer header; only send it for the origin site.
  const isWpCdn = /(^|\.)wp\.com$/.test(new URL(url).hostname);

  // Retry once with a longer timeout / without the Referer before giving up —
  // the upstream CDN occasionally times out or rejects the first attempt.
  const attempts: Array<{ useReferer: boolean; timeout: number }> = isWpCdn
    ? [
        { useReferer: false, timeout: 8000 },
        { useReferer: false, timeout: 15000 },
      ]
    : [
        { useReferer: true, timeout: 8000 },
        { useReferer: false, timeout: 15000 },
      ];

  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      const upstream = await fetchImage(url, attempt.useReferer, attempt.timeout);
      const ct = String(upstream.headers["content-type"] ?? "image/jpeg");
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(upstream.data));
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  req.log.warn({ err: lastErr, url }, "Image proxy failed after retries");
  res.status(502).json({ error: "Failed to fetch image" });
});

export default router;
