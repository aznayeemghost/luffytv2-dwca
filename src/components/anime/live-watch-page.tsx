"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAppStore } from "./store";
import Hls from "hls.js";

// ============================================================
// LIVE WATCH PAGE — hls.js + iframe Embed Player
// PRIMARY: M3U8 via hls.js (streamfree, cdnlivetv, dami-tv)
// FALLBACK: iframe embed via /api/embed/proxy (streamed.pk, embedsports)
// ============================================================

interface StreamInfo {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  m3u8Url: string;
  quality: string;
  source: string;
  viewers?: number;
  provider?: string;
  embedUrl?: string;
  corsEnabled: boolean;
  referer?: string;
  streamType: "m3u8" | "embed";
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
  matchStreamKey?: string;
  matchStreamCategory?: string;
  matchChannelName?: string;
  matchChannelCode?: string;
  matchDamitvId?: string;
  matchWatchfootyId?: string;
  matchApiSource?: string;
  matchSportsrcCategory?: string;
  matchSportsrcId?: string;
  matchWatchfootyStreams?: string;
  matchLeague?: string;
  matchLeagueLogo?: string;
  matchHomeScore?: number;
  matchAwayScore?: number;
  matchCurrentMinute?: string;
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
  const [playerState, setPlayerState] = useState<"loading" | "playing" | "error" | "countdown" | "no-stream" | "ready" | "scoreboard">("loading");
  const [playerError, setPlayerError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showPlayButton, setShowPlayButton] = useState(false); // Embed auto-plays, M3U8 needs click

  // ── Scoreboard live score state ──
  const [scoreboardData, setScoreboardData] = useState<{ homeScore: string; awayScore: string; period: string; clock: string; statusDetail: string } | null>(null);
  const [scoreboardLoading, setScoreboardLoading] = useState(false);

  const sportIcon = sportIcons[props.matchSport || "other"] || "📺";
  const sportColor = sportColors[props.matchSport || "other"] || "#6b7280";
  const isUpcoming = props.matchDate ? props.matchDate > Date.now() : false;
  const matchTime = props.matchDate ? formatMatchTime(props.matchDate) : "";
  const hasTeams = props.matchHomeTeam || props.matchAwayTeam;
  const isEmbedStream = activeStream?.streamType === "embed";

  // WatchFooty score data from props
  const wfHomeScore = props.matchHomeScore;
  const wfAwayScore = props.matchAwayScore;
  const wfCurrentMinute = props.matchCurrentMinute;
  const wfLeague = props.matchLeague;
  const wfLeagueLogo = props.matchLeagueLogo;
  const hasWfScore = wfHomeScore !== undefined && wfAwayScore !== undefined;

