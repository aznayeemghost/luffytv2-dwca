"use client";

import { useState } from "react";
import { useAppStore, getSectionNavLinks } from "./store";
import type { SectionSubPage } from "./store";

/* ─── Cat-on-Moon Mascot SVG (nav version — closed happy eyes) ─── */
function NavMascot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crescent moon */}
      <path d="M20 85 C20 45, 85 20, 95 55 C100 70, 90 90, 60 95 C35 98, 20 95, 20 85Z" fill="#7c6cf0" opacity="0.18"/>
      <path d="M30 82 C30 50, 80 30, 88 58 C92 68, 84 85, 58 90 C38 93, 30 90, 30 82Z" fill="#7c6cf0" opacity="0.25"/>
      {/* Cat body */}
      <ellipse cx="58" cy="62" rx="18" ry="16" fill="#e8e6f0"/>
      {/* Cat head */}
      <circle cx="58" cy="46" r="14" fill="#e8e6f0"/>
      {/* Cat ears */}
      <path d="M46 38 L42 22 L52 34 Z" fill="#e8e6f0"/>
      <path d="M70 38 L74 22 L64 34 Z" fill="#e8e6f0"/>
      <path d="M47 37 L44 25 L52 34 Z" fill="#d4c8f0"/>
      <path d="M69 37 L72 25 L64 34 Z" fill="#d4c8f0"/>
      {/* Closed happy eyes (upside-down U) */}
      <path d="M51 44 Q53 40 55 44" stroke="#2d1b69" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M61 44 Q63 40 65 44" stroke="#2d1b69" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Nose */}
      <ellipse cx="58" cy="48" rx="1.5" ry="1" fill="#d4a0c0"/>
      {/* Whiskers */}
      <line x1="44" y1="47" x2="52" y2="48" stroke="#c4b8d8" strokeWidth="0.7"/>
      <line x1="44" y1="50" x2="52" y2="49" stroke="#c4b8d8" strokeWidth="0.7"/>
      <line x1="64" y1="48" x2="72" y2="47" stroke="#c4b8d8" strokeWidth="0.7"/>
      <line x1="64" y1="49" x2="72" y2="50" stroke="#c4b8d8" strokeWidth="0.7"/>
      {/* Tail */}
      <path d="M76 62 Q85 55, 82 45 Q80 40, 78 42" stroke="#d4c8f0" strokeWidth="3" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Search Icon ─── */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function Navbar() {
  const { route, navigate, sectionSubPage, setSectionSubPage } = useAppStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ page: "search", query: searchQuery.trim() });
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  // Dynamic nav links — change based on current section
  const sectionLinks = getSectionNavLinks(route);
  const isInSection = sectionLinks.length > 0;

  // Default nav links (shown on home, features, contact, watchnow, etc.)
  const defaultNavLinks = [
    { id: "home", label: "Home" },
    { id: "guide", label: "Guide" },
    { id: "features", label: "Features" },
    { id: "contact", label: "Contact" },
  ];

  const navLinks = isInSection ? sectionLinks : defaultNavLinks;

  const isActive = (id: string) => {
    if (isInSection) {
      // Section sub-page active state
      const currentSub = sectionSubPage;
      return id === currentSub;
    }
    // Default nav active state
    if (id === "home" && route.page === "home") return true;
    if (id === "guide" && route.page === "guide") return true;
    if (id === "features" && route.page === "features") return true;
    if (id === "contact" && route.page === "contact") return true;
    return false;
  };

  const handleNav = (id: string) => {
    if (isInSection) {
      // Section sub-page navigation
      setSectionSubPage(id as SectionSubPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Default navigation
      if (id === "home") navigate({ page: "home" });
      else if (id === "guide") navigate({ page: "guide" });
      else if (id === "features") {
        if (route.page === "home") {
          const el = document.getElementById("features-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
          else navigate({ page: "home" });
        } else {
          navigate({ page: "features" });
        }
      }
      else if (id === "contact") navigate({ page: "contact" });
    }
    setMobileMenuOpen(false);
  };

  // Mobile bottom nav items
  const bottomNavItems = [
    { id: "home", label: "Home", icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )},
    { id: "guide", label: "Guide", icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )},
    { id: "watchnow", label: "Watch", icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    )},
    { id: "live", label: "Live TV", icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
        <polyline points="17 2 12 7 7 2" />
      </svg>
    )},
  ];

  const isBottomActive = (id: string) => {
    if (id === "home" && route.page === "home") return true;
    if (id === "guide" && route.page === "guide") return true;
    if (id === "watchnow" && route.page === "watchnow") return true;
    if (id === "watchnow" && ["dub", "movies", "tv", "manga", "anime", "watch", "movie-detail", "tv-detail", "movie-watch", "tv-watch", "manga-detail", "manga-read"].includes(route.page)) return true;
    if (id === "live" && ["live", "live-watch"].includes(route.page)) return true;
    return false;
  };

  const handleBottomNav = (id: string) => {
    if (id === "home") navigate({ page: "home" });
    else if (id === "guide") navigate({ page: "guide" });
    else if (id === "watchnow") navigate({ page: "watchnow" });
    else if (id === "live") navigate({ page: "live" });
  };

  return (
    <>
      {/* ═══════════════════════════════════════════
          FLOATING PILL NAVBAR — LunarAnime style
          Transparent glassmorphism, always visible
          ═══════════════════════════════════════════ */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        {/* Mascot floating above the pill */}
        <div className="lunar-mascot-float -mb-3 drop-shadow-[0_4px_12px_rgba(124,108,240,0.3)]">
          <NavMascot className="w-12 h-10 hidden sm:block" />
        </div>

        {/* Pill navbar */}
        <nav className="lunar-nav-pill px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Logo */}
          <button
            onClick={() => navigate({ page: "home" })}
            className="flex items-center gap-2 shrink-0 group"
          >
            <NavMascot className="w-7 h-6 sm:hidden group-hover:drop-shadow-[0_0_8px_rgba(124,108,240,0.5)] transition-all" />
            <span
              className="hidden sm:block text-sm font-bold tracking-wide"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              LUFFY <span className="text-[#7c6cf0]">TV</span>
            </span>
          </button>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 bg-white/10" />

          {/* Nav Links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold tracking-[0.06em] uppercase transition-all duration-200 ${
                  isActive(link.id)
                    ? "text-white bg-white/10"
                    : "text-white/45 hover:text-white hover:bg-white/[0.04]"
                }`}
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* CTA — Watch Now (purple + white) */}
          <button
            onClick={() => navigate({ page: "watchnow" })}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full text-[12px] font-bold tracking-[0.04em] uppercase bg-[#7c6cf0] text-white hover:bg-[#6b5ce0] hover:shadow-[0_0_20px_rgba(124,108,240,0.4)] transition-all"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Watch Now
          </button>

          {/* Mobile: search + hamburger */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-white/45 hover:text-white transition-colors"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/45 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen
                  ? <path d="M6 18L18 6M6 6l12 12" />
                  : <path d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE MENU OVERLAY
          ═══════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[#050507]/98 backdrop-blur-2xl pt-28 px-6 fade-in">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-6 right-6 p-2 text-white/40 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="space-y-2">
            {/* If in a section, show "Back to Home" first */}
            {isInSection && (
              <button
                onClick={() => { navigate({ page: "home" }); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold uppercase tracking-wider text-white/45 hover:text-white hover:bg-white/[0.04] transition-all"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
                Back to Home
              </button>
            )}
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all ${
                  isActive(link.id)
                    ? "text-white bg-white/8 border border-white/10"
                    : "text-white/45 hover:text-white hover:bg-white/[0.04]"
                }`}
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {link.label}
              </button>
            ))}
            {/* Watch Now CTA in mobile menu */}
            <button
              onClick={() => { navigate({ page: "watchnow" }); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-sm font-bold uppercase tracking-wider bg-[#7c6cf0] text-white hover:bg-[#6b5ce0] transition-all"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Watch Now
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          SEARCH MODAL
          ═══════════════════════════════════════════ */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-[#050507]/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl mx-4 bg-[#0d0d10] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.07]" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="flex items-center gap-3 p-4">
              <SearchIcon className="w-5 h-5 text-[#7c6cf0] shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search movies, TV shows, anime, manga..."
                className="flex-1 bg-transparent text-white placeholder-white/25 text-sm outline-none"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-[10px] text-white/25 bg-white/[0.06] px-2 py-1 rounded-md border border-white/[0.06]" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>ESC</button>
            </form>
            {searchQuery && (
              <div className="p-3 border-t border-white/[0.04]">
                <button
                  onClick={handleSearch}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-white/[0.04] rounded-lg transition-colors text-left"
                >
                  <SearchIcon className="w-4 h-4 text-white/25" />
                  <span className="text-sm text-white/45">Search for &quot;{searchQuery}&quot;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MOBILE BOTTOM NAV
          ═══════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d10]/95 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around py-2 px-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          {bottomNavItems.map(item => {
            const IconComp = item.icon;
            const active = isBottomActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleBottomNav(item.id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 ${item.id === "watchnow" ? "-mt-4" : ""}`}
              >
                {item.id === "watchnow" ? (
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${active ? "bg-[#7c6cf0] shadow-[0_0_16px_rgba(124,108,240,0.5)]" : "bg-[#7c6cf0]/80 shadow-[0_0_8px_rgba(124,108,240,0.3)]"}`}>
                    <IconComp />
                  </div>
                ) : (
                  <IconComp />
                )}
                <span
                  className={`text-[10px] font-bold tracking-wider ${active ? "text-[#7c6cf0]" : "text-white/25"}`}
                  style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <SearchIcon className="w-5 h-5 text-white/25" />
            <span
              className="text-[10px] font-bold tracking-wider text-white/25"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Search
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
