import { useSearchDonghua, getSearchDonghuaQueryKey } from "@workspace/api-client-react";
import { DonghuaCard, DonghuaCardSkeleton } from "@/components/DonghuaCard";
import { Helmet } from "react-helmet-async";
import { Search } from "lucide-react";
import { useLocation } from "wouter";

export default function SearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q") || "";

  const { data, isLoading, isError } = useSearchDonghua({ q }, { query: { enabled: !!q, queryKey: getSearchDonghuaQueryKey({ q }) } });
  const results = data?.results || [];

  return (
    <div className="container mx-auto px-4 pt-24 pb-12 min-h-screen">
      <Helmet>
        <title>Search "{q}" | DonghuaStream</title>
      </Helmet>

      <div className="mb-8 border-b border-border pb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Search className="text-primary w-6 h-6 md:w-8 md:h-8" />
          Search Results for "{q}"
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {isLoading ? "Searching..." : `Found ${data?.total || 0} results`}
        </p>
      </div>

      {!q && (
        <div className="text-center py-20 text-muted-foreground text-lg">
          Please enter a search term above.
        </div>
      )}

      {isError && (
        <div className="text-center py-20 text-destructive text-lg">
          Failed to fetch search results.
        </div>
      )}

      {q && !isLoading && !isError && results.length === 0 && (
        <div className="text-center py-20">
          <p className="text-xl font-medium mb-2">No results found</p>
          <p className="text-muted-foreground">Try adjusting your search keywords.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {isLoading && q ? (
          Array(12).fill(0).map((_, i) => <DonghuaCardSkeleton key={i} />)
        ) : (
          results.map((item) => <DonghuaCard key={item.slug} item={item} />)
        )}
      </div>
    </div>
  );
}
