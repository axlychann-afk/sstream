import {
  useGetStream,
  useGetDonghuaDetail,
  useGetDownload,
  getGetStreamQueryKey,
  getGetDonghuaDetailQueryKey,
  getGetDownloadQueryKey,
  toDirectUpstreamUrl,
} from "@workspace/api-client-react";
// Note: useGetServers removed — using direct fetch below to avoid VideoServer type mismatch
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  ListVideo,
  Server,
  Download,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdBanner } from "@/components/AdBanner";
import { useEffect, useRef, useState } from "react";

// Axly server shape returned by /donghua/servers
type AxlyServer = {
  label?: string;
  name?: string;
  embed_url?: string;
  decoded_html?: string;
  is_ads?: boolean;
};

// Build the servers API URL: use VITE_API_BASE_URL if set (Vercel → Axly direct),
// otherwise use the local proxy path.
const _apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function serversApiUrl(slug: string) {
  if (_apiBase) return `${_apiBase}/donghua/servers?slug=${encodeURIComponent(slug)}`;
  return `/api/donghua/servers?slug=${encodeURIComponent(slug)}`;
}

// Fetch the servers list, falling back to calling Axly directly (via the
// shared mapping in @workspace/api-client-react) if the relative /api path
// has no backend behind it — e.g. a static-only deploy where a SPA rewrite
// silently returns index.html instead of JSON/a 404.
async function fetchServers(slug: string): Promise<{ result?: { servers?: AxlyServer[] } }> {
  const url = serversApiUrl(slug);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Servers fetch failed: ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) throw new Error("Servers fetch returned non-JSON response");
    return await res.json();
  } catch (err) {
    const directUrl = !_apiBase ? toDirectUpstreamUrl(url) : null;
    if (!directUrl) throw err;
    const res = await fetch(directUrl);
    if (!res.ok) throw new Error(`Servers fetch failed: ${res.status}`);
    return res.json();
  }
}

// Servers confirmed to block iframe embedding entirely — hidden
const BLOCKED_SERVERS = ["dailymotion"];
// Marker appended to embed_url for our own verified dongchindopro Dailymotion
// lookups (see api-server dailymotion.ts) — those videos are confirmed
// embeddable, unlike the ad-hoc Dailymotion links anichin/Animasu sometimes
// scrape, which is why "dailymotion" is blocked by default above.
const TRUSTED_DAILYMOTION_MARKER = "dcsrc=dongchindopro";
function isServerBlocked(name: string, url: string) {
  const h = `${name} ${url}`.toLowerCase();
  if (h.includes("dailymotion") && url.includes(TRUSTED_DAILYMOTION_MARKER)) return false;
  return BLOCKED_SERVERS.some((b) => h.includes(b));
}

// Servers that may not embed reliably — shown with a ⚠ warning
function isServerUnreliable(name: string, url: string) {
  const h = `${name} ${url}`.toLowerCase();
  return h.includes("ok.ru") || h.includes("okru");
}

// Replace wrapper embed URLs with direct equivalents
// e.g. anichin-player.web.id/index.php?ok=ID → //ok.ru/videoembed/ID
function unwrapEmbedUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("//") ? `https:${url}` : url);
    if (u.hostname === "anichin-player.web.id") {
      const okId = u.searchParams.get("ok");
      if (okId) return `//ok.ru/videoembed/${okId}`;
    }
  } catch { /* ignore */ }
  return url;
}

// Convert anichin slug → Animasu slug format
// e.g. "apotheosis-episode-01-subtitle-indonesia" → "nonton-apotheosis-episode-1"
function toAnimasuSlug(slug: string): string {
  if (slug.startsWith("nonton-")) return slug;
  const m = slug.match(/^(.+?)-episode-0*(\d+)(?:-subtitle.*)?$/i);
  if (m) return `nonton-${m[1]}-episode-${parseInt(m[2], 10)}`;
  return `nonton-${slug}`;
}

