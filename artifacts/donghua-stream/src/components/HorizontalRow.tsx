import { useState, useRef } from "react";
import { Link } from "wouter";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { DonghuaItem } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface HorizontalRowProps {
  title: string;
  icon?: React.ReactNode;
  items: DonghuaItem[];
  viewAllHref?: string;
  isLoading?: boolean;
  skeletonCount?: number;
}

export function HorizontalRow({
  title,
  icon,
  items,
  viewAllHref,
  isLoading,
  skeletonCount = 8,
}: HorizontalRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  };

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-0 mb-3">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
          >
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Scroll arrows — desktop only */}
      <button
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-[4.5rem] -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-8 h-16 rounded-r-xl bg-background/80 border border-border/50 text-foreground hover:bg-secondary/80 transition-colors backdrop-blur-sm"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-[4.5rem] -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-8 h-16 rounded-l-xl bg-background/80 border border-border/50 text-foreground hover:bg-secondary/80 transition-colors backdrop-blur-sm"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Card row */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto hide-scrollbar px-4 md:px-0 snap-x snap-mandatory"
        style={{ overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {isLoading
          ? Array(skeletonCount)
              .fill(0)
              .map((_, i) => <CardSkeleton key={i} />)
          : items.map((item) => <RowCard key={item.slug} item={item} />)}
      </div>
    </section>
  );
}

function RowCard({ item }: { item: DonghuaItem }) {
  const [loaded, setLoaded] = useState(false);
  const isOngoing = item.status?.toLowerCase().includes("ongoing");
  const isCompleted = item.status?.toLowerCase().includes("completed");

  return (
    <Link
      href={`/donghua/${item.slug}`}
      className="flex-none snap-start w-[38vw] sm:w-44 md:w-40 rounded-xl overflow-hidden bg-card border border-border/40 active:scale-[0.97] transition-transform touch-manipulation"
      style={{ contain: "layout style" }}
    >
      <div className="relative aspect-[3/4] w-full bg-muted overflow-hidden">
        {item.thumbnail ? (
          <>
            {/* Shimmer placeholder */}
            <div
              className={cn(
                "absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted/60 transition-opacity duration-300",
                loaded ? "opacity-0" : "opacity-100"
              )}
            />
            <img
              src={item.thumbnail}
              alt={item.title}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                loaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
              )}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/60">
            <span className="text-muted-foreground text-[10px]">No Image</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Status badge */}
        {item.status && (
          <div className="absolute top-1.5 right-1.5">
            <span
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white",
                isOngoing
                  ? "bg-emerald-500/90"
                  : isCompleted
                  ? "bg-blue-500/90"
                  : "bg-amber-500/90"
              )}
            >
              {item.status}
            </span>
          </div>
        )}

        {/* Sub badge */}
        {item.sub && (
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/90 text-white">
              {item.sub}
            </span>
          </div>
        )}

        {/* Title at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">
            {item.title}
          </p>
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="flex-none w-[38vw] sm:w-44 md:w-40 rounded-xl overflow-hidden bg-muted border border-border/40">
      <div className="aspect-[3/4] w-full animate-pulse bg-muted/80" />
    </div>
  );
}
