"use client";

import { useState } from "react";
import { useAppStore, getAnimeTitle, getAnimeImage, getTMDBTitle, getTMDBImage, getTMDBYear, getTMDBMediaType, type AnimeItem, type MiruroAnimeItem, type TMDBContentItem } from "./store";

interface ContentCardProps {
  anime?: AnimeItem | MiruroAnimeItem;
  tmdbItem?: TMDBContentItem;
  index?: number;
}

export default function ContentCard({ anime, tmdbItem, index = 0 }: ContentCardProps) {
  const navigate = useAppStore(s => s.navigate);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isTMDB = !!tmdbItem;

  // Null-safe access — data from any source (AniList, MAL, Miruro) can have missing fields
  const title = isTMDB ? getTMDBTitle(tmdbItem!) : getAnimeTitle(anime!);
  const image = isTMDB ? getTMDBImage(tmdbItem!) : getAnimeImage(anime!);

  // Safely extract score — ensure it's always a number or undefined (never an object)
  let score: number | undefined;
  if (isTMDB) {
    score = typeof tmdbItem!.vote_average === 'number' ? tmdbItem!.vote_average : undefined;
  } else if (anime) {
    const isMiruroCheck = "title" in anime && !("name" in anime);
    if (isMiruroCheck) {
      const raw = (anime as MiruroAnimeItem).averageScore;
      score = typeof raw === 'number' ? raw : undefined;
    } else {
      const raw = (anime as AnimeItem).score;
      score = typeof raw === 'number' ? raw : undefined;
    }
  }

  const year = isTMDB ? getTMDBYear(tmdbItem!) : undefined;
  const mediaType = isTMDB ? getTMDBMediaType(tmdbItem!) : undefined;

  const isMiruro = !isTMDB && anime && "title" in anime && !("name" in anime);
  const type = isTMDB ? (mediaType === "movie" ? "Movie" : "TV") : isMiruro ? (anime as MiruroAnimeItem).type : anime ? (anime as AnimeItem).type : undefined;

  const episodes = isTMDB ? undefined : isMiruro && anime
    ? (anime as MiruroAnimeItem).episodes
    : anime && (anime as AnimeItem).availableEpisodes
      ? Math.max(
          ...(anime as AnimeItem).availableEpisodes?.sub ? [(anime as AnimeItem).availableEpisodes!.sub || 0] : [],
          ...(anime as AnimeItem).availableEpisodes?.dub ? [(anime as AnimeItem).availableEpisodes!.dub || 0] : [],
          0
        )
      : undefined;

  const handleDetailClick = () => {
    if (isTMDB) {
      if (mediaType === "movie") {
        navigate({ page: "movie-detail", id: tmdbItem!.id });
      } else {
        navigate({ page: "tv-detail", id: tmdbItem!.id });
      }
    } else if (anime) {
      const id = isMiruro ? String((anime as MiruroAnimeItem).id) : (anime as AnimeItem)._id;
      navigate({ page: "anime", id });
    }
  };

  const handlePlayClick = () => {
    if (isTMDB) {
      if (mediaType === "movie") {
        navigate({ page: "movie-watch", id: tmdbItem!.id });
      } else {
        navigate({ page: "tv-watch", id: tmdbItem!.id, season: 1, episode: 1 });
      }
    } else if (anime) {
      const id = isMiruro ? String((anime as MiruroAnimeItem).id) : (anime as AnimeItem)._id;
      navigate({ page: "watch", id, episode: 1 });
    }
  };

  const typeLabel = isTMDB ? (mediaType === "movie" ? "MOVIE" : "TV") : (type || "ANIME");

  return (
    <div
      className="content-card group text-left w-full"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Card image container — 2/3 aspect ratio poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[#0f0f1a] rounded-xl">
        {/* Skeleton */}
        {!imgLoaded && <div className="absolute inset-0 skeleton" />}

        {/* Image */}
        {image && (
          <img
            src={image}
            alt={title}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />
        )}

        {/* Default: Bottom gradient + title overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#05050a] via-[#05050a]/60 to-transparent opacity-80 group-hover:opacity-0 transition-opacity duration-300" />
        <div className="absolute inset-x-0 bottom-0 p-3 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
          <h3 className="text-xs font-semibold text-white line-clamp-2 leading-tight drop-shadow-lg">
            {title}
          </h3>
        </div>

        {/* Type badge — top right */}
        <div className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-md z-10 ${
          isTMDB
            ? mediaType === "movie"
              ? "bg-rose-500/80 text-white backdrop-blur-sm"
              : "bg-purple-500/80 text-white backdrop-blur-sm"
            : "bg-purple-500/80 text-white backdrop-blur-sm"
        }`}>
          {typeLabel}
        </div>

        {/* Hover: Full info reveal overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-[#05050a]/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
          {/* Title */}
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight mb-2">
            {title}
          </h3>

          {/* Rating */}
          {score != null && score > 0 && (
            <div className="flex items-center gap-1 mb-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-bold text-emerald-400">
                {/* Normalize to 0-10 scale: TMDB vote_average is 0-10, AniList averageScore is 0-100 */}
                {(score > 10 ? score / 10 : score).toFixed(1)}
              </span>
            </div>
          )}

          {/* Year + Type row */}
          <div className="flex items-center gap-2 mb-3">
            {year && (
              <span className="text-[10px] text-zinc-400">{year}</span>
            )}
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
              isTMDB
                ? mediaType === "movie"
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-purple-500/20 text-purple-300"
                : "bg-purple-500/20 text-purple-300"
            }`}>
              {typeLabel}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handlePlayClick();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-[11px] font-semibold rounded-full transition-all shadow-lg shadow-purple-500/25 cursor-pointer"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Play
            </button>
            <button
              type="button"
              onClick={() => {
                handleDetailClick();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium rounded-full transition-all backdrop-blur-sm border border-white/10 cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Details
            </button>
          </div>
        </div>

        {/* Episode count / Year badge — bottom right (default view) */}
        {(episodes && episodes > 0) && (
          <div className="absolute bottom-2 right-2 bg-[#05050a]/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20 z-[5] group-hover:opacity-0 transition-opacity duration-300">
            EP:{episodes}
          </div>
        )}
        {(isTMDB && year) && (
          <div className="absolute bottom-9 left-3 bg-[#05050a]/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 border border-white/10 z-[5] group-hover:opacity-0 transition-opacity duration-300">
            {year}
          </div>
        )}
      </div>
    </div>
  );
}
