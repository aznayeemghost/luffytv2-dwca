"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE WATCH PAGE — Simple & FAST: Direct iframe, no proxy, no extraction
// How other sites do it: iframe the embed URL directly. That's it.
// + Countdown timer for upcoming matches
// + Multiple embed providers
// ============================================================

interface StreamInfo {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers?: number;
  provider?: string; // "embedsports" | "streamed" | etc
}

interface MatchData {
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
  sources: { source: string; id: string }[];
  isLive: boolean;
}

interface LiveWatchProps {
  matchId: string;
  matchTitle: string;
  matchSport: string;
  matchSportName: string;
  matchHomeTeam: string;
  matchAwayTeam: string;
  matchHomeBadge: string;
  matchAwayBadge: string;
  matchPoster: string;
  matchPopular: boolean;
  matchSources: string;
  matchDate: number;
}

const sportIcons: Record<string, string> = {
  football: "⚽", basketball: "🏀", "american-football": "🏈", hockey: "🏒",
  baseball: "⚾", tennis: "🎾", fight: "🥊", "motor-sports": "🏎️",
  rugby: "🏉", golf: "⛳", cricket: "🏏", billiards: "🎱",
  afl: "🏈", darts: "🎯", other: "📺",
};

const sportColors: Record<string, string> = {
  football: "#22c55e", basketball: "#ef4444", "american-football": "#dc2626", hockey: "#06b6d4",
  baseball: "#3b82f6", tennis: "#a855f7", fight: "#f97316", "motor-sports": "#eab308",
  rugby: "#10b981", golf: "#84cc16", cricket: "#f59e0b", billiards: "#8b5cf6",
  afl: "#14b8a6", darts: "#f43f5e", other: "#6b7280",
};

const sportNames: Record<string, string> = {
  football: "Football", basketball: "Basketball", "american-football": "American Football",
  hockey: "Hockey", baseball: "Baseball", tennis: "Tennis", fight: "Fight / UFC / Boxing",
  "motor-sports": "Motor Sports", rugby: "Rugby", golf: "Golf", cricket: "Cricket",
  billiards: "Billiards", afl: "AFL", darts: "Darts", other: "Other",
};

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

// ── COUNTDOWN TIMER COMPONENT ──
function CountdownTimer({ targetDate, sportColor }: { targetDate: number; sportColor: string }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, total: 0 });

  useEffect(() => {
    const update = () => {
      const diff = targetDate - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, total: 0 });
        return;
      }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        total: diff,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <span className="text-sm font-bold text-red-400">STARTING NOW!</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  if (timeLeft.d > 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/30">Starts in</span>
        <div className="flex items-center gap-1">
          <span className="px-2 py-1 rounded-lg text-sm font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{timeLeft.d}d</span>
          <span className="px-2 py-1 rounded-lg text-sm font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.h)}h</span>
          <span className="px-2 py-1 rounded-lg text-sm font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.m)}m</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/30">Starts in</span>
      <div className="flex items-center gap-1">
        <span className="px-2 py-1 rounded-lg text-sm font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.h)}</span>
        <span className="text-sm font-bold text-white/20">:</span>
        <span className="px-2 py-1 rounded-lg text-sm font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.m)}</span>
        <span className="text-sm font-bold text-white/20">:</span>
        <span className="px-2 py-1 rounded-lg text-sm font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.s)}</span>
      </div>
    </div>
  );
}

