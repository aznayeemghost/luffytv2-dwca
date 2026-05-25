"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "./store";
import Hls from "hls.js";

// ============================================================
// LIVE WATCH PAGE — hls.js Native Player (NO IFRAME)
// Primary: Extract M3U8 → play with hls.js → proxy through Edge if CORS blocked
// Fallback: Open embed URL in new tab (always works)
// ============================================================

interface StreamInfo {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers?: number;
  provider?: string;
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
  matchSportsrcCategory?: string;
  matchSportsrcId?: string;
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

// ── COUNTDOWN TIMER ──
function CountdownTimer({ targetDate, sportColor }: { targetDate: number; sportColor: string }) {
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
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (timeLeft.total <= 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
        </span>
        <span className="text-xl font-black text-red-400 animate-pulse">MATCH STARTING!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-bold">Kickoff In</span>
      <div className="flex items-center gap-2">
        {timeLeft.d > 0 && (
          <>
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{timeLeft.d}</div>
              <span className="text-[8px] text-white/20 uppercase">days</span>
            </div>
            <span className="text-xl font-black text-white/10 -mt-3">:</span>
          </>
        )}
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.h)}</div>
          <span className="text-[8px] text-white/20 uppercase">hrs</span>
        </div>
        <span className="text-xl font-black text-white/10 -mt-3">:</span>
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.m)}</div>
          <span className="text-[8px] text-white/20 uppercase">min</span>
        </div>
        <span className="text-xl font-black text-white/10 -mt-3">:</span>
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-black" style={{ background: `${sportColor}20`, color: sportColor }}>{pad(timeLeft.s)}</div>
          <span className="text-[8px] text-white/20 uppercase">sec</span>
        </div>
      </div>
    </div>
  );
}

