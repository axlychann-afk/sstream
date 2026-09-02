import { useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { DonghuaItem } from "@workspace/api-client-react";
import { PlayCircle } from "lucide-react";

interface DonghuaCardProps {
  item: DonghuaItem;
  className?: string;
}

export function DonghuaCard({ item, className }: DonghuaCardProps) {
  const [loaded, setLoaded] = useState(false);
  const isOngoing = item.status?.toLowerCase().includes("ongoing");
  const isCompleted = item.status?.toLowerCase().includes("completed");
  const statusLabel = isOngoing ? "Ongoing" : isCompleted ? "Selesai" : (item.status ?? "");

  return (
    <Link
      href={`/donghua/${item.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl bg-card border border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(225,29,72,0.15)] hover:-translate-y-1",
        className
      )}
      data-testid={`card-donghua-${item.slug}`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {item.thumbnail ? (
          <>
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
                "h-full w-full object-cover transition-all duration-500 group-hover:scale-110",
                loaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
              )}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted/50">
            <span className="text-muted-foreground text-xs">No Image</span>
          </div>
        )}

        {/* Base gradient — hidden on hover, replaced by overlay */}
        <div className="absolute inset-0 card-mask opacity-80 group-hover:opacity-0 transition-opacity duration-200" />

        {/* Sub badge */}
        {item.sub && (
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className="rounded bg-primary/90 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
              {item.sub}
            </span>
          </div>
        )}

        {/* Status badge */}
        {item.status && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white leading-none",
                isOngoing
                  ? "bg-emerald-600/90"
                  : isCompleted
                  ? "bg-blue-600/90"
                  : "bg-amber-500/90"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  isOngoing ? "bg-emerald-300" : isCompleted ? "bg-blue-300" : "bg-amber-300"
                )}
              />
              {statusLabel}
            </span>
          </div>
        )}

        {/* Default title (not hovered) */}
        <div className="absolute bottom-0 left-0 right-0 p-2 group-hover:opacity-0 transition-opacity duration-150">
          <h3 className="font-semibold text-white line-clamp-2 text-[11px] leading-tight drop-shadow">
            {item.title}
          </h3>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-250 bg-gradient-to-t from-black/95 via-black/55 to-black/5">
          <div className="p-2.5">
            <h3 className="font-bold text-white text-[11px] leading-tight line-clamp-2 mb-2">
              {item.title}
            </h3>
            {item.type && (
              <div className="flex gap-1 mb-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-medium border border-white/10">
                  {item.type}
                </span>
              </div>
            )}
            <div className="flex items-center justify-center gap-1.5 w-full bg-primary text-white text-[10px] font-bold py-1.5 rounded-lg">
              <PlayCircle className="w-3 h-3 fill-current" />
              Tonton Sekarang
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function DonghuaCardSkeleton() {
  return (
    <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-muted border border-border/50" />
  );
}
