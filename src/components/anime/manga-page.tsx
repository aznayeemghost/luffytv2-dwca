"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "./store";

interface MangaEntry {
  id: string;
  title: string;
  englishTitle?: string;
  poster?: string;
  cover?: string;
  type?: string;
  status?: string;
  year?: number;
  isAdult?: boolean;
  genres?: string[];
  source?: string;
}

interface MangaSection {
  title: string;
  type: string;
  items: MangaEntry[];
}

export default function MangaPage() {
  const navigate = useAppStore(s => s.navigate);
  const [sections, setSections] = useState<MangaSection[]>([]);
  const [searchResults, setSearchResults] = useState<MangaEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/manga/home");
        if (res.ok) {
          const data = await res.json();
          setSections(data.sections || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchMode(false);
      setSearchResults([]);
      return;
    }
    setSearchMode(true);
    setSearching(true);
    try {
      const res = await fetch(`/api/manga/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => handleSearch(value), 500);
  };

  if (loading) {
    return (
      <div className="space-y-8 fade-in">
        <div className="h-10 w-48 skeleton rounded-lg" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-600/25">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manga</h1>
            <p className="text-xs text-zinc-500">Browse thousands of manga — powered by Atsumaru</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search manga by title, author..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-[#0f0f1a] border border-white/[0.06] rounded-xl text-sm text-white placeholder-zinc-500 outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all"
          />
          {searching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchMode ? (
        <div className="space-y-4">
          <div className="section-header flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Search Results</h2>
            <span className="text-xs text-zinc-500">({searchResults.length} found)</span>
          </div>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {searchResults.map(manga => (
                <MangaCard key={manga.id} manga={manga} onClick={() => navigate({ page: "manga-detail", id: manga.id })} />
              ))}
            </div>
          ) : !searching ? (
            <div className="text-center py-20 bg-[#0a0a14] rounded-2xl border border-white/[0.04]">
              <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-zinc-400 text-sm">No manga found for &quot;{searchQuery}&quot;</p>
              <p className="text-zinc-600 text-xs mt-1">Try a different search term</p>
            </div>
          ) : null}
        </div>
      ) : (
        /* Home Sections */
        sections.map((section, si) => (
          <div key={si} className="space-y-3">
            <div className="section-header flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{section.title}</h2>
              <span className="text-xs text-zinc-500">({section.items.length})</span>
            </div>
            {section.items.length > 0 ? (
              <div className="scroll-container flex gap-3 overflow-x-auto pb-3">
                {section.items.map(manga => (
                  <div key={manga.id} className="shrink-0 w-[130px] sm:w-[145px] lg:w-[155px]">
                    <MangaCard manga={manga} onClick={() => navigate({ page: "manga-detail", id: manga.id })} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-[#0a0a14] rounded-xl border border-white/[0.04]">
                <p className="text-zinc-500 text-xs">No manga in this section</p>
              </div>
            )}
          </div>
        ))
      )}

      {/* Empty State */}
      {!searchMode && sections.length === 0 && (
        <div className="text-center py-24 bg-[#0a0a14] rounded-2xl border border-white/[0.04]">
          <svg className="w-14 h-14 text-zinc-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          <p className="text-zinc-400 text-sm">No manga available right now</p>
          <p className="text-zinc-600 text-xs mt-1">Try searching for a title!</p>
        </div>
      )}
    </div>
  );
}

function MangaCard({ manga, onClick }: { manga: MangaEntry; onClick: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const displayTitle = manga.englishTitle || manga.title;
  const poster = manga.poster || manga.cover || "";

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      className="content-card group text-left w-full focus-ring"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#0f0f1a] rounded-xl">
        {!imgLoaded && <div className="absolute inset-0 skeleton" />}
        {poster && (
          <img
            src={poster}
            alt={displayTitle}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />
        )}
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#05050a] via-[#05050a]/60 to-transparent opacity-80 group-hover:opacity-0 transition-opacity duration-300" />
        <div className="absolute inset-x-0 bottom-0 p-2.5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
          <h3 className="text-[11px] font-semibold text-white line-clamp-2 leading-tight drop-shadow-lg">{displayTitle}</h3>
        </div>
        {/* Type badge */}
        <div className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-red-600/80 text-white backdrop-blur-sm z-10">
          {manga.type || "MANGA"}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-[#05050a]/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight mb-1.5">{displayTitle}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {manga.year && <span className="text-[10px] text-zinc-400">{manga.year}</span>}
            {manga.status && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-red-600/20 text-red-300">{manga.status}</span>}
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-full transition-all shadow-lg shadow-red-600/25">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            Read
          </span>
        </div>
      </div>
    </div>
  );
}
