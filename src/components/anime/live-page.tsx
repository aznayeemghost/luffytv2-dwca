"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE TV & SPORTS — WatchFooty-Style Redesign
// - Sticky top sport filter bar with Home + Live Only toggle
// - Sport category cards (horizontal scroll)
// - Popular Live section with poster cards
// - Matches by sport/time with team badges, VS, countdown
// - News section at bottom
// ============================================================

const WF_BASE = "https://api.watchfooty.st";

const defaultSportCategories = [
  { id: "all", label: "All Sports", icon: "🏟️", color: "#7c6cf0" },
  { id: "football", label: "Football", icon: "⚽", color: "#22c55e" },
  { id: "basketball", label: "Basketball", icon: "🏀", color: "#ef4444" },
  { id: "american-football", label: "NFL", icon: "🏈", color: "#dc2626" },
  { id: "hockey", label: "Hockey", icon: "🏒", color: "#06b6d4" },
  { id: "baseball", label: "Baseball", icon: "⚾", color: "#3b82f6" },
  { id: "tennis", label: "Tennis", icon: "🎾", color: "#a855f7" },
  { id: "fight", label: "MMA/Boxing", icon: "🥊", color: "#f97316" },
  { id: "motor-sports", label: "Motorsport", icon: "🏎️", color: "#eab308" },
  { id: "rugby", label: "Rugby", icon: "🏉", color: "#10b981" },
  { id: "golf", label: "Golf", icon: "⛳", color: "#84cc16" },
  { id: "cricket", label: "Cricket", icon: "🏏", color: "#f59e0b" },
  { id: "billiards", label: "Billiards", icon: "🎱", color: "#8b5cf6" },
  { id: "afl", label: "AFL", icon: "🏈", color: "#14b8a6" },
  { id: "darts", label: "Darts", icon: "🎯", color: "#f43f5e" },
  { id: "other", label: "Other", icon: "📺", color: "#6b7280" },
];

interface MatchSource { source: string; id: string; }

interface LiveMatch {
  id: string;
  title: string;
  sport: string;
  sportName: string;
  date: number;
  poster: string;
  popular: boolean;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string;
  awayBadge: string;
  sources: MatchSource[];
  isLive: boolean;
  apiSource?: string;
  streamKey?: string;
  streamCategory?: string;
  channelCode?: string;
  channelName?: string;
  damitvId?: string;
  watchfootyId?: number;
  sportsrcCategory?: string;
  sportsrcId?: string;
  watchfootyStreams?: { id: string; url: string; quality: string; language: string; isRedirect: boolean; nsfw: boolean; ads: boolean }[];
  league?: string;
  leagueLogo?: string;
  homeScore?: number;
  awayScore?: number;
  currentMinute?: string;
}

interface SportCategory { id: string; name: string; displayName?: string; liveCount?: number; }

interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
  editedAt: string | null;
  sport: string;
  author: string;
}

function getSportColor(sport: string): string {
  const cat = defaultSportCategories.find(c => c.id === sport);
  return cat?.color || "#6b7280";
}

function getSportIcon(sport: string): string {
  const cat = defaultSportCategories.find(c => c.id === sport);
  return cat?.icon || "📺";
}

