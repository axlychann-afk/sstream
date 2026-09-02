import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Play, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { DonghuaItem } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface HeroBannerProps {
  items: DonghuaItem[];
  isLoading?: boolean;
}

const INTERVAL_MS = 6000;
const FADE_MS = 250;

export function HeroBanner({ items, isLoading }: HeroBannerProps) {
  const count = items.length;
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clamp current if items shrinks (e.g. data refresh)
  useEffect(() => {
    if (count > 0 && current >= count) {
      setCurrent(0);
    }
  }, [count, current]);

  /** Cross-fade to a new slide index. Returns without action if already transitioning. */
  const goTo = (next: number) => {
    if (pendingTimeout.current) return; // already mid-transition
    setVisible(false);
    pendingTimeout.current = setTimeout(() => {
      setCurrent((next + count) % count);
      setVisible(true);
      pendingTimeout.current = null;
    }, FADE_MS);
  };

  // Auto-rotate — pause on reduced-motion
  useEffect(() => {
    if (count <= 1) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    intervalRef.current = setInterval(() => {
      if (pendingTimeout.current) return; // skip if mid-fade
      setVisible(false);
      pendingTimeout.current = setTimeout(() => {
        setCurrent((prev) => (prev + 1) % count);
        setVisible(true);
        pendingTimeout.current = null;
      }, FADE_MS);
    }, INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    };
  }, [count]);

  if (isLoading) {
    return (
      <div className="relative w-full hero-height bg-muted overflow-hidden">
        <div className="w-full h-full animate-pulse bg-gradient-to-br from-muted to-muted/50" />
        <div className="absolute bottom-8 left-4 right-4 space-y-3">
          <div className="h-4 w-24 bg-muted-foreground/20 rounded-full animate-pulse" />
          <div className="h-8 w-3/4 bg-muted-foreground/20 rounded-lg animate-pulse" />
          <div className="h-4 w-1/2 bg-muted-foreground/20 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!count) return null;

  const safeIdx = Math.min(current, count - 1);
  const item = items[safeIdx];

  return (
    <section
      className="relative w-full hero-height overflow-hidden bg-black select-none"
      aria-label="Featured donghua slideshow"
      aria-roledescription="carousel"
    >
      {/* Background image */}
      <div
        className={cn(
          "absolute inset-0 hero-fade",
          visible ? "opacity-100" : "opacity-0"
        )}
      >
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover hero-scale"
            draggable={false}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
      </div>

      {/* Content */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 md:p-10 pb-8 md:pb-14 hero-fade hero-slide",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        )}
      >
        <div className="flex items-center gap-2 mb-3" aria-hidden="true">
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider">
            <Star className="w-3 h-3 fill-current" />
            Trending
          </span>
          {item.type && (
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px] font-medium border border-white/10 backdrop-blur-md">
              {item.type}
            </span>
          )}
          {item.sub && (
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px] font-medium border border-white/10 backdrop-blur-md">
              {item.sub}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-2 md:mb-4 max-w-xl drop-shadow-lg line-clamp-2">
          {item.title}
        </h1>

        <p className="text-sm text-white/60 mb-4 md:mb-6 max-w-md hidden sm:block">
          Nonton {item.title} sub Indonesia sekarang dengan kualitas terbaik.
        </p>

        <div className="flex items-center gap-3">
          <Link
            href={`/donghua/${item.slug}`}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm active:scale-95 transition-transform touch-manipulation"
          >
            <Play className="w-4 h-4 fill-current" />
            Tonton Sekarang
          </Link>
          <Link
            href={`/donghua/${item.slug}`}
            className="flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-full font-semibold text-sm backdrop-blur-md border border-white/15 active:scale-95 transition-transform touch-manipulation"
          >
            Detail
          </Link>
        </div>
      </div>

      {/* Prev / Next arrows — desktop only */}
      {count > 1 && (
        <>
          <button
            onClick={() => goTo(safeIdx - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/40 text-white border border-white/10 backdrop-blur-md hover:bg-black/60 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => goTo(safeIdx + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/40 text-white border border-white/10 backdrop-blur-md hover:bg-black/60 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div
          className="absolute bottom-3 right-4 flex items-center gap-1.5"
          role="tablist"
          aria-label="Slide indicators"
        >
          {items.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === safeIdx}
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all duration-300 touch-manipulation",
                i === safeIdx
                  ? "w-5 h-1.5 bg-primary"
                  : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
