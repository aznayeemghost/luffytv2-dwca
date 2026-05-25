"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";

// ============================================================
// SPORT CATEGORIES with icons and colors
// ============================================================
const defaultSportCategories = [
  { id: "all", label: "All", icon: "🏟️", color: "#7c6cf0" },
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

interface MatchSource {
  source: string;
  id: string;
}

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
}

interface SportCategory {
  id: string;
  name: string;
}

function getSportColor(sport: string): string {
  const cat = defaultSportCategories.find(c => c.id === sport);
  return cat?.color || "#6b7280";
}

function getSportIcon(sport: string): string {
  const cat = defaultSportCategories.find(c => c.id === sport);
  return cat?.icon || "📺";
}

function LivePulse() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-wider">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      Live
    </span>
  );
}

function formatMatchTime(timestamp: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
}

// ── Mini Countdown for match cards ──
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

function MatchCard({ match, onWatch }: { match: LiveMatch; onWatch: (m: LiveMatch) => void }) {
  const sportColor = getSportColor(match.sport);
  const sportIcon = getSportIcon(match.sport);
  const hasTeams = match.homeTeam || match.awayTeam;
  const hasStreams = match.sources && match.sources.length > 0;
  const isUpcoming = match.date > 0 && match.date > Date.now();

  return (
    <div className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20">
      {match.poster ? (
        <div className="relative h-28 overflow-hidden">
          <img src={match.poster} alt={match.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md" style={{ background: `${sportColor}30`, color: sportColor }}>
              {sportIcon} {match.sportName}
            </span>
            {match.isLive && <LivePulse />}
          </div>
          {match.popular && (
            <div className="absolute top-2 right-2">
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 backdrop-blur-md">Popular</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${sportColor}, transparent)` }} />
      )}

      <div className={`${match.poster ? "-mt-6 relative" : ""} p-4 sm:p-5`}>
        {!match.poster && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{sportIcon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>
                {match.sportName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {match.isLive && <LivePulse />}
              {match.popular && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Popular</span>}
            </div>
          </div>
        )}

        {match.date > 0 && (
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-white/30 font-medium">{formatMatchTime(match.date)}</p>
            {isUpcoming && <MiniCountdown targetDate={match.date} sportColor={sportColor} />}
          </div>
        )}

        {hasTeams ? (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {match.homeBadge ? (
                <img src={match.homeBadge} alt={match.homeTeam} className="w-10 h-10 object-contain rounded-lg bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                  {match.homeTeam?.charAt(0) || "H"}
                </div>
              )}
              <span className="text-[11px] text-white/70 font-medium text-center truncate w-full">{match.homeTeam || "Home"}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-2">
              <span className="text-[10px] font-black text-white/20 tracking-wider">VS</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {match.awayBadge ? (
                <img src={match.awayBadge} alt={match.awayTeam} className="w-10 h-10 object-contain rounded-lg bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                  {match.awayTeam?.charAt(0) || "A"}
                </div>
              )}
              <span className="text-[11px] text-white/70 font-medium text-center truncate w-full">{match.awayTeam || "Away"}</span>
            </div>
          </div>
        ) : (
          <h3 className="text-sm text-white/90 font-semibold line-clamp-2 leading-snug mb-3">{match.title}</h3>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-[10px] text-white/25">
            {hasStreams ? `${match.sources.length} source${match.sources.length !== 1 ? "s" : ""}` : match.apiSource === "thesportsdb" ? "Schedule only" : "Stream available"}
          </span>
          <button
            onClick={() => onWatch(match)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#7c6cf0] text-white hover:bg-[#6b5ce0] hover:shadow-[0_0_16px_rgba(124,108,240,0.4)] transition-all"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            {hasStreams ? "Watch" : "Details"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LIVE PAGE
// ============================================================
export default function LivePage() {
  const navigate = useAppStore(s => s.navigate);
  const [selectedSport, setSelectedSport] = useState("all");
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [sports, setSports] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "live" | "upcoming">("all");
  const [apiSources, setApiSources] = useState<{ streamed: number; thesportsdb: number }>({ streamed: 0, thesportsdb: 0 });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [liveRes, todayRes] = await Promise.all([
        fetch("/api/live?filter=live" + (selectedSport !== "all" ? `&sport=${encodeURIComponent(selectedSport)}` : "")),
        fetch("/api/live" + (selectedSport !== "all" ? `?sport=${encodeURIComponent(selectedSport)}` : "")),
      ]);

      if (!liveRes.ok && !todayRes.ok) throw new Error("API failed");

      const liveData = liveRes.ok ? await liveRes.json() : { matches: [], sports: [] };
      const todayData = todayRes.ok ? await todayRes.json() : { matches: [], sports: [] };

      // Track API sources
      if (todayData.sources) setApiSources(todayData.sources);

      const liveMatchIds = new Set<string>((liveData.matches || []).map((m: LiveMatch) => m.id));
      setLiveIds(liveMatchIds);

      const todayMatches: LiveMatch[] = (todayData.matches || []).map((m: LiveMatch) => ({
        ...m,
        isLive: liveMatchIds.has(m.id),
      }));

      for (const m of liveData.matches || []) {
        if (!todayMatches.find(t => t.id === m.id)) {
          todayMatches.push({ ...m, isLive: true });
        }
      }

      todayMatches.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        return a.date - b.date;
      });

      setMatches(todayMatches);
      setSports(todayData.sports || liveData.sports || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load live data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedSport]);
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [selectedSport]);

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
    } as any);
  };

  const filteredMatches = matches.filter(m => {
    if (selectedSport !== "all" && m.sport !== selectedSport) return false;
    if (viewMode === "live" && !m.isLive) return false;
    if (viewMode === "upcoming" && m.isLive) return false;
    return true;
  });

  const liveMatches = filteredMatches.filter(m => m.isLive);
  const upcomingMatches = filteredMatches.filter(m => !m.isLive);

  const sportCounts: Record<string, number> = { all: matches.length };
  for (const m of matches) sportCounts[m.sport] = (sportCounts[m.sport] || 0) + 1;

  const displayCategories = defaultSportCategories.map(cat => {
    const apiSport = sports.find(s => s.id === cat.id);
    return apiSport ? { ...cat, label: apiSport.name || cat.label } : cat;
  });

  return (
    <div className="min-h-screen pb-8">
      {/* Hero */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
        <div className="relative pt-6 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Live Sports</span>
            {liveIds.size > 0 && <span className="text-[11px] font-bold text-red-300/60">{liveIds.size} live</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
            Live TV & Sports
          </h1>
          <p className="text-sm text-white/30 max-w-md mx-auto">
            Watch live sports from around the world. Multiple sources, team badges, native player.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            {lastUpdated && <p className="text-[10px] text-white/15">Updated {lastUpdated.toLocaleTimeString()} — Auto-refreshes 60s</p>}
          </div>
          {/* API source badges */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/60 border border-emerald-500/10">
              streamed.pk: {apiSources.streamed} matches
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/60 border border-blue-500/10">
              thesportsdb: {apiSources.thesportsdb} matches
            </span>
          </div>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-2 mb-6">
        {([
          { id: "all" as const, label: "All Matches", count: matches.length },
          { id: "live" as const, label: "Live Now", count: liveIds.size },
          { id: "upcoming" as const, label: "Upcoming", count: matches.length - liveIds.size },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all ${
              viewMode === tab.id
                ? tab.id === "live"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                  : "bg-[#7c6cf0] text-white shadow-[0_0_16px_rgba(124,108,240,0.3)]"
                : "bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            {tab.id === "live" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            {tab.label}
            <span className="text-[9px] opacity-60">{tab.count}</span>
          </button>
        ))}
        <button onClick={fetchData} disabled={loading} className="ml-auto p-2 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-50 flex-shrink-0">
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" /></svg>
        </button>
      </div>

      {/* Sport category filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide -mx-1 px-1">
        {displayCategories.filter(cat => cat.id === "all" || sportCounts[cat.id]).map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedSport(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedSport === cat.id ? "text-white shadow-[0_0_12px_rgba(0,0,0,0.3)]" : "bg-white/[0.03] text-white/35 hover:text-white/55 hover:bg-white/[0.05] border border-white/[0.04]"
            }`}
            style={{
              fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
              ...(selectedSport === cat.id ? { background: `linear-gradient(135deg, ${cat.color}30, ${cat.color}15)`, border: `1px solid ${cat.color}40` } : {}),
            }}
          >
            <span className="text-sm">{cat.icon}</span>
            {cat.label}
            {sportCounts[cat.id] && <span className="text-[9px] opacity-50">{sportCounts[cat.id]}</span>}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
          <p className="text-sm text-white/30">Loading matches...</p>
          <div className="flex gap-2">
            <span className="text-[10px] text-white/15">Fetching from streamed.pk + thesportsdb</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <p className="text-sm text-white/50">Failed to load data</p>
          <p className="text-[10px] text-white/25">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-full bg-[#7c6cf0] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-[#6b5ce0] transition-all">Try Again</button>
        </div>
      )}

      {/* LIVE section */}
      {!loading && !error && liveMatches.length > 0 && viewMode !== "upcoming" && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Live Now</h2>
            </div>
            <span className="text-[11px] text-red-400/60 font-bold">{liveMatches.length} match{liveMatches.length !== 1 ? "es" : ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveMatches.map(match => <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} />)}
          </div>
        </div>
      )}

      {/* UPCOMING section */}
      {!loading && !error && upcomingMatches.length > 0 && viewMode !== "live" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-white/70" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Upcoming</h2>
            <span className="text-[11px] text-white/30 font-bold">{upcomingMatches.length} match{upcomingMatches.length !== 1 ? "es" : ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMatches.map(match => <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} />)}
          </div>
        </div>
      )}

      {/* No matches */}
      {!loading && !error && filteredMatches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-4xl">📺</div>
          <p className="text-sm text-white/40">No matches found</p>
          <p className="text-[10px] text-white/20">Check back later or try a different category</p>
          <button onClick={() => { setSelectedSport("all"); setViewMode("all"); }} className="px-4 py-2 rounded-full bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08] transition-all">Show All</button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-white/[0.04]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-white/15">Data from: streamed.pk + thesportsdb — {matches.length} matches</p>
          </div>
          <button onClick={() => navigate({ page: "watchnow" })} className="text-[10px] text-[#7c6cf0]/50 hover:text-[#7c6cf0] transition-colors">← Back to Watch Now</button>
        </div>
      </div>
    </div>
  );
}
