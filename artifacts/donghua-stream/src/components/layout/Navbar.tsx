import { Search, Menu, X, Play } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchDonghua } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/ongoing", label: "Ongoing" },
  { href: "/completed", label: "Completed" },
  { href: "/schedule", label: "Schedule" },
  { href: "/upcoming", label: "Upcoming" },
];

// Inline search bar used in both desktop nav and mobile menu
function SearchBar({
  value,
  onChange,
  onSubmit,
  onNavigate,
  inputRef,
  className,
  inputClassName,
  placeholder = "Search donghua...",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onNavigate: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const [debouncedQ, setDebouncedQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounce query for suggestions (300 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    setOpen(debouncedQ.length >= 2);
  }, [debouncedQ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: suggestData } = useSearchDonghua(
    { q: debouncedQ },
    { query: { enabled: debouncedQ.length >= 2, staleTime: 30_000 } }
  );

  const suggestions = suggestData?.results?.slice(0, 6) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setOpen(false);
    inputRef?.current?.blur(); // dismiss keyboard on mobile
    onSubmit();
  };

  const handleSelect = (slug: string) => {
    setOpen(false);
    onChange("");
    inputRef?.current?.blur();
    onNavigate();
    // navigation is handled by the Link below
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => debouncedQ.length >= 2 && setOpen(true)}
          className={cn(
            "bg-secondary/50 border border-border/50 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all backdrop-blur-md",
            inputClassName
          )}
        />
      </form>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          {suggestions.map((item) => (
            <Link
              key={item.slug}
              href={`/donghua/${item.slug}`}
              onClick={() => handleSelect(item.slug)}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 active:bg-secondary transition-colors"
            >
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-8 h-10 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                {(item.type || item.status) && (
                  <p className="text-[11px] text-muted-foreground">
                    {[item.type, item.status].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync query from URL
  useEffect(() => {
    if (location.startsWith("/search")) {
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get("q") || "");
    } else {
      setSearchQuery("");
    }
  }, [location]);

  const submitSearch = useCallback(() => {
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  }, [searchQuery, setLocation]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/90 backdrop-blur-lg border-b border-border shadow-sm"
          : "bg-gradient-to-b from-background/90 to-transparent pt-2"
      )}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 z-50 flex-shrink-0">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">
            Donghua<span className="text-primary">Stream</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-secondary/50 border border-border/50 rounded-full px-2 py-1 backdrop-blur-md">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors hover:text-foreground",
                location === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search + mobile toggle */}
        <div className="flex items-center gap-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={submitSearch}
            onNavigate={() => {}}
            inputRef={desktopInputRef}
            className="hidden sm:block"
            inputClassName="w-56 md:w-64"
          />

          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border shadow-xl transition-all duration-300 ease-in-out",
          mobileMenuOpen
            ? "translate-y-0 opacity-100 h-screen sm:h-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <div className="pt-20 pb-6 px-4 flex flex-col gap-4 h-full">
          {/* Mobile search with suggestions */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={submitSearch}
            onNavigate={() => setMobileMenuOpen(false)}
            inputRef={mobileInputRef}
            className="sm:hidden"
            inputClassName="w-full pl-10 pr-4 py-3 text-base rounded-xl"
            placeholder="Cari donghua..."
          />

          <div className="flex flex-col gap-2 mt-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-xl text-lg font-medium transition-colors",
                  location === link.href
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
