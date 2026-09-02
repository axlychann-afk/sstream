import { useGetDonghuaDetail, useSearchDonghua, getGetDonghuaDetailQueryKey } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { PlayCircle, Star, ListVideo, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

// Patterns that confirm a text is SEO spam
const SEO_SPAM_SIGNALS = [
  /download\s+gratis/i,
  /\bMP4\b|\bMKV\b/i,
  /hardsub|softsub/i,
  /kuota\s+internet/i,
  /subtitle\s+bahasa\s+indonesia/i,
  /\d{3,4}[Pp]\s+\d{3,4}[Pp]/,
];

// Patterns that indicate spam has started — text before these is potentially real
const SPAM_START_SIGNALS = [
  /tonton\s+streaming/i,
  /nonton\s+streaming/i,
  /kamu\s+juga\s+bisa\s+download/i,
  /jangan\s+lupa\s+ya/i,
  /anichin/i,
  /download\s+gratis/i,
];

function cleanSynopsis(raw: string): { text: string } {
  const isSpam = SEO_SPAM_SIGNALS.some(p => p.test(raw));
  if (!isSpam) return { text: raw };

  // Find the earliest spam signal index
  const spamIdx = SPAM_START_SIGNALS.reduce<number>((min, p) => {
    const i = raw.search(p);
    return i >= 0 && i < min ? i : min;
  }, Infinity);

  // If spam starts within the first 120 chars, the whole thing is a spam description
  if (spamIdx < 120) return { text: "" };

  // Otherwise there's real content before the spam
  return { text: raw.slice(0, spamIdx).trim() };
}

export default function Detail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [, navigate] = useLocation();
  
  const { data, isLoading, error } = useGetDonghuaDetail(
    { slug },
    { query: { enabled: !!slug, queryKey: getGetDonghuaDetailQueryKey({ slug }), retry: false } }
  );

  // When slug not found, search using the slug words to find the correct slug
  const notFound = !isLoading && (!!error || (data != null && !data.result?.title));
  const searchQuery = slug.replace(/-/g, " ");
  const { data: searchData } = useSearchDonghua(
    { q: searchQuery },
    { query: { enabled: notFound && !!searchQuery, retry: false } }
  );

  // Auto-redirect if search found a close match with a different slug
  useEffect(() => {
    if (!notFound || !searchData?.results?.length) return;
    const match = searchData.results[0];
    if (match.slug && match.slug !== slug) {
      navigate(`/donghua/${match.slug}`, { replace: true });
    }
  }, [notFound, searchData, slug, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <div className="h-[40vh] bg-muted animate-pulse" />
        <div className="container mx-auto px-4 -mt-20 relative z-10 flex flex-col md:flex-row gap-8">
          <div className="w-48 md:w-64 h-72 md:h-96 bg-muted/80 rounded-xl animate-pulse border border-border" />
          <div className="flex-1 mt-20 space-y-4">
            <div className="h-10 bg-muted/80 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-muted/80 rounded w-1/3 animate-pulse" />
            <div className="space-y-2 mt-8">
              <div className="h-4 bg-muted/80 rounded w-full animate-pulse" />
              <div className="h-4 bg-muted/80 rounded w-full animate-pulse" />
              <div className="h-4 bg-muted/80 rounded w-3/4 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.result) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 text-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Series Not Found</h2>
          <p className="text-muted-foreground mb-6">We couldn't find the requested donghua series.</p>
          <Link href="/" className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const item = data.result;
  const isOngoing = item.status?.toLowerCase().includes("ongoing");
  
  // Episode slug extraction helper. Prefer the API's own `slug` field — it's
  // always populated, including for Dailymotion look-ahead episodes anichin
  // hasn't listed yet, whose `url` is empty. Deriving from `url` made every
  // such episode resolve to the same "" slug (duplicate keys + dead links).
  const getEpisodeSlug = (ep: { url: string; slug?: string }) => {
    if (ep.slug) return ep.slug;
    try {
      const urlObj = new URL(ep.url);
      return urlObj.pathname.split('/').filter(Boolean).pop() || '';
    } catch {
      // Fallback if not valid URL
      const parts = ep.url.split('/').filter(Boolean);
      return parts[parts.length - 1] || ep.url;
    }
  };

  // Backend sends episodes ascending (ep 1 at index 0).
  // We display newest first, but "Start Watching" links to ep 1.
  const episodes = item.episodes ?? [];
  const firstEpisode = episodes.length > 0 ? episodes[0] : null;
  const latestEpisode = episodes.length > 0 ? episodes[episodes.length - 1] : null;
  const firstEpisodeSlug = firstEpisode ? getEpisodeSlug(firstEpisode) : '';
  const latestEpisodeSlug = latestEpisode ? getEpisodeSlug(latestEpisode) : '';
  // Reversed copy for display (newest at top)
  const episodesDesc = [...episodes].reverse();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>{item.title} Sub Indonesia | DonghuaStream</title>
        <meta name="description" content={item.sinopsis || `Watch ${item.title} on DonghuaStream`} />
        {item.cover && <meta property="og:image" content={item.cover} />}
      </Helmet>

      {/* Hero Banner backdrop */}
      <div className="w-full h-[40vh] md:h-[50vh] relative overflow-hidden">
        <div className="absolute inset-0 bg-muted">
          {item.cover && (
            <img 
              src={item.cover} 
              alt={item.title} 
              className="w-full h-full object-cover opacity-30 blur-sm scale-105"
            />
          )}
        </div>
        <div className="absolute inset-0 poster-mask" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-32 md:-mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Poster Sidebar */}
          <div className="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
            <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-2 border-border bg-card relative group">
              {item.cover ? (
                <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">No Image</div>
              )}
              {firstEpisodeSlug && (
                <Link 
                  href={`/watch/${slug}/${firstEpisodeSlug}`}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="bg-primary text-primary-foreground p-4 rounded-full transform scale-90 group-hover:scale-100 transition-transform">
                    <PlayCircle className="w-10 h-10" fill="currentColor" />
                  </div>
                </Link>
              )}
            </div>
            
            {latestEpisodeSlug && (
              <Link 
                href={`/watch/${slug}/${latestEpisodeSlug}`}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:-translate-y-1"
              >
                <PlayCircle className="w-5 h-5 fill-current" />
                Ep Terbaru
              </Link>
            )}
            {firstEpisodeSlug && firstEpisodeSlug !== latestEpisodeSlug && (
              <Link 
                href={`/watch/${slug}/${firstEpisodeSlug}`}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2.5 rounded-xl font-medium text-sm transition-all"
              >
                Mulai dari Ep 1
              </Link>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 mt-4 md:mt-24">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {item.status && (
                <span className={cn(
                  "px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border",
                  isOngoing ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                )}>
                  {item.status}
                </span>
              )}
              {item.type && (
                <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-secondary border border-border text-foreground">
                  {item.type}
                </span>
              )}
              {item.rating && (
                <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> {item.rating}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">
              {item.title}
            </h1>
            
            {item.alternative && (
              <p className="text-muted-foreground text-sm md:text-base font-medium mb-6">
                {item.alternative}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-8">
              {item.genres?.map(genre => (
                <span key={genre} className="px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-sm text-foreground hover:bg-secondary transition-colors cursor-default">
                  {genre}
                </span>
              ))}
            </div>

            <SynopsisBlock raw={item.sinopsis} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <InfoBox label="Studio" value={item.studio} />
              <InfoBox label="Released" value={item.releaseDate} />
              <InfoBox label="Duration" value={item.duration} />
              <InfoBox label="Episodes" value={item.totalEpisodes} />
              <InfoBox label="Season" value={item.season} />
              <InfoBox label="Network" value={item.network} />
              <InfoBox label="Country" value={item.country} />
              <InfoBox label="Subber" value={item.subber} />
            </div>

            {/* Episode List */}
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2 mb-6">
                <ListVideo className="w-6 h-6 text-primary" /> 
                Episodes
                <span className="text-muted-foreground font-normal text-lg">({item.episodes?.length || 0})</span>
              </h3>
              
              {item.episodes && item.episodes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {episodesDesc.map((ep) => {
                    const epSlug = getEpisodeSlug(ep);
                    return (
                      <Link 
                        key={epSlug}
                        href={`/watch/${slug}/${epSlug}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-muted text-muted-foreground w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {ep.number}
                          </div>
                          <div>
                            <div className="font-medium line-clamp-1 group-hover:text-primary transition-colors text-sm">
                              {ep.title || `Episode ${ep.number}`}
                            </div>
                            {ep.date && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {ep.date}
                              </div>
                            )}
                          </div>
                        </div>
                        <PlayCircle className="w-5 h-5 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all transform group-hover:scale-110" />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center border border-border border-dashed rounded-xl text-muted-foreground">
                  No episodes available yet.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value?: string | number | null }) {
  if (!value || value === "?" || value === "-") return null;
  return (
    <div className="bg-secondary/30 rounded-lg p-3 border border-border/30">
      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-sm font-medium text-foreground line-clamp-1" title={String(value)}>{value}</div>
    </div>
  );
}

function SynopsisBlock({ raw }: { raw?: string | null }) {
  const [expanded, setExpanded] = useState(false);

  const { text } = cleanSynopsis(raw ?? "");

  if (!raw || !text) {
    return (
      <div className="bg-card/50 border border-border/50 rounded-2xl p-6 mb-8">
        <h3 className="font-semibold text-base mb-2">Synopsis</h3>
        <p className="text-muted-foreground text-sm">No synopsis available.</p>
      </div>
    );
  }
  const LIMIT = 280;
  const needsExpand = text.length > LIMIT;
  const displayed = needsExpand && !expanded ? text.slice(0, LIMIT).trim() + "…" : text;

  return (
    <div className="bg-card/50 border border-border/50 rounded-2xl p-6 mb-8 backdrop-blur-sm">
      <h3 className="font-semibold text-base mb-3 border-b border-border/50 pb-2">Synopsis</h3>
      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{displayed}</p>
      {needsExpand && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-primary text-sm font-medium hover:text-primary/80 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-4 h-4" /> Tutup</>
          ) : (
            <><ChevronDown className="w-4 h-4" /> Baca selengkapnya</>
          )}
        </button>
      )}
    </div>
  );
}