// ── Live Pulse Badge ──
function LivePulse({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "h-3 w-3" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const dot = size === "lg" ? "h-3 w-3" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const text = size === "lg" ? "text-xs" : size === "md" ? "text-[10px]" : "text-[9px]";
  const px = size === "lg" ? "px-2.5 py-1" : size === "md" ? "px-2 py-0.5" : "px-1.5 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1.5 ${px} rounded-full bg-red-500/15 text-red-400 ${text} font-bold uppercase tracking-wider`}>
      <span className={`relative flex ${s}`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className={`relative inline-flex rounded-full ${dot} bg-red-500`} />
      </span>
      Live
    </span>
  );
}

// ── Format match time ──
function formatMatchTime(timestamp: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + `, ${time}`;
}

function formatTimeOnly(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Mini Countdown for cards ──
function MiniCountdown({ targetDate, sportColor }: { targetDate: number; sportColor: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, total: 0 });
  useEffect(() => {
    const update = () => {
      const diff = targetDate - Date.now();
      if (diff <= 0) { setTimeLeft({ h: 0, m: 0, s: 0, total: 0 }); return; }
      setTimeLeft({
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        total: diff,
      });
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, "0");
  if (timeLeft.total <= 0) return <span className="text-[9px] text-red-400 font-bold animate-pulse">STARTING!</span>;

  return (
    <div className="flex items-center gap-0.5">
      <span className="px-1.5 py-0.5 rounded text-[10px] font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.h)}</span>
      <span className="text-[9px] text-white/20 font-bold">:</span>
      <span className="px-1.5 py-0.5 rounded text-[10px] font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.m)}</span>
      <span className="text-[9px] text-white/20 font-bold">:</span>
      <span className="px-1.5 py-0.5 rounded text-[10px] font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.s)}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN LIVE PAGE — WatchFooty-Style Layout
// ═══════════════════════════════════════════════════════════════
export default function LivePage() {
  const navigate = useAppStore(s => s.navigate);
  const sectionSubPage = useAppStore(s => s.sectionSubPage);
  const setSectionSubPage = useAppStore(s => s.setSectionSubPage);

  // ── Main tab: "tv", "sports", "news" ──
  const activeTab = sectionSubPage === "sports" ? "sports" : sectionSubPage === "home" ? "tv" : (sectionSubPage as string) === "news" ? "news" : "tv";
  const setActiveTab = (tab: string) => {
    if (tab === "sports") setSectionSubPage("sports");
    else if (tab === "news") setSectionSubPage("news" as any);
    else setSectionSubPage("tv-channels");
  };

  // ── Sports state ──
  const [selectedSport, setSelectedSport] = useState("all");
  const [liveOnly, setLiveOnly] = useState(false);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [sports, setSports] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── News state ──
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsOffset, setNewsOffset] = useState(0);
  const [newsHasMore, setNewsHasMore] = useState(true);

  // ── Refs for horizontal scroll ──
  const sportCardsRef = useRef<HTMLDivElement>(null);
  const popularRef = useRef<HTMLDivElement>(null);

  // ── Fetch Sports ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (selectedSport !== "all") params.set("sport", selectedSport);
      if (liveOnly) params.set("filter", "live");

      const res = await fetch(`/api/live?${params.toString()}`);
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();

      const matchList: LiveMatch[] = (data.matches || []).map((m: any) => ({
        ...m,
        isLive: m.isLive || m.status === "in" || m.status === "live",
      }));

      matchList.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        return a.date - b.date;
      });

      setMatches(matchList);
      setSports(data.sports || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load live data");
    } finally {
      setLoading(false);
    }
  }, [selectedSport, liveOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Fetch News ──
  const fetchNews = useCallback(async (offset: number = 0, append: boolean = false) => {
    setNewsLoading(true);
    try {
      const res = await fetch(`/api/news?limit=12&offset=${offset}&sort=newest`);
      if (res.ok) {
        const data = await res.json();
        const articles: NewsArticle[] = data.articles || [];
        if (append) {
          setNewsArticles(prev => [...prev, ...articles]);
        } else {
          setNewsArticles(articles);
        }
        setNewsHasMore(articles.length >= 12);
        setNewsOffset(offset + articles.length);
      }
    } catch {}
    setNewsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "news") {
      fetchNews(0, false);
    }
  }, [activeTab, fetchNews]);

  const handleWatchMatch = (match: LiveMatch) => {
    navigate({
      page: "live-watch",
      matchId: match.id,
      matchTitle: match.title,
      matchSport: match.sport,
      matchSportName: match.sportName,
      matchHomeTeam: match.homeTeam,
      matchAwayTeam: match.awayTeam,
      matchHomeBadge: match.homeBadge,
      matchAwayBadge: match.awayBadge,
      matchPoster: match.poster,
      matchPopular: match.popular,
      matchSources: JSON.stringify(match.sources),
      matchDate: match.date,
      matchStreamKey: match.streamKey || "",
      matchStreamCategory: match.streamCategory || "",
      matchChannelName: match.channelName || "",
      matchChannelCode: match.channelCode || "",
      matchDamitvId: match.damitvId || "",
      matchWatchfootyId: match.watchfootyId ? String(match.watchfootyId) : "",
      matchApiSource: match.apiSource || "",
      matchSportsrcCategory: match.sportsrcCategory || "",
      matchSportsrcId: match.sportsrcId || "",
      matchWatchfootyStreams: match.watchfootyStreams ? JSON.stringify(match.watchfootyStreams) : "",
      matchLeague: match.league || "",
      matchLeagueLogo: match.leagueLogo || "",
      matchHomeScore: match.homeScore,
      matchAwayScore: match.awayScore,
      matchCurrentMinute: match.currentMinute || "",
    } as any);
  };

  // ── Group matches ──
  const now = Date.now();
  const filteredMatches = useMemo(() => {
    let result = matches;
    if (selectedSport !== "all") {
      result = result.filter(m => m.sport === selectedSport);
    }
    if (liveOnly) {
      result = result.filter(m => m.isLive);
    }
    return result;
  }, [matches, selectedSport, liveOnly]);

  const liveMatches = useMemo(() => filteredMatches.filter(m => m.isLive), [filteredMatches]);
  const startingSoon = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now < 3600000), [filteredMatches, now]);
  const todayUpcoming = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now >= 3600000 && m.date - now < 86400000), [filteredMatches, now]);
  const laterMatches = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now >= 86400000), [filteredMatches, now]);

  // Popular live matches (those with poster images from WatchFooty, or marked popular)
  const popularLiveMatches = useMemo(() => {
    return liveMatches.filter(m => m.popular || (m.apiSource === "watchfooty" && m.poster)).slice(0, 20);
  }, [liveMatches]);

  const sportCounts: Record<string, number> = { all: matches.length };
  const liveCountBySport: Record<string, number> = {};
  for (const m of matches) {
    sportCounts[m.sport] = (sportCounts[m.sport] || 0) + 1;
    if (m.isLive) liveCountBySport[m.sport] = (liveCountBySport[m.sport] || 0) + 1;
  }
  const totalLiveCount = Object.values(liveCountBySport).reduce((a, b) => a + b, 0);

  // Merge sports from API with defaults
  const displayCategories = useMemo(() => {
    const cats = defaultSportCategories.map(cat => {
      const apiSport = sports.find(s => s.id === cat.id);
      return {
        ...cat,
        label: apiSport?.displayName || apiSport?.name || cat.label,
        liveCount: liveCountBySport[cat.id] || apiSport?.liveCount || 0,
      };
    });
    // Add any sports from API not in defaults
    for (const s of sports) {
      if (!cats.find(c => c.id === s.id)) {
        cats.push({
          id: s.id,
          label: s.displayName || s.name || capitalize(s.id),
          icon: getSportIcon(s.id),
          color: getSportColor(s.id),
          liveCount: liveCountBySport[s.id] || s.liveCount || 0,
        });
      }
    }
    return cats;
  }, [sports, liveCountBySport]);

  // Nav sport buttons — top 8 most popular + "More" dropdown
  const sortedNavSports = useMemo(() => {
    return [...displayCategories]
      .filter(c => c.id !== "all")
      .sort((a, b) => (b.liveCount || 0) - (a.liveCount || 0));
  }, [displayCategories]);

  const topNavSports = sortedNavSports.slice(0, 7);
  const moreNavSports = sortedNavSports.slice(7);

  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : "";

  // Scroll helper
  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    const amount = 400;
    ref.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-8 -mx-4 lg:-mx-8">
      {/* ══════════════════════════════════════════
          STICKY TOP NAVIGATION BAR
          ══════════════════════════════════════════ */}
      <div className="sticky top-[65px] z-40 bg-[#0d0d12]/95 backdrop-blur-md border-b border-white/[0.06] px-4 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 h-12">
          {/* Home Button */}
          <button
            onClick={() => { setSelectedSport("all"); setLiveOnly(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/[0.06] transition-all flex-shrink-0"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </button>

          {/* Live Only Toggle */}
          <button
            onClick={() => setLiveOnly(!liveOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex-shrink-0 ${
              liveOnly
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <span className={`w-2 h-2 rounded-full ${liveOnly ? "bg-red-500 animate-pulse" : "bg-white/20"}`} />
            Live Only
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/[0.06] flex-shrink-0" />

          {/* Sport Category Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-hide">
            {topNavSports.map(cat => {
              const isActive = selectedSport === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedSport(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                  style={{
                    ...(isActive ? {
                      background: `linear-gradient(135deg, ${cat.color}25, ${cat.color}10)`,
                      border: `1px solid ${cat.color}40`,
                    } : {}),
                    fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                  }}
                >
                  <span className="text-sm">{cat.icon}</span>
                  {cat.label}
                  {cat.liveCount > 0 && (
                    <span className="text-[8px] px-1 py-0.5 rounded-full bg-red-500/20 text-red-400">{cat.liveCount}</span>
                  )}
                </button>
              );
            })}

            {/* More Dropdown */}
            {moreNavSports.length > 0 && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
                >
                  More
                  <svg className={`w-3 h-3 transition-transform ${showMoreDropdown ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {showMoreDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a24] border border-white/[0.08] rounded-xl shadow-2xl py-2 z-50">
                    {moreNavSports.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedSport(cat.id); setShowMoreDropdown(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-white/[0.04] transition-all ${
                          selectedSport === cat.id ? "text-white" : "text-white/50"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        {cat.label}
                        {cat.liveCount > 0 && (
                          <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">{cat.liveCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.03] rounded-lg border border-white/[0.04] flex-shrink-0">
            <button
              onClick={() => setActiveTab("tv")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                activeTab === "tv" ? "bg-[#7c6cf0] text-white" : "text-white/35 hover:text-white/60"
              }`}
            >
              Live TV
            </button>
            <button
              onClick={() => setActiveTab("sports")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                activeTab === "sports" ? "bg-[#7c6cf0] text-white" : "text-white/35 hover:text-white/60"
              }`}
            >
              Sports
            </button>
            <button
              onClick={() => setActiveTab("news")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                activeTab === "news" ? "bg-[#7c6cf0] text-white" : "text-white/35 hover:text-white/60"
              }`}
            >
              News
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CONTENT AREA
          ══════════════════════════════════════════ */}
      <div className="px-4 lg:px-8 max-w-[1400px] mx-auto pt-4">

        {/* ─── TV Tab ─── */}
        {activeTab === "tv" && (
          <div className="space-y-6">
            {/* Hero header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <LivePulse size="md" />
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Live TV</span>
                  {totalLiveCount > 0 && <span className="text-[11px] font-bold text-red-400/60">{totalLiveCount} live</span>}
                </div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Live TV Channels</h1>
              </div>
              {lastUpdated && <span className="text-[9px] text-white/15">Updated {lastUpdated.toLocaleTimeString()}</span>}
            </div>

            {/* Loading */}
            {loading && matches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                <p className="text-sm text-white/30">Loading live data...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="text-5xl">⚠️</div>
                <p className="text-sm text-white/40">{error}</p>
                <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08]">Retry</button>
              </div>
            )}

            {/* Channel grid */}
            {!loading && filteredMatches.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredMatches.slice(0, 48).map(match => (
                  <button
                    key={match.id}
                    onClick={() => handleWatchMatch(match)}
                    className="group relative flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.03]"
                  >
                    <div className="w-16 h-16 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden">
                      {match.homeBadge ? (
                        <img src={match.homeBadge} alt="" className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <span className="text-xl font-bold" style={{ color: getSportColor(match.sport) }}>{match.homeTeam?.charAt(0) || match.title?.charAt(0) || "📺"}</span>
                      )}
                      {match.isLive && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                    </div>
                    <span className="text-[11px] font-bold text-white/70 group-hover:text-white truncate w-full text-center">{match.homeTeam || match.title}</span>
                    {match.isLive && <LivePulse />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Sports Tab ─── */}
        {activeTab === "sports" && (
          <div className="space-y-8">
            {/* Loading */}
            {loading && matches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                <p className="text-sm text-white/30">Loading live sports...</p>
                <p className="text-[10px] text-white/15">Fetching from multiple sources</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="text-5xl">⚠️</div>
                <p className="text-sm text-white/40">{error}</p>
                <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08]">Retry</button>
              </div>
            )}

            {!loading && (
              <>
                {/* ══════════════════════════════════════════
                    A. SPORTS CATEGORY CARDS (Horizontal Scroll)
                    ══════════════════════════════════════════ */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                      <span className="text-base">🏟️</span> Sports
                    </h2>
                    <div className="flex items-center gap-1">
                      <button onClick={() => scrollContainer(sportCardsRef, "left")} className="p-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button onClick={() => scrollContainer(sportCardsRef, "right")} className="p-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                  <div ref={sportCardsRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {displayCategories.filter(c => c.id !== "all").map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedSport(selectedSport === cat.id ? "all" : cat.id)}
                        className={`group flex flex-col items-center gap-2 px-5 py-4 rounded-xl min-w-[100px] flex-shrink-0 transition-all duration-200 ${
                          selectedSport === cat.id
                            ? "border-[1.5px]"
                            : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
                        }`}
                        style={{
                          ...(selectedSport === cat.id ? {
                            background: `linear-gradient(135deg, ${cat.color}20, ${cat.color}08)`,
                            borderColor: `${cat.color}50`,
                          } : {}),
                        }}
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <span className="text-[10px] font-bold text-white/70 group-hover:text-white whitespace-nowrap" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>{cat.label}</span>
                        {cat.liveCount > 0 && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">Live ({cat.liveCount})</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ══════════════════════════════════════════
                    B. POPULAR LIVE (Poster Cards)
                    ══════════════════════════════════════════ */}
                {popularLiveMatches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                        <span className="text-base">🔥</span> Popular Live
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Live ({popularLiveMatches.length})</span>
                      </h2>
                      <div className="flex items-center gap-1">
                        <button onClick={() => scrollContainer(popularRef, "left")} className="p-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={() => scrollContainer(popularRef, "right")} className="p-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>
                    <div ref={popularRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                      {popularLiveMatches.map(match => (
                        <PopularLiveCard key={match.id} match={match} onWatch={handleWatchMatch} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════
                    C. MATCHES BY TIME SECTION
                    ══════════════════════════════════════════ */}

                {/* Live Now */}
                {liveMatches.length > 0 && (
                  <MatchSection
                    title="🔴 Live Now"
                    matches={liveMatches}
                    onWatch={handleWatchMatch}
                    sportFilter={selectedSport}
                  />
                )}

                {/* Starting Soon */}
                {startingSoon.length > 0 && (
                  <MatchSection
                    title="⏰ Starting Soon"
                    matches={startingSoon}
                    onWatch={handleWatchMatch}
                    sportFilter={selectedSport}
                  />
                )}

                {/* Today */}
                {todayUpcoming.length > 0 && (
                  <MatchSection
                    title="📅 Today"
                    matches={todayUpcoming}
                    onWatch={handleWatchMatch}
                    sportFilter={selectedSport}
                  />
                )}

                {/* Later */}
                {laterMatches.length > 0 && (
                  <MatchSection
                    title="📆 Upcoming"
                    matches={laterMatches}
                    onWatch={handleWatchMatch}
                    sportFilter={selectedSport}
                  />
                )}

                {/* No matches */}
                {filteredMatches.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="text-5xl">🏟️</div>
                    <p className="text-sm text-white/40">No matches found</p>
                    <p className="text-[10px] text-white/20">Try a different sport or check back later</p>
                    <button onClick={() => { setSelectedSport("all"); setLiveOnly(false); }} className="px-4 py-2 rounded-full bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08]">Show All</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── News Tab ─── */}
        {activeTab === "news" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">📰</span>
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Sports News</h2>
            </div>

            {newsLoading && newsArticles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                <p className="text-sm text-white/30">Loading news...</p>
              </div>
            )}

            {newsArticles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {newsArticles.map(article => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            )}

            {!newsLoading && newsArticles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="text-5xl">📰</div>
                <p className="text-sm text-white/40">No news available</p>
              </div>
            )}

            {newsHasMore && newsArticles.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={() => fetchNews(newsOffset, true)}
                  disabled={newsLoading}
                  className="px-6 py-2.5 rounded-xl bg-white/[0.04] text-white/40 text-[11px] font-bold hover:bg-white/[0.06] hover:text-white/60 transition-all disabled:opacity-50"
                >
                  {newsLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click-outside handler for More dropdown */}
      {showMoreDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setShowMoreDropdown(false)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// POPULAR LIVE CARD — Poster background with LIVE badge + team logos
// ═══════════════════════════════════════════════════════════════
function PopularLiveCard({ match, onWatch }: { match: LiveMatch; onWatch: (m: LiveMatch) => void }) {
  const sportColor = getSportColor(match.sport);
  const hasScore = match.homeScore !== undefined && match.awayScore !== undefined;

  return (
    <button
      onClick={() => onWatch(match)}
      className="group relative flex-shrink-0 w-[200px] sm:w-[240px] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-pointer"
    >
      {/* Poster Background */}
      <div className="relative h-[280px] sm:h-[320px]">
        {match.poster ? (
          <img
            src={match.poster}
            alt={match.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-white/[0.01]" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* LIVE Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Score or minute badge */}
        {(hasScore || match.currentMinute) && (
          <div className="absolute top-3 right-3">
            {match.currentMinute && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/80 text-white text-[9px] font-bold">
                {match.currentMinute}&apos;
              </span>
            )}
          </div>
        )}

        {/* Eye icon + viewers placeholder */}
        <div className="absolute top-3 right-3 flex items-center gap-1" style={{ display: match.currentMinute ? "none" : "flex" }}>
          <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        {/* League badge */}
        {match.league && (
          <div className="absolute top-10 right-3">
            <div className="flex items-center gap-1">
              {match.leagueLogo && (
                <img src={match.leagueLogo} alt="" className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <span className="text-[8px] text-white/50 font-bold">{match.league}</span>
            </div>
          </div>
        )}

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Team logos */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {match.homeBadge ? (
                <img src={match.homeBadge} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/10 p-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-white/10" style={{ color: sportColor }}>{match.homeTeam?.charAt(0) || "H"}</div>
              )}
              <span className="text-[9px] text-white/60 font-medium text-center truncate w-full">{match.homeTeam}</span>
            </div>

            {/* Score or VS */}
            <div className="flex flex-col items-center">
              {hasScore ? (
                <span className="text-lg font-black text-white">
                  {match.homeScore} - {match.awayScore}
                </span>
              ) : (
                <span className="text-sm font-black text-white/20">VS</span>
              )}
            </div>

            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {match.awayBadge ? (
                <img src={match.awayBadge} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/10 p-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-white/10" style={{ color: sportColor }}>{match.awayTeam?.charAt(0) || "A"}</div>
              )}
              <span className="text-[9px] text-white/60 font-medium text-center truncate w-full">{match.awayTeam}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATCH SECTION — Grouped matches with header
// ═══════════════════════════════════════════════════════════════
function MatchSection({ title, matches, onWatch, sportFilter }: {
  title: string;
  matches: LiveMatch[];
  onWatch: (m: LiveMatch) => void;
  sportFilter: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>{title}</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40">{matches.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {matches.map(match => (
          <MatchCard key={match.id} match={match} onWatch={onWatch} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATCH CARD — Team badges, VS/score, countdown, league
// ═══════════════════════════════════════════════════════════════
function MatchCard({ match, onWatch }: { match: LiveMatch; onWatch: (m: LiveMatch) => void }) {
  const sportColor = getSportColor(match.sport);
  const sportIcon = getSportIcon(match.sport);
  const hasTeams = match.homeTeam || match.awayTeam;
  const isUpcoming = match.date > 0 && match.date > Date.now();
  const hasScore = match.homeScore !== undefined && match.awayScore !== undefined;
  const hasWfStreams = match.watchfootyStreams && match.watchfootyStreams.length > 0;

  return (
    <div
      className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer"
      onClick={() => onWatch(match)}
    >
      {/* Sport color accent */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${sportColor}, transparent)` }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{sportIcon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>{match.sportName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {match.isLive && <LivePulse />}
            {isUpcoming && !match.isLive && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 animate-pulse">SOON</span>
            )}
            {hasWfStreams && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">▶ Stream</span>
            )}
          </div>
        </div>

        {/* League */}
        {match.league && (
          <div className="flex items-center gap-1.5 mb-2">
            {match.leagueLogo && (
              <img src={match.leagueLogo} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <span className="text-[9px] text-white/30 font-medium truncate">{match.league}</span>
          </div>
        )}

        {/* Teams */}
        {hasTeams ? (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {match.homeBadge ? (
                <img src={match.homeBadge} alt={match.homeTeam} className="w-9 h-9 object-contain rounded-lg bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>{match.homeTeam?.charAt(0) || "H"}</div>
              )}
              <span className="text-[10px] text-white/60 font-medium text-center truncate w-full">{match.homeTeam}</span>
            </div>
            <div className="flex flex-col items-center px-1">
              {hasScore ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black" style={{ color: sportColor }}>{match.homeScore}</span>
                  <span className="text-[10px] text-white/20 font-bold">-</span>
                  <span className="text-sm font-black" style={{ color: sportColor }}>{match.awayScore}</span>
                </div>
              ) : isUpcoming && !match.isLive ? (
                <MiniCountdown targetDate={match.date} sportColor={sportColor} />
              ) : (
                <span className="text-[10px] font-black text-white/15 tracking-wider">VS</span>
              )}
              {match.currentMinute && (
                <span className="text-[8px] text-amber-400/60 font-bold mt-0.5">{match.currentMinute}&apos;</span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {match.awayBadge ? (
                <img src={match.awayBadge} alt={match.awayTeam} className="w-9 h-9 object-contain rounded-lg bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>{match.awayTeam?.charAt(0) || "A"}</div>
              )}
              <span className="text-[10px] text-white/60 font-medium text-center truncate w-full">{match.awayTeam}</span>
            </div>
          </div>
        ) : (
          <h3 className="text-[12px] text-white/80 font-semibold line-clamp-2 leading-snug mb-2">{match.title}</h3>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
          {match.date > 0 ? <p className="text-[9px] text-white/25">{formatMatchTime(match.date)}</p> : <span />}
          <span className="text-[9px] text-white/20">{match.apiSource === "watchfooty" ? "WatchFooty" : match.apiSource || ""}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// NEWS CARD — Article with headline, image, date, sport tag
// ═══════════════════════════════════════════════════════════════
function NewsCard({ article }: { article: NewsArticle }) {
  const sportColor = getSportColor(article.sport);
  const sportIcon = getSportIcon(article.sport);
  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : null;
  const timeAgo = publishedDate ? getTimeAgo(publishedDate) : "";

  return (
    <div className="group bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]">
      {/* Image */}
      {article.imageUrl && (
        <div className="relative h-36 overflow-hidden">
          <img
            src={article.imageUrl}
            alt={article.headline}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {/* Sport tag */}
          <span className="absolute bottom-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${sportColor}25`, color: sportColor, backdropFilter: "blur(4px)" }}>
            {sportIcon} {article.sport}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Sport tag (if no image) */}
        {!article.imageUrl && (
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block" style={{ background: `${sportColor}15`, color: sportColor }}>
            {sportIcon} {article.sport}
          </span>
        )}

        {/* Headline */}
        <h3 className="text-[13px] text-white/80 font-semibold line-clamp-2 leading-snug mb-2 group-hover:text-white transition-colors">
          {article.headline}
        </h3>

        {/* Description */}
        {article.description && (
          <p className="text-[10px] text-white/30 line-clamp-2 mb-2">{article.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {article.author && <span className="text-[9px] text-white/20">By {article.author}</span>}
          {timeAgo && <span className="text-[9px] text-white/15">{timeAgo}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Time ago helper ──
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