// Fetch Animasu servers directly from Axly (CORS-open) — works on Vercel with no backend
async function fetchAnimasuServersDirect(slug: string): Promise<AxlyServer[]> {
  try {
    const animasuSlug = toAnimasuSlug(slug);
    const url = `https://axlyapi.qzz.io/anime/animasu/stream?url=${encodeURIComponent(`https://v1.animasu.work/${animasuSlug}/`)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as { status?: boolean; result?: { dropdown_servers?: AxlyServer[] } };
    if (!data?.status || !data?.result?.dropdown_servers) return [];
    return data.result.dropdown_servers
      .filter((s) => !isServerBlocked(s.label ?? s.name ?? "", s.embed_url ?? ""))
      .map((s) => ({ ...s, label: `[Animasu] ${s.label ?? s.name ?? "Server"}` }));
  } catch {
    return [];
  }
}

// Extract embed URL: prefer embed_url, fallback to parsing src from decoded_html
function extractEmbedUrl(server: AxlyServer): string {
  if (server.embed_url) return server.embed_url;
  if (server.decoded_html) {
    const m = server.decoded_html.match(/src=["']([^"']+)["']/i);
    if (m) return m[1];
  }
  return "";
}

function getServerLabel(s: AxlyServer) {
  return s.label || s.name || "Server";
}

