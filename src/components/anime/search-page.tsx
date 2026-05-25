"use client";

import { useState, useEffect } from "react";
import { useAppStore, type TMDBContentItem, type AnimeItem } from "./store";
import AnimeCard from "./anime-card";
import type { MiruroAnimeResult } from "@/lib/miruro-api";

interface SearchPageProps {
  initialQuery?: string;
}

export default function SearchPage({ initialQuery }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery || "");
  const [activeTab, setActiveTab] = useState<"all" | "anime" | "movies" | "tv">("all");
  const [animeResults, setAnimeResults] = useState<AnimeItem[]>([]);
  const [miruroResults, setMiruroResults] = useState<MiruroAnimeResult[]>([]);
  const [anilistResults, setAnilistResults] = useState<MiruroAnimeResult[]>([]);
  const [tmdbResults, setTmdbResults] = useState<TMDBContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);

    const promises: Promise<void>[] = [];

    // Search anime (always)
    if (activeTab === "all" || activeTab === "anime") {
      promises.push(
        fetch(`/api/anime/search?q=${encodeURIComponent(q)}&page=1`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) {
              setAnimeResults(data.results || []);
              setMiruroResults(data.miruroResults || []);
              setAnilistResults((data.anilistResults || []).map((item: any) => ({
                id: item.id,
                title: { romaji: item.title?.romaji, english: item.title?.english, native: item.title?.native },
                coverImage: { extraLarge: item.coverImage?.extraLarge, large: item.coverImage?.large, medium: item.coverImage?.medium },
                bannerImage: item.bannerImage,
                type: item.type,
                format: item.format,
                status: item.status,
                episodes: item.episodes,
                genres: item.genres,
                averageScore: item.averageScore,
                popularity: item.popularity,
                season: item.season,
                seasonYear: item.seasonYear,
                description: item.description,
              })));
            }
          })
          .catch(() => {})
      );
    }

    // Search TMDB (always)
    if (activeTab === "all" || activeTab === "movies" || activeTab === "tv") {
      const searchType = activeTab === "movies" ? "movie" : activeTab === "tv" ? "tv" : "multi";
      promises.push(
        fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}&type=${searchType}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.results) setTmdbResults(data.results);
          })
          .catch(() => {})
      );
    }

    await Promise.all(promises);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (query.trim()) {
      // Clear results and re-search
      setAnimeResults([]);
      setMiruroResults([]);
      setAnilistResults([]);

      setTmdbResults([]);
      performSearch(query);
    }
  };

  const totalResults = anilistResults.length + miruroResults.length + animeResults.length + tmdbResults.length;

  return (
    <div className="space-y-6 fade-in">
      {/* Search Input */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search anime, movies, TV shows..."
            className="w-full pl-10 pr-4 py-3 bg-[#111827] border border-white/[0.06] rounded-xl text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/30 focus:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all"
          />
        </form>

        {/* Search Type Tabs */}
        <div className="flex items-center gap-2 mt-3">
          {(["all", "anime", "movies", "tv"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === tab
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              {tab === "all" ? "All" : tab === "anime" ? "Anime" : tab === "movies" ? "Movies" : "TV Shows"}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
          ))}
        </div>
      ) : totalResults > 0 ? (
        <div className="space-y-6">
          <p className="text-xs text-zinc-500">{totalResults} results found</p>

          {/* TMDB Results */}
          {tmdbResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">
                {activeTab === "movies" ? "Movies" : activeTab === "tv" ? "TV Shows" : "Movies & TV Shows"}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {tmdbResults.map((item, i) => (
                  <AnimeCard key={`tmdb-${item.id}`} tmdbItem={item} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Anime Results — AniList PRIMARY */}
          {(anilistResults.length > 0 || miruroResults.length > 0 || animeResults.length > 0) && (activeTab === "all" || activeTab === "anime") && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">Anime <span className="text-[10px] text-purple-500 ml-1">via AniList</span></h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {anilistResults.map((item, i) => (
                  <AnimeCard key={`al-${item.id}`} anime={item} index={i} />
                ))}
                {miruroResults.filter(mr => !anilistResults.some(ar => ar.id === mr.id)).map((item, i) => (
                  <AnimeCard key={`miruro-${item.id}`} anime={item} index={anilistResults.length + i} />
                ))}
                {animeResults.map((item, i) => (
                  <AnimeCard key={`allanime-${item._id}`} anime={item} index={anilistResults.length + miruroResults.length + i} />
                ))}
              </div>
            </div>
          )}

          {/* Anime search uses AniList primary, Miruro + Official MAL API as backup */}
        </div>
      ) : query && searched && totalResults === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[#111827] border border-white/[0.04] p-8">
          <p className="text-zinc-400 text-sm">No results found for &quot;{query}&quot;</p>
          <p className="text-zinc-600 text-xs mt-2">Try a different search term</p>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="bg-[#111827] rounded-2xl px-8 py-6 inline-block border border-white/[0.04]">
            <p className="text-zinc-500 text-sm">Type to search for anime, movies, and TV shows</p>
          </div>
        </div>
      )}
    </div>
  );
}
