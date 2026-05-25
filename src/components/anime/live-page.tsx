"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE TV & SPORTS — Beautiful Redesign
// - Featured live hero at top
// - Prominent countdown timers for upcoming matches
// - Time-based sections: Live Now, Starting Soon, Today, Later
// - Beautiful card design with team badges & sport colors
// ============================================================

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

// ── BIG Countdown Timer for hero & upcoming section ──
function BigCountdown({ targetDate, sportColor }: { targetDate: number; sportColor: string }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, total: 0 });

  useEffect(() => {
    const update = () => {
      const diff = targetDate - Date.now();
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0, total: 0 }); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
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

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-sm font-bold text-red-400 animate-pulse">STARTING NOW!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Kickoff In</span>
      <div className="flex items-center gap-1.5">
        {timeLeft.d > 0 && (
          <>
            <div className="flex flex-col items-center">
              <span className="w-12 h-12 flex items-center justify-center rounded-lg text-lg font-black" style={{ background: `${sportColor}20`, color: sportColor }}>
                {timeLeft.d}
              </span>
              <span className="text-[8px] text-white/20 mt-0.5 uppercase">days</span>
            </div>
            <span className="text-lg font-bold text-white/15 -mt-3">:</span>
          </>
        )}
        <div className="flex flex-col items-center">
          <span className="w-12 h-12 flex items-center justify-center rounded-lg text-lg font-black" style={{ background: `${sportColor}20`, color: sportColor }}>
            {pad(timeLeft.h)}
          </span>
          <span className="text-[8px] text-white/20 mt-0.5 uppercase">hrs</span>
        </div>
        <span className="text-lg font-bold text-white/15 -mt-3">:</span>
        <div className="flex flex-col items-center">
          <span className="w-12 h-12 flex items-center justify-center rounded-lg text-lg font-black" style={{ background: `${sportColor}20`, color: sportColor }}>
            {pad(timeLeft.m)}
          </span>
          <span className="text-[8px] text-white/20 mt-0.5 uppercase">min</span>
        </div>
        <span className="text-lg font-bold text-white/15 -mt-3">:</span>
        <div className="flex flex-col items-center">
          <span className="w-12 h-12 flex items-center justify-center rounded-lg text-lg font-black" style={{ background: `${sportColor}20`, color: sportColor }}>
            {pad(timeLeft.s)}
          </span>
          <span className="text-[8px] text-white/20 mt-0.5 uppercase">sec</span>
        </div>
      </div>
    </div>
  );
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

