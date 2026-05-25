"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore, getAnimeTitle, getAnimeImage } from "./store";
import type { AnimeItem } from "./store";
import type { MiruroAnimeResult } from "@/lib/miruro-api";
import type { AniListMedia } from "@/lib/anilist-api";

// ============================================================
// Comment types
// ============================================================
interface CommentData {
  id: string;
  animeId: string;
  episode: number | null;
  username: string;
  content: string;
  parentId: string | null;
  rating: number | null;
  likes: number;
  createdAt: string;
  updatedAt: string;
  userLikes: Array<{ id: string; username: string }>;
}

interface CommentStats {
  avgRating: number;
  totalRatings: number;
}

interface AnimeDetailProps {
  animeId: string;
}

interface EpisodeData {
  episodeIdNum: number;
  notes?: string | null;
  thumbnails?: string[];
  title?: string | null;
  thumbnail?: string | null;
  source?: string;
  subSlug?: string;
  dubSlug?: string | null;
  anitakuSlug?: string | null;
}

interface MiruroEpData {
  sub: Array<{ number: number; slug: string; title?: string; thumbnail?: string }>;
  dub: Array<{ number: number; slug: string; title?: string; thumbnail?: string }>;
}

// TMDB types removed — anime section uses AniList API only

interface AniListCharacter {
  id: number;
  name: { full: string; native?: string };
  image?: { large?: string; medium?: string };
  role: string;
  voiceActors?: Array<{
    id: number;
    name: { full: string; native?: string };
    image?: { large?: string; medium?: string };
    language: string;
  }>;
}

interface AniListStaff {
  id: number;
  name: { full: string; native?: string };
  image?: { large?: string; medium?: string };
  role: string;
}

interface AniListRecommendation {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { extraLarge?: string; large?: string; medium?: string };
  type?: string;
  episodes?: number;
  averageScore?: number;
  status?: string;
  rating?: number;
}

interface AniListRelation {
  relationType: string;
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { extraLarge?: string; large?: string; medium?: string };
  type?: string;
  format?: string;
  episodes?: number;
  status?: string;
}

interface AniListStudio {
  id: number;
  name: string;
  isAnimationStudio: boolean;
}

