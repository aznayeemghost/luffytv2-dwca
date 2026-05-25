"use client";

import { useEffect, useState, useSyncExternalStore, useMemo, useRef, useCallback, Component, ReactNode } from "react";
import { useAppStore, parseHash } from "@/components/anime/store";
import Navbar from "@/components/anime/navbar";
import HomePage from "@/components/anime/home-page";
import SearchPage from "@/components/anime/search-page";
import AnimeDetailPage from "@/components/anime/anime-detail";
import WatchPage from "@/components/anime/watch-page";
import GenrePage from "@/components/anime/genre-page";
import BookmarksPage from "@/components/anime/bookmarks-page";
import HistoryPage from "@/components/anime/history-page";
import AnimeSectionPage from "@/components/anime/anime-section-page";
import MoviesPage from "@/components/anime/movies-page";
import TVPage from "@/components/anime/tv-page";
import MovieDetailPage from "@/components/anime/movie-detail";
import TVDetailPage from "@/components/anime/tv-detail";
import MovieWatchPage from "@/components/anime/movie-watch";
import TVWatchPage from "@/components/anime/tv-watch";
import MangaPage from "@/components/anime/manga-page";
import MangaDetailPage from "@/components/anime/manga-detail";
import MangaReader from "@/components/anime/manga-reader";
import WatchNowPage from "@/components/anime/watchnow-page";
import ContactPage from "@/components/anime/contact-page";
import GuidePage from "@/components/anime/guide-page";
import LivePage from "@/components/anime/live-page";
import LiveWatchPage from "@/components/anime/live-watch-page";
import NovelPage from "@/components/anime/novel-page";
import NovelDetailPage from "@/components/anime/novel-detail-page";
import NovelReaderPage from "@/components/anime/novel-reader-page";

// Error Boundary — catches client-side crashes gracefully
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: "" };
  static getDerivedStateFromError(err: any) {
    return { hasError: true, error: err?.message || String(err) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center bg-[#05050a]">
          <div className="text-center space-y-4 max-w-md px-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-zinc-400">{this.state.error}</p>
            <button onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }} className="pill-btn pill-btn-primary">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// ================================================================
// LUFFY TV CINEMATIC INTRO — Netflix/Crunchyroll style
// Dark bg → glow → letters reveal with light sweep → shimmer → fade
// ================================================================

function LuffyIntro({ onComplete }: { onComplete: () => void }) {
  const onCompleteRef = useRef(onComplete);
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => { onCompleteRef.current = onComplete; });

  const skip = useCallback(() => {
    setPhase("exit");
    setTimeout(() => onCompleteRef.current(), 600);
  }, []);

  useEffect(() => {
    // enter → hold after letters are in
    const t1 = setTimeout(() => setPhase("hold"), 1800);
    // hold → exit
    const t2 = setTimeout(() => {
      setPhase("exit");
      setTimeout(() => onCompleteRef.current(), 700);
    }, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "exit" && false) return null; // keep mounted for animation

  return (
    <div className={`ltv-intro ltv-phase-${phase}`}>
      {/* Ambient glow behind text */}
      <div className="ltv-glow" />

      {/* Floating particles */}
      <div className="ltv-particles">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="ltv-particle" style={{
            '--x': `${Math.random() * 100}%`,
            '--y': `${Math.random() * 100}%`,
            '--d': `${2 + Math.random() * 3}s`,
            '--delay': `${Math.random() * 2}s`,
            '--size': `${1 + Math.random() * 2}px`,
          } as React.CSSProperties} />
        ))}
      </div>

      {/* Logo text */}
      <div className="ltv-logo-wrap">
        <div className="ltv-letters">
          {['L','U','F','F','Y'].map((c, i) => (
            <span key={i} className="ltv-ltr ltv-ltr-brand" style={{ '--i': i } as React.CSSProperties}>{c}</span>
          ))}
          <span className="ltv-space" />
          {['T','V'].map((c, i) => (
            <span key={i+5} className="ltv-ltr ltv-ltr-white" style={{ '--i': i + 5 } as React.CSSProperties}>{c}</span>
          ))}
        </div>
        {/* Light sweep across text */}
        <div className="ltv-sweep" />
      </div>

      {/* Tagline */}
      <div className="ltv-tagline">
        <span>Stream. Watch. Enjoy.</span>
      </div>

      <button onClick={skip} className="ltv-skip" aria-label="Skip intro">Skip</button>
    </div>
  );
}

