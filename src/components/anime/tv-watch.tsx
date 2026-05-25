"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "./store";
import { getTmdbServers } from "@/lib/embed-servers";

interface TVShowInfo {
  id: number;
  name: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  vote_average?: number;
  genres?: Array<{ id: number; name: string }>;
  seasons?: Array<{
    id: number; name: string; season_number: number;
    episode_count: number; poster_path?: string; air_date?: string;
  }>;
}

interface SeasonEpisodes {
  episodes: Array<{
    id: number;
    name: string;
    overview?: string;
    episode_number: number;
    season_number: number;
    still_path?: string;
    air_date?: string;
    runtime?: number;
    vote_average?: number;
  }>;
}

export default function TVWatchPage({ tvId, season: initialSeason, episode: initialEpisode }: { tvId: number; season: number; episode: number }) {
  const navigate = useAppStore(s => s.navigate);
  const [show, setShow] = useState<TVShowInfo | null>(null);
  const [episodes, setEpisodes] = useState<SeasonEpisodes | null>(null);
  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [activeServer, setActiveServer] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [useDirectEmbed, setUseDirectEmbed] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const tmdbServers = getTmdbServers();

  // Load TV show info
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tmdb/detail?id=${tvId}&type=tv`);
        if (res.ok) {
          const data = await res.json();
          setShow(data);
          if (tmdbServers.length > 0) setActiveServer(tmdbServers[0].id);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [tvId]);

  // Load season episodes
  useEffect(() => {
    async function loadSeason() {
      try {
        const res = await fetch(`/api/tmdb/season?tvId=${tvId}&season=${currentSeason}`);
        if (res.ok) setEpisodes(await res.json());
      } catch { /* ignore */ }
    }
    loadSeason();
  }, [tvId, currentSeason]);

  // Generate embed URL
  const currentServer = tmdbServers.find(s => s.id === activeServer);
  const embedUrl = currentServer?.generateUrl({
    tmdbId: tvId, episode: currentEpisode, season: currentSeason, translation: "sub",
  }) || "";

  const currentEp = episodes?.episodes?.find(e => e.episode_number === currentEpisode);
  const nextEp = episodes?.episodes?.find(e => e.episode_number === currentEpisode + 1);
  const prevEp = episodes?.episodes?.find(e => e.episode_number === currentEpisode - 1);

  return (
    <div className="fade-in">
      {/* Immersive blurred background */}
      {show?.backdrop_path && (
        <div className="immersive-bg" style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${show.backdrop_path})` }} />
      )}

      {/* Grid: video + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 -mx-4 lg:-mx-8">
        {/* Video Section */}
        <div className="space-y-0">
          {/* Video Player */}
          <div className="relative w-full aspect-video bg-black rounded-none lg:rounded-2xl overflow-hidden player-glow">
            {embedUrl && !iframeError ? (
              <iframe
                ref={iframeRef}
                key={`${embedUrl}-${useDirectEmbed}`}
                src={useDirectEmbed ? embedUrl : `/api/embed/proxy?url=${encodeURIComponent(embedUrl)}`}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock; clipboard-write; document-domain"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (useDirectEmbed) {
                    // Direct embed failed — try proxy fallback
                    setUseDirectEmbed(false);
                  } else {
                    setIframeError(true);
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <svg className="w-12 h-12 text-zinc-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                  </svg>
                  <p className="text-zinc-500 text-sm">Select a server to start watching</p>
                </div>
              </div>
            )}
          </div>

          {/* Player controls bar */}
          <div className="bg-[#131c26] rounded-none lg:rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Now Playing</span>
              </div>
              <h3 className="text-sm font-bold text-white truncate">
                S{currentSeason} E{currentEpisode}
                {currentEp && ` - ${currentEp.name}`}
              </h3>
              <p className="text-xs text-zinc-500">{show?.name}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-1">Switch Server</span>
              {tmdbServers.map((server, idx) => (
                <button
                  key={server.id}
                  onClick={() => { setActiveServer(server.id); setIframeError(false); setUseDirectEmbed(true); }}
                  className={`server-pill text-[11px] py-1.5 px-3 ${activeServer === server.id ? "active" : ""}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: server.color }} />
                  Server {idx + 1}
                </button>
              ))}
              {/* Proxy / Direct toggle */}
              <button
                onClick={() => { setUseDirectEmbed(!useDirectEmbed); setIframeError(false); }}
                className={`ml-1 text-[10px] font-bold py-1.5 px-3 rounded-full transition-all ${
                  useDirectEmbed
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                    : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/15"
                }`}
                title={useDirectEmbed ? "Direct embed — bypasses proxy" : "Proxy mode — anti-sandbox enabled"}
              >
                {useDirectEmbed ? "Direct" : "Proxy"}
              </button>
            </div>
          </div>
        </div>

        {/* Episode Sidebar */}
        <div className="bg-[#131c26] rounded-none lg:rounded-xl overflow-hidden border border-white/[0.04]">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Episodes</h3>
            {show?.number_of_seasons && show.number_of_seasons > 1 && (
              <select
                value={currentSeason}
                onChange={e => {
                  const s = parseInt(e.target.value);
                  setCurrentSeason(s);
                  setCurrentEpisode(1);
                }}
                className="bg-[#0f0f1a] text-zinc-300 text-xs px-3 py-1.5 rounded-full border border-white/[0.06] outline-none focus:border-purple-500/30"
              >
                {Array.from({ length: show.number_of_seasons }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Season {i + 1}</option>
                ))}
              </select>
            )}
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {episodes?.episodes ? episodes.episodes.map(ep => (
              <button
                key={ep.id}
                onClick={() => {
                  setCurrentEpisode(ep.episode_number);
                  navigate({ page: "tv-watch", id: tvId, season: ep.season_number, episode: ep.episode_number });
                  setIframeError(false);
                }}
                className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                  currentEpisode === ep.episode_number
                    ? "bg-purple-500/10 border-l-3 border-purple-500"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                {/* Thumbnail */}
                <div className="w-24 h-14 rounded-lg overflow-hidden shrink-0 bg-[#0f0f1a] relative">
                  {ep.still_path ? (
                    <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">{ep.episode_number}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium line-clamp-1 ${currentEpisode === ep.episode_number ? "text-purple-300" : "text-zinc-300"}`}>{ep.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-purple-400 font-medium">EP {ep.episode_number}</span>
                    {ep.runtime && <span className="text-[9px] text-zinc-500">{ep.runtime}m</span>}
                  </div>
                </div>
                {currentEpisode === ep.episode_number && (
                  <svg className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                )}
              </button>
            )) : (
              Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-24 h-14 rounded-lg skeleton" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-32 skeleton rounded" />
                    <div className="h-2 w-16 skeleton rounded" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Info card below */}
      {show && (
        <div className="mt-4 glass-card rounded-xl p-4 -mx-4 lg:-mx-8">
          <div className="flex gap-4">
            {show.poster_path && (
              <img src={`https://image.tmdb.org/t/p/w185${show.poster_path}`} alt={show.name} className="w-20 h-28 rounded-lg shrink-0 object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">{show.name}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="badge-tv text-[9px] font-bold">TV SHOW</span>
                {show.number_of_seasons && <span className="text-xs text-zinc-400">{show.number_of_seasons} Season{show.number_of_seasons > 1 ? "s" : ""}</span>}
                {show.vote_average != null && show.vote_average > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    {/* TMDB vote_average: normalize from 0-100 to 0-10 if needed */}
                    <span className="text-[11px] font-bold">{(show.vote_average > 10 ? show.vote_average / 10 : show.vote_average).toFixed(1)}</span>
                  </span>
                )}
              </div>
              {show.overview && <p className="text-xs text-zinc-500 line-clamp-2 mt-2">{show.overview}</p>}
              {show.genres && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {show.genres.slice(0, 4).map(g => (
                    <span key={g.id} className="px-2.5 py-0.5 text-[9px] font-semibold rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/15">{g.name}</span>
                  ))}
                </div>
              )}
              <button onClick={() => navigate({ page: "tv-detail", id: tvId })}
                className="text-[11px] text-purple-400/70 hover:text-purple-400 mt-2 transition-colors font-medium">View Details →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