export default function AnimeDetailPage({ animeId }: AnimeDetailProps) {
  const navigate = useAppStore(s => s.navigate);
  const bookmarks = useAppStore(s => s.bookmarks);
  const setBookmarks = useAppStore(s => s.setBookmarks);

  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [miruroInfo, setMiruroInfo] = useState<MiruroAnimeResult | null>(null);
  const [anilistMedia, setAnilistMedia] = useState<AniListMedia | null>(null);
  const [anilistInfo, setAnilistInfo] = useState<any>(null);
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [miruroEps, setMiruroEps] = useState<MiruroEpData>({ sub: [], dub: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sub" | "dub">("sub");
  const [totalEpisodes, setTotalEpisodes] = useState<number | null>(null);

  const [anilistId, setAnilistId] = useState<number | null>(null);

  // AniList voice cast / characters
  const [anilistCharacters, setAnilistCharacters] = useState<AniListCharacter[]>([]);
  const [anilistStaff, setAnilistStaff] = useState<AniListStaff[]>([]);
  const [anilistRecommendations, setAnilistRecommendations] = useState<AniListRecommendation[]>([]);
  const [anilistRelations, setAnilistRelations] = useState<AniListRelation[]>([]);
  const [anilistStudios, setAnilistStudios] = useState<AniListStudio[]>([]);
  const [anilistTrailer, setAnilistTrailer] = useState<{ id: string; site: string; thumbnail: string } | null>(null);
  const [anilistDetailLoading, setAnilistDetailLoading] = useState(false);

  // Comments & Ratings
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentStats, setCommentStats] = useState<CommentStats>({ avgRating: 0, totalRatings: 0 });
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSort, setCommentSort] = useState<"newest" | "oldest" | "top">("newest");
  const [newComment, setNewComment] = useState("");
  const [newUsername, setNewUsername] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("luffy_username") || "";
    return "";
  });
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Load info + episodes in parallel
        const [infoRes, epRes] = await Promise.all([
          fetch(`/api/anime/info?id=${encodeURIComponent(animeId)}`),
          fetch(`/api/anime/episodes?id=${encodeURIComponent(animeId)}`),
        ]);

        if (infoRes.ok) {
          const data = await infoRes.json();
          setAnime(data.anime);
          setMiruroInfo(data.miruroInfo);
          // AniList + Official MAL API backup — no TMDB
          if (data.anilistInfo) setAnilistInfo(data.anilistInfo);
          // Use totalEpisodes from info API as a reliable fallback
          if (data.totalEpisodes != null && data.totalEpisodes > 0) {
            setTotalEpisodes(data.totalEpisodes);
          }
        }

        if (epRes.ok) {
          const epData = await epRes.json();
          setEpisodes(epData.episodes || []);
          setMiruroEps(epData.miruroEpisodes || { sub: [], dub: [] });
          // Use nullish coalescing to properly handle totalEpisodes=0
          const epTotal = epData.totalEpisodes ?? epData.episodes?.length ?? null;
          if (epTotal != null && epTotal > 0) {
            setTotalEpisodes(epTotal);
          }
        }

        const cleanId = animeId.replace(/^miruro_/, "").replace(/^mal_/, "");
        if (/^\d+$/.test(cleanId)) setAnilistId(parseInt(cleanId));
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [animeId]);

  // Fetch AniList characters & voice actors (AniList only)
  useEffect(() => {
    if (!anilistId) return;
    async function loadAnilistDetail() {
      setAnilistDetailLoading(true);
      try {
        const res = await fetch(`/api/anime/anilist-detail?id=${anilistId}`);
        if (res.ok) {
          const data = await res.json();
          setAnilistCharacters(data.characters || []);
          setAnilistStaff(data.staff || []);
          if (data.recommendations) setAnilistRecommendations(data.recommendations);
          if (data.relations) setAnilistRelations(data.relations);
          if (data.studios) setAnilistStudios(data.studios);
          if (data.trailer) setAnilistTrailer(data.trailer);
          if (data.details) {
            setAnilistMedia(data.details);
            // Also update totalEpisodes if we didn't have it
            if (data.details.episodes) {
              setTotalEpisodes(prev => prev ?? data.details.episodes);
            }
          }
        }
      } catch { /* ignore */ }
      setAnilistDetailLoading(false);
    }
    loadAnilistDetail();
  }, [anilistId]);

  // CRITICAL: ALL hooks MUST be before any early return (React Rules of Hooks)
  // Load comments — moved here to prevent React error #310
  const loadComments = useCallback(async () => {
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/comments?animeId=${encodeURIComponent(animeId)}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setCommentStats(data.stats || { avgRating: 0, totalRatings: 0 });
      }
    } catch { /* ignore */ }
    setCommentLoading(false);
  }, [animeId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="min-h-[90vh] skeleton" />
        <div className="flex gap-6">
          <div className="w-[180px] aspect-[2/3] skeleton shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
            <div className="h-20 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  // Merge info — AniList PRIMARY, Miruro fallback, Official MAL API backup
  const alTitle = anilistMedia?.title || anilistInfo?.title || null;
  const miruroTitle = miruroInfo?.title || null;

  // CRITICAL: Ensure titles are strings, not objects (prevents React #310)
  const anilistTitle = String(alTitle?.english || alTitle?.romaji || miruroTitle?.english || miruroTitle?.romaji || "");
  const anilistTitleRomaji = String(alTitle?.romaji || miruroTitle?.romaji || "");
  const anilistTitleNative = String(alTitle?.native || miruroTitle?.native || "");
  const allanimeTitle = anime ? String(anime.englishName || anime.name || "") : "";

  const displayTitle = anilistTitle || allanimeTitle || "Unknown";
  const alImage = anilistMedia?.coverImage?.extraLarge || anilistMedia?.coverImage?.large || anilistInfo?.coverImage?.extraLarge || anilistInfo?.coverImage?.large || "";
  const image = alImage || miruroInfo?.coverImage?.extraLarge || miruroInfo?.coverImage?.large || anime?.thumbnail || "";
  const banner = anilistMedia?.bannerImage || miruroInfo?.bannerImage || image;

  const alDesc = anilistMedia?.description?.replace(/<[^>]*>/g, "") || anilistInfo?.description?.replace(/<[^>]*>/g, "") || "";
  const miruroDesc = miruroInfo?.description?.replace(/<[^>]*>/g, "") || "";
  const allanimeDesc = anime?.description || "";
  const description = alDesc || miruroDesc || allanimeDesc;

  // AniList score is 0-100 scale, convert to 0-10
  const alScoreRaw = anilistMedia?.averageScore ?? anilistInfo?.averageScore ?? miruroInfo?.averageScore ?? null;
  const anilistScore = alScoreRaw ? (alScoreRaw > 10 ? alScoreRaw / 10 : alScoreRaw) : null;

  // CRITICAL: Filter genres to ONLY strings — prevents React #310 (objects as children)
  // Some APIs (MAL) return genres as objects {id, name}, filter those out
  const rawGenres: any[] = anilistMedia?.genres || anilistInfo?.genres || miruroInfo?.genres || anime?.genres || [];
  const anilistGenres: string[] = rawGenres.filter((g: any) => typeof g === "string").map((g: string) => g);
  const allGenres = anilistGenres;

  // Safety: ensure status/type are strings, not objects (prevents React #310)
  const status = String(anilistMedia?.status || anilistInfo?.status || miruroInfo?.status || anime?.status || "");
  const type = String(anilistMedia?.format || anilistInfo?.format || miruroInfo?.format || miruroInfo?.type || anime?.type || "");
  const alSeason = (anilistMedia?.season || anilistInfo?.season) && (anilistMedia?.seasonYear || anilistInfo?.seasonYear)
    ? `${anilistMedia?.season || anilistInfo?.season} ${anilistMedia?.seasonYear || anilistInfo?.seasonYear}` : "";
  const season = alSeason || (miruroInfo?.season && miruroInfo?.seasonYear ? `${miruroInfo.season} ${miruroInfo.seasonYear}` : "") || anime?.season || "";
  const episodesCount = totalEpisodes || anilistMedia?.episodes || anilistInfo?.episodes || miruroInfo?.episodes || (anime as any)?.episodeCount || null;

  const hasMiruroEps = miruroEps.sub.length > 0 || miruroEps.dub.length > 0;
  const currentEps = hasMiruroEps
    ? (activeTab === "dub" && miruroEps.dub.length > 0 ? miruroEps.dub : miruroEps.sub)
    : episodes;

  const handleWatch = (episodeNum: number) => {
    // Always use AniList ID for streaming — embed servers require it
    const watchId = anilistId ? String(anilistId) : animeId;
    navigate({ page: "watch", id: watchId, episode: episodeNum, title: displayTitle, image });
  };

  const bookmarked = bookmarks.some(b => b.animeId === animeId);
  const toggleBookmark = () => {
    if (bookmarked) {
      setBookmarks(bookmarks.filter(b => b.animeId !== animeId));
    } else {
      setBookmarks([...bookmarks, { id: animeId, animeId, animeName: displayTitle, thumbnail: image, score: anilistScore || 0, type: type || "TV", status: "", createdAt: new Date().toISOString() }]);
    }
  };

  // Determine if we have any episodes to show (including generated numbered ones)
  // Check if we have any episode data at all — also consider numbered fallback episodes
  const hasAnyEpisodes = episodes.length > 0 || hasMiruroEps || (episodesCount != null && episodesCount > 0);

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (commentSort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (commentSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return b.likes - a.likes; // top
  });

  // Submit comment
  const submitComment = async () => {
    if (!newUsername.trim() || !newComment.trim()) return;
    setSubmitting(true);
    try {
      localStorage.setItem("luffy_username", newUsername.trim());
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animeId,
          username: newUsername.trim(),
          content: newComment.trim(),
          rating: newRating > 0 ? newRating : null,
          parentId: null,
        }),
      });
      if (res.ok) {
        setNewComment("");
        setNewRating(0);
        loadComments();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  // Submit reply
  const submitReply = async (parentId: string) => {
    if (!newUsername.trim() || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      localStorage.setItem("luffy_username", newUsername.trim());
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animeId,
          username: newUsername.trim(),
          content: replyContent.trim(),
          parentId,
        }),
      });
      if (res.ok) {
        setReplyContent("");
        setReplyTo(null);
        loadComments();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  // Toggle like
  const toggleLike = async (commentId: string) => {
    const username = newUsername.trim() || localStorage.getItem("luffy_username") || "Anonymous";
    try {
      await fetch("/api/comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, username }),
      });
      loadComments();
    } catch { /* ignore */ }
  };

  // Delete comment
  const deleteComment = async (id: string) => {
    try {
      await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
      loadComments();
    } catch { /* ignore */ }
  };

  // Build comment tree
  const topLevelComments = sortedComments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => sortedComments.filter(c => c.parentId === parentId);

  return (
    <div className="fade-in">
      {/* Hero Section — 90vh */}
      {banner && (
        <div className="relative min-h-[90vh] -mt-[75px] overflow-hidden">
          <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover ken-burns" key={`banner-${animeId}`} />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#05050a]/50 to-[#05050a]/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-[#05050a]/40 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
            <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-end gap-8">
              <div className="flex-1 space-y-4">
                {/* Badges */}
                <div className="stagger-reveal stagger-1 flex items-center gap-2 flex-wrap">
                  {anilistScore && (
                    <span className="badge-score text-[11px] font-bold inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      AL {anilistScore.toFixed(1)} ★
                    </span>
                  )}
                  {type && <span className="badge-anime text-[10px] font-bold">{type}</span>}
                  {status && <span className="badge-airing text-[10px] font-bold">{status}</span>}
                  {season && <span className="badge-type text-[10px] font-bold">{season}</span>}
                  {episodesCount && <span className="badge-quality text-[10px] font-bold">{episodesCount} EP</span>}
                </div>

                <h1 className="stagger-reveal stagger-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-white line-clamp-2">{displayTitle}</h1>

                {/* Alt titles */}
                {anilistTitleRomaji && anilistTitleRomaji !== displayTitle && (
                  <p className="stagger-reveal stagger-2 text-sm text-zinc-400 line-clamp-1">{anilistTitleRomaji}</p>
                )}
                {anilistTitleNative && (
                  <p className="stagger-reveal stagger-2 text-xs text-zinc-500 line-clamp-1">{anilistTitleNative}</p>
                )}

                {/* Genre tags */}
                {allGenres.length > 0 && (
                  <div className="stagger-reveal stagger-3 flex flex-wrap gap-2">
                    {allGenres.slice(0, 8).map(g => (
                      <button
                        key={g}
                        onClick={() => navigate({ page: "genre", genre: g })}
                        className="px-3 py-1 text-xs font-medium bg-purple-500/10 text-purple-300 rounded-full border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}

                {/* Description */}
                {description && (
                  <p className="stagger-reveal stagger-4 text-sm text-zinc-400 line-clamp-3 max-w-lg leading-relaxed">{description}</p>
                )}

                {/* Action buttons */}
                <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
                  <button onClick={() => handleWatch(1)} className="pill-btn pill-btn-primary">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Play EP.1
                  </button>
                  <button
                    onClick={toggleBookmark}
                    className={`pill-btn ${bookmarked ? "bg-purple-500/10 text-purple-300 border border-purple-500/20" : "pill-btn-ghost"}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    {bookmarked ? "Saved" : "Add to List"}
                  </button>
                </div>
              </div>

              {/* 3D tilted poster */}
              {image && (
                <div className="stagger-reveal stagger-4 hidden lg:block shrink-0">
                  <img src={image} alt={displayTitle} className="w-[240px] rounded-xl poster-3d" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info section (when no banner) */}
      {!banner && image && (
        <div className="flex flex-col sm:flex-row gap-6 mt-4">
          <div className="shrink-0 w-[180px] mx-auto sm:mx-0">
            <img src={image} alt={displayTitle} className="w-full rounded-xl shadow-2xl shadow-black/50" />
          </div>
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{displayTitle}</h1>
            {description && <p className="text-sm text-zinc-400 leading-relaxed line-clamp-5">{description}</p>}
          </div>
        </div>
      )}

      {/* AniList Voice Cast / Characters */}
      {anilistCharacters.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Voice Cast &amp; Characters</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
            {anilistCharacters.filter(c => c.role === "MAIN" || c.role === "SUPPORTING").slice(0, 16).map(c => {
              const va = c.voiceActors?.[0];
              const cName = c.name?.full || "Unknown";
              const cNameNative = c.name?.native;
              const vaName = va?.name?.full || "Unknown";
              const vaNameNative = va?.name?.native;
              return (
                <div key={c.id} className="shrink-0 text-center w-[120px]">
                  {/* Character */}
                  <div className="flex flex-col items-center">
                    <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-purple-500/20 bg-[#0f0f1a] mb-1">
                      {c.image?.large || c.image?.medium ? (
                        <img src={c.image.large || c.image.medium} alt={cName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-zinc-600 font-semibold">{cName.charAt(0)}</div>
                      )}
                    </div>
                    <p className="text-[10px] text-purple-300 font-medium line-clamp-1">{cName}</p>
                    {cNameNative && <p className="text-[8px] text-zinc-500 line-clamp-1">{cNameNative}</p>}
                    <span className={`text-[8px] font-bold mt-0.5 px-2 py-0.5 rounded-full ${
                      c.role === "MAIN" ? "bg-purple-500/15 text-purple-300" : "bg-white/[0.05] text-zinc-400"
                    }`}>{c.role}</span>
                  </div>

                  {/* Voice Actor */}
                  {va && (
                    <div className="flex flex-col items-center mt-2">
                      <div className="w-[8px] h-[8px] rounded-full bg-zinc-700 mb-1" />
                      <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-violet-500/20 bg-[#0f0f1a] mb-1">
                        {va.image?.large || va.image?.medium ? (
                          <img src={va.image.large || va.image.medium} alt={vaName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600 font-semibold">{vaName.charAt(0)}</div>
                        )}
                      </div>
                      <p className="text-[9px] text-violet-300 font-medium line-clamp-1">{vaName}</p>
                      {vaNameNative && <p className="text-[7px] text-zinc-500 line-clamp-1">{vaNameNative}</p>}
                      <span className="text-[7px] text-zinc-600">CV</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AniList Staff */}
      {anilistStaff.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Staff</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
            {anilistStaff.slice(0, 12).map(s => {
              const sName = s.name?.full || "Unknown";
              return (
              <div key={s.id} className="shrink-0 text-center w-[100px]">
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden mx-auto mb-2 border-2 border-white/[0.06] bg-[#0f0f1a]">
                  {s.image?.large || s.image?.medium ? (
                    <img src={s.image.large || s.image.medium} alt={sName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-zinc-600 font-semibold">{sName.charAt(0)}</div>
                  )}
                </div>
                <p className="text-[10px] text-zinc-300 font-medium line-clamp-1">{sName}</p>
                {s.role && <p className="text-[8px] text-zinc-500 line-clamp-1">{s.role}</p>}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AniList Studios */}
      {anilistStudios.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Studios</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {anilistStudios.map(s => (
              <span key={s.id} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                s.isAnimationStudio
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                  : "bg-white/[0.05] text-zinc-400 border border-white/[0.06]"
              }`}>
                {s.name}
                {s.isAnimationStudio && <span className="ml-1 text-[8px] text-purple-500">★</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AniList Trailer */}
      {anilistTrailer && anilistTrailer.site === "youtube" && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Trailer</h3>
          </div>
          <div className="relative w-full aspect-video max-w-2xl rounded-xl overflow-hidden border border-white/[0.06]">
            <iframe
              src={`https://www.youtube.com/embed/${anilistTrailer.id}?autoplay=0&modestbranding=1`}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title="Trailer"
            />
          </div>
        </div>
      )}

      {/* AniList Recommendations */}
      {anilistRecommendations.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Recommendations</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scroll-container pb-2">
            {anilistRecommendations.slice(0, 12).map(r => {
              const rTitle = r.title?.english || r.title?.romaji || r.title?.native || "Unknown";
              const rImg = r.coverImage?.extraLarge || r.coverImage?.large || r.coverImage?.medium || "";
              return (
                <button
                  key={r.id}
                  onClick={() => navigate({ page: "anime", id: String(r.id) })}
                  className="shrink-0 w-[120px] group text-left"
                >
                  <div className="w-[120px] aspect-[3/4] rounded-lg overflow-hidden border border-white/[0.04] bg-[#0f0f1a] mb-1.5">
                    {rImg ? (
                      <img src={rImg} alt={rTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">{rTitle.charAt(0)}</div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-300 font-medium line-clamp-2 group-hover:text-purple-300 transition-colors">{rTitle}</p>
                  {r.averageScore && (
                    <span className="text-[9px] text-emerald-400 font-semibold">{(r.averageScore > 10 ? r.averageScore / 10 : r.averageScore).toFixed(1)} ★</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AniList Related Anime */}
      {anilistRelations.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Related</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="space-y-2">
            {anilistRelations.slice(0, 8).map(r => {
              const rTitle = r.title?.english || r.title?.romaji || r.title?.native || "Unknown";
              const rImg = r.coverImage?.extraLarge || r.coverImage?.large || r.coverImage?.medium || "";
              return (
                <button
                  key={r.id}
                  onClick={() => navigate({ page: "anime", id: String(r.id) })}
                  className="flex items-center gap-3 w-full p-2 bg-[#131c26] rounded-lg border border-white/[0.03] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all group text-left"
                >
                  <div className="w-12 h-16 rounded-md overflow-hidden shrink-0 bg-[#0f0f1a]">
                    {rImg ? (
                      <img src={rImg} alt={rTitle} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600">{rTitle.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-purple-300 transition-colors">{rTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold">{r.relationType?.replace(/_/g, " ")}</span>
                      {r.format && <span className="text-[9px] text-zinc-500">{r.format}</span>}
                      {r.episodes && <span className="text-[9px] text-zinc-500">{r.episodes} EP</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Episodes List — anixtv style with thumbnails */}
      {(episodes.length > 0 || hasMiruroEps) && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="section-header flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">EPISODES</h3>
              {episodesCount && <span className="text-[10px] text-zinc-500">({episodesCount} total)</span>}
            </div>
            {hasMiruroEps && miruroEps.dub.length > 0 && (
              <div className="flex items-center gap-1 bg-[#0f0f1a] rounded-full p-0.5 border border-white/[0.06]">
                {(["sub", "dub"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all ${
                      activeTab === tab ? "bg-purple-500/15 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab.toUpperCase()} ({tab === "sub" ? miruroEps.sub.length : miruroEps.dub.length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episode grid with thumbnails (anixtv style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {hasMiruroEps
              ? currentEps.map((ep) => {
                  const epThumbnail = ep.thumbnail || null;
                  const epTitle = ep.title || null;
                  return (
                    <button
                      key={`miruro-${ep.number}`}
                      onClick={() => handleWatch(ep.number)}
                      className="flex items-center gap-3 p-2 bg-[#131c26] rounded-lg border border-white/[0.03] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all group text-left"
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-12 rounded-md overflow-hidden shrink-0 bg-[#0f0f1a] relative">
                        {epThumbnail ? (
                          <img src={epThumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-400">{ep.number}</span>
                          </div>
                        )}
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-purple-300 transition-colors">
                          EP {ep.number}
                        </p>
                        {epTitle && (
                          <p className="text-[10px] text-zinc-500 line-clamp-1">{epTitle}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              : episodes.map((ep) => {
                  const epThumbnail = ep.thumbnail || ep.thumbnails?.[0] || null;
                  const epTitle = ep.title || ep.notes || null;
                  return (
                    <button
                      key={`aa-${ep.episodeIdNum}`}
                      onClick={() => handleWatch(ep.episodeIdNum)}
                      className="flex items-center gap-3 p-2 bg-[#131c26] rounded-lg border border-white/[0.03] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all group text-left"
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-12 rounded-md overflow-hidden shrink-0 bg-[#0f0f1a] relative">
                        {epThumbnail ? (
                          <img src={epThumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-400">{ep.episodeIdNum}</span>
                          </div>
                        )}
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-purple-300 transition-colors">
                          EP {ep.episodeIdNum}
                        </p>
                        {epTitle && (
                          <p className="text-[10px] text-zinc-500 line-clamp-1">{epTitle}</p>
                        )}
                      </div>
                    </button>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* Fallback when we know there are episodes but none were fetched */}
      {!episodes.length && !hasMiruroEps && episodesCount && episodesCount > 0 && (
        <div className="mt-8 space-y-4">
          <div className="section-header flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">EPISODES</h3>
            <span className="text-[10px] text-zinc-500">({episodesCount} total)</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {Array.from({ length: Math.min(episodesCount, 50) }, (_, i) => i + 1).map(num => (
              <button
                key={`gen-${num}`}
                onClick={() => handleWatch(num)}
                className="server-pill justify-center text-[11px] font-semibold py-2.5 px-2 hover:bg-purple-500/10 hover:border-purple-500/20 hover:text-purple-300 transition-all"
              >
                <svg className="w-3 h-3 text-purple-400/60 shrink-0" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                {num}
              </button>
            ))}
          </div>
          {episodesCount > 50 && (
            <p className="text-xs text-zinc-500 text-center">Showing first 50 of {episodesCount} episodes</p>
          )}
        </div>
      )}

      {/* No episodes at all — only show when we truly have no episode data */}
      {!hasAnyEpisodes && !loading && (
        <div className="text-center py-12 mt-6 bg-[#0a0a14] rounded-xl border border-white/[0.04]">
          <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" />
          </svg>
          <p className="text-zinc-500 text-sm">No episodes available yet</p>
          <p className="text-zinc-600 text-xs mt-1">Try checking back later or use the search to find a stream</p>
        </div>
      )}

      {/* ========== COMMENTS & RATINGS SECTION ========== */}
      <div className="mt-10 space-y-6">
        <div className="section-header flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <h3 className="text-sm font-bold text-white">Comments &amp; Reviews</h3>
          <span className="text-[10px] text-zinc-500 ml-1">({comments.length})</span>
        </div>

        {/* Rating summary */}
        {commentStats.totalRatings > 0 && (
          <div className="flex items-center gap-4 p-4 bg-[#131c26] rounded-xl border border-white/[0.04]">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{commentStats.avgRating.toFixed(1)}</div>
              <div className="flex items-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <svg key={star} className="w-4 h-4" fill={star <= Math.round(commentStats.avgRating) ? "#F59E0B" : "#334155"} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">{commentStats.totalRatings} rating{commentStats.totalRatings !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map(star => {
                const count = comments.filter(c => c.rating === star).length;
                const pct = commentStats.totalRatings > 0 ? (count / commentStats.totalRatings) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-3">{star}</span>
                    <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <div className="flex-1 h-1.5 bg-[#0f0f1a] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-600 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Post comment form */}
        <div className="p-4 bg-[#131c26] rounded-xl border border-white/[0.04] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 bg-[#05050a] border border-white/[0.06] rounded-lg text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/30"
            />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-500 mr-1">Rate:</span>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setNewRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-125"
                >
                  <svg className="w-5 h-5" fill={star <= (hoverRating || newRating) ? "#F59E0B" : "#334155"} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
              {newRating > 0 && (
                <button onClick={() => setNewRating(0)} className="text-[10px] text-zinc-500 hover:text-rose-400 ml-1">Clear</button>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <textarea
              placeholder="Write a comment or review..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={3}
              className="flex-1 px-3 py-2 bg-[#05050a] border border-white/[0.06] rounded-lg text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/30 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={submitComment}
              disabled={submitting || !newUsername.trim() || !newComment.trim()}
              className="pill-btn pill-btn-primary text-xs py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">Sort by:</span>
          {(["newest", "oldest", "top"] as const).map(sort => (
            <button
              key={sort}
              onClick={() => setCommentSort(sort)}
              className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                commentSort === sort
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
            >
              {sort === "newest" ? "Newest" : sort === "oldest" ? "Oldest" : "Top Rated"}
            </button>
          ))}
        </div>

        {/* Comments list */}
        {commentLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 bg-[#131c26] rounded-xl border border-white/[0.04] space-y-2">
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-3 w-full skeleton rounded" />
              </div>
            ))}
          </div>
        ) : topLevelComments.length === 0 ? (
          <div className="text-center py-8 bg-[#131c26] rounded-xl border border-white/[0.04]">
            <svg className="w-10 h-10 text-zinc-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-zinc-500 text-sm">No comments yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topLevelComments.map(comment => {
              const replies = getReplies(comment.id);
              const isOwner = comment.username === (newUsername.trim() || localStorage.getItem("luffy_username"));
              const hasLiked = comment.userLikes?.some(l => l.username === (newUsername.trim() || localStorage.getItem("luffy_username")));
              return (
                <div key={comment.id} className="space-y-2">
                  <div className="p-4 bg-[#131c26] rounded-xl border border-white/[0.04] hover:border-white/[0.06] transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center shrink-0 border border-white/[0.06]">
                          <span className="text-xs font-bold text-purple-300">{comment.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-300">{comment.username}</span>
                            {comment.rating && (
                              <span className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <svg key={s} className="w-3 h-3" fill={s <= comment.rating! ? "#F59E0B" : "#334155"} viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-zinc-600">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isOwner && (
                        <button onClick={() => deleteComment(comment.id)} className="text-zinc-600 hover:text-rose-400 transition-colors p-1" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <button onClick={() => toggleLike(comment.id)} className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${hasLiked ? "text-rose-400" : "text-zinc-500 hover:text-rose-400"}`}>
                        <svg className="w-3.5 h-3.5" fill={hasLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        {comment.likes > 0 && comment.likes}
                      </button>
                      <button onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyContent(""); }} className="text-[10px] text-zinc-500 hover:text-purple-400 font-medium transition-colors">
                        Reply
                      </button>
                    </div>

                    {/* Reply form */}
                    {replyTo === comment.id && (
                      <div className="mt-3 p-3 bg-[#05050a] rounded-lg space-y-2 border border-white/[0.03]">
                        <textarea
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 bg-[#0a0a14] border border-white/[0.06] rounded-lg text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/30 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setReplyTo(null); setReplyContent(""); }} className="text-[10px] text-zinc-500 hover:text-white px-3 py-1">Cancel</button>
                          <button onClick={() => submitReply(comment.id)} disabled={submitting || !replyContent.trim()} className="pill-btn pill-btn-primary text-[10px] py-1 px-3 disabled:opacity-40">Reply</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="ml-6 space-y-2 border-l-2 border-white/[0.04] pl-4">
                      {replies.map(reply => {
                        const isReplyOwner = reply.username === (newUsername.trim() || localStorage.getItem("luffy_username"));
                        return (
                          <div key={reply.id} className="p-3 bg-[#05050a] rounded-lg border border-white/[0.03]">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/20 to-rose-500/20 flex items-center justify-center shrink-0 border border-white/[0.06]">
                                <span className="text-[9px] font-bold text-violet-300">{reply.username.charAt(0).toUpperCase()}</span>
                              </div>
                              <span className="text-[10px] font-bold text-zinc-400">{reply.username}</span>
                              <span className="text-[8px] text-zinc-600">{new Date(reply.createdAt).toLocaleDateString()}</span>
                              {isReplyOwner && (
                                <button onClick={() => deleteComment(reply.id)} className="text-zinc-600 hover:text-rose-400 ml-auto p-1" title="Delete">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{reply.content}</p>
                            <button onClick={() => toggleLike(reply.id)} className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-rose-400 mt-1 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                              {reply.likes > 0 && reply.likes}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
