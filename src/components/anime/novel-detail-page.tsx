"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";

// ============================================================
// NOVEL DETAIL PAGE — Novel info + chapter list
// ============================================================

interface Chapter {
  id: string;
  title: string;
  number: number;
  url: string;
  releaseDate: string;
}

interface NovelDetailData {
  id: string;
  title: string;
  cover: string;
  author: string;
  artist: string;
  genres: string[];
  rating: number;
  status: string;
  description: string;
  chapters: Chapter[];
  source: string;
  sourceId: string;
  url: string;
}

interface NovelDetailProps {
  novelId: string;
  novelTitle: string;
  novelCover: string;
  novelAuthor: string;
  novelSource: string;
}

const genreColors: Record<string, string> = {
  Action: "#ef4444", Adventure: "#22c55e", Comedy: "#f59e0b", Drama: "#3b82f6",
  Fantasy: "#a855f7", Harem: "#ec4899", Isekai: "#6366f1", "Martial Arts": "#f97316",
  Mystery: "#06b6d4", Romance: "#f472b6", "Sci-Fi": "#10b981", "Slice of Life": "#84cc16",
  Supernatural: "#8b5cf6", Horror: "#dc2626", Historical: "#92400e", Mecha: "#0ea5e9",
  Psychological: "#be185d", Seinen: "#475569", Shounen: "#f59e0b", Wuxia: "#b45309",
  Xianxia: "#7c3aed", Xuanhuan: "#0891b2", Josei: "#db2777", Shoujo: "#f472b6",
};

export default function NovelDetailPage({ novelId, novelTitle, novelCover, novelAuthor, novelSource }: NovelDetailProps) {
  const navigate = useAppStore(s => s.navigate);
  const [detail, setDetail] = useState<NovelDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chapterSearch, setChapterSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const chaptersPerPage = 50;

  // Fetch novel detail
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/novel/detail?id=${encodeURIComponent(novelId)}&source=${novelSource}`);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        setDetail(data);
      } catch (err: any) {
        setError(err.message || "Failed to load novel details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [novelId, novelSource]);

  // Filter and sort chapters
  const filteredChapters = detail?.chapters
    ? [...detail.chapters]
        .filter(ch => !chapterSearch || ch.title.toLowerCase().includes(chapterSearch.toLowerCase()) || String(ch.number).includes(chapterSearch))
        .sort((a, b) => sortOrder === "asc" ? a.number - b.number : b.number - a.number)
    : [];

  const totalPages = Math.ceil(filteredChapters.length / chaptersPerPage);
  const paginatedChapters = filteredChapters.slice((page - 1) * chaptersPerPage, page * chaptersPerPage);

  // Handle chapter click
  const handleChapterClick = (chapter: Chapter) => {
    navigate({
      page: "novel-read",
      novelId: novelId,
      novelTitle: detail?.title || novelTitle,
      chapterId: chapter.id,
      chapterNum: chapter.number,
      chapterTitle: chapter.title,
      totalChapters: detail?.chapters.length || 0,
      novelSource: novelSource,
    } as any);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* ── Back button ── */}
      <button
        onClick={() => navigate({ page: "novel" } as any)}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          Back to Novels
        </span>
      </button>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#a855f7]/30 border-t-[#a855f7] animate-spin" />
          <p className="text-sm text-white/30">Loading novel details...</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-sm text-white/50">{error}</p>
          <button onClick={() => navigate({ page: "novel" } as any)} className="px-4 py-2 rounded-full bg-[#a855f7] text-white text-[11px] font-bold uppercase tracking-wider">
            Go Back
          </button>
        </div>
      )}

      {/* ── Novel info ── */}
      {!loading && !error && (detail || novelTitle) && (
        <>
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            {/* Cover */}
            <div className="w-32 h-48 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
              {detail?.cover || novelCover ? (
                <img
                  src={detail?.cover || novelCover}
                  alt={detail?.title || novelTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <svg className="w-12 h-12 text-white/15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1
                className="text-xl sm:text-2xl font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {detail?.title || novelTitle}
              </h1>

              {detail?.author && (
                <p className="text-sm text-white/40 mb-3">by {detail.author}</p>
              )}

              {/* Genres */}
              {detail?.genres && detail.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {detail.genres.map(g => (
                    <span
                      key={g}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${genreColors[g] || "#6b7280"}15`,
                        color: genreColors[g] || "#6b7280",
                      }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4">
                {(detail?.rating || 0) > 0 && (
                  <span className="flex items-center gap-1 text-sm text-amber-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    {detail?.rating}
                  </span>
                )}
                <span className="text-[11px] text-white/30">
                  {detail?.chapters?.length || 0} chapters
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${detail?.status === "Completed" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>
                  {detail?.status || "Unknown"}
                </span>
              </div>

              {/* Description */}
              {detail?.description && (
                <p className="text-sm text-white/40 leading-relaxed line-clamp-4">
                  {detail.description}
                </p>
              )}

              {/* Source badge */}
              <div className="mt-3">
                <span className="text-[10px] text-white/20">Source: {detail?.source || novelSource}</span>
              </div>
            </div>
          </div>

          {/* ── Start Reading button ── */}
          {detail?.chapters && detail.chapters.length > 0 && (
            <button
              onClick={() => handleChapterClick(detail.chapters[0])}
              className="w-full py-4 rounded-xl bg-[#a855f7] text-white text-[13px] font-bold uppercase tracking-wider hover:bg-[#9333ea] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all mb-8"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
                Start Reading — Chapter 1
              </span>
            </button>
          )}

          {/* ── Chapter list ── */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-sm font-bold text-white/70 uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                >
                  Chapters ({filteredChapters.length})
                </h3>
                <button
                  onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/50 text-[10px] font-bold transition-all"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    {sortOrder === "asc" ? <path d="M3 4h18M3 12h12M3 20h6" /> : <path d="M3 4h18M7 12h14M11 20h10" />}
                  </svg>
                  {sortOrder === "asc" ? "Oldest" : "Latest"}
                </button>
              </div>

              {/* Chapter search */}
              <input
                value={chapterSearch}
                onChange={e => { setChapterSearch(e.target.value); setPage(1); }}
                placeholder="Search chapters..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-[#a855f7]/30 transition-all"
              />
            </div>

            {/* Chapter list */}
            <div className="max-h-[500px] overflow-y-auto">
              {paginatedChapters.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => handleChapterClick(ch)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] border-b border-white/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/20 font-mono w-8 text-right">{ch.number}</span>
                    <span className="text-sm text-white/70 hover:text-white transition-colors">{ch.title}</span>
                  </div>
                  <svg className="w-3 h-3 text-white/15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-white/[0.04] flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg bg-white/[0.04] text-white/30 text-[11px] font-bold disabled:opacity-30 hover:bg-white/[0.06] transition-all"
                >
                  Prev
                </button>
                <span className="text-[11px] text-white/25">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded-lg bg-white/[0.04] text-white/30 text-[11px] font-bold disabled:opacity-30 hover:bg-white/[0.06] transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
