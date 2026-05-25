"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";
import AnimeCard from "./anime-card";
import type { TMDBContentItem } from "./store";

interface TVDetail {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  networks?: Array<{ id: number; name: string; logo_path?: string }>;
  seasons?: Array<{
    id: number; name: string; season_number: number;
    episode_count: number; poster_path?: string; air_date?: string;
  }>;
  credits?: {
    cast: Array<{ id: number; name: string; character?: string; profile_path?: string; order?: number }>;
  };
  videos?: { results: Array<{ id: string; key: string; name: string; site: string; type: string }> };
  similar?: { results: TMDBContentItem[] };
  recommendations?: { results: TMDBContentItem[] };
  external_ids?: { imdb_id?: string };
  episode_run_time?: number[];
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

export default function TVDetailPage({ tvId }: { tvId: number }) {
  const navigate = useAppStore(s => s.navigate);
  const [show, setShow] = useState<TVDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<SeasonEpisodes | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tmdb/detail?id=${tvId}&type=tv`);
        if (res.ok) {
          const data = await res.json();
          setShow(data);
          if (data.number_of_seasons) setSelectedSeason(1);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [tvId]);

  // Load season episodes
  useEffect(() => {
    if (!tvId || !selectedSeason) return;
    async function loadSeason() {
      try {
        const res = await fetch(`/api/tmdb/season?tvId=${tvId}&season=${selectedSeason}`);
        if (res.ok) setEpisodes(await res.json());
      } catch { /* ignore */ }
    }
    loadSeason();
  }, [tvId, selectedSeason]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="min-h-[90vh] skeleton" />
        <div className="flex gap-6">
          <div className="w-[220px] aspect-[2/3] skeleton rounded-xl shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-64 skeleton rounded" />
            <div className="h-4 w-40 skeleton rounded" />
            <div className="h-20 skeleton rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!show) {
    return <div className="text-center py-20"><p className="text-zinc-400">TV show not found</p></div>;
  }

  const trailer = show.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
  const year = show.first_air_date?.split("-")[0];

  return (
    <div className="space-y-8 fade-in">
      {/* Hero Section — 90vh */}
      <div className="relative min-h-[90vh] -mt-[75px] overflow-hidden">
        {show.backdrop_path && (
          <img src={`https://image.tmdb.org/t/p/w1280${show.backdrop_path}`} alt={show.name} className="absolute inset-0 w-full h-full object-cover ken-burns" />
        )}

        {/* Trailer background */}
        {showTrailer && trailer && (
          <div className="absolute inset-0 z-10 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&playlist=${trailer.key}&controls=0&showinfo=0&modestbranding=1`}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
              style={{ filter: "brightness(0.7)" }}
            />
          </div>
        )}

        {/* Dual gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#05050a]/50 to-[#05050a]/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-[#05050a]/40 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
          <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-end gap-8">
            {/* Left: Info */}
            <div className="flex-1 space-y-4">
              {/* Meta badges */}
              <div className="stagger-reveal stagger-1 flex items-center gap-2 flex-wrap">
                {show.vote_average != null && show.vote_average > 0 && (
                  <span className="badge-score text-[11px] font-bold inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {/* TMDB vote_average: normalize from 0-100 to 0-10 if needed */}
                    {(show.vote_average > 10 ? show.vote_average / 10 : show.vote_average).toFixed(1)}
                  </span>
                )}
                {year && <span className="badge-type text-[10px] font-bold">{year}</span>}
                {show.number_of_seasons && <span className="badge-type text-[10px] font-bold">{show.number_of_seasons} Season{show.number_of_seasons > 1 ? "s" : ""}</span>}
                <span className="badge-tv text-[10px] font-bold">TV SHOW</span>
              </div>

              <h1 className="stagger-reveal stagger-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-white line-clamp-2">{show.name}</h1>
              {show.tagline && <p className="stagger-reveal stagger-3 text-sm text-zinc-400 italic">&quot;{show.tagline}&quot;</p>}

              {/* Genre tags */}
              {show.genres && show.genres.length > 0 && (
                <div className="stagger-reveal stagger-4 flex flex-wrap gap-2">
                  {show.genres.map(g => (
                    <span key={g.id} className="px-3 py-1 text-xs font-medium bg-violet-500/10 text-violet-300 rounded-full border border-violet-500/20">{g.name}</span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
                <button
                  onClick={() => navigate({ page: "tv-watch", id: show.id, season: 1, episode: 1 })}
                  className="pill-btn pill-btn-primary"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Watch Now
                </button>
                {trailer && (
                  <button
                    onClick={() => setShowTrailer(!showTrailer)}
                    className="pill-btn pill-btn-ghost"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {showTrailer ? "Hide Trailer" : "Trailer"}
                  </button>
                )}
                <button className="pill-btn pill-btn-ghost">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  Add to List
                </button>
              </div>
            </div>

            {/* Right: 3D tilted poster */}
            {show.poster_path && (
              <div className="stagger-reveal stagger-4 hidden lg:block shrink-0">
                <img
                  src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                  alt={show.name}
                  className="w-[260px] rounded-xl poster-3d"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Poster (mobile) */}
        <div className="shrink-0 lg:hidden">
          {show.poster_path && (
            <img src={`https://image.tmdb.org/t/p/w500${show.poster_path}`} alt={show.name} className="w-[180px] rounded-xl shadow-2xl shadow-black/50 mx-auto" />
          )}
        </div>

        <div className="flex-1 space-y-6">
          {/* Overview */}
          {show.overview && (
            <div>
              <h3 className="section-header text-sm font-semibold text-zinc-300 mb-2">Overview</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{show.overview}</p>
            </div>
          )}

          {/* Networks */}
          {show.networks && show.networks.length > 0 && (
            <div>
              <h3 className="section-header text-sm font-semibold text-zinc-300 mb-2">Networks</h3>
              <div className="flex gap-3">
                {show.networks.map(n => (
                  <div key={n.id} className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                    {n.logo_path && <img src={`https://image.tmdb.org/t/p/w92${n.logo_path}`} alt={n.name} className="h-4" />}
                    {!n.logo_path && <span className="text-xs text-zinc-400">{n.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cast */}
          {show.credits?.cast && show.credits.cast.length > 0 && (
            <div>
              <h3 className="section-header text-sm font-semibold text-zinc-300 mb-3">Top Cast</h3>
              <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
                {show.credits.cast.slice(0, 12).map(person => (
                  <div key={person.id} className="shrink-0 text-center w-[110px]">
                    <div className="w-[110px] h-[110px] rounded-full bg-[#0f0f1a] overflow-hidden mx-auto mb-2 border-2 border-white/[0.06]">
                      {person.profile_path ? (
                        <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-zinc-600 font-semibold">
                          {person.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-300 font-medium line-clamp-1">{person.name}</p>
                    {person.character && <p className="text-[9px] text-zinc-500 line-clamp-1">{person.character}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seasons & Episodes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="section-header">
            <h3 className="text-lg font-bold text-white">Episodes</h3>
          </div>
          {show.number_of_seasons && show.number_of_seasons > 1 && (
            <select
              value={selectedSeason}
              onChange={e => setSelectedSeason(parseInt(e.target.value))}
              className="bg-[#0f0f1a] text-zinc-300 text-sm px-4 py-2 rounded-full border border-white/[0.06] outline-none focus:border-violet-500/30"
            >
              {Array.from({ length: show.number_of_seasons }, (_, i) => (
                <option key={i + 1} value={i + 1}>Season {i + 1}</option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-2">
          {episodes?.episodes ? episodes.episodes.map(ep => (
            <button
              key={ep.id}
              onClick={() => navigate({ page: "tv-watch", id: show.id, season: ep.season_number, episode: ep.episode_number })}
              className="episode-item w-full flex items-center gap-4 p-3 rounded-xl text-left hover:bg-violet-500/[0.06] transition-all group"
            >
              {/* Thumbnail or episode number */}
              <div className="w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-[#0f0f1a] relative">
                {ep.still_path ? (
                  <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-500">{ep.episode_number}</div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <svg className="w-8 h-8 text-violet-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 line-clamp-1">{ep.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-violet-400 font-medium">EP {ep.episode_number}</span>
                  {ep.runtime && <span className="text-[10px] text-zinc-500">{ep.runtime}m</span>}
                  {ep.air_date && <span className="text-[10px] text-zinc-600">{ep.air_date}</span>}
                </div>
                {ep.overview && <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{ep.overview}</p>}
              </div>
            </button>
          )) : (
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <div className="w-28 h-16 rounded-lg skeleton" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-48 skeleton rounded" />
                  <div className="h-3 w-24 skeleton rounded" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Similar */}
      {show.similar?.results && show.similar.results.length > 0 && (
        <section className="space-y-3">
          <div className="section-header">
            <h3 className="text-lg font-bold text-white">You May Also Like</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {show.similar.results.slice(0, 12).map((item, i) => (
              <AnimeCard key={item.id} tmdbItem={{ ...item, media_type: "tv" }} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {show.recommendations?.results && show.recommendations.results.length > 0 && (
        <section className="space-y-3">
          <div className="section-header">
            <h3 className="text-lg font-bold text-white">More Like This</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {show.recommendations.results.slice(0, 12).map((item, i) => (
              <AnimeCard key={item.id} tmdbItem={{ ...item, media_type: "tv" }} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