// ── Match Card ──
function MatchCard({ match, onWatch, variant = "default" }: { match: LiveMatch; onWatch: (m: LiveMatch) => void; variant?: "default" | "featured" }) {
  const sportColor = getSportColor(match.sport);
  const sportIcon = getSportIcon(match.sport);
  const hasTeams = match.homeTeam || match.awayTeam;
  const hasStreams = match.sources && match.sources.length > 0;
  const isUpcoming = match.date > 0 && match.date > Date.now();
  const isStartingSoon = isUpcoming && match.date - Date.now() < 3600000; // < 1 hour

  if (variant === "featured") {
    return (
      <div className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl overflow-hidden transition-all duration-300">
        {/* Top color bar */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${sportColor}, ${sportColor}50, transparent)` }} />

        <div className="p-6">
          {/* Sport badge + live pulse */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">{sportIcon}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>
                {match.sportName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {match.isLive && <LivePulse size="md" />}
              {match.popular && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Popular</span>}
            </div>
          </div>

          {/* Teams section */}
          {hasTeams ? (
            <div className="flex items-center gap-4 mb-5">
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {match.homeBadge ? (
                  <img src={match.homeBadge} alt={match.homeTeam} className="w-14 h-14 object-contain rounded-xl bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                    {match.homeTeam?.charAt(0) || "H"}
                  </div>
                )}
                <span className="text-xs text-white/80 font-semibold text-center truncate w-full">{match.homeTeam || "Home"}</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-3">
                {isUpcoming && !match.isLive ? (
                  <BigCountdown targetDate={match.date} sportColor={sportColor} />
                ) : (
                  <span className="text-lg font-black text-white/15 tracking-widest">VS</span>
                )}
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {match.awayBadge ? (
                  <img src={match.awayBadge} alt={match.awayTeam} className="w-14 h-14 object-contain rounded-xl bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                    {match.awayTeam?.charAt(0) || "A"}
                  </div>
                )}
                <span className="text-xs text-white/80 font-semibold text-center truncate w-full">{match.awayTeam || "Away"}</span>
              </div>
            </div>
          ) : (
            <h3 className="text-base text-white/90 font-semibold line-clamp-2 leading-snug mb-4">{match.title}</h3>
          )}

          {/* Schedule info */}
          {match.date > 0 && (
            <div className="flex items-center justify-between mb-4 px-2 py-2 rounded-lg bg-white/[0.02]">
              <p className="text-[11px] text-white/40 font-medium">{formatMatchTime(match.date)}</p>
              {isUpcoming && !hasTeams && <MiniCountdown targetDate={match.date} sportColor={sportColor} />}
            </div>
          )}

          {/* Watch button */}
          <button
            onClick={() => onWatch(match)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: match.isLive ? `linear-gradient(135deg, ${sportColor}30, ${sportColor}15)` : `linear-gradient(135deg, ${sportColor}20, ${sportColor}08)`,
              color: sportColor,
              border: `1px solid ${sportColor}30`,
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            {match.isLive ? "Watch Live" : isStartingSoon ? "Watch Soon" : "Set Reminder"}
          </button>
        </div>
      </div>
    );
  }

  // Default card (compact)
  return (
    <div
      className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer"
      onClick={() => onWatch(match)}
    >
      {/* Top accent */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${sportColor}, transparent)` }} />

      <div className="p-4">
        {/* Header: sport + status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{sportIcon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>
              {match.sportName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {match.isLive && <LivePulse />}
            {isStartingSoon && !match.isLive && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 animate-pulse">SOON</span>
            )}
          </div>
        </div>

        {/* Teams or title */}
        {hasTeams ? (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {match.homeBadge ? (
                <img src={match.homeBadge} alt={match.homeTeam} className="w-9 h-9 object-contain rounded-lg bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                  {match.homeTeam?.charAt(0) || "H"}
                </div>
              )}
              <span className="text-[10px] text-white/60 font-medium text-center truncate w-full">{match.homeTeam || "Home"}</span>
            </div>
            <div className="flex flex-col items-center px-1">
              {isUpcoming && !match.isLive ? (
                <MiniCountdown targetDate={match.date} sportColor={sportColor} />
              ) : (
                <span className="text-[10px] font-black text-white/15 tracking-wider">VS</span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {match.awayBadge ? (
                <img src={match.awayBadge} alt={match.awayTeam} className="w-9 h-9 object-contain rounded-lg bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                  {match.awayTeam?.charAt(0) || "A"}
                </div>
              )}
              <span className="text-[10px] text-white/60 font-medium text-center truncate w-full">{match.awayTeam || "Away"}</span>
            </div>
          </div>
        ) : (
          <h3 className="text-[12px] text-white/80 font-semibold line-clamp-2 leading-snug mb-2">{match.title}</h3>
        )}

        {/* Footer: time + sources */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
          {match.date > 0 ? (
            <p className="text-[9px] text-white/25">{formatMatchTime(match.date)}</p>
          ) : (
            <span />
          )}
          <span className="text-[9px] text-white/20">
            {hasStreams ? `${match.sources.length} src` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Section Header ──
function SectionHeader({ icon, title, subtitle, color, count }: { icon: string; title: string; subtitle?: string; color: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          {title}
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color: `${color}80` }}>{count}</span>
        </h2>
        {subtitle && <p className="text-[10px] text-white/20">{subtitle}</p>}
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

  const fetchData = useCallback(async () => {
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
  }, [selectedSport]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  // ── Group matches by time ──
  const now = Date.now();
  const filteredMatches = useMemo(() => matches.filter(m => selectedSport === "all" || m.sport === selectedSport), [matches, selectedSport]);

  const liveMatches = useMemo(() => filteredMatches.filter(m => m.isLive), [filteredMatches]);
  const startingSoon = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now < 3600000), [filteredMatches, now]);
  const todayUpcoming = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now >= 3600000 && m.date - now < 86400000), [filteredMatches, now]);
  const laterMatches = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now >= 86400000), [filteredMatches, now]);
  const pastMatches = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > 0 && m.date <= now), [filteredMatches, now]);

  const sportCounts: Record<string, number> = { all: matches.length };
  for (const m of matches) sportCounts[m.sport] = (sportCounts[m.sport] || 0) + 1;

  const displayCategories = defaultSportCategories.map(cat => {
    const apiSport = sports.find(s => s.id === cat.id);
    return apiSport ? { ...cat, label: apiSport.name || cat.label } : cat;
  });

  // Featured match = first live match or first upcoming match
  const featuredMatch = liveMatches[0] || startingSoon[0] || todayUpcoming[0] || null;

  return (
    <div className="min-h-screen pb-8">
      {/* ── HERO ── */}
      <div className="relative mb-8 -mx-4 lg:-mx-8 px-4 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/[0.03] via-[#7c6cf0]/[0.02] to-transparent pointer-events-none" />
        <div className="relative pt-4 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-3">
                <LivePulse size="md" />
                <span className="text-[11px] font-bold text-red-400/80 uppercase tracking-wider">Live Sports</span>
                {liveIds.size > 0 && <span className="text-[11px] font-bold text-red-300/50">{liveIds.size} live</span>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                Live TV & Sports
              </h1>
              <p className="text-sm text-white/25">
                Watch live sports with countdown timers. Multiple sources for every match.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {lastUpdated && (
                <span className="text-[9px] text-white/15">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-50">
                <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SPORT CATEGORY FILTERS ── */}
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

      {/* ── LOADING ── */}
      {loading && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
          <p className="text-sm text-white/30">Loading matches...</p>
          <p className="text-[10px] text-white/15">Fetching from streamed.pk + thesportsdb</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <p className="text-sm text-white/50">Failed to load data</p>
          <p className="text-[10px] text-white/25">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-full bg-[#7c6cf0] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-[#6b5ce0] transition-all">Try Again</button>
        </div>
      )}

      {/* ── FEATURED LIVE MATCH ── */}
      {!loading && !error && featuredMatch && (
        <div className="mb-8">
          <SectionHeader
            icon={featuredMatch.isLive ? "🔴" : "⭐"}
            title={featuredMatch.isLive ? "Featured Live Match" : "Next Up"}
            subtitle={featuredMatch.isLive ? "Watch now — it's live!" : "Don't miss this match"}
            color={featuredMatch.isLive ? "#ef4444" : "#f59e0b"}
            count={1}
          />
          <div className="max-w-2xl">
            <MatchCard match={featuredMatch} onWatch={handleWatchMatch} variant="featured" />
          </div>
        </div>
      )}

      {/* ── LIVE NOW ── */}
      {!loading && !error && liveMatches.length > 0 && (
        <div className="mb-8">
          <SectionHeader
            icon="🔴"
            title="Live Now"
            subtitle="Currently broadcasting"
            color="#ef4444"
            count={liveMatches.length}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {liveMatches.filter(m => m.id !== featuredMatch?.id).map(match => (
              <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} />
            ))}
          </div>
        </div>
      )}

      {/* ── STARTING SOON (< 1 hour) ── */}
      {!loading && !error && startingSoon.length > 0 && (
        <div className="mb-8">
          <SectionHeader
            icon="⏰"
            title="Starting Soon"
            subtitle="Less than 1 hour until kickoff"
            color="#f59e0b"
            count={startingSoon.length}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {startingSoon.filter(m => m.id !== featuredMatch?.id).map(match => (
              <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} />
            ))}
          </div>
        </div>
      )}

      {/* ── UPCOMING TODAY ── */}
      {!loading && !error && todayUpcoming.length > 0 && (
        <div className="mb-8">
          <SectionHeader
            icon="📅"
            title="Today's Schedule"
            subtitle="Matches happening later today"
            color="#7c6cf0"
            count={todayUpcoming.length}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {todayUpcoming.filter(m => m.id !== featuredMatch?.id).map(match => (
              <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} />
            ))}
          </div>
        </div>
      )}

      {/* ── LATER ── */}
      {!loading && !error && laterMatches.length > 0 && (
        <div className="mb-8">
          <SectionHeader
            icon="📆"
            title="Coming Up"
            subtitle="Upcoming in the next few days"
            color="#06b6d4"
            count={laterMatches.length}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {laterMatches.map(match => (
              <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} />
            ))}
          </div>
        </div>
      )}

      {/* ── PAST / FINISHED ── */}
      {!loading && !error && pastMatches.length > 0 && (
        <div className="mb-8">
          <SectionHeader
            icon="✅"
            title="Finished"
            subtitle="Matches that have ended"
            color="#6b7280"
            count={pastMatches.length}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 opacity-50">
            {pastMatches.map(match => (
              <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} />
            ))}
          </div>
        </div>
      )}

      {/* ── NO MATCHES ── */}
      {!loading && !error && filteredMatches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-5xl">📺</div>
          <p className="text-sm text-white/40">No matches found</p>
          <p className="text-[10px] text-white/20">Check back later or try a different sport category</p>
          <button onClick={() => setSelectedSport("all")} className="px-4 py-2 rounded-full bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08] transition-all">Show All Sports</button>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="mt-12 pt-6 border-t border-white/[0.04]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/50 border border-emerald-500/10">streamed.pk</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/50 border border-blue-500/10">thesportsdb</span>
            <span className="text-[10px] text-white/15">{matches.length} matches</span>
          </div>
          <button onClick={() => navigate({ page: "watchnow" })} className="text-[10px] text-[#7c6cf0]/50 hover:text-[#7c6cf0] transition-colors">
            ← Back to Watch Now
          </button>
        </div>
      </div>
    </div>
  );
}
