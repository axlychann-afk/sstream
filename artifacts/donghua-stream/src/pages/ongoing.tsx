import { useGetOngoing } from "@workspace/api-client-react";
import { DonghuaCard, DonghuaCardSkeleton } from "@/components/DonghuaCard";
import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Ongoing() {
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("Semua");

  const { data, isLoading, isFetching } = useGetOngoing(
    { page },
    { query: { keepPreviousData: true } as any }
  );

  useEffect(() => {
    if (!data?.results) return;
    if (page === 1) {
      setAllResults(data.results);
    } else {
      setAllResults(prev => {
        const existing = new Set(prev.map((r: any) => r.slug));
        const toAdd = data.results.filter((r: any) => !existing.has(r.slug));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
    }
  }, [data, page]);

  const results = allResults.length > 0 ? allResults : (data?.results || []);
  const hasMore = data?.hasMore ?? false;

  const filterOptions = useMemo(() => {
    const subs = Array.from(new Set(results.map((r: any) => r.sub).filter(Boolean)));
    return subs.length > 1 ? ["Semua", ...subs] : [];
  }, [results]);

  const filtered = activeFilter === "Semua"
    ? results
    : results.filter((r: any) => r.sub === activeFilter);

  return (
    <div className="container mx-auto px-4 pt-24 pb-12 min-h-screen">
      <Helmet>
        <title>Ongoing Donghua | DonghuaStream</title>
      </Helmet>

      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold">Ongoing Series</h1>
        <p className="text-muted-foreground mt-1">Catch up on the latest airing donghua episodes.</p>
      </div>

      {filterOptions.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                activeFilter === f
                  ? "bg-primary text-white border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {isLoading && page === 1
          ? Array(12).fill(0).map((_, i) => <DonghuaCardSkeleton key={i} />)
          : filtered.map((item: any) => <DonghuaCard key={item.slug} item={item} />)
        }
      </div>

      {hasMore && activeFilter === "Semua" && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={isFetching}
            className={cn(
              "px-8 py-3 rounded-full bg-secondary hover:bg-secondary/80 font-medium transition-all",
              isFetching && "opacity-70 cursor-not-allowed"
            )}
          >
            {isFetching ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
              </span>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
