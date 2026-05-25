"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";

interface MangaChapter {
  id: string;
  title: string;
  number: number;
  date?: string;
  scanGroup?: string;
  pageCount?: number;
  pages?: number;
}

interface MangaDetailData {
  id: string;
  title: string;
  englishTitle?: string;
  altTitles?: string[];
  poster?: string;
  cover?: string;
  banner?: string;
  description?: string;
  type?: string;
  status?: string;
  year?: number;
  authors?: string | string[];
  artists?: string[];
  genres?: string[];
  isAdult?: boolean;
  anilistId?: number;
  malId?: number;
  totalChapters?: number;
  rating?: number;
  views?: number | string;
  chapters?: MangaChapter[];
  source?: string;
  slug?: string;
}

interface MangaDetailProps {
  mangaId: string;
}

export default function MangaDetailPage({ mangaId }: MangaDetailProps) {
  const navigate = useAppStore(s => s.navigate);
  const [manga, setManga] = useState<MangaDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapterSearch, setChapterSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFullDesc, setShowFullDesc] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/manga/detail?id=${encodeURIComponent(mangaId)}`);
        if (res.ok) {
          const data = await res.json();
          setManga(data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [mangaId]);

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="min-h-[70vh] skeleton rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] fade-in">
        <div className="text-center space-y-4">
          <svg className="w-16 h-16 text-zinc-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          <p className="text-zinc-400 text-lg font-medium">Manga not found</p>
          <button onClick={() => navigate({ page: "manga" })} className="pill-btn pill-btn-ghost">Back to Manga</button>
        </div>
      </div>
    );
  }

  const displayTitle = manga.englishTitle || manga.title;
  const poster = manga.poster || manga.cover || "";
  const bannerImg = manga.banner || poster;

  const authorsText = Array.isArray(manga.authors)
    ? manga.authors.join(", ")
    : (manga.authors || "Unknown");

  const filteredChapters = (manga.chapters || [])
    .filter(ch => {
      if (!chapterSearch) return true;
      const q = chapterSearch.toLowerCase();
      return ch.title.toLowerCase().includes(q) || String(ch.number).includes(q);
    })
    .sort((a, b) => sortOrder === "asc" ? a.number - b.number : b.number - a.number);

  const cleanDesc = manga.description ? manga.description.replace(/<[^>]*>/g, "") : "";
  const descTruncated = cleanDesc.length > 280 && !showFullDesc;
  const descDisplay = descTruncated ? cleanDesc.slice(0, 280) + "..." : cleanDesc;

  return (
    <div className="fade-in">
      {/* ═══ FULL-SCREEN HERO BANNER ═══ */}
      <div className="relative min-h-[85vh] -mt-[75px] overflow-hidden">
        {/* Background image with blur */}
        {bannerImg && (
          <img
            src={bannerImg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-sm opacity-30"
            key={`bg-${mangaId}`}
          />
        )}

        {/* Dark overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#05050a] via-[#05050a]/80 to-[#05050a]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-transparent to-[#05050a]/60" />

        {/* Content */}
        <div className="relative z-10 h-full min-h-[85vh] flex items-end pb-16 pt-[120px]">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 w-full">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-8">
              {/* Poster */}
              {poster && (
                <div className="shrink-0 hidden lg:block stagger-reveal stagger-1">
                  <div className="relative group">
                    <img
                      src={poster}
                      alt={displayTitle}
                      className="w-[220px] rounded-2xl shadow-2xl shadow-black/60 border border-white/[0.08] transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 space-y-4 min-w-0">
                {/* Badges */}
                <div className="stagger-reveal stagger-1 flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 text-[10px] font-bold rounded-md bg-red-600/20 text-red-400 border border-red-600/20">MANGA</span>
                  {manga.status && (
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-md border ${
                      manga.status.toLowerCase() === 'ongoing'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                        : manga.status.toLowerCase() === 'completed'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                    }`}>{manga.status}</span>
                  )}
                  {manga.type && (
                    <span className="px-3 py-1 text-[10px] font-bold rounded-md bg-white/[0.06] text-zinc-300 border border-white/[0.08]">{manga.type}</span>
                  )}
                  {manga.isAdult && (
                    <span className="px-3 py-1 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">18+</span>
                  )}
                </div>

                {/* Title */}
                <h1 className="stagger-reveal stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                  {displayTitle}
                </h1>

                {/* Alt title */}
                {manga.altTitles && manga.altTitles.length > 0 && (
                  <p className="stagger-reveal stagger-3 text-sm text-zinc-500 italic line-clamp-1">{manga.altTitles[0]}</p>
                )}

                {/* Meta row */}
                <div className="stagger-reveal stagger-3 flex items-center gap-4 text-sm text-zinc-400">
                  {authorsText && authorsText !== "Unknown" && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {authorsText}
                    </span>
                  )}
                  {manga.views && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {typeof manga.views === 'number' ? manga.views.toLocaleString() : manga.views}
                    </span>
                  )}
                </div>

                {/* Genres */}
                {manga.genres && manga.genres.length > 0 && (
                  <div className="stagger-reveal stagger-3 flex flex-wrap gap-1.5">
                    {manga.genres.slice(0, 8).map(g => (
                      <span key={g} className="px-2.5 py-0.5 text-[10px] font-medium bg-white/[0.05] text-zinc-300 rounded-full border border-white/[0.06]">{g}</span>
                    ))}
                  </div>
                )}

                {/* Description */}
                {cleanDesc && (
                  <div className="stagger-reveal stagger-4 max-w-2xl">
                    <p className="text-sm text-zinc-400 leading-relaxed">{descDisplay}</p>
                    {cleanDesc.length > 280 && (
                      <button
                        onClick={() => setShowFullDesc(!showFullDesc)}
                        className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors"
                      >
                        {showFullDesc ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
                  {filteredChapters.length > 0 && (
                    <button
                      onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: filteredChapters[0].id })}
                      className="pill-btn px-6 py-2.5 text-sm font-bold rounded-full flex items-center gap-2"
                      style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)", boxShadow: "0 4px 20px rgba(220, 38, 38, 0.4)" }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                      </svg>
                      Read Ch.{filteredChapters[0].number}
                    </button>
                  )}
                  {filteredChapters.length > 1 && (
                    <button
                      onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: filteredChapters[filteredChapters.length - 1].id })}
                      className="pill-btn pill-btn-ghost px-5 py-2.5 text-sm rounded-full flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Latest Ch.{filteredChapters[filteredChapters.length - 1].number}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ INFO CARDS ═══ */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {authorsText && authorsText !== "Unknown" && (
          <div className="bg-[#0a0a14] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Author</p>
            <p className="text-xs text-white font-medium line-clamp-2">{authorsText}</p>
          </div>
        )}
        {manga.status && (
          <div className="bg-[#0a0a14] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Status</p>
            <p className="text-xs text-white font-medium">{manga.status}</p>
          </div>
        )}
        <div className="bg-[#0a0a14] rounded-xl p-4 border border-white/[0.04]">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Chapters</p>
          <p className="text-xs text-white font-medium">{manga.totalChapters || manga.chapters?.length || "—"}</p>
        </div>
        {manga.type && (
          <div className="bg-[#0a0a14] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Type</p>
            <p className="text-xs text-white font-medium">{manga.type}</p>
          </div>
        )}
        {manga.anilistId && (
          <div className="bg-[#0a0a14] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">AniList</p>
            <p className="text-xs text-purple-400 font-medium">{manga.anilistId}</p>
          </div>
        )}
        {manga.source && (
          <div className="bg-[#0a0a14] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Source</p>
            <p className="text-xs text-white font-medium capitalize">{manga.source}</p>
          </div>
        )}
      </div>

      {/* ═══ MOBILE POSTER (shown on small screens below hero) ═══ */}
      {poster && (
        <div className="lg:hidden mt-6 flex justify-center">
          <img src={poster} alt={displayTitle} className="w-[140px] rounded-xl shadow-2xl shadow-black/50 border border-white/[0.08]" />
        </div>
      )}

      {/* ═══ CHAPTERS LIST ═══ */}
      <div className="mt-10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="section-header flex items-center gap-2">
            <div className="w-1 h-5 bg-red-600 rounded-full" />
            <h3 className="text-sm font-bold text-white">CHAPTERS</h3>
            <span className="text-[10px] text-zinc-500">({filteredChapters.length})</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search chapters..."
                value={chapterSearch}
                onChange={e => setChapterSearch(e.target.value)}
                className="h-8 pl-8 pr-3 bg-[#0f0f1a] border border-white/[0.06] rounded-lg text-xs text-white placeholder-zinc-500 outline-none focus:border-red-500/30 w-[160px] transition-colors"
              />
            </div>
            {/* Sort toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-[#0f0f1a] border border-white/[0.06] rounded-lg text-zinc-400 hover:text-white hover:border-red-600/20 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d={sortOrder === "asc" ? "M3 4h13M3 8h9M3 12h5" : "M3 4h5M3 8h9M3 12h13"} />
                <path d="M17 9l4 4-4 4" />
              </svg>
              {sortOrder === "asc" ? "Oldest" : "Newest"}
            </button>
          </div>
        </div>

        {filteredChapters.length > 0 ? (
          <div className="max-h-[700px] overflow-y-auto bg-[#0d1520] rounded-2xl border border-white/[0.04]">
            {filteredChapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: ch.id })}
                className="w-full flex items-center gap-4 p-4 text-left transition-all hover:bg-white/[0.02] border-b border-white/[0.03] last:border-0 group"
              >
                <div className="w-11 h-11 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0 group-hover:bg-red-600/20 transition-colors">
                  <span className="text-xs font-bold text-red-400">{ch.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-300 line-clamp-1 group-hover:text-white transition-colors">{ch.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {ch.scanGroup && <span className="text-[9px] text-zinc-500">{ch.scanGroup}</span>}
                    {ch.date && <span className="text-[9px] text-zinc-600">{new Date(ch.date).toLocaleDateString()}</span>}
                    {ch.pageCount != null && <span className="text-[9px] text-zinc-600">{ch.pageCount} pages</span>}
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-red-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#0d1520] rounded-2xl border border-white/[0.04]">
            <svg className="w-10 h-10 text-zinc-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <p className="text-zinc-500 text-sm">{chapterSearch ? "No matching chapters" : "No chapters available yet"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