export default function Watch() {
  const params = useParams<{ seriesSlug: string; episodeSlug: string }>();
  const { seriesSlug = "", episodeSlug = "" } = params;

  const { data: streamData, isLoading: streamLoading, error: streamError, refetch } = useGetStream(
    { slug: episodeSlug },
    { query: { enabled: !!episodeSlug, queryKey: getGetStreamQueryKey({ slug: episodeSlug }) } }
  );

  const { data: detailData } = useGetDonghuaDetail(
    { slug: seriesSlug },
    { query: { enabled: !!seriesSlug, queryKey: getGetDonghuaDetailQueryKey({ slug: seriesSlug }) } }
  );

  // Direct fetch — bypasses generated client to avoid VideoServer type mismatch with Axly
  const {
    data: serversData,
    isLoading: serversLoading,
    isError: serversError,
    refetch: refetchServers,
  } = useQuery<{ result?: { servers?: AxlyServer[] } }>({
    queryKey: ["axly-servers", episodeSlug],
    queryFn: () => fetchServers(episodeSlug),
    enabled: !!episodeSlug,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  // Fetch Animasu servers directly from browser — works on Vercel (no backend needed)
  const { data: animasuServers = [] } = useQuery<AxlyServer[]>({
    queryKey: ["animasu-servers", episodeSlug],
    queryFn: () => fetchAnimasuServersDirect(episodeSlug),
    enabled: !!episodeSlug,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const {
    data: downloadData,
    isLoading: downloadLoading,
    isError: downloadError,
    refetch: refetchDownload,
  } = useGetDownload(
    { slug: episodeSlug },
    { query: { enabled: !!episodeSlug, queryKey: getGetDownloadQueryKey({ slug: episodeSlug }) } }
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedServer, setSelectedServer] = useState(0);
  const [openQuality, setOpenQuality] = useState<string | null>(null);

  // Reset selections when episode changes
  useEffect(() => {
    setSelectedServer(0);
    setOpenQuality(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [episodeSlug]);

  const series = detailData?.result;
  const episodes = series?.episodes || [];

  // Prefer the API's own `slug` field — it's always populated (including for
  // Dailymotion look-ahead episodes anichin hasn't listed yet, whose `url` is
  // empty). Deriving from `url` broke for those: every such episode resolved
  // to the same "" slug, causing duplicate React keys and dead episode links
  // that pointed at /watch/:seriesSlug/ with no episode segment.
  const getEpisodeSlug = (ep: { url: string; slug?: string }) => {
    if (ep.slug) return ep.slug;
    try {
      const urlObj = new URL(ep.url);
      return urlObj.pathname.split("/").filter(Boolean).pop() || "";
    } catch {
      const parts = ep.url.split("/").filter(Boolean);
      return parts[parts.length - 1] || ep.url;
    }
  };

  const currentIndex = episodes.findIndex((ep) => getEpisodeSlug(ep) === episodeSlug);
  const nextEpisode = currentIndex !== -1 && currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const currentEpInfo = currentIndex !== -1 ? episodes[currentIndex] : null;
  const stream = streamData?.result;

  // Build server list: anichin servers (via backend/direct Axly) + Animasu (direct browser fetch)
  // Deduped by embed_url, blocked servers filtered out
  const primaryServers = (serversData?.result?.servers ?? [])
    .map((s) => ({ ...s, embed_url: unwrapEmbedUrl(s.embed_url ?? "") }))
    .filter((s) => !isServerBlocked(s.label ?? s.name ?? "", s.embed_url));
  const seenUrls = new Set(primaryServers.map((s) => s.embed_url ?? ""));
  const extraServers = animasuServers
    .map((s) => ({ ...s, embed_url: unwrapEmbedUrl(s.embed_url ?? "") }))
    .filter((s) => s.embed_url && !seenUrls.has(s.embed_url));
  const servers: AxlyServer[] = [...primaryServers, ...extraServers];
  const activeEmbedUrl = (servers[selectedServer] ? extractEmbedUrl(servers[selectedServer]) : "") || stream?.embed_url || "";

  const downloads = (downloadData?.result?.downloads ?? []).filter(
    (q) => q.quality?.toUpperCase() !== "VIP"
  );

  return (
    <div className="min-h-screen bg-background pt-16 pb-12 flex flex-col">
      <Helmet>
        <title>
          {stream?.title || `Episode ${currentEpInfo?.number || ""}`} |{" "}
          {series?.title || "Watch"} | DonghuaStream
        </title>
      </Helmet>

      {/* Main Player Area */}
      <div className="bg-black border-b border-border">
        <div className="container mx-auto px-0 lg:px-4 flex flex-col lg:flex-row">

          {/* Player Column */}
          <div className="flex-1 w-full min-w-0 relative group">
            {/* Video Player */}
            <div className="aspect-video w-full bg-zinc-950 relative flex items-center justify-center overflow-hidden lg:rounded-b-none lg:rounded-tl-lg">
              {streamLoading && !activeEmbedUrl ? (
                <div className="flex flex-col items-center text-muted-foreground animate-pulse">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
                  <p>Loading stream...</p>
                </div>
              ) : !activeEmbedUrl ? (
                <div className="flex flex-col items-center text-center p-6 text-muted-foreground max-w-md">
                  <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Stream Unavailable</h3>
                  <p className="mb-6">The video source could not be loaded or is no longer available.</p>
                  <button
                    onClick={() => { refetch(); refetchServers(); }}
                    className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-6 py-2.5 rounded-full transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4" /> Retry Connection
                  </button>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  key={activeEmbedUrl}
                  src={activeEmbedUrl}
                  className="w-full h-full border-0 absolute inset-0"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                />
              )}
            </div>

            {/* Server Selector — right below the video */}
            <div className="bg-muted/20 border-t border-border px-3 py-2.5 flex flex-wrap gap-1.5 items-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0 mr-1">
                <Server className="w-3.5 h-3.5" />
                <span>Pilihan Server:</span>
              </div>
              {serversLoading ? (
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 w-16 rounded-md bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : serversError ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive">Gagal memuat server.</span>
                  <button
                    onClick={() => refetchServers()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Coba lagi
                  </button>
                </div>
              ) : servers.length === 0 ? (
                <span className="text-xs text-muted-foreground">Tidak ada server tersedia.</span>
              ) : (
                servers.map((server, idx) => {
                  const unreliable = isServerUnreliable(server.label ?? server.name ?? "", server.embed_url ?? "");
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedServer(idx)}
                      title={unreliable ? "Server ini mungkin tidak bisa diplay (embed dibatasi)" : undefined}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 flex items-center gap-1",
                        selectedServer === idx
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary hover:bg-secondary/70 text-foreground"
                      )}
                    >
                      {unreliable && <span>⚠</span>}
                      {getServerLabel(server)}
                    </button>
                  );
                })
              )}
            </div>

            {/* Player Controls Bar */}
            <div className="bg-card/90 border-t border-border p-3 flex flex-col gap-2.5 min-w-0">
              {/* Top row: title + prev/next nav */}
              <div className="flex flex-row items-center justify-between gap-3 min-w-0">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h1
                    className="text-base md:text-lg font-bold text-white truncate leading-tight"
                    title={stream?.title || currentEpInfo?.title}
                  >
                    {stream?.title || currentEpInfo?.title || "Loading Episode..."}
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5 min-w-0 overflow-hidden">
                    <Link
                      href={`/donghua/${seriesSlug}`}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors truncate min-w-0"
                    >
                      {series?.title || "Loading Series..."}
                    </Link>
                    {stream?.source && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-primary/20 text-primary border border-primary/20 shrink-0">
                        {stream.source}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={prevEpisode ? `/watch/${seriesSlug}/${getEpisodeSlug(prevEpisode)}` : "#"}
                    className={cn(
                      "flex items-center justify-center p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors",
                      !prevEpisode && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                    title="Previous Episode"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                  <Link
                    href={nextEpisode ? `/watch/${seriesSlug}/${getEpisodeSlug(nextEpisode)}` : "#"}
                    className={cn(
                      "flex items-center justify-center p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-primary",
                      !nextEpisode && "opacity-50 cursor-not-allowed pointer-events-none text-foreground"
                    )}
                    title="Next Episode"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Download Section — below the title */}
              <div className="border-t border-border/50 pt-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-2">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Episode:</span>
                </div>
                {downloadLoading ? (
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-7 w-16 rounded-md bg-secondary animate-pulse" />
                    ))}
                  </div>
                ) : downloadError ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Gagal memuat link download.</span>
                    <button
                      onClick={() => refetchDownload()}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Coba lagi
                    </button>
                  </div>
                ) : downloads.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Tidak ada link download tersedia.</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {downloads.map((q) => (
                      <div key={q.quality} className="relative">
                        <button
                          onClick={() => setOpenQuality(openQuality === q.quality ? null : q.quality)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all",
                            openQuality === q.quality
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary hover:bg-secondary/70 text-foreground border-border"
                          )}
                        >
                          {q.quality}
                          {q.size && (
                            <span className={cn(
                              "text-[10px] font-normal",
                              openQuality === q.quality ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {q.size}
                            </span>
                          )}
                        </button>

                        {/* Dropdown links */}
                        {openQuality === q.quality && q.links.length > 0 && (
                          <div className="absolute top-full left-0 mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg min-w-[160px] overflow-hidden">
                            {q.links.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors text-foreground"
                                onClick={() => setOpenQuality(null)}
                              >
                                <span>{link.label}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Playlist */}
          <div className="w-full lg:w-80 xl:w-96 bg-card border-l border-border flex flex-col h-[360px] lg:h-auto lg:min-h-[500px]">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <ListVideo className="w-4 h-4 text-primary" /> Playlist
              </h3>
              <span className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-1 rounded shrink-0">
                {episodes.length} Eps
              </span>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-1 bg-muted/10 min-h-0">
              {!series ? (
                <div className="p-4 flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                episodes.map((ep) => {
                  const epSlug = getEpisodeSlug(ep);
                  const isActive = epSlug === episodeSlug;

                  return (
                    <Link
                      key={epSlug}
                      href={`/watch/${seriesSlug}/${epSlug}`}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group",
                        isActive
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-secondary border border-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold font-mono text-xs",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/40"
                            : "bg-muted text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {ep.number}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div
                          className={cn(
                            "font-medium text-xs truncate",
                            isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                          )}
                        >
                          {ep.title || `Episode ${ep.number}`}
                        </div>
                        {ep.date && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {ep.date}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Ad — fills the empty space below the playlist. Hidden on mobile/tablet
                where the sidebar is a short fixed-height box with no room to spare;
                only shown once the sidebar switches to its tall desktop layout. */}
            <div className="hidden lg:flex shrink-0 flex-col items-center justify-center gap-3 py-4 border-t border-border bg-muted/10">
              <AdBanner adKey="8550b721f8992c34a1b4334a029889ce" width={160} height={300} />
              <AdBanner adKey="54eecf233aa963e10a7f564f1b75648f" width={300} height={250} className="hidden xl:block" />
              <AdBanner adKey="4b070b67a7290768f9985c8873046c56" width={160} height={600} className="hidden xl:block" />
            </div>
          </div>

          {/* Ad — mobile/tablet only. Placed after the whole player+playlist stack
              so it never squeezes into the playlist's fixed-height box. */}
          <div className="flex lg:hidden justify-center py-4 border-t border-border bg-muted/10">
            <AdBanner adKey="54eecf233aa963e10a7f564f1b75648f" width={300} height={250} />
          </div>
        </div>
      </div>

    </div>
  );
}
