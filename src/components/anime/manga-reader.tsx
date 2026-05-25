"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "./store";

interface ChapterPage {
  index: number;
  url: string;
  proxiedUrl?: string;
  width?: number;
  height?: number;
}

interface MangaReaderProps {
  mangaId: string;
  chapterId: string;
}

export default function MangaReader({ mangaId, chapterId }: MangaReaderProps) {
  const navigate = useAppStore(s => s.navigate);
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mangaTitle, setMangaTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [showControls, setShowControls] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load chapter pages
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [pagesRes, detailRes] = await Promise.all([
          fetch(`/api/manga/read?mangaId=${encodeURIComponent(mangaId)}&chapterId=${encodeURIComponent(chapterId)}`),
          fetch(`/api/manga/detail?id=${encodeURIComponent(mangaId)}`),
        ]);
        if (pagesRes.ok) {
          const data = await pagesRes.json();
          if (data.pages?.length > 0) {
            setPages(data.pages);
          } else {
            setError("No pages available for this chapter.");
          }
        } else {
          setError("Failed to load chapter pages.");
        }
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setMangaTitle(detail.englishTitle || detail.title || "");
          const chs = detail.chapters || [];
          setAllChapters(chs);
          const ch = chs.find((c: any) => c.id === chapterId);
          setChapterTitle(ch?.title || `Chapter ${ch?.number || chapterId}`);
        }
      } catch {
        setError("Failed to load chapter.");
      }
      setLoading(false);
    }
    load();
  }, [mangaId, chapterId]);

  // Find prev/next chapters
  const currentChapterIdx = allChapters.findIndex((c: any) => c.id === chapterId);
  const prevChapter = currentChapterIdx > 0 ? allChapters[currentChapterIdx - 1] : null;
  const nextChapter = currentChapterIdx < allChapters.length - 1 ? allChapters[currentChapterIdx + 1] : null;

  // Track scroll position for page counter
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollPos = container.scrollTop + container.clientHeight / 2;
    const images = container.querySelectorAll("img");
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.offsetTop <= scrollPos && img.offsetTop + img.clientHeight > scrollPos) {
        setCurrentPage(i);
        break;
      }
    }
  }, []);

  // Auto-hide controls
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const show = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), 4000);
    };
    window.addEventListener("mousemove", show);
    window.addEventListener("touchstart", show);
    return () => {
      window.removeEventListener("mousemove", show);
      window.removeEventListener("touchstart", show);
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] fade-in">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full border-2 border-red-600/20 border-t-red-500/60 animate-spin mx-auto" />
          <p className="text-red-300/60 text-xs font-medium">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] fade-in">
        <div className="text-center space-y-4">
          <svg className="w-10 h-10 text-rose-400/60 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-zinc-300 text-sm">{error}</p>
          <button
            onClick={() => navigate({ page: "manga-detail", id: mangaId })}
            className="pill-btn pill-btn-ghost text-xs"
          >
            Back to Manga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative fade-in -mx-4 lg:-mx-8">
      {/* Floating Controls Bar */}
      <div className={`fixed top-[85px] left-0 right-0 z-50 transition-all duration-300 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
          <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate({ page: "manga-detail", id: mangaId })}
                className="shrink-0 p-2 text-zinc-400 hover:text-white bg-white/[0.04] rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{mangaTitle}</p>
                <p className="text-[10px] text-zinc-400 truncate">{chapterTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {prevChapter && (
                <button
                  onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: prevChapter.id })}
                  className="p-2 text-zinc-400 hover:text-red-400 bg-white/[0.04] rounded-lg transition-colors"
                  title="Previous Chapter"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <span className="text-xs text-zinc-400 font-medium min-w-[60px] text-center">
                {currentPage + 1} / {pages.length}
              </span>
              {nextChapter && (
                <button
                  onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: nextChapter.id })}
                  className="p-2 text-zinc-400 hover:text-red-400 bg-white/[0.04] rounded-lg transition-colors"
                  title="Next Chapter"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav pill */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <div className="glass-pill rounded-full px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => {
              if (containerRef.current) {
                const imgs = containerRef.current.querySelectorAll("img");
                if (imgs[currentPage - 1]) imgs[currentPage - 1].scrollIntoView({ behavior: "smooth" });
              }
            }}
            disabled={currentPage <= 0}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs text-white font-medium min-w-[60px] text-center">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            onClick={() => {
              if (containerRef.current) {
                const imgs = containerRef.current.querySelectorAll("img");
                if (imgs[currentPage + 1]) imgs[currentPage + 1].scrollIntoView({ behavior: "smooth" });
              }
            }}
            disabled={currentPage >= pages.length - 1}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Vertical scrolling manga reader — FULL WIDTH */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[calc(100vh-75px)] overflow-y-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="max-w-4xl mx-auto">
          {pages.map((page, i) => (
            <div key={i} className="w-full">
              <img
                src={page.proxiedUrl || page.url}
                alt={`Page ${i + 1}`}
                className="w-full h-auto"
                loading={i < 3 ? "eager" : "lazy"}
                style={{ minHeight: "200px" }}
              />
            </div>
          ))}

          {/* Chapter end nav */}
          {pages.length > 0 && (
            <div className="py-8 text-center space-y-3">
              <p className="text-zinc-500 text-xs">End of {chapterTitle}</p>
              <div className="flex items-center justify-center gap-3">
                {prevChapter && (
                  <button
                    onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: prevChapter.id })}
                    className="pill-btn pill-btn-ghost text-xs"
                  >
                    ← Prev Chapter
                  </button>
                )}
                <button
                  onClick={() => navigate({ page: "manga-detail", id: mangaId })}
                  className="pill-btn text-xs"
                  style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)", color: "white" }}
                >
                  All Chapters
                </button>
                {nextChapter && (
                  <button
                    onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: nextChapter.id })}
                    className="pill-btn pill-btn-ghost text-xs"
                  >
                    Next Chapter →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