export default function LiveWatchPage(props: LiveWatchProps) {
  const navigate = useAppStore(s => s.navigate);
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [activeStream, setActiveStream] = useState<StreamInfo | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Build match data from props or fetch it
  const hasFullData = props.matchTitle && props.matchSources && props.matchSources !== "[]";

  useEffect(() => {
    if (hasFullData) {
      const sources = (() => {
        try { return JSON.parse(props.matchSources || "[]"); } catch { return []; }
      })();
      setMatchData({
        id: props.matchId,
        title: props.matchTitle,
        sport: props.matchSport,
        sportName: props.matchSportName || sportNames[props.matchSport] || props.matchSport,
        date: props.matchDate,
        poster: props.matchPoster,
        popular: props.matchPopular,
        homeTeam: props.matchHomeTeam,
        awayTeam: props.matchAwayTeam,
        homeBadge: props.matchHomeBadge,
        awayBadge: props.matchAwayBadge,
        sources,
        isLive: true,
      });
      return;
    }

    if (!props.matchId) return;
    setLoadingMatch(true);

    const fetchMatchData = async () => {
      try {
        const res = await fetch("/api/live");
        if (res.ok) {
          const data = await res.json();
          const match = (data.matches || []).find((m: any) => m.id === props.matchId);
          if (match) { setMatchData(match); setLoadingMatch(false); return; }
        }
        const liveRes = await fetch("/api/live?filter=live");
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          const match = (liveData.matches || []).find((m: any) => m.id === props.matchId);
          if (match) { setMatchData({ ...match, isLive: true }); setLoadingMatch(false); return; }
        }
        setMatchData({
          id: props.matchId, title: props.matchTitle || props.matchId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          sport: props.matchSport || "other", sportName: props.matchSportName || sportNames[props.matchSport] || "Sports",
          date: props.matchDate || 0, poster: "", popular: false,
          homeTeam: "", awayTeam: "", homeBadge: "", awayBadge: "", sources: [], isLive: false,
        });
      } catch {
        setMatchData({
          id: props.matchId, title: props.matchId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          sport: props.matchSport || "other", sportName: "Sports", date: 0, poster: "", popular: false,
          homeTeam: "", awayTeam: "", homeBadge: "", awayBadge: "", sources: [], isLive: false,
        });
      }
      setLoadingMatch(false);
    };
    fetchMatchData();
  }, [props.matchId, hasFullData]);

  // Fetch streams — FAST, no M3U8 extraction
  useEffect(() => {
    if (!matchData) return;
    const fetchStreams = async () => {
      setLoadingStreams(true);
      try {
        const sourcesParam = JSON.stringify(matchData.sources || []);
        const res = await fetch(`/api/live/embed?matchId=${encodeURIComponent(matchData.id)}&sources=${encodeURIComponent(sourcesParam)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.streams?.length > 0) {
            setStreams(data.streams);
            setActiveStream(data.streams[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch streams:", err);
      }
      setLoadingStreams(false);
    };
    fetchStreams();
  }, [matchData?.id, matchData?.sources?.length]);

  // Reset iframe state when stream changes
  useEffect(() => { setIframeLoaded(false); }, [activeStream, iframeKey]);

  const switchStream = (stream: StreamInfo) => {
    setActiveStream(stream);
    setIframeKey(prev => prev + 1);
  };

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      await playerContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Derived data
  const m = matchData;
  const sportIcon = sportIcons[m?.sport || "other"] || "📺";
  const sportColor = sportColors[m?.sport || "other"] || "#6b7280";
  const hasTeams = m?.homeTeam || m?.awayTeam;
  const matchTime = m?.date ? formatMatchTime(m.date) : "";
  const isLive = m?.isLive || (m?.date ? m.date <= Date.now() && m.date > Date.now() - 10800000 : false);
  const isUpcoming = m?.date ? m.date > Date.now() : false;
  const embedUrl = activeStream?.embedUrl || "";

  return (
    <div className="min-h-screen flex flex-col -mx-4 lg:-mx-8 -mt-[75px] pt-0">
      {/* ── FULL-WIDTH PLAYER ── */}
      <div ref={playerContainerRef} className="relative w-full bg-black" style={{ aspectRatio: isFullscreen ? "auto" : "16/9", minHeight: isFullscreen ? "100vh" : "300px" }}>

        {/* Loading state */}
        {loadingStreams || loadingMatch ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
            <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
            <p className="text-sm text-white/30">{loadingMatch ? "Loading match info..." : "Resolving streams..."}</p>
          </div>
        ) : !embedUrl ? (
          /* No stream available — show countdown or message */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-black via-[#0a0a0f] to-black">
            <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${sportColor}15, transparent 70%)` }} />
            <div className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `${sportColor}10` }}>
              <span className="text-4xl">{sportIcon}</span>
            </div>
            <p className="text-lg font-bold text-white/60">{m?.title || "Match"}</p>
            {isUpcoming && m?.date ? (
              <div className="flex flex-col items-center gap-3">
                <CountdownTimer targetDate={m.date} sportColor={sportColor} />
                <p className="text-xs text-white/25">{matchTime}</p>
                <p className="text-[10px] text-white/15">Stream will be available when the match starts</p>
              </div>
            ) : (
              <p className="text-sm text-white/30">No streams available for this match</p>
            )}
          </div>
        ) : !iframeLoaded ? (
          /* Iframe loading */
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black">
            <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
            <p className="text-sm text-white/30">Loading player...</p>
            <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/15 border border-emerald-500/10 transition-all">
              Open in New Tab (Instant)
            </a>
          </div>
        ) : null}

        {/* ── DIRECT IFRAME — No proxy, no extraction, just iframe the embed URL ── */}
        {embedUrl && (
          <iframe
            key={iframeKey}
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ border: "none", zIndex: iframeLoaded ? 1 : 0 }}
            onLoad={() => setIframeLoaded(true)}
          />
        )}

        {/* Overlay controls when iframe is loaded */}
        {iframeLoaded && embedUrl && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none">
            <div className="flex items-end justify-between pointer-events-auto">
              <div className="flex items-center gap-3">
                {isLive && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
                <div>
                  <p className="text-white text-sm font-bold leading-tight">{m?.title || "Live Match"}</p>
                  <p className="text-white/40 text-[10px]">{sportIcon} {m?.sportName || m?.sport}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-all" title="Open in new tab">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                </a>
                <button onClick={toggleFullscreen} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-all">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    {isFullscreen ? <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /> : <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Content below player ── */}
      <div className="px-4 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Server selection + match details */}
        <div className="flex-1 min-w-0">
          {/* Back button */}
          <button
            onClick={() => navigate({ page: "live" } as any)}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
            <span className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Back to Live</span>
          </button>

          {/* Match header card */}
          {m && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                    {m.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>
                      {sportIcon} {m.sportName || m.sport}
                    </span>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE NOW
                      </span>
                    ) : isUpcoming ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                        UPCOMING
                      </span>
                    ) : null}
                    {m.popular && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">POPULAR</span>
                    )}
                  </div>
                </div>
                {matchTime && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-white/50">{matchTime}</p>
                  </div>
                )}
              </div>

              {/* COUNTDOWN TIMER for upcoming matches */}
              {isUpcoming && m.date > 0 && (
                <div className="mb-4 p-4 rounded-xl" style={{ background: `${sportColor}08`, border: `1px solid ${sportColor}15` }}>
                  <CountdownTimer targetDate={m.date} sportColor={sportColor} />
                </div>
              )}

              {/* Teams with badges */}
              {hasTeams && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      {m.homeBadge ? (
                        <img src={m.homeBadge} alt={m.homeTeam} className="w-16 h-16 object-contain rounded-xl bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                          {m.homeTeam?.charAt(0) || "H"}
                        </div>
                      )}
                      <span className="text-sm text-white/80 font-semibold text-center truncate w-full">{m.homeTeam || "Home"}</span>
                    </div>
                    <div className="px-6 flex flex-col items-center gap-1">
                      <span className="text-lg font-black text-white/15 tracking-widest">VS</span>
                      {isLive && <span className="text-[9px] text-red-400/60 font-bold">LIVE</span>}
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      {m.awayBadge ? (
                        <img src={m.awayBadge} alt={m.awayTeam} className="w-16 h-16 object-contain rounded-xl bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                          {m.awayTeam?.charAt(0) || "A"}
                        </div>
                      )}
                      <span className="text-sm text-white/80 font-semibold text-center truncate w-full">{m.awayTeam || "Away"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Server selection */}
          <div className="mb-6">
            <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              Servers ({streams.length} available)
            </h3>
            <div className="flex flex-wrap gap-2">
              {streams.map((stream, idx) => (
                <button
                  key={`${stream.id}-${stream.streamNo}-${idx}`}
                  onClick={() => switchStream(stream)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                    activeStream?.embedUrl === stream.embedUrl
                      ? "bg-[#7c6cf0] text-white shadow-[0_0_16px_rgba(124,108,240,0.3)]"
                      : "bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.06] border border-white/[0.06]"
                  }`}
                  style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path d="M2 12h4m12 0h4M12 2v4m0 12v4" /></svg>
                  {stream.source?.charAt(0).toUpperCase()}{stream.source?.slice(1)} {stream.streamNo}
                  {stream.hd && <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black">HD</span>}
                  {stream.language && <span className="text-[9px] text-white/30">{stream.language}</span>}
                </button>
              ))}
              {loadingStreams && (
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <div className="w-4 h-4 rounded-full border border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                  <span className="text-[11px] text-white/30">Resolving...</span>
                </div>
              )}
              <button
                onClick={() => setIframeKey(prev => prev + 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-white/[0.04] text-white/30 hover:text-white/50 hover:bg-white/[0.06] border border-white/[0.06] transition-all"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" /></svg>
                Reload
              </button>
              {embedUrl && (
                <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-emerald-500/10 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/10 transition-all" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                  Open in New Tab
                </a>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              Stream Tips
            </h4>
            <div className="space-y-1.5 text-[11px] text-white/20 leading-relaxed">
              <p>• If stream doesn&apos;t load in the player, click <strong className="text-emerald-400/60">Open in New Tab</strong> — this always works</p>
              <p>• Try different servers (Delta, Admin, Golf, Echo)</p>
              <p>• Some servers take 5-10 seconds to start</p>
              <p>• Use fullscreen for the best experience</p>
            </div>
          </div>
        </div>

        {/* Right: Match info card */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${sportColor}, transparent)` }} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{sportIcon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>
                  {m?.sportName || m?.sport || "Sports"}
                </span>
                {isLive ? (
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                  </span>
                ) : isUpcoming ? (
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                    UPCOMING
                  </span>
                ) : null}
              </div>

              {m?.poster && (
                <div className="flex justify-center mb-4">
                  <img src={m.poster} alt="" className="w-full h-40 rounded-xl object-cover bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}

              <h2 className="text-lg font-bold text-white mb-3 text-center leading-snug" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                {m?.title || "Live Match"}
              </h2>

              {hasTeams && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                      {m!.homeBadge ? (
                        <img src={m!.homeBadge} alt={m!.homeTeam} className="w-12 h-12 object-contain rounded-lg bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                          {m!.homeTeam?.charAt(0) || "H"}
                        </div>
                      )}
                      <span className="text-[11px] text-white/70 font-medium text-center truncate w-full">{m!.homeTeam || "Home"}</span>
                    </div>
                    <div className="px-3 flex flex-col items-center">
                      <span className="text-xs font-black text-white/20 tracking-wider">VS</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                      {m!.awayBadge ? (
                        <img src={m!.awayBadge} alt={m!.awayTeam} className="w-12 h-12 object-contain rounded-lg bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>
                          {m!.awayTeam?.charAt(0) || "A"}
                        </div>
                      )}
                      <span className="text-[11px] text-white/70 font-medium text-center truncate w-full">{m!.awayTeam || "Away"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Countdown in sidebar */}
              {isUpcoming && m?.date && m.date > 0 && (
                <div className="mb-4 p-3 rounded-xl" style={{ background: `${sportColor}08`, border: `1px solid ${sportColor}12` }}>
                  <CountdownTimer targetDate={m.date} sportColor={sportColor} />
                </div>
              )}

              <div className="space-y-2">
                {matchTime && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-white/25">Schedule</span>
                    <span className="text-[11px] text-white/60 font-medium">{matchTime}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-white/25">Status</span>
                  <span className="text-[11px] font-medium" style={{ color: isLive ? "#ef4444" : isUpcoming ? "#f59e0b" : "#6b7280" }}>
                    {isLive ? "Live Now" : isUpcoming ? "Upcoming" : "Ended"}
                  </span>
                </div>
                {streams.length > 0 && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-white/25">Servers</span>
                    <span className="text-[11px] text-white/60 font-medium">{streams.length} available</span>
                  </div>
                )}
                {m?.sources && m.sources.length > 0 && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-white/25">Sources</span>
                    <span className="text-[11px] text-white/60 font-medium">{m.sources.map(s => s.source).join(", ")}</span>
                  </div>
                )}
                {activeStream && (
                  <>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-white/25">Quality</span>
                      <span className="text-[11px] text-white/60 font-medium">{activeStream.hd ? "HD" : "SD"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-white/25">Language</span>
                      <span className="text-[11px] text-white/60 font-medium">{activeStream.language || "English"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-white/25">Active Server</span>
                      <span className="text-[11px] text-white/60 font-medium">{activeStream.source} #{activeStream.streamNo}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => navigate({ page: "live" } as any)} className="py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Browse More</button>
            {embedUrl ? (
              <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-[11px] font-bold text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/15 transition-all text-center" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Watch in Tab</a>
            ) : (
              <button onClick={() => setIframeKey(prev => prev + 1)} className="py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Refresh</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
