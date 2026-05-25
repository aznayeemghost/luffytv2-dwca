"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "./store";
import { getTmdbServers } from "@/lib/embed-servers";

interface MovieInfo {
  id: number;
  title: string;
  original_title?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  tagline?: string;
  status?: string;
  production_companies?: Array<{ id: number; name: string; logo_path?: string }>;
  external_ids?: { imdb_id?: string };
  credits?: {
    cast: Array<{ id: number; name: string; character?: string; profile_path?: string; order?: number }>;
    crew?: Array<{ id: number; name: string; job?: string; department?: string; profile_path?: string }>;
  };
  similar?: { results: Array<any> };
  recommendations?: { results: Array<any> };
}

export default function MovieWatchPage({ movieId }: { movieId: number }) {
  const navigate = useAppStore(s => s.navigate);
  const [movie, setMovie] = useState<MovieInfo | null>(null);
  const [activeServer, setActiveServer] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [useDirectEmbed, setUseDirectEmbed] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const tmdbServers = getTmdbServers();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tmdb/detail?id=${movieId}&type=movie`);
        if (res.ok) {
          const data = await res.json();
          setMovie(data);
          if (tmdbServers.length > 0) setActiveServer(tmdbServers[0].id);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [movieId]);

  const currentServer = tmdbServers.find(s => s.id === activeServer);
  const embedUrl = currentServer?.generateUrl({
    tmdbId: movieId, episode: 1, season: 0, translation: "sub",
  }) || "";

  const year = movie?.release_date?.split("-")[0];
  const hours = movie?.runtime ? Math.floor(movie.runtime / 60) : 0;
  const minutes = movie?.runtime ? movie.runtime % 60 : 0;
  const director = movie?.credits?.crew?.find(c => c.job === "Director");
  const topCast = movie?.credits?.cast?.slice(0, 8) || [];

  return (
    <div className="fade-in">
      {/* Immersive blurred background */}
      {movie?.backdrop_path && (
        <div className="immersive-bg" style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${movie.backdrop_path})` }} />
      )}

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
      <div className="bg-[#131c26] rounded-none lg:rounded-xl p-4 mt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Now Playing</span>
          </div>
          <h3 className="text-sm font-bold text-white truncate">{movie?.title || "Loading..."}</h3>
          {movie?.tagline && <p className="text-[10px] text-zinc-500 italic mt-0.5">&quot;{movie.tagline}&quot;</p>}
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

      {/* Info card below */}
      {movie && (
        <div className="mt-4 glass-card rounded-xl p-4">
          <div className="flex gap-4">
            {movie.poster_path && (
              <img src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`} alt={movie.title} className="w-24 h-36 rounded-lg shrink-0 object-cover border border-white/[0.06]" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">{movie.title}</h3>
              {movie.tagline && <p className="text-[11px] text-zinc-500 italic mt-0.5">&quot;{movie.tagline}&quot;</p>}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="badge-movie text-[9px] font-bold">MOVIE</span>
                {year && <span className="text-xs text-zinc-400">{year}</span>}
                {movie.runtime && <span className="text-xs text-zinc-400">{hours}h {minutes}m</span>}
                {movie.vote_average != null && movie.vote_average > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    {/* TMDB vote_average: normalize from 0-100 to 0-10 if needed */}
                    <span className="text-xs font-bold">{(movie.vote_average > 10 ? movie.vote_average / 10 : movie.vote_average).toFixed(1)}</span>
                    <span className="text-[9px] text-zinc-500">/ 10</span>
                  </span>
                )}
              </div>
              {movie.overview && <p className="text-xs text-zinc-400 line-clamp-3 mt-2 leading-relaxed">{movie.overview}</p>}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {movie.genres.map(g => (
                    <span key={g.id} className="px-2.5 py-0.5 text-[9px] font-semibold rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/15">{g.name}</span>
                  ))}
                </div>
              )}
              {director && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold">Director</span>
                  <span className="text-[11px] text-zinc-300 font-medium">{director.name}</span>
                </div>
              )}
              <button onClick={() => navigate({ page: "movie-detail", id: movie.id })}
                className="text-[11px] text-purple-400/70 hover:text-purple-400 mt-2 transition-colors font-medium">View Full Details →</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Cast */}
      {topCast.length > 0 && (
        <div className="mt-4 glass-card rounded-xl p-4">
          <h3 className="section-header text-sm font-bold text-white mb-3">Top Cast</h3>
          <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
            {topCast.map(person => (
              <div key={person.id} className="shrink-0 text-center w-[90px]">
                <div className="w-[80px] h-[80px] rounded-full bg-[#0f0f1a] overflow-hidden mx-auto mb-2 border-2 border-white/[0.06]">
                  {person.profile_path ? (
                    <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg text-zinc-600 font-semibold">
                      {person.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-zinc-300 font-medium line-clamp-1">{person.name}</p>
                {person.character && <p className="text-[8px] text-zinc-500 line-clamp-1">{person.character}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
