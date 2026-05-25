"use client";

import { useState, useEffect } from "react";
import { useAppStore, type TMDBContentItem } from "./store";
import AnimeCard from "./anime-card";

const CATEGORIES = [
  { id: "popular", label: "Popular" },
  { id: "top_rated", label: "Top Rated" },
  { id: "now_playing", label: "Now Playing" },
  { id: "upcoming", label: "Upcoming" },
];

const GENRES = [
  { id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" }, { id: 80, name: "Crime" }, { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" }, { id: 10751, name: "Family" }, { id: 14, name: "Fantasy" },
  { id: 36, name: "History" }, { id: 27, name: "Horror" }, { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" }, { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" },
  { id: 10770, name: "TV Movie" }, { id: 53, name: "Thriller" }, { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

export default function MoviesPage() {
  const [category, setCategory] = useState("popular");
  const [genre, setGenre] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState<TMDBContentItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          category: genre ? "discover" : category,
          page: String(page),
        });
        if (genre) params.set("genre", String(genre));
        const res = await fetch(`/api/tmdb/movies?${params}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setMovies(data.results || []);
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [category, genre, page]);

  const handleCategoryChange = (catId: string) => {
    setCategory(catId);
    setGenre(null);
    setPage(1);
  };

  const handleGenreChange = (gId: number | null) => {
    setGenre(gId);
    setPage(1);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Movies</h1>
        <p className="text-sm text-zinc-500 mt-1">Browse and watch movies from TMDB</p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scroll-container pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              category === cat.id && !genre
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Genre Filter */}
      <div className="flex items-center gap-2 overflow-x-auto scroll-container pb-2">
        <button
          onClick={() => handleGenreChange(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
            !genre ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/[0.03] text-zinc-500 hover:text-zinc-300 border border-white/[0.04]"
          }`}
        >
          All Genres
        </button>
        {GENRES.map(g => (
          <button
            key={g.id}
            onClick={() => handleGenreChange(g.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              genre === g.id ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/[0.03] text-zinc-500 hover:text-zinc-300 border border-white/[0.04]"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Movies Grid */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {movies.map((item, i) => (
            <AnimeCard key={item.id} tmdbItem={{ ...item, media_type: "movie" }} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl bg-[#111827] border border-white/[0.04]">
          <p className="text-zinc-400 text-sm">No movies found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm bg-white/[0.04] text-zinc-400 rounded-lg hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/[0.06]"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-400 px-3">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm bg-white/[0.04] text-zinc-400 rounded-lg hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/[0.06]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
