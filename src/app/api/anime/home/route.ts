import { NextRequest, NextResponse } from "next/server";
import { getTrending, getPopular, getTopRated } from "@/lib/anilist-api";
import { miruroTrending, miruroPopular, miruroRecent } from "@/lib/miruro-api";
import { malTopAnime, malSeasonNow } from "@/lib/mal-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Normalize any anime item to a consistent MiruroAnimeResult shape.
 */
function normalizeItem(item: any): Record<string, any> {
  // Safely extract title — handle both object and string formats
  let title: { romaji?: string; english?: string; native?: string };
  if (item.title && typeof item.title === "object") {
    title = {
      romaji: item.title.romaji || undefined,
      english: item.title.english || undefined,
      native: item.title.native || undefined,
    };
  } else if (typeof item.title === "string" && item.title) {
    title = { romaji: item.title, english: item.title };
  } else if (item.name) {
    title = { romaji: item.name, english: item.englishName || item.name };
  } else {
    title = { romaji: "Unknown" };
  }

  // Safely extract coverImage
  let coverImage: { extraLarge?: string; large?: string; medium?: string; color?: string } | undefined;
  if (item.coverImage && typeof item.coverImage === "object") {
    coverImage = {
      extraLarge: item.coverImage.extraLarge || undefined,
      large: item.coverImage.large || undefined,
      medium: item.coverImage.medium || undefined,
      color: item.coverImage.color || undefined,
    };
  } else if (item.thumbnail) {
    coverImage = { extraLarge: item.thumbnail, large: item.thumbnail, medium: item.thumbnail };
  } else {
    coverImage = undefined;
  }

  return {
    id: item.id || item._id || 0,
    title,
    coverImage,
    bannerImage: item.bannerImage || undefined,
    type: item.type || undefined,
    format: item.format || undefined,
    status: item.status || undefined,
    description: item.description || undefined,
    season: item.season || undefined,
    seasonYear: item.seasonYear || item.year || undefined,
    episodes: item.episodes ?? undefined,
    duration: item.duration ?? undefined,
    genres: Array.isArray(item.genres) ? item.genres.filter((g: any) => typeof g === "string") : undefined,
    averageScore: item.averageScore ?? (item.score ? Math.round(item.score * 10) : undefined),
    popularity: item.popularity ?? undefined,
    trending: item.trending ?? undefined,
    countryOfOrigin: item.countryOfOrigin || undefined,
    isAdult: item.isAdult || undefined,
  };
}

/**
 * GET /api/anime/home
 * 3-LAYER FALLBACK: AniList (primary) → Miruro (backup 1) → Official MAL API (backup 2)
 *
 * Official MAL API v2 as backup 2
 */
export async function GET(request: NextRequest) {
  try {
    // ---- TRENDING: AniList → Miruro → Official MAL API ----
    let trendingData: any[] = [];
    let trendingSource = "anilist";

    try {
      const alTrending = await getTrending(1, 20);
      if (alTrending && alTrending.length > 0) {
        trendingData = alTrending.map(normalizeItem);
      }
    } catch (err) {
      // AniList is primary — silent on failure
    }

    if (trendingData.length === 0) {
      try {
        const miruroData = await miruroTrending(1, 20);
        if (miruroData && miruroData.length > 0) {
          trendingData = miruroData.map(normalizeItem);
          trendingSource = "miruro";
        }
      } catch (err) {
        // Miruro backup — silent
      }
    }

    if (trendingData.length === 0) {
      try {
        const malData = await malTopAnime(1, 20, "airing");
        if (malData && malData.length > 0) {
          trendingData = malData.map(normalizeItem);
          trendingSource = "mal";
        }
      } catch (err) {
        // MAL backup — silent
      }
    }

    // ---- POPULAR: AniList → Miruro → Official MAL API ----
    let popularData: any[] = [];
    let popularSource = "anilist";

    try {
      const alPopular = await getPopular(1, 20);
      if (alPopular && alPopular.length > 0) {
        popularData = alPopular.map(normalizeItem);
      }
    } catch (err) {
      // AniList is primary — silent on failure
    }

    if (popularData.length === 0) {
      try {
        const miruroData = await miruroPopular(1, 20);
        if (miruroData && miruroData.length > 0) {
          popularData = miruroData.map(normalizeItem);
          popularSource = "miruro";
        }
      } catch (err) {
        // Miruro backup — silent
      }
    }

    if (popularData.length === 0) {
      try {
        const malData = await malTopAnime(1, 20, "bypopularity"); // MAL API valid ranking_type
        if (malData && malData.length > 0) {
          popularData = malData.map(normalizeItem);
          popularSource = "mal";
        }
      } catch (err) {
        // MAL backup — silent
      }
    }

    // ---- RECENT: Miruro primary → AniList trending → Official MAL API ----
    let recentData: any[] = [];
    let recentSource = "miruro";

    try {
      const miruroData = await miruroRecent(1, 20);
      if (miruroData && miruroData.length > 0) {
        recentData = miruroData.map(normalizeItem);
        recentSource = "miruro";
      }
    } catch (err) {
      // Miruro recent — silent on failure
    }

    if (recentData.length === 0) {
      try {
        const alData = await getTrending(1, 20);
        if (alData && alData.length > 0) {
          recentData = alData.map(normalizeItem);
          recentSource = "anilist";
        }
      } catch (err) {
        // AniList backup — silent
      }
    }

    if (recentData.length === 0) {
      try {
        const malData = await malSeasonNow(1, 20);
        if (malData && malData.length > 0) {
          recentData = malData.map(normalizeItem);
          recentSource = "mal";
        }
      } catch (err) {
        // MAL backup — silent
      }
    }

    return NextResponse.json({
      trending: [],
      recent: [],
      miruroTrending: trendingData,
      miruroPopular: popularData,
      miruroRecent: recentData,
      _sources: {
        trending: trendingSource,
        popular: popularSource,
        recent: recentSource,
      },
    });
  } catch (error) {
    console.error("[home] Error:", error);
    return NextResponse.json({
      trending: [],
      recent: [],
      miruroTrending: [],
      miruroPopular: [],
      miruroRecent: [],
      error: "Failed to fetch home data",
    }, { status: 500 });
  }
}
