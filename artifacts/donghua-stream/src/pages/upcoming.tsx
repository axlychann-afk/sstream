import { useGetUpcoming } from "@workspace/api-client-react";
import { DonghuaCardSkeleton } from "@/components/DonghuaCard";
import { Helmet } from "react-helmet-async";
import { CalendarClock, Bell } from "lucide-react";
import { Link } from "wouter";

export default function Upcoming() {
  const { data, isLoading } = useGetUpcoming();
  const results = data?.results || [];
  const featured = results[0];
  const rest = results.slice(1);

  return (
    <div className="container mx-auto px-4 pt-24 pb-12 min-h-screen">
      <Helmet>
        <title>Upcoming Donghua | DonghuaStream</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Coming Soon</h1>
        <p className="text-muted-foreground mt-1">Series that are about to air.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-2xl">
          {Array(4).fill(0).map((_, i) => <DonghuaCardSkeleton key={i} />)}
        </div>
      ) : results.length === 0 ? (
        <div className="py-20 text-center">
          <CalendarClock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Nothing announced yet.</p>
          <p className="text-sm text-muted-foreground/50 mt-1">Check back soon.</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-2">
          {/* Featured banner */}
          {featured && (
            <Link href={`/donghua/${featured.slug}`} className="block mb-4 group">
              <div className="relative rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-all">
                {featured.thumbnail && (
                  <img
                    src={featured.thumbnail}
                    alt={featured.title}
                    className="w-full h-36 object-cover opacity-25 group-hover:opacity-35 transition-opacity"
                  />
                )}
                {!featured.thumbnail && <div className="w-full h-36 bg-muted" />}
                <div className="absolute inset-0 bg-gradient-to-r from-background/98 via-background/80 to-background/40 flex items-center p-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded mb-3 inline-block">
                      Segera Hadir
                    </span>
                    <h2 className="text-xl font-bold text-white mt-2">{featured.title}</h2>
                    {featured.status && (
                      <p className="text-sm text-muted-foreground mt-1">{featured.status}</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Rest as list */}
          {rest.map(item => (
            <Link
              key={item.slug}
              href={`/donghua/${item.slug}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-secondary/20 transition-all group"
            >
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-16 rounded-lg bg-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.type || "Donghua"} · Belum ada tanggal pasti
                </p>
              </div>
              <Bell className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
