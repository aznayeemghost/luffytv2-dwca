"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";
import {
  ChevronLeft, Play, SkipBack, SkipForward, Loader2, AlertCircle,
  List, Star, Globe, RefreshCw, Subtitles, Tv, Film
} from "lucide-react";
import type { HindiAnimeEntry } from "@/lib/hindi-anime-db";

interface HindiEpisodeInfo {
  episode: string;
  title: string;
  files: { name: string; url: string; type: "sub" | "dub" }[];
}

export default function HindiWatchPage({
  animeId,
  initialEpisode = 1,
}: {
  animeId: string;
  initialEpisode?: number;
}) {
  const { navigate } = useAppStore();
  const [info, setInfo] = useState<HindiAnimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamType, setStreamType] = useState<"sub" | "dub">("dub");
  const [selectedEpisode, setSelectedEpisode] = useState(initialEpisode);
  const [showEpList, setShowEpList] = useState(true);
  const [streamUrl, setStreamUrl] = useState("");
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState("");

  // Fetch anime info
  useEffect(() => {
    async function fetchInfo() {
      setLoading(true);
      try {
        const res = await fetch(`/api/hindi?action=info&id=${animeId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setInfo(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch Hindi anime info:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, [animeId]);

  // Load stream when episode or type changes
  useEffect(() => {
    async function loadStream() {
      setStreamLoading(true);
      setStreamError("");
      try {
        // Use our server-side proxy for megaplay.buzz embeds (handles Referer header)
        const embedUrl = `/api/hindi/embed?id=${animeId}&ep=${selectedEpisode}&type=${streamType}`;
        setStreamUrl(embedUrl);
      } catch (err) {
        console.error("Stream load failed:", err);
        setStreamError("Failed to load stream.");
        setStreamUrl("");
      } finally {
        setStreamLoading(false);
      }
    }
    if (animeId) loadStream();
  }, [animeId, selectedEpisode, streamType]);

  const episodes: HindiEpisodeInfo[] = info?.episodes || [];
  const totalEpisodes = info?.totalEpisodes || episodes.length;
  const hasDub = episodes.some((ep) => ep.files.some((f) => f.type === "dub"));
  const hasSub = episodes.some((ep) => ep.files.some((f) => f.type === "sub"));

  if (loading) {
    return (
      <div className="space-y-4 fade-in">
        <div className="aspect-video rounded-2xl shimmer" />
        <div className="h-8 w-1/3 shimmer rounded" />
        <div className="h-4 w-2/3 shimmer rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate({ page: "hindi" })}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#f59e0b] transition-colors font-medium"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Hindi Anime
      </button>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 space-y-4">
          {/* Video Player */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0b0b0f] shadow-2xl shadow-black/50 border border-white/[0.04]">
            {streamLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0b0b0f]">
                <div className="w-14 h-14 rounded-2xl bg-[#f59e0b]/10 flex items-center justify-center mb-4">
                  <Loader2 className="w-7 h-7 text-[#f59e0b] animate-spin" />
                </div>
                <p className="text-zinc-500 text-xs">Loading stream...</p>
              </div>
            ) : streamUrl ? (
              <iframe
                key={`hindi-stream-${selectedEpisode}-${streamType}`}
                src={streamUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock; clipboard-write"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0b0b0f] p-6">
                <AlertCircle className="w-12 h-12 text-[#f59e0b]/30 mb-4" />
                <p className="text-zinc-400 text-xs text-center max-w-md mb-5">
                  {streamError || "No stream available for this episode."}
                </p>
                <button
                  onClick={() => {
                    setStreamLoading(true);
                    setStreamError("");
                    const embedUrl = `/api/hindi/embed?id=${animeId}&ep=${selectedEpisode}&type=${streamType}`;
                    setStreamUrl(embedUrl);
                    setStreamLoading(false);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f59e0b]/10 text-[#f59e0b] text-xs hover:bg-[#f59e0b]/20 border border-[#f59e0b]/10 transition-all font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="space-y-4">
            <h1 className="text-lg font-bold text-white tracking-tight">
              {info?.title || `Anime #${animeId}`}
              {totalEpisodes > 1 && ` — Episode ${selectedEpisode}`}
            </h1>

            {/* Info badges */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/10 font-medium">
                <Globe className="w-2.5 h-2.5" /> 🇮🇳 Hindi Dub
              </span>
              {info?.type && (
                <span className="px-2.5 py-1 rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/10 font-medium">
                  {info.type}
                </span>
              )}
              {info?.rating && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/10 font-medium">
                  <Star className="w-2.5 h-2.5" fill="currentColor" /> {info.rating}
                </span>
              )}
              {info?.status && (
                <span className="px-2.5 py-1 rounded-lg bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/10 font-medium">
                  {info.status}
                </span>
              )}
              {totalEpisodes > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/10 font-medium">
                  <Film className="w-2.5 h-2.5" /> {totalEpisodes} episodes
                </span>
              )}
            </div>

            {/* Synopsis */}
            {info?.synopsis && (
              <p className="text-sm text-zinc-400 leading-relaxed line-clamp-4">
                {info.synopsis.replace(/<[^>]*>/g, "")}
              </p>
            )}

            {/* Genres */}
            {info?.genres && info.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {info.genres.map((genre, gi) => (
                  <span
                    key={`genre-${gi}-${genre}`}
                    className="px-2.5 py-0.5 rounded-lg bg-white/[0.03] text-zinc-500 text-[10px] border border-white/[0.04]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Sub/Dub Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold">Audio</span>
                <button
                  onClick={() => setStreamType("sub")}
                  disabled={!hasSub}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    streamType === "sub"
                      ? "bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/20"
                      : "bg-white/[0.03] text-zinc-500 border border-white/[0.04] hover:text-white disabled:opacity-30"
                  }`}
                >
                  <Subtitles className="w-3 h-3 inline mr-1" />SUB
                </button>
                <button
                  onClick={() => setStreamType("dub")}
                  disabled={!hasDub}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    streamType === "dub"
                      ? "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/20"
                      : "bg-white/[0.03] text-zinc-500 border border-white/[0.04] hover:text-white disabled:opacity-30"
                  }`}
                >
                  🇮🇳 HINDI DUB
                </button>
              </div>
            </div>

            {/* Episode Navigation */}
            {totalEpisodes > 1 && (
              <div className="flex items-center gap-3 flex-wrap">
                {selectedEpisode > 1 && (
                  <button
                    onClick={() => setSelectedEpisode(Math.max(1, selectedEpisode - 1))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs transition-all border border-white/[0.04] font-medium"
                  >
                    <SkipBack className="w-3.5 h-3.5" /> Previous
                  </button>
                )}
                {selectedEpisode < totalEpisodes && (
                  <button
                    onClick={() => setSelectedEpisode(Math.min(totalEpisodes, selectedEpisode + 1))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#f59e0b] text-xs transition-all border border-[#f59e0b]/10 font-medium"
                  >
                    Next <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* More Info */}
            {info && (
              <div className="p-4 rounded-xl bg-[#0f0f15] border border-white/[0.04] space-y-2">
                <h4 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {info.studios && info.studios.length > 0 && (
                    <div>
                      <span className="text-zinc-600">Studios:</span>{" "}
                      <span className="text-zinc-400">{info.studios.join(", ")}</span>
                    </div>
                  )}
                  {info.duration && (
                    <div>
                      <span className="text-zinc-600">Duration:</span>{" "}
                      <span className="text-zinc-400">{info.duration}</span>
                    </div>
                  )}
                  {info.aired && (
                    <div>
                      <span className="text-zinc-600">Aired:</span>{" "}
                      <span className="text-zinc-400">{info.aired}</span>
                    </div>
                  )}
                  {info.country && (
                    <div>
                      <span className="text-zinc-600">Country:</span>{" "}
                      <span className="text-zinc-400">{info.country}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Episode List Sidebar */}
        {showEpList && totalEpisodes > 1 && (
          <div className="lg:w-80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <List className="w-4 h-4" /> Episodes ({totalEpisodes})
              </h3>
              <button
                onClick={() => setShowEpList(false)}
                className="text-zinc-500 hover:text-white text-xs lg:hidden"
              >
                Hide
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-[#0f0f15] border border-white/[0.04]">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((epNum) => {
                const isActive = epNum === selectedEpisode;
                const epInfo = episodes.find((e) => parseInt(e.episode) === epNum);
                const epFiles = epInfo?.files || [];
                const hasEpDub = epFiles.some((f) => f.type === "dub");
                const hasEpSub = epFiles.some((f) => f.type === "sub");

                return (
                  <button
                    key={`hindi-ep-${epNum}`}
                    onClick={() => setSelectedEpisode(epNum)}
                    className={`episode-item w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-all border-l-2 ${
                      isActive
                        ? "active bg-[#f59e0b]/10 text-[#f59e0b] border-l-[#f59e0b]"
                        : "text-zinc-500 hover:bg-white/[0.03] hover:text-white border-l-transparent"
                    }`}
                  >
                    {info?.thumbnail ? (
                      <img
                        src={info.thumbnail}
                        alt={`Ep ${epNum}`}
                        className="w-12 h-8 rounded-md object-cover flex-shrink-0 bg-[#15151d]"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                          const span = document.createElement('span');
                          span.className = 'text-[10px] font-bold w-7 text-right flex-shrink-0';
                          span.textContent = String(epNum);
                          target.parentElement?.insertBefore(span, target);
                        }}
                      />
                    ) : (
                      <span className="text-[10px] font-bold w-7 text-right flex-shrink-0">{epNum}</span>
                    )}
                    <span className="text-[10px] truncate flex-1">
                      {epInfo?.title || `Episode ${epNum}`}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasEpDub && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] font-bold">D</span>
                      )}
                      {hasEpSub && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] font-bold">S</span>
                      )}
                      {isActive && <Play className="w-2.5 h-2.5 text-[#f59e0b]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
