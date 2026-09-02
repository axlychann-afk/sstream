import { useGetSchedule } from "@workspace/api-client-react";
import { Helmet } from "react-helmet-async";
import { CalendarDays, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// anichin.moe returns Indonesian day names
const DAYS_ORDER = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jum'at",
  "Sabtu",
  "Minggu",
  "Acak",
];

const DAY_EN_TO_ID: Record<string, string> = {
  Monday: "Senin",
  Tuesday: "Selasa",
  Wednesday: "Rabu",
  Thursday: "Kamis",
  Friday: "Jum'at",
  Saturday: "Sabtu",
  Sunday: "Minggu",
};

export default function Schedule() {
  const { data, isLoading } = useGetSchedule();

  const todayIndex = new Date().getDay();
  const todayEnName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][todayIndex];
  const todayName = DAY_EN_TO_ID[todayEnName] ?? "";

  const scheduleMap = data?.result || {};

  return (
    <div className="container mx-auto px-4 pt-24 pb-12 min-h-screen">
      <Helmet>
        <title>Release Schedule | DonghuaStream</title>
      </Helmet>

      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <CalendarDays className="text-primary w-8 h-8" />
          Weekly Schedule
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Find out when your favorite donghua airs.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array(7).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {DAYS_ORDER.map((day) => {
            const isToday = day === todayName;
            const items = scheduleMap[day] || [];
            
            return (
              <div 
                key={day} 
                className={cn(
                  "bg-card border rounded-2xl overflow-hidden transition-all duration-300",
                  isToday ? "border-primary shadow-[0_0_20px_rgba(225,29,72,0.15)] ring-1 ring-primary/20" : "border-border/50"
                )}
              >
                <div className={cn(
                  "px-6 py-4 font-semibold text-lg flex items-center justify-between border-b",
                  isToday ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/30 border-border"
                )}>
                  {day}
                  {isToday && <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-wider">Today</span>}
                </div>
                
                <div className="p-4 space-y-3">
                  {items.length > 0 ? items.map((item) => (
                    <Link 
                      key={item.slug} 
                      href={`/donghua/${item.slug}`}
                      className="group flex items-start gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-1 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                        {item.is_vip && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold border border-amber-500/20">
                            VIP
                          </span>
                        )}
                      </div>
                    </Link>
                  )) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No releases scheduled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