export default function LiveWatchPage(props: LiveWatchProps) {
  const navigate = useAppStore(s => s.navigate);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [activeStream, setActiveStream] = useState<StreamInfo | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [playerState, setPlayerState] = useState<"loading" | "playing" | "error" | "countdown" | "no-stream">("loading");
  const [playerError, setPlayerError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [m3u8Url, setM3u8Url] = useState("");
  const [useProxy, setUseProxy] = useState(true);
  const [matchData, setMatchData] = useState<any>(null);

  const sportIcon = sportIcons[props.matchSport || "other"] || "📺";
  const sportColor = sportColors[props.matchSport || "other"] || "#6b7280";
  const isUpcoming = props.matchDate ? props.matchDate > Date.now() : false;
  const matchTime = props.matchDate ? formatMatchTime(props.matchDate) : "";

  // Build match data from props
  useEffect(() => {
    const sources = (() => { try { return JSON.parse(props.matchSources || "[]"); } catch { return []; } })();
    setMatchData({
      id: props.matchId,
      title: props.matchTitle,
      sport: props.matchSport,
      sportName: props.matchSportName || sportNames[props.matchSport] || props.matchSport,
      date: props.matchDate,
      homeTeam: props.matchHomeTeam,
      awayTeam: props.matchAwayTeam,
      homeBadge: props.matchHomeBadge,
      awayBadge: props.matchAwayBadge,
      sources,
    });
  }, [props.matchId]);

  // Fetch stream servers from embed API
  useEffect(() => {
    if (!props.matchId) return;
    const fetchStreams = async () => {
      setLoadingStreams(true);
      try {
        const sourcesParam = props.matchSources || "[]";
        const cat = props.matchSportsrcCategory || props.matchSport || "";
        const srcId = props.matchSportsrcId || props.matchId || "";
        const res = await fetch(`/api/live/embed?matchId=${encodeURIComponent(props.matchId)}&sources=${encodeURIComponent(sourcesParam)}&sportsrcCategory=${encodeURIComponent(cat)}&sportsrcId=${encodeURIComponent(srcId)}`);
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
  }, [props.matchId, props.matchSources]);

  // When activeStream changes, try to extract M3U8 and play with hls.js
  useEffect(() => {
    if (!activeStream?.embedUrl) {
      if (isUpcoming) setPlayerState("countdown");
      else setPlayerState("no-stream");
      return;
    }

    const tryPlayStream = async () => {
      setPlayerState("loading");
      setPlayerError("");

      // Step 1: Extract M3U8 URL from embed page
      try {
        const res = await fetch(`/api/live/m3u8?embedUrl=${encodeURIComponent(activeStream.embedUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.m3u8Url) {
            setM3u8Url(data.m3u8Url);
            playWithHls(data.m3u8Url, true); // try with proxy first
            return;
          }
        }
      } catch {}

      // M3U8 extraction failed — try direct embed (might work for some providers)
      // If that fails, user can open in new tab
      setPlayerState("error");
      setPlayerError("Could not extract video stream. Click 'Watch in New Tab' below.");
    };

    tryPlayStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStream]);

  // Play M3U8 with hls.js
  const playWithHls = useCallback((url: string, proxy: boolean) => {
    if (!videoRef.current) return;

    // Destroy previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Route through edge proxy if CORS is an issue
    const finalUrl = proxy
      ? `/api/live/proxy/${url.replace("https://", "https://").replace("http://", "http://")}`
      : url;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr, url) => {
          xhr.setRequestHeader("Referer", "https://embedsports.top/");
        },
      });
      hlsRef.current = hls;

      hls.loadSource(finalUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play().catch(() => {});
        setPlayerState("playing");
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (proxy && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Proxy failed, try without proxy (direct M3U8)
            playWithHls(url, false);
            return;
          }
          setPlayerState("error");
          setPlayerError("Stream failed to load. Try a different server or open in new tab.");
        }
      });
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      videoRef.current.src = finalUrl;
      videoRef.current.addEventListener("loadedmetadata", () => {
        videoRef.current?.play().catch(() => {});
        setPlayerState("playing");
      });
    }
  }, []);

  const switchStream = (stream: StreamInfo) => {
    setActiveStream(stream);
    setM3u8Url("");
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

  const hasTeams = props.matchHomeTeam || props.matchAwayTeam;

  return (
    <div className="min-h-screen flex flex-col -mx-4 lg:-mx-8 -mt-[75px] pt-0">
      {/* ── PLAYER AREA ── */}
      <div
        ref={playerContainerRef}
        className="relative w-full bg-black"
        style={{ aspectRatio: isFullscreen ? "auto" : "16/9", minHeight: isFullscreen ? "100vh" : "280px" }}
      >
        {/* Hidden video element for hls.js */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: playerState === "playing" ? 10 : 0 }}
          playsInline
          controls
        />

        {/* Loading overlay */}
        {playerState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20">
            <div className="w-14 h-14 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
            <p className="text-sm text-white/40">Extracting stream...</p>
            <p className="text-[10px] text-white/20">Getting M3U8 from embed page</p>
          </div>
        )}

        {/* Countdown for upcoming */}
        {playerState === "countdown" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-black via-[#0a0a0f] to-black z-20">
            <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 40%, ${sportColor}15, transparent 60%)` }} />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: `${sportColor}10`, boxShadow: `0 0 40px ${sportColor}10` }}>
                <span className="text-5xl">{sportIcon}</span>
              </div>
              <h2 className="text-xl font-bold text-white/80">{props.matchTitle}</h2>
              <CountdownTimer targetDate={props.matchDate} sportColor={sportColor} />
              <p className="text-xs text-white/20">{matchTime}</p>
            </div>
          </div>
        )}

        {/* Error / no stream */}
        {playerState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black z-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-500/10">
              <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-white/50">Stream could not load inline</p>
            <p className="text-[10px] text-white/20 max-w-xs text-center">{playerError || "Try opening in a new tab — this always works!"}</p>
            {activeStream?.embedUrl && (
              <a
                href={activeStream.embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 px-6 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-bold hover:bg-emerald-500/25 border border-emerald-500/20 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Watch in New Tab
              </a>
            )}
          </div>
        )}

        {/* No stream available */}
        {playerState === "no-stream" && !isUpcoming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5">
              <span className="text-3xl">{sportIcon}</span>
            </div>
            <p className="text-sm text-white/40">No streams available</p>
            <button onClick={() => navigate({ page: "live" } as any)} className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/40 text-[11px] font-bold hover:bg-white/[0.08] transition-all">Browse Matches</button>
          </div>
        )}

        {/* Player controls overlay */}
        {playerState === "playing" && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            {activeStream?.embedUrl && (
              <a href={activeStream.embedUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-all" title="Open in new tab">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
              </a>
            )}
            <button onClick={toggleFullscreen} className="p-2 rounded-lg bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                {isFullscreen ? <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /> : <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />}
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── BELOW PLAYER ── */}
      <div className="px-4 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {/* Back */}
          <button onClick={() => navigate({ page: "live" } as any)} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Back to Live</span>
          </button>

          {/* Match info card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden mb-6">
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${sportColor}, ${sportColor}50, transparent)` }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1.5" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>{props.matchTitle}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>{sportIcon} {props.matchSportName || props.matchSport}</span>
                    {isUpcoming ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">UPCOMING</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                      </span>
                    )}
                  </div>
                </div>
                {matchTime && <p className="text-xs text-white/40 flex-shrink-0">{matchTime}</p>}
              </div>

              {isUpcoming && props.matchDate > 0 && (
                <div className="mb-5 p-5 rounded-xl flex justify-center" style={{ background: `${sportColor}08`, border: `1px solid ${sportColor}15` }}>
                  <CountdownTimer targetDate={props.matchDate} sportColor={sportColor} />
                </div>
              )}

              {hasTeams && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      {props.matchHomeBadge ? (
                        <img src={props.matchHomeBadge} alt={props.matchHomeTeam} className="w-16 h-16 object-contain rounded-xl bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>{props.matchHomeTeam?.charAt(0) || "H"}</div>
                      )}
                      <span className="text-sm text-white/80 font-semibold text-center truncate w-full">{props.matchHomeTeam || "Home"}</span>
                    </div>
                    <div className="px-6">
                      <span className="text-lg font-black text-white/15 tracking-widest">VS</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      {props.matchAwayBadge ? (
                        <img src={props.matchAwayBadge} alt={props.matchAwayTeam} className="w-16 h-16 object-contain rounded-xl bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: `${sportColor}10`, color: `${sportColor}80` }}>{props.matchAwayTeam?.charAt(0) || "A"}</div>
                      )}
                      <span className="text-sm text-white/80 font-semibold text-center truncate w-full">{props.matchAwayTeam || "Away"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SERVERS ── */}
          <div className="mb-6">
            <h3 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              Stream Servers {streams.length > 0 && `(${streams.length})`}
            </h3>

            {streams.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {streams.map((stream, idx) => {
                  const isActive = activeStream?.embedUrl === stream.embedUrl;
                  return (
                    <button
                      key={`${stream.id}-${stream.streamNo}-${idx}`}
                      onClick={() => switchStream(stream)}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                        isActive ? "bg-[#7c6cf0] text-white shadow-[0_0_16px_rgba(124,108,240,0.3)]" : "bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.06] border border-white/[0.06]"
                      }`}
                    >
                      <span className="truncate">{stream.source?.charAt(0).toUpperCase()}{stream.source?.slice(1)} {stream.streamNo}</span>
                      {stream.hd && <span className="text-[7px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black">HD</span>}
                    </button>
                  );
                })}
              </div>
            ) : !loadingStreams ? (
              <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <p className="text-xs text-white/25">No servers found</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="w-4 h-4 rounded-full border border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                <span className="text-[10px] text-white/30">Finding servers...</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {activeStream?.embedUrl && (
                <a
                  href={activeStream.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-emerald-500/10 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/10 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                  Watch in New Tab (Always Works)
                </a>
              )}
              <button onClick={() => setActiveStream(activeStream)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-white/[0.04] text-white/30 hover:text-white/50 border border-white/[0.06] transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" /></svg>
                Retry
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <h4 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Stream Tips</h4>
            <div className="space-y-1.5 text-[11px] text-white/20 leading-relaxed">
              <p>If the inline player doesn&apos;t load, click <strong className="text-emerald-400/60">Watch in New Tab</strong> — this always works</p>
              <p>Try different servers — some are faster than others</p>
              <p>The video plays natively using HLS — no iframe needed</p>
              <p>Upcoming matches show a countdown timer</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${sportColor}, transparent)` }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{sportIcon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>{props.matchSportName || "Sports"}</span>
                </div>
                {isUpcoming ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">UPCOMING</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-white mb-4 text-center leading-snug" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>{props.matchTitle}</h2>

              {isUpcoming && props.matchDate > 0 && (
                <div className="mb-4 p-3 rounded-xl flex justify-center" style={{ background: `${sportColor}08`, border: `1px solid ${sportColor}12` }}>
                  <CountdownTimer targetDate={props.matchDate} sportColor={sportColor} />
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
                  <span className="text-[11px] font-medium" style={{ color: isUpcoming ? "#f59e0b" : "#ef4444" }}>{isUpcoming ? "Upcoming" : "Live"}</span>
                </div>
                {streams.length > 0 && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-white/25">Servers</span>
                    <span className="text-[11px] text-white/60 font-medium">{streams.length}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-white/25">Player</span>
                  <span className="text-[11px] text-white/60 font-medium">{playerState === "playing" ? "HLS Native" : "Connecting..."}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => navigate({ page: "live" } as any)} className="py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all">Browse More</button>
            {activeStream?.embedUrl ? (
              <a href={activeStream.embedUrl} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-[11px] font-bold text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/15 transition-all text-center">Watch in Tab</a>
            ) : (
              <button onClick={() => setActiveStream(activeStream)} className="py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-white/60 transition-all">Refresh</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
