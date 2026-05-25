"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";
import AnimeCard from "./anime-card";
import type { TMDBContentItem } from "./store";

interface MovieDetail {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  release_date?: string;
  runtime?: number;
  status?: string;
  tagline?: string;
  production_companies?: Array<{ id: number; name: string; logo_path?: string }>;
  credits?: {
    cast: Array<{ id: number; name: string; character?: string; profile_path?: string; order?: number }>;
    crew?: Array<{ id: number; name: string; job?: string; department?: string; profile_path?: string }>;
  };
  videos?: { results: Array<{ id: string; key: string; name: string; site: string; type: string }> };
  similar?: { results: TMDBContentItem[] };
  recommendations?: { results: TMDBContentItem[] };
  external_ids?: { imdb_id?: string };
  belongs_to_collection?: { id: number; name: string; poster_path?: string; backdrop_path?: string };
}

export default function MovieDetailPage({ movieId }: { movieId: number }) {
  const navigate = useAppStore(s => s.navigate);
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tmdb/detail?id=${movieId}&type=movie`);
        if (res.ok) setMovie(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [movieId]);

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

  if (!movie) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Movie not found</p>
      </div>
    );
  }

  const trailer = movie.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
  const year = movie.release_date?.split("-")[0];
  const hours = movie.runtime ? Math.floor(movie.runtime / 60) : 0;
  const minutes = movie.runtime ? movie.runtime % 60 : 0;
  const director = movie.credits?.crew?.find(c => c.job === "Director");

  return (
    <div className="space-y-8 fade-in">
      {/* Hero Section — 90vh, overlaps navbar */}
      <div className="relative min-h-[90vh] -mt-[75px] overflow-hidden">
        {/* Backdrop image */}
        {movie.backdrop_path && (
          <img
            src={`https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover ken-burns"
          />
        )}

        {/* Trailer as background */}
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

        {/* Content — 2 column */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
          <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-end gap-8">
            {/* Left: Info */}
            <div className="flex-1 space-y-4">
              {/* Score + meta badges */}
              <div className="stagger-reveal stagger-1 flex items-center gap-2 flex-wrap">
                {movie.vote_average != null && movie.vote_average > 0 && (
                  <span className="badge-score text-[11px] font-bold inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {/* TMDB vote_average: normalize from 0-100 to 0-10 if needed */}
                    {(movie.vote_average > 10 ? movie.vote_average / 10 : movie.vote_average).toFixed(1)}
                  </span>
                )}
                {year && <span className="badge-type text-[10px] font-bold">{year}</span>}
                <span className="badge-quality text-[10px] font-bold">HD</span>
                {movie.runtime && <span className="badge-type text-[10px] font-bold">{hours}h {minutes}m</span>}
                <span className="badge-movie text-[10px] font-bold">MOVIE</span>
              </div>

              {/* Title */}
              <h1 className="stagger-reveal stagger-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-white line-clamp-2">{movie.title}</h1>

              {/* Tagline */}
              {movie.tagline && <p className="stagger-reveal stagger-3 text-sm text-zinc-400 italic">&quot;{movie.tagline}&quot;</p>}

              {/* Genre text */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="stagger-reveal stagger-4 flex flex-wrap gap-2">
                  {movie.genres.map(g => (
                    <span key={g.id} className="px-3 py-1 text-xs font-medium bg-violet-500/10 text-violet-300 rounded-full border border-violet-500/20">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
                <button
                  onClick={() => navigate({ page: "movie-watch", id: movie.id })}
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
                <button
                  className="pill-btn pill-btn-ghost"
                  onClick={() => {}}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  Add to List
                </button>
              </div>
            </div>

            {/* Right: 3D tilted poster */}
            {movie.poster_path && (
              <div className="stagger-reveal stagger-4 hidden lg:block shrink-0">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
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
          {movie.poster_path && (
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              className="w-[180px] rounded-xl shadow-2xl shadow-black/50 mx-auto"
            />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 space-y-6">
          {/* Overview */}
          {movie.overview && (
            <div>
              <h3 className="section-header text-sm font-semibold text-zinc-300 mb-2">Overview</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{movie.overview}</p>
            </div>
          )}

          {/* Director */}
          {director && (
            <div>
              <h3 className="section-header text-sm font-semibold text-zinc-300 mb-1">Director</h3>
              <p className="text-sm text-zinc-400">{director.name}</p>
            </div>
          )}

          {/* Cast — horizontal scroll with circular photos */}
          {movie.credits?.cast && movie.credits.cast.length > 0 && (
            <div>
              <h3 className="section-header text-sm font-semibold text-zinc-300 mb-3">Top Cast</h3>
              <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
                {movie.credits.cast.slice(0, 12).map(person => (
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

          {/* Production */}
          {movie.production_companies && movie.production_companies.length > 0 && (
            <div>
              <h3 className="section-header text-sm font-semibold text-zinc-300 mb-1">Production</h3>
              <p className="text-xs text-zinc-500">{movie.production_companies.map(c => c.name).join(" • ")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Similar Movies */}
      {movie.similar?.results && movie.similar.results.length > 0 && (
        <section className="space-y-3">
          <div className="section-header">
            <h3 className="text-lg font-bold text-white">You May Also Like</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {movie.similar.results.slice(0, 12).map((item, i) => (
              <AnimeCard key={item.id} tmdbItem={{ ...item, media_type: "movie" }} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {movie.recommendations?.results && movie.recommendations.results.length > 0 && (
        <section className="space-y-3">
          <div className="section-header">
            <h3 className="text-lg font-bold text-white">More Like This</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {movie.recommendations.results.slice(0, 12).map((item, i) => (
              <AnimeCard key={item.id} tmdbItem={{ ...item, media_type: "movie" }} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
