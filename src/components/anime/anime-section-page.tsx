"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "./store";
import ContentCard from "./anime-card";
import type { MiruroAnimeResult } from "@/lib/miruro-api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

type DiscoverTab = "trending" | "popular" | "topRated";

interface FeaturedAnime {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  bannerImage?: string;
  coverImage?: { extraLarge?: string; large?: string; medium?: string; color?: string };
  description?: string;
  type?: string;
  format?: string;
  episodes?: number;
  averageScore?: number;
  genres?: string[];
  season?: string;
  seasonYear?: number;
  status?: string;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function mapAniListToMiruro(items: any[]): MiruroAnimeResult[] {
  return items.map(item => {
    if (!item) return { id: 0, title: { romaji: "Unknown" } };
    return {
      id: item.id || 0,
      title: {
        romaji: typeof item.title?.romaji === "string" ? item.title.romaji : undefined,
        english: typeof item.title?.english === "string" ? item.title.english : undefined,
        native: typeof item.title?.native === "string" ? item.title.native : undefined,
      },
      coverImage: item.coverImage ? {
        extraLarge: typeof item.coverImage.extraLarge === "string" ? item.coverImage.extraLarge : undefined,
        large: typeof item.coverImage.large === "string" ? item.coverImage.large : undefined,
        medium: typeof item.coverImage.medium === "string" ? item.coverImage.medium : undefined,
        color: typeof item.coverImage.color === "string" ? item.coverImage.color : undefined,
      } : undefined,
      bannerImage: typeof item.bannerImage === "string" ? item.bannerImage : undefined,
      type: typeof item.type === "string" ? item.type : undefined,
      format: typeof item.format === "string" ? item.format : undefined,
      status: typeof item.status === "string" ? item.status : undefined,
      description: typeof item.description === "string" ? item.description : undefined,
      season: typeof item.season === "string" ? item.season : undefined,
      seasonYear: typeof item.seasonYear === "number" ? item.seasonYear : undefined,
      episodes: typeof item.episodes === "number" ? item.episodes : undefined,
      duration: typeof item.duration === "number" ? item.duration : undefined,
      genres: Array.isArray(item.genres) ? item.genres.filter((g: any) => typeof g === "string") : undefined,
      averageScore: typeof item.averageScore === "number" ? item.averageScore : undefined,
      popularity: typeof item.popularity === "number" ? item.popularity : undefined,
      trending: typeof item.trending === "number" ? item.trending : undefined,
      countryOfOrigin: typeof item.countryOfOrigin === "string" ? item.countryOfOrigin : undefined,
      isAdult: !!item.isAdult,
    };
  });
}

const ANIME_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
  "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports",
  "Supernatural", "Thriller", "Ecchi", "Mecha", "Psychological",
  "Shounen", "Seinen", "Shoujo", "Isekai",
];

const GENRE_COLORS: Record<string, string> = {
  Action: "#ef4444", Adventure: "#f59e0b", Comedy: "#eab308",
  Drama: "#6366f1", Fantasy: "#8b5cf6", Horror: "#dc2626",
  Mystery: "#0ea5e9", Romance: "#ec4899", "Sci-Fi": "#06b6d4",
  "Slice of Life": "#10b981", Sports: "#22c55e", Supernatural: "#a855f7",
  Thriller: "#f97316", Ecchi: "#f43f5e", Mecha: "#64748b",
  Psychological: "#8b5cf6", Shounen: "#ef4444", Seinen: "#6366f1",
  Shoujo: "#ec4899", Isekai: "#8b5cf6",
};

/* ═══════════════════════════════════════════════════════════════
   HORIZONTAL SCROLL SECTION
   ═══════════════════════════════════════════════════════════════ */

function HorizontalSection({ title, icon, children, viewAllAction }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  viewAllAction?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === "left" ? -500 : 500, behavior: "smooth" });
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {icon}
          <h2 className="text-lg sm:text-xl font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllAction && (
            <button onClick={viewAllAction} className="text-[11px] font-bold uppercase tracking-wider text-[#7c6cf0]/70 hover:text-[#7c6cf0] transition-colors mr-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              View All
            </button>
          )}
          <button onClick={() => scroll("left")} className="p-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => scroll("right")} className="p-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="scroll-container flex gap-3 overflow-x-auto pb-2">
        {children}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURED BANNER — Rotating hero with anime info
   ═══════════════════════════════════════════════════════════════ */

