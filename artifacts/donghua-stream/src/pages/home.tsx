import { useGetTrending, useGetSchedule } from "@workspace/api-client-react";
import { useGetPopular } from "@/hooks/usePopular";
import { HeroBanner } from "@/components/HeroBanner";
import { HorizontalRow } from "@/components/HorizontalRow";
import { DonghuaCard, DonghuaCardSkeleton } from "@/components/DonghuaCard";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import {
  TrendingUp,
  Flame,
  History,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_ORDER = ["Senin","Selasa","Rabu","Kamis","Jum'at","Sabtu","Minggu"];
const DAY_EN: Record<string, string> = {
  Sunday: "Minggu", Monday: "Senin", Tuesday: "Selasa",
  Wednesday: "Rabu", Thursday: "Kamis", Friday: "Jum'at", Saturday: "Sabtu",
};

function SectionHeader({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4 px-4 md:px-0">
      <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
        >
          Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const { data: trending, isLoading } = useGetTrending();
  const { data: scheduleData, isLoading: scheduleLoading } = useGetSchedule();
  const { data: popularData, isLoading: popularLoading } = useGetPopular();

  const heroItems   = trending?.ongoing?.slice(0, 5) ?? [];
  const latestRelease = trending?.completed?.slice(0, 12) ?? [];
  const moreSeries   = trending?.ongoing?.slice(5, 17) ?? [];
  const upcoming     = trending?.upcoming ?? [];

  const popularToday = (popularData?.results ?? []).map((item) => ({
    title: item.short_title || item.title,
    slug: item.slug.replace(/-episode-\d+.*$/, ""),
    url: item.url,
    type: item.type,
    status: "Ongoing",
    sub: item.sub_status,
    thumbnail: item.image,
  }));

  const todayName = DAY_EN[["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]] ?? "";
  const scheduleMap = scheduleData?.result ?? {};

  return (
    <div className="pb-16 overflow-x-hidden">
      <Helmet>
        <title>DonghuaStream — Nonton Donghua Sub Indonesia</title>
        <meta name="description" content="Nonton streaming anime China (Donghua) subtitle Indonesia terlengkap dan terbaru." />
      </Helmet>

      {/* Auto-rotating hero */}
      <HeroBanner items={heroItems} isLoading={isLoading} />

      <div className="mt-6 space-y-10 md:container md:mx-auto md:px-4">

        {/* 1. Popular Today — horizontal scroll */}
        <HorizontalRow
          title="Popular Today"
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          items={popularToday}
          viewAllHref="/ongoing"
          isLoading={popularLoading}
          skeletonCount={8}
        />

        {/* 2. Latest Release — grid */}
        <section>
          <SectionHeader
            icon={<Flame className="w-5 h-5 text-orange-400" />}
            title="Latest Release"
            href="/completed"
          />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 px-4 md:px-0">
            {isLoading
              ? Array(12).fill(0).map((_, i) => <DonghuaCardSkeleton key={i} />)
              : latestRelease.map((item) => <DonghuaCard key={item.slug} item={item} />)}
          </div>
        </section>

        {/* 3. Ongoing Series — grid */}
        {(isLoading || moreSeries.length > 0) && (
          <section>
            <SectionHeader
              icon={<History className="w-5 h-5 text-blue-400" />}
              title="Ongoing Series"
              href="/ongoing"
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 px-4 md:px-0">
              {isLoading
                ? Array(12).fill(0).map((_, i) => <DonghuaCardSkeleton key={i} />)
                : moreSeries.map((item) => <DonghuaCard key={item.slug} item={item} />)}
            </div>
          </section>
        )}

        {/* 4. Coming Soon — grid */}
        {(isLoading || upcoming.length > 0) && (
          <section>
            <SectionHeader
              icon={<CalendarClock className="w-5 h-5 text-amber-400" />}
              title="Coming Soon"
              href="/upcoming"
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 px-4 md:px-0">
              {isLoading
                ? Array(6).fill(0).map((_, i) => <DonghuaCardSkeleton key={i} />)
                : upcoming.map((item) => <DonghuaCard key={item.slug} item={item} />)}
            </div>
          </section>
        )}

        {/* 5. Weekly Schedule */}
        <section>
          <SectionHeader
            icon={<CalendarDays className="w-5 h-5 text-violet-400" />}
            title="Jadwal Tayang Minggu Ini"
            href="/schedule"
          />

          {scheduleLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 md:px-0">
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 md:px-0">
              {DAYS_ORDER.map((day) => {
                const isToday = day === todayName;
                const items = scheduleMap[day] ?? [];
                return (
                  <div
                    key={day}
                    className={cn(
                      "rounded-xl overflow-hidden border bg-card",
                      isToday
                        ? "border-primary shadow-[0_0_16px_rgba(225,29,72,0.2)] ring-1 ring-primary/20"
                        : "border-border/50"
                    )}
                  >
                    {/* Day header */}
                    <div
                      className={cn(
                        "px-3 py-2 flex items-center justify-between border-b text-sm font-bold",
                        isToday
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-muted/30 border-border text-foreground"
                      )}
                    >
                      {day}
                      {isToday && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-wider">
                          Hari ini
                        </span>
                      )}
                    </div>

                    {/* Items */}
                    <div className="p-2 space-y-1 max-h-48 overflow-y-auto hide-scrollbar">
                      {items.length > 0 ? (
                        items.slice(0, 8).map((item) => (
                          <Link
                            key={item.slug}
                            href={`/donghua/${item.slug}`}
                            className="group flex items-start gap-2 p-1.5 rounded-lg hover:bg-muted/60 active:bg-muted transition-colors touch-manipulation"
                          >
                            <PlayCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-[11px] leading-tight line-clamp-2 font-medium group-hover:text-primary transition-colors">
                              {item.title}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center py-4">
                          Tidak ada jadwal
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