  // Parse WatchFooty streams from props
  const wfStreamsFromProps = useMemo(() => {
    if (!props.matchWatchfootyStreams) return [];
    try {
      const parsed = JSON.parse(props.matchWatchfootyStreams);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [props.matchWatchfootyStreams]);

  // Fetch stream URLs from our resolver API
  useEffect(() => {
    if (!props.matchId) return;
    const fetchStreams = async () => {
      setLoadingStreams(true);
      try {
        // First, add WatchFooty streams directly (they have embed URLs!)
        const wfStreams: StreamInfo[] = wfStreamsFromProps
          .filter((s: any) => s.url && !s.isRedirect)
          .map((s: any, i: number) => ({
            id: `wf-direct-${s.id || i}`,
            streamNo: i + 1,
            language: s.language || "english",
            hd: s.quality === "hd",
            m3u8Url: "",
            quality: s.quality === "hd" ? "720p" : "480p",
            source: `WatchFooty ${s.language || ""} ${s.quality || ""}`.trim(),
            viewers: 0,
            provider: "watchfooty",
            embedUrl: s.url,
            corsEnabled: false,
            referer: "https://watchfooty.st/",
            streamType: "embed" as const,
          }));

        // Also fetch from resolver API for other sources
        const params = new URLSearchParams();
        params.set("matchId", props.matchId);
        params.set("provider", props.matchApiSource || "");
        if (props.matchStreamKey) params.set("streamKey", props.matchStreamKey);
        if (props.matchStreamCategory) params.set("streamCategory", props.matchStreamCategory);
        if (props.matchChannelName) params.set("channelName", props.matchChannelName);
        if (props.matchChannelCode) params.set("channelCode", props.matchChannelCode);
        if (props.matchDamitvId) params.set("damitvId", props.matchDamitvId);
        if (props.matchWatchfootyId) params.set("watchfootyId", props.matchWatchfootyId);
        if (props.matchSources) params.set("sources", props.matchSources);

        const res = await fetch(`/api/live/embed?${params.toString()}`);
        let resolverStreams: StreamInfo[] = [];
        if (res.ok) {
          const data = await res.json();
          if (data.streams?.length > 0) {
            resolverStreams = data.streams;
          }
        }

        // Merge: WatchFooty direct streams first, then resolver streams
        const allStreams = [...wfStreams, ...resolverStreams];

        // Deduplicate by embedUrl
        const seen = new Set<string>();
        const uniqueStreams = allStreams.filter(s => {
          const key = s.streamType === "m3u8" && s.m3u8Url ? s.m3u8Url : (s.embedUrl || s.id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (uniqueStreams.length > 0) {
          setStreams(uniqueStreams);
          // Prefer embed streams first (they work reliably), then CORS M3U8, then proxy M3U8
          const embedStream = uniqueStreams.find((s: StreamInfo) => s.streamType === "embed" && s.embedUrl);
          const corsStream = uniqueStreams.find((s: StreamInfo) => s.streamType === "m3u8" && s.m3u8Url && s.corsEnabled);
          const m3u8Stream = uniqueStreams.find((s: StreamInfo) => s.streamType === "m3u8" && s.m3u8Url);
          // Embed streams auto-play in iframe, so prefer those for instant playback
          const best = embedStream || corsStream || m3u8Stream || uniqueStreams[0];
          setActiveStream(best);
        } else if (wfStreams.length === 0 && resolverStreams.length === 0) {
          // No streams at all
          if (isUpcoming) setPlayerState("countdown");
          else if (hasTeams) setPlayerState("scoreboard");
          else setPlayerState("error");
        }
      } catch (err) {
        console.error("Failed to fetch streams:", err);
      }
      setLoadingStreams(false);
    };
    fetchStreams();
  }, [props.matchId, props.matchSources, retryCount, wfStreamsFromProps]);

  // When activeStream changes, prepare the player
  useEffect(() => {
    // For embed streams, auto-play in sandbox iframe (no click needed)
    if (activeStream?.streamType === "embed" && activeStream?.embedUrl) {
      setPlayerState("playing");
      setShowPlayButton(false);
      return;
    }

    if (!activeStream?.m3u8Url) {
      if (isUpcoming) setPlayerState("countdown");
      else setPlayerState("scoreboard"); // Show scoreboard instead of plain "no stream"
      return;
    }

    // For M3U8 streams, show play button first
    setShowPlayButton(true);
    setPlayerState("ready");
  }, [activeStream]);

  // ── Fetch ESPN live score when scoreboard is showing ──
  useEffect(() => {
    if (playerState !== "scoreboard") return;
    if (!props.matchHomeTeam && !props.matchAwayTeam) return;

    const fetchScore = async () => {
      setScoreboardLoading(true);
      try {
        // Map our sport to ESPN sport/league
        const espnMap: Record<string, { sport: string; league: string }[]> = {
          basketball: [{ sport: "basketball", league: "nba" }],
          "american-football": [{ sport: "football", league: "nfl" }],
          football: [{ sport: "soccer", league: "eng.1" }, { sport: "soccer", league: "usa.1" }, { sport: "soccer", league: "uefa.champions" }],
          hockey: [{ sport: "hockey", league: "nhl" }],
          baseball: [{ sport: "baseball", league: "mlb" }],
        };

        const leagues = espnMap[props.matchSport] || [];
        let found = false;

        for (const { sport, league } of leagues) {
          try {
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`);
            if (!res.ok) continue;
            const data = await res.json();

            for (const event of data.events || []) {
              const comp = event.competitions?.[0];
              if (!comp) continue;

              const home = comp.competitors?.find((c: any) => c.homeAway === "home");
              const away = comp.competitors?.find((c: any) => c.homeAway === "away");

              const homeName = home?.team?.displayName || "";
              const awayName = away?.team?.displayName || "";

              // Match by team name similarity
              const homeMatch = homeName && props.matchHomeTeam &&
                (homeName.toLowerCase().includes(props.matchHomeTeam.toLowerCase()) ||
                 props.matchHomeTeam.toLowerCase().includes(homeName.toLowerCase()));
              const awayMatch = awayName && props.matchAwayTeam &&
                (awayName.toLowerCase().includes(props.matchAwayTeam.toLowerCase()) ||
                 props.matchAwayTeam.toLowerCase().includes(awayName.toLowerCase()));

              if (homeMatch || awayMatch || (homeMatch && awayMatch)) {
                const statusDetail = comp.status?.type?.detail || "";
                const period = comp.status?.period ? `Period ${comp.status.period}` : "";
                const clock = comp.status?.displayClock || "";

                setScoreboardData({
                  homeScore: home?.score || "0",
                  awayScore: away?.score || "0",
                  period,
                  clock,
                  statusDetail,
                });
                found = true;
                break;
              }
            }
            if (found) break;
          } catch { continue; }
        }
      } catch {}
      setScoreboardLoading(false);
    };

    fetchScore();
    // Refresh score every 30 seconds while scoreboard is showing
    const iv = setInterval(fetchScore, 30000);
    return () => clearInterval(iv);
  }, [playerState, props.matchSport, props.matchHomeTeam, props.matchAwayTeam]);

  const switchStream = useCallback((stream: StreamInfo) => {
    setActiveStream(stream);
    setShowPlayButton(true);
  }, []);

  // Start M3U8 playback
  const startM3U8Playback = useCallback(() => {
    if (!activeStream?.m3u8Url || !videoRef.current) return;
    const m3u8Url = activeStream.m3u8Url;

    setPlayerState("loading");
    setPlayerError("");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr, url) => {
          if (activeStream.referer) {
            xhr.setRequestHeader("Referer", activeStream.referer);
          }
        },
      });
      hlsRef.current = hls;

      const useProxy = !activeStream.corsEnabled;
      const finalUrl = useProxy
        ? `/api/live/proxy/${m3u8Url}?referer=${encodeURIComponent(activeStream.referer || "")}`
        : m3u8Url;

      hls.loadSource(finalUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play().catch(() => {});
        setPlayerState("playing");
        setShowPlayButton(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (useProxy && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.log("Proxy failed, trying direct M3U8...");
            hls.destroy();
            hlsRef.current = null;

            const hls2 = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              xhrSetup: (xhr, url) => {
                if (activeStream.referer) xhr.setRequestHeader("Referer", activeStream.referer);
              },
            });
            hlsRef.current = hls2;
            hls2.loadSource(m3u8Url);
            hls2.attachMedia(videoRef.current!);

            hls2.on(Hls.Events.MANIFEST_PARSED, () => {
              videoRef.current?.play().catch(() => {});
              setPlayerState("playing");
              setShowPlayButton(false);
            });

            hls2.on(Hls.Events.ERROR, (_e2, data2) => {
              if (data2.fatal) {
                // M3U8 failed - auto-switch to embed if available, else show scoreboard
                const embedStream = streams.find(s => s.streamType === "embed" && s.embedUrl);
                if (embedStream) {
                  switchStream(embedStream);
                } else if (hasTeams) {
                  setPlayerState("scoreboard");
                } else {
                  setPlayerState("error");
                  setPlayerError("Stream failed to load. Try a different server.");
                }
              }
            });
            return;
          }
          // M3U8 fatal error - auto-switch to embed if available, else show scoreboard
          const embedStream = streams.find(s => s.streamType === "embed" && s.embedUrl);
          if (embedStream) {
            switchStream(embedStream);
          } else if (hasTeams) {
            setPlayerState("scoreboard");
          } else {
            setPlayerState("error");
            setPlayerError("Stream failed to load. Try a different server.");
          }
        }
      });
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      const useProxy = !activeStream.corsEnabled;
      const finalUrl = useProxy
        ? `/api/live/proxy/${m3u8Url}?referer=${encodeURIComponent(activeStream.referer || "")}`
        : m3u8Url;
      videoRef.current.src = finalUrl;
      videoRef.current.addEventListener("loadedmetadata", () => {
        videoRef.current?.play().catch(() => {});
        setPlayerState("playing");
        setShowPlayButton(false);
      });
    }
  }, [activeStream]);

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Handle play button click
  const handlePlayClick = () => {
    setShowPlayButton(false);
    if (activeStream?.m3u8Url) {
      // For M3U8: start HLS playback
      startM3U8Playback();
    }
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

  const newTabUrl = activeStream?.embedUrl || (props.matchStreamKey && props.matchStreamCategory
    ? `https://streamfree.app/player/${props.matchStreamCategory}/${props.matchStreamKey}`
    : "");

  return (
    <div className="min-h-screen flex flex-col -mx-4 lg:-mx-8 -mt-[75px] pt-0">
      {/* ── PLAYER AREA ── */}
      <div
        ref={playerContainerRef}
        className="relative w-full bg-black"
        style={{ aspectRatio: isFullscreen ? "auto" : "16/9", minHeight: isFullscreen ? "100vh" : "280px" }}
      >
        {/* Video element for hls.js (M3U8 streams) */}
        {!isEmbedStream && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: playerState === "playing" ? 10 : 0 }}
            playsInline
            controls
            autoPlay
          />
        )}

        {/* Iframe for embed streams — direct iframe, no sandbox blocking */}
        {isEmbedStream && activeStream?.embedUrl && playerState === "playing" && (
          <iframe
            src={activeStream.embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            style={{ zIndex: 15 }}
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Play button overlay — only for M3U8 streams, not embeds */}
        {showPlayButton && !isEmbedStream && activeStream && (playerState === "ready" || playerState === "loading") && (
          <div
            className="absolute inset-0 flex items-center justify-center z-25 cursor-pointer"
            style={{ zIndex: 25 }}
            onClick={handlePlayClick}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60" />
            {/* Play button */}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${sportColor}dd, ${sportColor}99)`,
                  boxShadow: `0 0 40px ${sportColor}40, 0 0 80px ${sportColor}20`,
                }}
              >
                <svg className="w-10 h-10 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Click to Play</p>
                <p className="text-white/40 text-xs mt-1">
                  {isEmbedStream ? `Embed Player • ${activeStream?.source || 'Stream'}` : `HLS Player • ${activeStream?.quality || 'HD'}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {playerState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20">
            <div className="w-14 h-14 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
            <p className="text-sm text-white/40">Loading stream...</p>
            <p className="text-[10px] text-white/20">
              {activeStream?.provider === "streamfree" ? "streamfree.app CDN" :
               activeStream?.provider === "cdnlivetv" ? "cdnlivetv.tv" :
               activeStream?.provider === "damitv" ? "dami-tv.pro" :
               activeStream?.provider === "streamed" ? "Streamed • Loading embed..." :
               "Connecting to server..."}
            </p>
            {activeStream?.corsEnabled && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">CORS Direct</span>
            )}
            {isEmbedStream && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Embed Player</span>
            )}
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

        {/* Error */}
        {playerState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black z-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-500/10">
              <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-white/50">Stream could not load</p>
            <p className="text-[10px] text-white/20 max-w-xs text-center">{playerError || "Try a different server"}</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {streams.filter(s => s.streamType === "embed" && s.embedUrl).length > 0 && (
                <button
                  onClick={() => {
                    const embedStream = streams.find(s => s.streamType === "embed" && s.embedUrl);
                    if (embedStream) switchStream(embedStream);
                  }}
                  className="mt-2 px-6 py-3 rounded-xl bg-purple-500/15 text-purple-400 text-sm font-bold hover:bg-purple-500/25 border border-purple-500/20 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="14" rx="2" /></svg>
                  Try Embed Player
                </button>
              )}
              {newTabUrl && (
                <a href={newTabUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-2 px-6 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-bold hover:bg-emerald-500/25 border border-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Watch in New Tab
                </a>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            SCOREBOARD — Shows when no streams are available
            Displays team info, live score (from ESPN if available),
            match status, and refresh/try-embed buttons
            ═══════════════════════════════════════════════════ */}
        {playerState === "scoreboard" && !isUpcoming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black via-[#0a0a0f] to-black z-20 overflow-auto">
            {/* Background glow */}
            <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 40%, ${sportColor}20, transparent 60%)` }} />

            <div className="relative z-10 flex flex-col items-center gap-5 px-6 py-8 w-full max-w-lg">
              {/* Live indicator */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-[11px] font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  LIVE SCOREBOARD
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${sportColor}15`, color: sportColor }}>{sportIcon} {props.matchSportName || props.matchSport}</span>
                {wfLeague && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">
                    {wfLeagueLogo && <img src={wfLeagueLogo} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    {wfLeague}
                  </span>
                )}
              </div>

              {/* Main Scoreboard Card */}
              <div className="w-full rounded-2xl overflow-hidden border border-white/[0.06]" style={{ background: `linear-gradient(135deg, ${sportColor}08, rgba(255,255,255,0.02))` }}>
                {/* Top accent bar */}
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${sportColor}, ${sportColor}50, transparent)` }} />

                <div className="p-6">
                  {/* Team names */}
                  {hasTeams ? (
                    <div className="flex items-center justify-between gap-4">
                      {/* Home Team */}
                      <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                        {props.matchHomeBadge ? (
                          <img src={props.matchHomeBadge} alt={props.matchHomeTeam} className="w-16 h-16 object-contain rounded-xl bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: `${sportColor}15`, color: `${sportColor}90` }}>{props.matchHomeTeam?.charAt(0) || "H"}</div>
                        )}
                        <span className="text-sm text-white/80 font-semibold text-center truncate w-full">{props.matchHomeTeam || "Home"}</span>
                      </div>

                      {/* Score / VS */}
                      <div className="flex flex-col items-center gap-1 px-4">
                        {hasWfScore ? (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="text-3xl font-black" style={{ color: sportColor }}>{wfHomeScore}</span>
                              <span className="text-lg text-white/20 font-bold">-</span>
                              <span className="text-3xl font-black" style={{ color: sportColor }}>{wfAwayScore}</span>
                            </div>
                            {wfCurrentMinute && (
                              <span className="text-[10px] text-amber-400/60 font-bold">{wfCurrentMinute}&apos;</span>
                            )}
                          </>
                        ) : scoreboardData ? (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="text-3xl font-black" style={{ color: sportColor }}>{scoreboardData.homeScore}</span>
                              <span className="text-lg text-white/20 font-bold">-</span>
                              <span className="text-3xl font-black" style={{ color: sportColor }}>{scoreboardData.awayScore}</span>
                            </div>
                            {scoreboardData.period && (
                              <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{scoreboardData.period}</span>
                            )}
                            {scoreboardData.clock && (
                              <span className="text-[10px] text-amber-400/60 font-bold">{scoreboardData.clock}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-2xl font-black text-white/15 tracking-widest">VS</span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                        {props.matchAwayBadge ? (
                          <img src={props.matchAwayBadge} alt={props.matchAwayTeam} className="w-16 h-16 object-contain rounded-xl bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: `${sportColor}15`, color: `${sportColor}90` }}>{props.matchAwayTeam?.charAt(0) || "A"}</div>
                        )}
                        <span className="text-sm text-white/80 font-semibold text-center truncate w-full">{props.matchAwayTeam || "Away"}</span>
                      </div>
                    </div>
                  ) : (
                    /* No team data — show title */
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-white/80 mb-2">{props.matchTitle}</h3>
                      {scoreboardData && (
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-2xl font-black" style={{ color: sportColor }}>{scoreboardData.homeScore}</span>
                          <span className="text-lg text-white/20 font-bold">-</span>
                          <span className="text-2xl font-black" style={{ color: sportColor }}>{scoreboardData.awayScore}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Match status line */}
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-[10px] text-white/25">
                      {matchTime || props.matchSportName || "Live Match"}
                    </span>
                    {scoreboardData?.statusDetail ? (
                      <span className="text-[10px] text-emerald-400/60 font-bold">{scoreboardData.statusDetail}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Score loading indicator */}
              {scoreboardLoading && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                  <span className="text-[10px] text-white/25">Fetching live score...</span>
                </div>
              )}

              {/* No streams message */}
              <div className="text-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] w-full">
                <p className="text-[11px] text-white/30 mb-1">No streams available for this match</p>
                <p className="text-[9px] text-white/15">The stream will appear when a source goes live</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap justify-center w-full">
                {streams.filter(s => s.streamType === "embed").length > 0 && (
                  <button
                    onClick={() => {
                      const embedStream = streams.find(s => s.streamType === "embed" && s.embedUrl);
                      if (embedStream) switchStream(embedStream);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-purple-500/15 text-purple-400 text-[11px] font-bold hover:bg-purple-500/25 border border-purple-500/20 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="14" rx="2" /></svg>
                    Try Embed Player
                  </button>
                )}
                {newTabUrl && (
                  <a href={newTabUrl} target="_blank" rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 border border-emerald-500/20 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Watch in New Tab
                  </a>
                )}
                <button onClick={() => setRetryCount(c => c + 1)} className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-white/40 text-[11px] font-bold hover:bg-white/[0.08] transition-all flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" /></svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player controls overlay */}
        {playerState === "playing" && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            {isEmbedStream && (
              <span className="px-2 py-1 rounded-lg bg-purple-500/60 backdrop-blur-sm text-white text-[9px] font-bold">EMBED</span>
            )}
            {newTabUrl && (
              <a href={newTabUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-all" title="Open in new tab">
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

        {/* Live badge when playing */}
        {playerState === "playing" && (
          <div className="absolute top-3 left-3 z-30">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/80 backdrop-blur-sm text-white text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
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
                    {activeStream?.corsEnabled && playerState === "playing" && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">CORS DIRECT</span>
                    )}
                    {isEmbedStream && playerState === "playing" && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] font-bold">EMBED PLAYER</span>
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
                  const isActive = activeStream?.id === stream.id;
                  return (
                    <button
                      key={`${stream.id}-${idx}`}
                      onClick={() => switchStream(stream)}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                        isActive ? "bg-[#7c6cf0] text-white shadow-[0_0_16px_rgba(124,108,240,0.3)]" : "bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.06] border border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stream.streamType === "embed" ? "bg-purple-400" : "bg-emerald-400"}`} />
                        <span className="truncate">{stream.source?.charAt(0).toUpperCase()}{stream.source?.slice(1)}</span>
                        <span className="text-[9px] opacity-50">{stream.quality}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {stream.corsEnabled && <span className="text-[7px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black">CORS</span>}
                        {stream.streamType === "embed" && <span className="text-[7px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-black">EMB</span>}
                        {stream.hd && <span className="text-[7px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black">HD</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : !loadingStreams ? (
              <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <p className="text-xs text-white/25">No servers found</p>
                <p className="text-[10px] text-white/15 mt-1">The stream will appear when the event goes live</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="w-4 h-4 rounded-full border border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                <span className="text-[10px] text-white/30">Finding servers...</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {newTabUrl && (
                <a href={newTabUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-emerald-500/10 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/10 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                  Watch in New Tab
                </a>
              )}
              <button onClick={() => setRetryCount(c => c + 1)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-white/[0.04] text-white/30 hover:text-white/50 border border-white/[0.06] transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" /></svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <h4 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Stream Tips</h4>
            <div className="space-y-1.5 text-[11px] text-white/20 leading-relaxed">
              <p>Servers with <strong className="text-emerald-400/60">CORS</strong> badge play directly via hls.js</p>
              <p>Servers with <strong className="text-purple-400/60">EMB</strong> badge use iframe embed player</p>
              <p>If one server doesn&apos;t work, try another — different sources have different reliability</p>
              <p>Upcoming matches show a countdown timer until kickoff</p>
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
                    <span className="text-[11px] text-white/60 font-medium">{streams.length} ({streams.filter(s => s.streamType === "m3u8").length} M3U8, {streams.filter(s => s.streamType === "embed").length} Embed)</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-white/25">Player</span>
                  <span className="text-[11px] text-white/60 font-medium">
                    {playerState === "playing" ? (isEmbedStream ? "Embed (iframe)" : activeStream?.corsEnabled ? "HLS Direct" : "HLS via Proxy") : "Connecting..."}
                  </span>
                </div>
                {activeStream?.provider && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-white/25">Source</span>
                    <span className="text-[11px] text-white/60 font-medium">{activeStream.provider}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => navigate({ page: "live" } as any)} className="py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all">Browse More</button>
            {newTabUrl ? (
              <a href={newTabUrl} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-[11px] font-bold text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/15 transition-all text-center">Watch in Tab</a>
            ) : (
              <button onClick={() => setRetryCount(c => c + 1)} className="py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-white/60 transition-all">Refresh</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