export default function MainPage() {
  const { route, navigate } = useAppStore();
  const mounted = useMounted();
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  // Hash-based routing
  useEffect(() => {
    const handleHash = () => {
      const newRoute = parseHash(window.location.hash);
      const current = useAppStore.getState().route;
      if (JSON.stringify(current) !== JSON.stringify(newRoute)) {
        useAppStore.setState({ route: newRoute });
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        navigate({ page: "search" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const handleSplashComplete = () => {
    setSplashComplete(true);
    setTimeout(() => setShowSplash(false), 400);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#7c6cf0]/20 flex items-center justify-center mx-auto animate-pulse">
            <svg className="w-6 h-6 text-[#7c6cf0]" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-[#7c6cf0] text-sm font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>LUFFY TV</p>
            <p className="text-white/20 text-xs" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Loading...</p>
          </div>
          <div className="w-32 h-1 bg-white/[0.04] mx-auto rounded-full overflow-hidden">
            <div className="h-full bg-[#7c6cf0]/40 animate-pulse rounded-full" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  const isWatchPage = route.page === "watch" || route.page === "movie-watch" || route.page === "tv-watch" || route.page === "live-watch";
  const isMangaReader = route.page === "manga-read" || route.page === "novel-read";

  const renderPage = () => {
    switch (route.page) {
      case "home": return <HomePage />;
      case "search": return <SearchPage initialQuery={route.query} />;
      case "anime": return <AnimeDetailPage animeId={route.id} />;
      case "watch": return <WatchPage animeId={route.id} episodeNum={route.episode} />;
      case "genre": return <GenrePage genre={route.genre} />;
      case "dub": return <AnimeSectionPage />;
      case "bookmarks": return <BookmarksPage />;
      case "history": return <HistoryPage />;
      case "movies": return <MoviesPage />;
      case "tv": return <TVPage />;
      case "manga": return <MangaPage />;
      case "manga-detail": return <MangaDetailPage mangaId={route.id} />;
      case "manga-read": return <MangaReader mangaId={route.id} chapterId={route.chapterId} />;
      case "movie-detail": return <MovieDetailPage movieId={route.id} />;
      case "tv-detail": return <TVDetailPage tvId={route.id} />;
      case "movie-watch": return <MovieWatchPage movieId={route.id} />;
      case "tv-watch": return <TVWatchPage tvId={route.id} season={route.season} episode={route.episode} />;
      case "watchnow": return <WatchNowPage />;
      case "contact": return <ContactPage />;
      case "guide": return <GuidePage />;
      case "live": return <LivePage />;
      case "live-watch": return <LiveWatchPage matchId={route.matchId} matchTitle={route.matchTitle} matchSport={route.matchSport} matchSportName={route.matchSportName} matchHomeTeam={route.matchHomeTeam} matchAwayTeam={route.matchAwayTeam} matchHomeBadge={route.matchHomeBadge} matchAwayBadge={route.matchAwayBadge} matchPoster={route.matchPoster} matchPopular={route.matchPopular} matchSources={route.matchSources} matchDate={route.matchDate} matchSportsrcCategory={(route as any).matchSportsrcCategory} matchSportsrcId={(route as any).matchSportsrcId} />;
      case "novel": return <NovelPage />;
      case "novel-detail": return <NovelDetailPage novelId={route.novelId} novelTitle={route.novelTitle} novelCover={route.novelCover} novelAuthor={route.novelAuthor} novelSource={route.novelSource} />;
      case "novel-read": return <NovelReaderPage novelId={route.novelId} novelTitle={route.novelTitle} chapterId={route.chapterId} chapterNum={route.chapterNum} chapterTitle={route.chapterTitle} totalChapters={route.totalChapters} novelSource={route.novelSource} />;
      case "features": {
        // Scroll to features section after rendering home page
        setTimeout(() => {
          const el = document.getElementById("features-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 300);
        return <HomePage />;
      }
      default: return <HomePage />;
    }
  };

  return (
    <>
      {/* Splash Screen */}
      {showSplash && (
        <div className={splashComplete ? "splash-scale-out" : ""}>
          <LuffyIntro onComplete={handleSplashComplete} />
        </div>
      )}

      {/* Main Content */}
      <ErrorBoundary>
      <div className={`min-h-screen bg-[#050507] flex flex-col ${!showSplash ? "content-reveal" : "opacity-0"}`}>
        {!isWatchPage && !isMangaReader && <Navbar />}
        <main className={`max-w-[1400px] mx-auto px-4 lg:px-8 ${isWatchPage || isMangaReader ? '' : 'pt-[75px]'} ${isWatchPage || isMangaReader ? "" : "pb-24 lg:pb-12"} flex-1`}>
          {renderPage()}
        </main>
        {!isWatchPage && !isMangaReader && (
          <footer className="border-t border-white/[0.06] mt-16 bg-[#050507]">
            <div className="max-w-[1200px] mx-auto px-6 py-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Logo */}
                <button onClick={() => navigate({ page: "home" })} className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                    LUFFY <span className="text-[#7c6cf0]">TV</span>
                  </span>
                </button>
                {/* Links */}
                <div className="flex items-center gap-6">
                  {[
                    { label: "Home", page: "home" as const },
                    { label: "Guide", page: "guide" as const },
                    { label: "Watch Now", page: "watchnow" as const },
                    { label: "Features", page: "features" as const },
                    { label: "Contact", page: "contact" as const },
                  ].map(link => (
                    <button
                      key={link.label}
                      onClick={() => navigate({ page: link.page })}
                      className="text-[11px] font-bold tracking-[0.06em] uppercase text-white/25 hover:text-white/60 transition-colors"
                      style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lunar-divider mt-6 mb-4" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-[10px] text-white/15" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>&copy; {new Date().getFullYear()} Luffy TV</p>
                <p className="text-[10px] text-white/10" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Powered by TMDB &amp; AniList</p>
              </div>
            </div>
          </footer>
        )}
      </div>
      </ErrorBoundary>
    </>
  );
}
