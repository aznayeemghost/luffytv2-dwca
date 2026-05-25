"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "./store";
import { getAnimeServers, getHindiServers } from "@/lib/embed-servers";

interface WatchPageProps {
  animeId: string;
  episodeNum: number;
}

interface ServerInfo {
  id: string;
  name: string;
  url: string;
  color: string;
  idType: "tmdb" | "anilist";
  supportsDub: boolean;
  supportsHindi: boolean;
  category: "anime" | "tmdb" | "hindi";
  noSandbox?: boolean;
}

type TranslationType = "sub" | "dub" | "hindi";

export default function WatchPage({ animeId, episodeNum }: WatchPageProps) {
  const navigate = useAppStore(s => s.navigate);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [useDirectEmbed, setUseDirectEmbed] = useState(true);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [translation, setTranslation] = useState<TranslationType>("sub");
  const [episodeList, setEpisodeList] = useState<Array<{ number: number; slug: string }>>([]);
  const [animeTitle, setAnimeTitle] = useState("");
  const [animeImage, setAnimeImage] = useState("");
  const [animeDescription, setAnimeDescription] = useState("");
  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [malId, setMalId] = useState<number | null>(null);
  const [tmdbSeason, setTmdbSeason] = useState<number | null>(null);
  const [tmdbBackdrop, setTmdbBackdrop] = useState("");
  const [tmdbRating, setTmdbRating] = useState<number | null>(null);
  const [tmdbGenres, setTmdbGenres] = useState<string[]>([]);

  // Parse anime ID — runs once on mount
  useEffect(() => {
    const cleanId = animeId.replace(/^miruro_/, "").replace(/^mal_/, "");
    if (/^\d+$/.test(cleanId)) setAnilistId(parseInt(cleanId));
  }, [animeId]);

  // Load anime info — fetches AniList data which includes malId
  useEffect(() => {
    let cancelled = false;
    async function loadInfo() {
      try {
        const res = await fetch(`/api/anime/info?id=${encodeURIComponent(animeId)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const anime = data.anime;
          const anilistInfo = data.anilistInfo;
          const tmdbFallback = data.tmdbFallbackInfo;
          const malInfo = data._source === "mal" ? data.anilistInfo : null;

          setAnimeTitle(
            anilistInfo?.title?.english || anilistInfo?.title?.romaji ||
            malInfo?.title?.english || malInfo?.title?.romaji ||
            tmdbFallback?.title?.english || tmdbFallback?.title?.romaji ||
            anime?.englishName || anime?.name || ""
          );
          setAnimeImage(
            anilistInfo?.coverImage?.extraLarge || anilistInfo?.coverImage?.large ||
            malInfo?.coverImage?.extraLarge || malInfo?.coverImage?.large ||
            tmdbFallback?.coverImage?.extraLarge || tmdbFallback?.coverImage?.large ||
            anime?.thumbnail || ""
          );
          setAnimeDescription(
            anilistInfo?.description?.replace(/<[^>]*>/g, "") ||
            malInfo?.description?.replace(/<[^>]*>/g, "") ||
            tmdbFallback?.description?.replace(/<[^>]*>/g, "") ||
            anime?.description || ""
          );

          // Extract AniList ID and MAL ID from AniList response
          if (anilistInfo?.id && !anilistId) {
            setAnilistId(anilistInfo.id);
          }
          // AniList returns idMal which is the MAL ID — critical for megaplay MAL servers
          if (anilistInfo?.idMal) {
            setMalId(anilistInfo.idMal);
          }
          // Also check if the anime object has malId
          if (!malId && anime?.idMal) {
            setMalId(anime.idMal);
          }

          if (data.tmdbSeason) setTmdbSeason(data.tmdbSeason);
          else if (data.zenshinMappings?.season?.tmdb) setTmdbSeason(data.zenshinMappings.season.tmdb);
          if (data.tmdbData) {
            if (data.tmdbData.backdropUrl) setTmdbBackdrop(data.tmdbData.backdropUrl);
            else if (data.tmdbData.backdrop_path) setTmdbBackdrop(`https://image.tmdb.org/t/p/w780${data.tmdbData.backdrop_path}`);
            if (data.tmdbData.vote_average) setTmdbRating(data.tmdbData.vote_average);
            if (data.tmdbData.genres) setTmdbGenres(data.tmdbData.genres.map((g: any) => typeof g === "string" ? g : g.name));
          }
          if (!tmdbRating && tmdbFallback?.averageScore) {
            setTmdbRating(tmdbFallback.averageScore > 10 ? tmdbFallback.averageScore / 10 : tmdbFallback.averageScore);
          }
          if (tmdbGenres.length === 0 && tmdbFallback?.genres?.length) {
            setTmdbGenres(tmdbFallback.genres.filter((g: any) => typeof g === "string"));
          }
        }
      } catch { /* ignore */ }
    }
    loadInfo();
    return () => { cancelled = true; };
  }, [animeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load episodes list
  useEffect(() => {
    let cancelled = false;
    async function loadEps() {
      try {
        const res = await fetch(`/api/anime/episodes?id=${encodeURIComponent(animeId)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.episodes?.length) {
            setEpisodeList(data.episodes.map((e: any) => ({ number: e.episodeIdNum, slug: String(e.episodeIdNum) })));
          }
        }
      } catch { /* ignore */ }
    }
    loadEps();
    return () => { cancelled = true; };
  }, [animeId]);

  // Build servers based on translation type
  useEffect(() => {
    const availableServers: ServerInfo[] = [];

    if (translation === "hindi") {
      const hindiServers = getHindiServers();
      for (const server of hindiServers) {
        const url = server.generateUrl({
          anilistId: anilistId || undefined,
          malId: malId || undefined,
          episode: episodeNum,
          translation: "hindi",
          title: animeTitle,
        });
        if (url) {
          availableServers.push({
            id: server.id, name: server.name, url,
            color: server.color, idType: server.idType,
            supportsDub: false, supportsHindi: true,
            category: "hindi",
            noSandbox: server.noSandbox,
          });
        }
      }
    } else {
      const animeServers = getAnimeServers();
      for (const server of animeServers) {
        if (translation === "dub" && !server.supportsDub) continue;

        const url = server.generateUrl({
          anilistId: anilistId || undefined,
          malId: malId || undefined,
          tmdbId: undefined, episode: episodeNum,
          season: tmdbSeason || undefined, translation,
        });
        if (url) {
          availableServers.push({
            id: server.id, name: server.name, url,
            color: server.color, idType: server.idType,
            supportsDub: server.supportsDub, supportsHindi: false,
            category: server.category,
            noSandbox: server.noSandbox,
          });
        }
      }
    }

    setServers(availableServers);
    if (availableServers.length > 0) {
      const currentStillValid = availableServers.some(s => s.id === activeServerId);
      if (!currentStillValid) setActiveServerId(availableServers[0].id);
    }
  }, [anilistId, malId, tmdbSeason, episodeNum, translation, animeTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  // When active server changes, update embed URL
  useEffect(() => {
    const server = servers.find(s => s.id === activeServerId);
    if (!server) return;

    // Internal API routes (like /api/miruro/player) should always load directly
    const isInternalApi = server.url.startsWith("/api/");
    setUseDirectEmbed(isInternalApi || !server.noSandbox);
    setEmbedUrl(server.url);
    setLoading(true);
    setError(null);
    setPlaying(false);

    // Auto-dismiss loading spinner after 6s — cross-origin iframes often
    // don't fire onLoad, so the spinner would get stuck forever otherwise
    const timer = setTimeout(() => {
      setLoading(false);
      setPlaying(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [activeServerId, servers]);

  // Auto-switch to next server on failure
  const autoSwitchToNextServer = useCallback(() => {
    const currentIdx = servers.findIndex(s => s.id === activeServerId);
    for (let i = currentIdx + 1; i < servers.length; i++) {
      setActiveServerId(servers[i].id);
      return;
    }
    for (let i = 0; i < currentIdx; i++) {
      if (servers[i].id !== activeServerId) {
        setActiveServerId(servers[i].id);
        return;
      }
    }
    setError("All servers failed. Try refreshing the page.");
  }, [servers, activeServerId]);

  const switchTranslation = (trans: TranslationType) => {
    setTranslation(trans);
    setActiveServerId("");
  };
  const switchEpisode = (epNum: number) => {
    navigate({ page: "watch", id: animeId, episode: epNum, title: animeTitle, image: animeImage });
  };

  const retryLoad = () => {
    setError(null);
    if (!useDirectEmbed) {
      setUseDirectEmbed(true);
      setLoading(true);
    } else {
      const currentIdx = servers.findIndex(s => s.id === activeServerId);
      if (currentIdx < servers.length - 1) setActiveServerId(servers[currentIdx + 1].id);
      else setActiveServerId(servers[0]?.id || "");
    }
  };

  const activeServer = servers.find(s => s.id === activeServerId);
  const prevEp = episodeNum > 1 ? episodeNum - 1 : null;
  const nextEp = episodeList.find(e => e.number === episodeNum + 1) ? episodeNum + 1 : null;
  const hindiAvailable = getHindiServers().length > 0;

  return (
    <div className="fade-in">
      {tmdbBackdrop && <div className="immersive-bg" style={{ backgroundImage: `url(${tmdbBackdrop})` }} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 -mx-4 lg:-mx-8">
        <div className="space-y-0">
          <div className="relative bg-black overflow-hidden aspect-video rounded-none lg:rounded-2xl player-glow">
            {translation === "hindi" && servers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-20">
                <div className="text-center space-y-4 max-w-sm px-6">
                  <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-orange-300 text-lg font-bold">Hindi Dub Not Available</h3>
                  <p className="text-zinc-400 text-sm">This anime doesn&apos;t have a Hindi dub. Try SUB or DUB.</p>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => switchTranslation("sub")} className="pill-btn pill-btn-primary text-xs py-2 px-4">Watch SUB</button>
                    <button onClick={() => switchTranslation("dub")} className="pill-btn pill-btn-ghost text-xs py-2 px-4">Watch DUB</button>
                  </div>
                </div>
              </div>
            )}

            {embedUrl && !(translation === "hindi" && servers.length === 0) && (
              <iframe
                ref={iframeRef}
                key={`${activeServerId}-${embedUrl}-${useDirectEmbed}`}
                src={(() => {
                  // Internal API routes always load directly
                  if (embedUrl.startsWith("/api/")) return embedUrl;
                  // External embeds: try direct first, then proxy fallback
                  return useDirectEmbed ? embedUrl : `/api/embed/proxy?url=${encodeURIComponent(embedUrl)}`;
                })()}
                className="w-full h-full border-0 relative z-10"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock; clipboard-write; document-domain"
                referrerPolicy="no-referrer"
                onLoad={() => { setLoading(false); setPlaying(true); }}
                onLoadCapture={() => { setLoading(false); setPlaying(true); }}
                onError={() => {
                  if (embedUrl.startsWith("/api/")) {
                    autoSwitchToNextServer();
                  } else if (useDirectEmbed) {
                    setUseDirectEmbed(false);
                    setLoading(true);
                  } else {
                    autoSwitchToNextServer();
                  }
                }}
                title={`${animeTitle} - Episode ${episodeNum}`}
              />
            )}

            {loading && !(translation === "hindi" && servers.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full border-2 border-purple-500/20 border-t-purple-500/60 animate-spin mx-auto" />
                  <p className="text-purple-300/60 text-xs font-medium">
                    {`Loading from ${activeServer?.name || "server"}...`}
                  </p>
                </div>
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="text-center space-y-4 max-w-sm px-6">
                  <svg className="w-10 h-10 text-rose-400/60 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-zinc-300 text-sm">{error}</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button onClick={retryLoad} className="pill-btn pill-btn-primary text-xs py-2 px-4">Retry</button>
                    <button onClick={autoSwitchToNextServer} className="pill-btn pill-btn-ghost text-xs py-2 px-4">Next Server</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Player controls bar */}
          <div className="bg-[#131c26] rounded-none lg:rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Now Playing</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-full ${
                    translation === "sub" ? "bg-purple-500/15 text-purple-300" : translation === "dub" ? "bg-violet-500/15 text-violet-300" : "bg-orange-500/15 text-orange-300"
                  }`}>
                    {translation === "hindi" ? "HINDI DUB" : translation.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white truncate">{animeTitle}</h3>
                <p className="text-xs text-zinc-500">Episode {episodeNum}</p>
              </div>
              <button
                onClick={() => { setUseDirectEmbed(!useDirectEmbed); setLoading(true); setError(null); }}
                className={`shrink-0 text-[10px] font-bold py-1.5 px-3 rounded-full transition-all ${
                  useDirectEmbed
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                    : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/15"
                }`}
                title={useDirectEmbed ? "Direct embed" : "Proxy mode"}
              >
                {useDirectEmbed ? "Direct" : "Proxy"}
              </button>
            </div>

            {servers.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Servers ({servers.length})</span>
                <div className="flex flex-wrap gap-1.5">
                  {servers.map((s) => (
                    <button key={s.id}
                      onClick={() => { setActiveServerId(s.id); setLoading(true); setError(null); }}
                      className={`server-pill text-[11px] py-1.5 px-3 ${activeServerId === s.id ? "active" : ""}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Episode Sidebar */}
        <div className="bg-[#131c26] rounded-none lg:rounded-xl overflow-hidden border border-white/[0.04]">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Episodes</h3>
            <span className="text-[10px] text-zinc-500">{episodeList.length || "?"} episodes</span>
          </div>

          <div className="p-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-1 bg-[#05050a] rounded-full p-0.5">
              {(["sub", "dub", "hindi"] as const).map(t => (
                <button key={t} onClick={() => switchTranslation(t)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all ${
                    translation === t
                      ? t === "sub" ? "bg-purple-500/15 text-purple-300" : t === "dub" ? "bg-violet-500/15 text-violet-300" : "bg-orange-500/15 text-orange-300"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}>
                  {t === "hindi" ? "HINDI DUB" : t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {episodeList.length > 0 ? episodeList.map(ep => (
              <button
                key={ep.number}
                onClick={() => switchEpisode(ep.number)}
                className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                  ep.number === episodeNum
                    ? "bg-purple-500/10 border-l-3 border-purple-500"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  ep.number === episodeNum
                    ? "bg-purple-500 text-white"
                    : "bg-[#0f0f1a] text-zinc-500"
                }`}>
                  {ep.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium line-clamp-1 ${ep.number === episodeNum ? "text-purple-300" : "text-zinc-300"}`}>
                    Episode {ep.number}
                  </p>
                </div>
                {ep.number === episodeNum && (
                  <svg className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                )}
              </button>
            )) : (
              Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-lg skeleton" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 skeleton rounded" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Info card below video */}
      {(animeTitle || animeDescription) && (
        <div className="mt-4 glass-card rounded-xl p-4 -mx-4 lg:-mx-8">
          <div className="flex items-start gap-4">
            {animeImage && (
              <div className="shrink-0 w-20 h-28 rounded-lg overflow-hidden border border-white/[0.06]">
                <img src={animeImage} alt={animeTitle} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">{animeTitle}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {tmdbRating && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="text-xs font-semibold">{(tmdbRating > 10 ? tmdbRating / 10 : tmdbRating).toFixed(1)}</span>
                  </span>
                )}
              </div>
              {tmdbGenres.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {tmdbGenres.slice(0, 5).map((genre, i) => (
                    <span key={i} className="px-2.5 py-1 text-[9px] font-semibold rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-500">{genre}</span>
                  ))}
                </div>
              )}
              {animeDescription && (
                <p className="text-[11px] text-zinc-500 line-clamp-2 mt-2 leading-relaxed">
                  {animeDescription.slice(0, 200)}{animeDescription.length > 200 ? "..." : ""}
                </p>
              )}
              <button onClick={() => navigate({ page: "anime", id: anilistId ? String(anilistId) : animeId })}
                className="text-[11px] text-purple-400/70 hover:text-purple-400 mt-2 transition-colors font-medium">View Details →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