function FeaturedBanner({ items }: { items: FeaturedAnime[] }) {
  const [current, setCurrent] = useState(0);
  const navigate = useAppStore(s => s.navigate);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [items.length]);

  const anime = items[current];
  if (!anime) return null;

  const title = anime.title?.english || anime.title?.romaji || "Unknown";
  const banner = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || "";
  const score = anime.averageScore;
  const status = anime.status;
  const format = anime.format;

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[440px] rounded-2xl overflow-hidden mb-8 group">
      {/* Banner image */}
      {banner && (
        <img
          src={banner}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-1000"
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-[#050507]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          {format && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-[#7c6cf0]/20 text-[#7c6cf0] border border-[#7c6cf0]/20">
              {format}
            </span>
          )}
          {score && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              {score}%
            </span>
          )}
          {anime.seasonYear && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/[0.06] text-white/50 border border-white/[0.06]">
              {anime.seasonYear}
            </span>
          )}
          {anime.episodes && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/[0.06] text-white/50 border border-white/[0.06]">
              {anime.episodes} eps
            </span>
          )}
          {status === "RELEASING" && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 animate-pulse">
              Releasing
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 line-clamp-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          {title}
        </h2>

        {/* Description */}
        {anime.description && (
          <p className="text-[13px] text-white/50 line-clamp-2 max-w-lg mb-4" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
            {anime.description.replace(/<[^>]+>/g, "").slice(0, 180)}...
          </p>
        )}

        {/* Genres */}
        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {anime.genres.slice(0, 4).map(g => (
              <span key={g} className="px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{
                color: GENRE_COLORS[g] || "#7c6cf0",
                borderColor: `${GENRE_COLORS[g] || "#7c6cf0"}25`,
                backgroundColor: `${GENRE_COLORS[g] || "#7c6cf0"}10`,
              }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ page: "watch", id: String(anime.id), episode: 1 })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7c6cf0] text-white text-[12px] font-bold uppercase tracking-wider hover:bg-[#6b5ce0] hover:shadow-[0_0_20px_rgba(124,108,240,0.4)] transition-all"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Watch Now
          </button>
          <button
            onClick={() => navigate({ page: "anime", id: String(anime.id) })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] text-white text-[12px] font-bold uppercase tracking-wider border border-white/[0.1] hover:bg-white/[0.12] transition-all"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Details
          </button>
        </div>
      </div>

      {/* Slide indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-6 flex items-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? "w-6 bg-[#7c6cf0]" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
            />
          ))}
        </div>
      )}

      {/* Navigation arrows */}
      <button
        onClick={() => setCurrent(prev => (prev - 1 + items.length) % items.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/50 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <button
        onClick={() => setCurrent(prev => (prev + 1) % items.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/50 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOP 10 LIST — Ranked anime entries
   ═══════════════════════════════════════════════════════════════ */

function Top10List({ items }: { items: MiruroAnimeResult[] }) {
  const navigate = useAppStore(s => s.navigate);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2.5 mb-4">
        <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        <h2 className="text-lg sm:text-xl font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          Top 10 Anime
        </h2>
      </div>
      <div className="space-y-2">
        {items.slice(0, 10).map((anime, i) => {
          const title = anime.title?.english || anime.title?.romaji || "Unknown";
          const image = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium || "";
          const score = anime.averageScore;
          const type = anime.format || anime.type;
          const episodes = anime.episodes;
          const status = anime.status;

          return (
            <button
              key={`${anime.id}-${i}`}
              onClick={() => navigate({ page: "anime", id: String(anime.id) })}
              className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all group text-left"
            >
              {/* Rank */}
              <span className="text-2xl sm:text-3xl font-black text-white/10 shrink-0 w-10 text-center" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Poster */}
              <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-[#0f0f1a]">
                {image && (
                  <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#7c6cf0] transition-colors">
                  {title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {type && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#7c6cf0]/15 text-[#7c6cf0]">
                      {type}
                    </span>
                  )}
                  {anime.seasonYear && (
                    <span className="text-[10px] text-white/30">{anime.seasonYear}</span>
                  )}
                  {episodes && (
                    <span className="text-[10px] text-white/30">{episodes} eps</span>
                  )}
                  {status === "RELEASING" && (
                    <span className="text-[10px] font-bold text-emerald-400">Releasing</span>
                  )}
                </div>
              </div>

              {/* Score */}
              {score && (
                <div className="flex items-center gap-1 shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <span className="text-xs font-bold text-emerald-400">{score}%</span>
                </div>
              )}

              {/* Play icon */}
              <div className="shrink-0 p-2 rounded-full bg-white/[0.04] group-hover:bg-[#7c6cf0]/20 text-white/20 group-hover:text-[#7c6cf0] transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCHEDULE SUB-PAGE — Day-by-day airing schedule
   ═══════════════════════════════════════════════════════════════ */

function SchedulePage() {
  const navigate = useAppStore(s => s.navigate);
  const [schedule, setSchedule] = useState<Record<string, any[]>>({});
  const [days, setDays] = useState<string[]>([]);
  const [activeDay, setActiveDay] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/anime/anilist-schedule");
        if (res.ok) {
          const data = await res.json();
          setSchedule(data.schedule || {});
          setDays(data.days || []);
          if (data.days?.length > 0) {
            // Default to today or first available day
            const today = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
            setActiveDay(data.days.includes(today) ? today : data.days[0]);
          }
        }
      } catch (err) {
        console.error("[Schedule] Load error:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const dayEntries = activeDay ? (schedule[activeDay] || []) : [];

  // Get date string for a day
  const getDateForDay = (dayName: string): string => {
    const entries = schedule[dayName];
    if (entries && entries.length > 0) return entries[0].dateStr;
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-[#7c6cf0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
            Airing Schedule
          </h2>
          <p className="text-[12px] text-white/30" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
            Track your favorite anime releases in chronological order
          </p>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-container">
        {days.map(day => {
          const dateStr = getDateForDay(day);
          const count = (schedule[day] || []).length;
          const isActive = activeDay === day;

          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all ${
                isActive
                  ? "bg-[#7c6cf0]/15 border-[#7c6cf0]/25 text-white"
                  : "bg-white/[0.02] border-white/[0.04] text-white/40 hover:bg-white/[0.05] hover:text-white/70"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                {day}
              </span>
              {dateStr && (
                <span className="text-[9px] text-white/20">{dateStr}</span>
              )}
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.04] text-white/25"}`}>
                  {count} RELEASING
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule entries */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-16 skeleton rounded-lg h-5" />
              <div className="w-12 h-16 skeleton rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="w-48 h-4 skeleton rounded" />
                <div className="w-32 h-3 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : dayEntries.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] rounded-xl border border-white/[0.04]">
          <svg className="w-12 h-12 mx-auto text-white/10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-white/30 text-sm">No episodes scheduled for this day</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEntries.map((entry: any) => {
            const media = entry.media;
            if (!media) return null;
            const title = media.title?.english || media.title?.romaji || "Unknown";
            const image = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || "";
            const score = media.averageScore;
            const type = media.format || media.type;
            const duration = media.duration;
            const genres = media.genres || [];
            const status = media.status;

            return (
              <div
                key={entry.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group"
              >
                {/* Time */}
                <div className="shrink-0 w-14 text-center pt-1">
                  <span className="text-sm font-bold text-white/50" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                    {entry.airTime}
                  </span>
                </div>

                {/* Poster */}
                <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-[#0f0f1a]">
                  {image && <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#7c6cf0]/15 text-[#7c6cf0]">
                      EP {entry.episode}
                    </span>
                    {status === "RELEASING" && (
                      <span className="text-[10px] font-bold text-emerald-400">Airing</span>
                    )}
                  </div>
                  <h3
                    className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#7c6cf0] transition-colors cursor-pointer"
                    onClick={() => navigate({ page: "anime", id: String(media.id) })}
                  >
                    {title}
                  </h3>

                  <div className="flex items-center gap-2 mt-1">
                    {type && (
                      <span className="text-[9px] font-bold text-white/25 uppercase">{type}</span>
                    )}
                    {duration && (
                      <span className="text-[9px] text-white/20">{duration}min</span>
                    )}
                    {score && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        {score}%
                      </span>
                    )}
                  </div>

                  {/* Genres */}
                  {genres.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {genres.slice(0, 3).map((g: string) => (
                        <span key={g} className="px-2 py-0.5 rounded-full text-[9px] font-bold border" style={{
                          color: GENRE_COLORS[g] || "#7c6cf0",
                          borderColor: `${GENRE_COLORS[g] || "#7c6cf0"}20`,
                          backgroundColor: `${GENRE_COLORS[g] || "#7c6cf0"}08`,
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Watch button */}
                <button
                  onClick={() => navigate({ page: "watch", id: String(media.id), episode: entry.episode })}
                  className="shrink-0 mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7c6cf0] text-white text-[11px] font-bold hover:bg-[#6b5ce0] hover:shadow-[0_0_16px_rgba(124,108,240,0.3)] transition-all"
                  style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Watch
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BROWSE GENRES SUB-PAGE
   ═══════════════════════════════════════════════════════════════ */

function BrowseGenresPage() {
  const navigate = useAppStore(s => s.navigate);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreResults, setGenreResults] = useState<MiruroAnimeResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedGenre) { setGenreResults([]); return; }
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/anime/genre?genre=${encodeURIComponent(selectedGenre)}`);
        if (res.ok) {
          const data = await res.json();
          setGenreResults((data.anime || data.results || []).map((a: any) => ({
            id: a.id || a._id || 0,
            title: {
              romaji: typeof a.name === "string" ? a.name : "Unknown",
              english: typeof (a.englishName || a.name) === "string" ? (a.englishName || a.name) : "Unknown",
            },
            coverImage: a.thumbnail ? { extraLarge: a.thumbnail, large: a.thumbnail } : undefined,
            averageScore: typeof a.score === "number" ? Math.round(a.score * 10) : undefined,
            type: typeof a.type === "string" ? a.type : undefined,
            status: typeof a.status === "string" ? a.status : undefined,
            genres: Array.isArray(a.genres) ? a.genres.filter((g: any) => typeof g === "string") : undefined,
          })));
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [selectedGenre]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-[#7c6cf0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          Browse Genres
        </h2>
      </div>

      {/* Genre grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {ANIME_GENRES.map(genre => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
            className={`group relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:scale-[1.02] ${
              selectedGenre === genre
                ? "bg-white/[0.06] border-white/[0.12]"
                : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
            }`}
          >
            {/* Glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
              style={{ background: `radial-gradient(ellipse at center, ${(GENRE_COLORS[genre] || "#7c6cf0")}15 0%, transparent 70%)` }}
            />
            <span
              className="relative z-[1] text-sm font-bold transition-colors"
              style={{
                fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                color: selectedGenre === genre ? (GENRE_COLORS[genre] || "#7c6cf0") : "rgba(255,255,255,0.5)",
              }}
            >
              {genre}
            </span>
          </button>
        ))}
      </div>

      {/* Genre results */}
      {selectedGenre && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              {selectedGenre} Anime
            </h3>
            <span className="text-xs text-white/25">({genreResults.length})</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
              ))}
            </div>
          ) : genreResults.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {genreResults.map((anime, i) => (
                <div key={`${anime.id}-${i}`} className="shrink-0">
                  <ContentCard anime={anime} index={i} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              <p className="text-white/25 text-sm">No anime found for this genre</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN ANIME SECTION PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function AnimeSectionPage() {
  const navigate = useAppStore(s => s.navigate);
  const subPage = useAppStore(s => s.sectionSubPage);
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [featured, setFeatured] = useState<FeaturedAnime[]>([]);
  const [trending, setTrending] = useState<MiruroAnimeResult[]>([]);
  const [popular, setPopular] = useState<MiruroAnimeResult[]>([]);
  const [topRated, setTopRated] = useState<MiruroAnimeResult[]>([]);
  const [thisSeason, setThisSeason] = useState<MiruroAnimeResult[]>([]);
  const [nextSeason, setNextSeason] = useState<MiruroAnimeResult[]>([]);
  const [topThisYear, setTopThisYear] = useState<MiruroAnimeResult[]>([]);
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>("trending");
  const [loading, setLoading] = useState(true);

  // Load all data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [trendingRes, seasonRes] = await Promise.all([
          fetch("/api/anime/anilist-trending").catch(() => null),
          fetch("/api/anime/anilist-trending?section=season").catch(() => null),
        ]);

        let tData: any = null;
        if (trendingRes?.ok) {
          try { tData = await trendingRes.json(); } catch { tData = null; }
        }

        let sData: any = null;
        if (seasonRes?.ok) {
          try { sData = await seasonRes.json(); } catch { sData = null; }
        }

        // Trending
        const trendingData = tData?.trending || [];
        if (trendingData.length > 0) {
          setTrending(mapAniListToMiruro(trendingData));
          // Use first 5 as featured banner items
          setFeatured(trendingData.slice(0, 5).filter((a: any) => a.bannerImage || a.coverImage?.extraLarge));
        }

        // Popular
        const popularData = tData?.popular || [];
        if (popularData.length > 0) {
          setPopular(mapAniListToMiruro(popularData));
        }

        // Top Rated
        const topRatedData = tData?.topRated || [];
        if (topRatedData.length > 0) {
          setTopRated(mapAniListToMiruro(topRatedData));
          // Use top rated for "Top This Year"
          setTopThisYear(mapAniListToMiruro(topRatedData));
        }

        // This Season
        const seasonData = sData?.season || [];
        if (seasonData.length > 0) {
          setThisSeason(mapAniListToMiruro(seasonData));
        }

        // Next Season — calculate next season
        const now = new Date();
        const currentMonth = now.getMonth();
        let nextSeasonName: string;
        let nextSeasonYear: number;
        if (currentMonth >= 0 && currentMonth <= 2) { nextSeasonName = "SPRING"; nextSeasonYear = now.getFullYear(); }
        else if (currentMonth >= 3 && currentMonth <= 5) { nextSeasonName = "SUMMER"; nextSeasonYear = now.getFullYear(); }
        else if (currentMonth >= 6 && currentMonth <= 8) { nextSeasonName = "FALL"; nextSeasonYear = now.getFullYear(); }
        else { nextSeasonName = "WINTER"; nextSeasonYear = now.getFullYear() + 1; }

        try {
          const nextRes = await fetch(`/api/anime/anilist-trending?section=season&season=${nextSeasonName}&year=${nextSeasonYear}`);
          if (nextRes.ok) {
            const nextData = await nextRes.json();
            if (nextData.season?.length > 0) {
              setNextSeason(mapAniListToMiruro(nextData.season));
            }
          }
        } catch { /* ignore */ }

      } catch (err) {
        console.error("[AnimeSection] Load error:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ page: "search", query: searchQuery.trim() });
      setSearchQuery("");
    }
  };

  // Get discover data based on active tab
  const discoverData = discoverTab === "trending" ? trending : discoverTab === "popular" ? popular : topRated;

  const setSectionSubPage = useAppStore(s => s.setSectionSubPage);

  return (
    <div className="space-y-0">
      {/* Section title bar — minimal, just shows we're in Anime */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c6cf0] to-[#6b5ce0] flex items-center justify-center shadow-lg shadow-[#7c6cf0]/20">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
            Anime
          </h1>
          <p className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
            Stream sub, dub & Hindi anime
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SEARCH BAR
          ═══════════════════════════════════════════════════════════ */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] focus-within:border-[#7c6cf0]/30 focus-within:bg-white/[0.04] transition-all">
          <svg className="w-4 h-4 text-white/25 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for anime... (e.g., One Piece)"
            className="flex-1 bg-transparent text-white placeholder-white/20 text-sm outline-none"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          />
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-[10px] text-white/20 bg-white/[0.04] px-2 py-1 rounded-md border border-white/[0.04] hover:bg-white/[0.08] transition-colors"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            {searchQuery ? "Clear" : "Filters"}
          </button>
        </div>
      </form>

      {/* ═══════════════════════════════════════════════════════════
          SUB-PAGES
          ═══════════════════════════════════════════════════════════ */}

      {subPage === "schedule" && <SchedulePage />}
      {subPage === "genres" && <BrowseGenresPage />}

      {subPage === "home" && (
        <>
          {loading ? (
            <div className="space-y-8">
              {/* Banner skeleton */}
              <div className="w-full h-[320px] sm:h-[400px] rounded-2xl skeleton" />
              {/* Section skeletons */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="w-48 h-6 skeleton rounded" />
                  <div className="flex gap-3 overflow-hidden">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <div key={j} className="shrink-0 w-[160px] aspect-[2/3] skeleton rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* ═══════════════════════════════════════════
                  FEATURED BANNER
                  ═══════════════════════════════════════════ */}
              {featured.length > 0 && <FeaturedBanner items={featured} />}

              {/* ═══════════════════════════════════════════
                  TOP 10 ANIME
                  ═══════════════════════════════════════════ */}
              {topRated.length > 0 && <Top10List items={topRated} />}

              {/* ═══════════════════════════════════════════
                  DISCOVER ANIME (with tabs)
                  ═══════════════════════════════════════════ */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-[#7c6cf0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                    </svg>
                    <h2 className="text-lg sm:text-xl font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                      Discover Anime
                    </h2>
                  </div>
                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-white/[0.02] rounded-full p-0.5 border border-white/[0.04]">
                    {(["trending", "popular", "topRated"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setDiscoverTab(tab)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                          discoverTab === tab
                            ? "bg-[#7c6cf0]/15 text-[#7c6cf0] border border-[#7c6cf0]/20"
                            : "text-white/30 hover:text-white/60"
                        }`}
                        style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                      >
                        {tab === "topRated" ? "Top Rated" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="scroll-container flex gap-3 overflow-x-auto pb-2">
                  {discoverData.slice(0, 20).map((anime, i) => (
                    <div key={`${anime.id}-${i}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                      <ContentCard anime={anime} index={i} />
                    </div>
                  ))}
                </div>
              </section>

              {/* ═══════════════════════════════════════════
                  THIS SEASON
                  ═══════════════════════════════════════════ */}
              {thisSeason.length > 0 && (
                <HorizontalSection
                  title="Popular This Season"
                  icon={
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  }
                >
                  {thisSeason.slice(0, 20).map((anime, i) => (
                    <div key={`season-${anime.id}-${i}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                      <ContentCard anime={anime} index={i} />
                    </div>
                  ))}
                </HorizontalSection>
              )}

              {/* ═══════════════════════════════════════════
                  NEXT SEASON
                  ═══════════════════════════════════════════ */}
              {nextSeason.length > 0 && (
                <HorizontalSection
                  title="Next Season"
                  icon={
                    <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  }
                >
                  {nextSeason.slice(0, 20).map((anime, i) => (
                    <div key={`next-${anime.id}-${i}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                      <ContentCard anime={anime} index={i} />
                    </div>
                  ))}
                </HorizontalSection>
              )}

              {/* ═══════════════════════════════════════════
                  TOP THIS YEAR
                  ═══════════════════════════════════════════ */}
              {topThisYear.length > 0 && (
                <HorizontalSection
                  title="Top This Year"
                  icon={
                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  }
                >
                  {topThisYear.slice(0, 20).map((anime, i) => (
                    <div key={`topyear-${anime.id}-${i}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                      <ContentCard anime={anime} index={i} />
                    </div>
                  ))}
                </HorizontalSection>
              )}

              {/* ═══════════════════════════════════════════
                  POPULAR GENRES
                  ═══════════════════════════════════════════ */}
              <section className="mb-8">
                <div className="flex items-center gap-2.5 mb-4">
                  <svg className="w-5 h-5 text-[#7c6cf0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7V4h16v3" />
                    <path d="M9 20h6" />
                    <path d="M12 4v16" />
                  </svg>
                  <h2 className="text-lg sm:text-xl font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                    Popular Genres
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ANIME_GENRES.map(genre => (
                    <button
                      key={genre}
                      onClick={() => {
                        setSectionSubPage("genres");
                        // Small delay to let sub-page render, then set genre
                        setTimeout(() => {
                          const genreButtons = document.querySelectorAll(`[data-genre="${genre}"]`);
                          genreButtons.forEach(btn => (btn as HTMLButtonElement).click());
                        }, 100);
                      }}
                      className="group relative px-4 py-2 rounded-full text-[12px] font-bold border transition-all hover:scale-105"
                      style={{
                        fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                        color: GENRE_COLORS[genre] || "#7c6cf0",
                        borderColor: `${GENRE_COLORS[genre] || "#7c6cf0"}20`,
                        backgroundColor: `${GENRE_COLORS[genre] || "#7c6cf0"}08`,
                      }}
                    >
                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-full"
                        style={{ background: `radial-gradient(ellipse at center, ${(GENRE_COLORS[genre] || "#7c6cf0")}15 0%, transparent 70%)` }}
                      />
                      <span className="relative z-[1]">{genre}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Empty state */}
              {!loading && trending.length === 0 && popular.length === 0 && topRated.length === 0 && (
                <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-[#7c6cf0]/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#7c6cf0]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <p className="text-white/30 text-sm">Loading anime from backup sources...</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 text-xs font-bold bg-[#7c6cf0]/15 text-[#7c6cf0] rounded-full hover:bg-[#7c6cf0]/25 transition-all border border-[#7c6cf0]/20"
                    >
                      Refresh Page
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
