import { NextRequest, NextResponse } from "next/server";
import { getTrending, getPopular, getTopRated, getSeasonAnime } from "@/lib/anilist-api";
import { miruroTrending, miruroPopular } from "@/lib/miruro-api";
import { malTopAnime, malSeasonNow } from "@/lib/mal-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/anime/anilist-trending
 * 3-LAYER FALLBACK: AniList (primary) → Miruro (backup 1) → Official MAL API (backup 2)
 *
 * Optional query params:
 *   - section: "trending" | "popular" | "topRated" | "season" | "all" (default: all)
 *   - season: "SPRING" | "SUMMER" | "FALL" | "WINTER" (for season filter)
 *   - year: number (for season filter, e.g. 2025)
 */
export async function GET(request: NextRequest) {
  const section = request.nextUrl.searchParams.get("section") || "all";
  const season = request.nextUrl.searchParams.get("season") || undefined;
  const yearStr = request.nextUrl.searchParams.get("year");
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

  try {
    const results: Record<string, any> = {};

    // ---- TRENDING: AniList → Miruro → Official MAL API ----
    if (section === "all" || section === "trending") {
      let trendingData: any[] = [];
      let source = "anilist";

      // Layer 1: AniList
      try {
        trendingData = await getTrending(1, 25);
        if (trendingData.length > 0) source = "anilist";
      } catch (err) {
        // AniList is primary — only log if it completely fails
      }

      // Layer 2: Miruro backup
      if (trendingData.length === 0) {
        try {
          trendingData = await miruroTrending(1, 25);
          if (trendingData.length > 0) source = "miruro";
        } catch (err) {
          // Miruro backup skipped — silent
        }
      }

      // Layer 3: Official MAL API v2
      if (trendingData.length === 0) {
        try {
          trendingData = await malTopAnime(1, 25, "airing"); // valid: airing, upcoming, all, tv, movie, popular
          if (trendingData.length > 0) source = "mal";
        } catch (err) {
          // MAL backup skipped — silent
        }
      }

      results.trending = trendingData;
      results._trendingSource = source;
    }

    // ---- POPULAR: AniList → Miruro → Official MAL API ----
    if (section === "all" || section === "popular") {
      let popularData: any[] = [];
      let source = "anilist";

      // Layer 1: AniList
      try {
        popularData = await getPopular(1, 25);
        if (popularData.length > 0) source = "anilist";
      } catch (err) {
        // AniList is primary
      }

      // Layer 2: Miruro backup
      if (popularData.length === 0) {
        try {
          popularData = await miruroPopular(1, 25);
          if (popularData.length > 0) source = "miruro";
        } catch (err) {
          // Miruro backup skipped — silent
        }
      }

      // Layer 3: Official MAL API
      if (popularData.length === 0) {
        try {
          popularData = await malTopAnime(1, 25, "bypopularity"); // MAL API valid ranking_type
          if (popularData.length > 0) source = "mal";
        } catch (err) {
          // MAL backup skipped — silent
        }
      }

      results.popular = popularData;
      results._popularSource = source;
    }

    // ---- TOP RATED: AniList → Miruro → Official MAL API ----
    if (section === "all" || section === "topRated") {
      let topRatedData: any[] = [];
      let source = "anilist";

      // Layer 1: AniList
      try {
        topRatedData = await getTopRated(1, 25);
        if (topRatedData.length > 0) source = "anilist";
      } catch (err) {
        // AniList is primary
      }

      // Layer 2: Miruro backup (use popular as topRated proxy)
      if (topRatedData.length === 0) {
        try {
          topRatedData = await miruroPopular(1, 25);
          if (topRatedData.length > 0) source = "miruro";
        } catch (err) {
          // Miruro backup skipped — silent
        }
      }

      // Layer 3: Official MAL API
      if (topRatedData.length === 0) {
        try {
          topRatedData = await malTopAnime(1, 25, "all");
          if (topRatedData.length > 0) source = "mal";
        } catch (err) {
          // MAL backup skipped — silent
        }
      }

      results.topRated = topRatedData;
      results._topRatedSource = source;
    }

    // ---- SEASON: AniList → Miruro → Official MAL API ----
    if (section === "season" || section === "all") {
      const currentMonth = new Date().getMonth();
      let currentSeason = season;
      if (!currentSeason) {
        if (currentMonth >= 0 && currentMonth <= 2) currentSeason = "WINTER";
        else if (currentMonth >= 3 && currentMonth <= 5) currentSeason = "SPRING";
        else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = "SUMMER";
        else currentSeason = "FALL";
      }

      let seasonData: any[] = [];
      let source = "anilist";

      // Layer 1: AniList
      try {
        seasonData = await getSeasonAnime(currentSeason, year, 1, 25);
        if (seasonData.length > 0) source = "anilist";
      } catch (err) {
        // AniList is primary
      }

      // Layer 2: Miruro backup (use trending and filter by season)
      if (seasonData.length === 0) {
        try {
          const miruroData = await miruroTrending(1, 50);
          seasonData = miruroData.filter((a: any) =>
            a.season?.toUpperCase() === currentSeason && a.seasonYear === year
          );
          if (seasonData.length > 0) source = "miruro";
        } catch (err) {
          // Miruro backup skipped — silent
        }
      }

      // Layer 3: Official MAL API
      if (seasonData.length === 0) {
        try {
          seasonData = await malSeasonNow(1, 25);
          if (seasonData.length > 0) source = "mal";
        } catch (err) {
          // MAL backup skipped — silent
        }
      }

      results.season = seasonData;
      results.seasonInfo = { season: currentSeason, year };
      results._seasonSource = source;
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("[anilist-trending] Error:", err);
    return NextResponse.json({ error: "Failed to fetch trending data" }, { status: 500 });
  }
}
