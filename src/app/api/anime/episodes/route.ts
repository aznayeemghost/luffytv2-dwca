import { NextRequest, NextResponse } from "next/server";
import { getAnimeBasicInfo, getAnimeDetails, getStreamingEpisodes } from "@/lib/anilist-api";
import { miruroInfo, miruroEpisodes } from "@/lib/miruro-api";
import { getEpisodes, searchAnime } from "@/lib/anime-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Extract the actual ID and detect its source
function parseAnimeId(rawId: string): { anilistId: number | null; allanimeId: string | null } {
  const cleanId = rawId.replace(/^miruro_/, "").replace(/^mal_/, "");
  if (/^\d+$/.test(cleanId)) {
    return { anilistId: parseInt(cleanId), allanimeId: null };
  }
  return { anilistId: null, allanimeId: cleanId };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const { anilistId, allanimeId: initialAllAnimeId } = parseAnimeId(id);

    let allAnimeId: string | null = initialAllAnimeId;
    let miruroEpsResult: { sub: any[]; dub: any[] } = { sub: [], dub: [] };
    let allAnimeEpisodes: any[] = [];
    let animeTitle: string | null = null;
    let anilistEps: any[] = []; // From AniList streamingEpisodes
    let totalEpsFromAniList: number | null = null;

    // Step 1: Try AniList GraphQL directly (most reliable for episode count + info)
    if (anilistId) {
      try {
        const anilistData = await getAnimeDetails(anilistId);
        if (anilistData) {
          animeTitle = anilistData.title?.english || anilistData.title?.romaji || null;
          totalEpsFromAniList = anilistData.episodes || null;

          // Use nextAiringEpisode to infer more episodes if count is 0
          if (!totalEpsFromAniList && anilistData.nextAiringEpisode) {
            totalEpsFromAniList = anilistData.nextAiringEpisode.episode;
          }

          // Get streaming episode info (has titles + thumbnails)
          if (anilistData.streamingEpisodes && anilistData.streamingEpisodes.length > 0) {
            anilistEps = anilistData.streamingEpisodes.map((ep: any, i: number) => ({
              episodeIdNum: i + 1,
              title: ep.title || null,
              thumbnail: ep.thumbnail || null,
              url: ep.url || null,
              site: ep.site || null,
              source: "anilist",
            }));
          }

          // If we still don't have total episodes, try basic info as fallback
          if (!totalEpsFromAniList) {
            try {
              const basicInfo = await getAnimeBasicInfo(anilistId);
              if (basicInfo) {
                if (!animeTitle) animeTitle = basicInfo.title?.english || basicInfo.title?.romaji || null;
                if (!totalEpsFromAniList) totalEpsFromAniList = basicInfo.episodes || null;
                if (!totalEpsFromAniList && basicInfo.nextAiringEpisode) {
                  totalEpsFromAniList = basicInfo.nextAiringEpisode.episode;
                }
                if (anilistEps.length === 0 && basicInfo.streamingEpisodes?.length > 0) {
                  anilistEps = basicInfo.streamingEpisodes.map((ep: any, i: number) => ({
                    episodeIdNum: i + 1,
                    title: ep.title || null,
                    thumbnail: ep.thumbnail || null,
                    url: ep.url || null,
                    site: ep.site || null,
                    source: "anilist",
                  }));
                }
              }
            } catch { /* basic info fallback failed */ }
          }
        }
      } catch (err) {
        console.error("[episodes] getAnimeDetails failed:", err);
        // Try basic info as last resort
        try {
          const anilistData = await getAnimeBasicInfo(anilistId!);
          if (anilistData) {
            animeTitle = anilistData.title?.english || anilistData.title?.romaji || null;
            totalEpsFromAniList = anilistData.episodes || null;
            if (!totalEpsFromAniList && anilistData.nextAiringEpisode) {
              totalEpsFromAniList = anilistData.nextAiringEpisode.episode;
            }
            if (anilistData.streamingEpisodes?.length > 0) {
              anilistEps = anilistData.streamingEpisodes.map((ep: any, i: number) => ({
                episodeIdNum: i + 1,
                title: ep.title || null,
                thumbnail: ep.thumbnail || null,
                url: ep.url || null,
                site: ep.site || null,
                source: "anilist",
              }));
            }
          }
        } catch { /* all AniList attempts failed */ }
      }

      // Step 2: Try Miruro episodes endpoint using the helper (has retry logic)
      try {
        miruroEpsResult = await miruroEpisodes(anilistId);
      } catch (err) {
        console.error("[episodes] Miruro episodes fetch failed:", err);
      }

      // Get Miruro info for title and additional episode count
      if (!animeTitle || !totalEpsFromAniList) {
        try {
          const miruroInfoData = await miruroInfo(anilistId);
          if (!animeTitle) animeTitle = miruroInfoData?.title?.english || miruroInfoData?.title?.romaji || null;
          if (!totalEpsFromAniList && miruroInfoData?.episodes) {
            totalEpsFromAniList = miruroInfoData.episodes;
          }
        } catch (err) {
          console.error("[episodes] Miruro info fetch failed:", err);
        }
      }
    }

    // Step 3: Find AllAnime ID via title search
    if (animeTitle) {
      try {
        const searchResult = await searchAnime(animeTitle, 1, 5);
        if (searchResult.results?.length > 0) {
          const best = searchResult.results.find(
            (r: any) => r.englishName?.toLowerCase() === animeTitle!.toLowerCase() ||
                        r.name?.toLowerCase() === animeTitle!.toLowerCase()
          ) || searchResult.results[0];
          allAnimeId = best._id;
        }
      } catch { /* AllAnime search failed */ }
    }

    // Step 4: Get AllAnime episodes
    if (allAnimeId) {
      try {
        allAnimeEpisodes = await getEpisodes(allAnimeId);
      } catch { /* AllAnime episodes failed */ }
    }

    // Combine all sources: prefer Miruro > AniList streaming > AllAnime > numbered fallback
    const hasMiruroEps = miruroEpsResult.sub?.length > 0 || miruroEpsResult.dub?.length > 0;
    const hasAnilistEps = anilistEps.length > 0;
    const hasAllAnimeEps = allAnimeEpisodes.length > 0;

    let finalEpisodes: any[];

    if (hasMiruroEps) {
      const maxEps = Math.max(
        miruroEpsResult.sub?.length || 0,
        miruroEpsResult.dub?.length || 0,
        totalEpsFromAniList || 0
      );
      finalEpisodes = [];
      for (let i = 1; i <= maxEps; i++) {
        const subEp = miruroEpsResult.sub?.find((e: any) => Number(e.number) === i);
        const dubEp = miruroEpsResult.dub?.find((e: any) => Number(e.number) === i);
        const anilistEp = anilistEps.find(e => e.episodeIdNum === i);
        const allAnimeEp = allAnimeEpisodes.find((ae: any) => ae.episodeIdNum === i);

        finalEpisodes.push({
          episodeIdNum: i,
          title: subEp?.title || dubEp?.title || anilistEp?.title || null,
          thumbnail: subEp?.thumbnail || dubEp?.thumbnail || anilistEp?.thumbnail || allAnimeEp?.thumbnails?.[0] || null,
          source: "miruro",
          subSlug: subEp?.slug || String(i),
          dubSlug: dubEp?.slug || null,
        });
      }
    } else if (hasAnilistEps && anilistEps.length > 0) {
      finalEpisodes = [];
      const maxEps = Math.max(anilistEps.length, totalEpsFromAniList || anilistEps.length, allAnimeEpisodes.length);
      for (let i = 1; i <= maxEps; i++) {
        const anilistEp = anilistEps.find(e => e.episodeIdNum === i);
        const allAnimeEp = allAnimeEpisodes.find((ae: any) => ae.episodeIdNum === i);
        finalEpisodes.push({
          episodeIdNum: i,
          title: anilistEp?.title || null,
          thumbnail: anilistEp?.thumbnail || allAnimeEp?.thumbnails?.[0] || null,
          source: anilistEp ? "anilist" : (allAnimeEp ? "allanime" : "numbered"),
        });
      }
    } else if (hasAllAnimeEps) {
      finalEpisodes = allAnimeEpisodes.map(ep => ({
        ...ep,
      }));
    } else if (totalEpsFromAniList && totalEpsFromAniList > 0) {
      console.log(`[episodes] Generating ${totalEpsFromAniList} numbered episodes (no source data)`);
      finalEpisodes = Array.from({ length: totalEpsFromAniList }, (_, i) => ({
        episodeIdNum: i + 1,
        title: null,
        thumbnail: null,
        source: "numbered",
      }));
    } else {
      // Last resort: generate at least 12 episodes
      if (anilistId) {
        console.log(`[episodes] No episode data found. Generating 12 numbered episodes as fallback for anilistId=${anilistId}`);
        finalEpisodes = Array.from({ length: 12 }, (_, i) => ({
          episodeIdNum: i + 1,
          title: null,
          thumbnail: null,
          source: "numbered",
        }));
        totalEpsFromAniList = 12;
      } else {
        finalEpisodes = [];
      }
    }

    // Final safety net
    if (finalEpisodes.length === 0 && (anilistId || allAnimeId)) {
      console.log(`[episodes] Final safety net: generating 12 numbered episodes for id=${id}`);
      finalEpisodes = Array.from({ length: 12 }, (_, i) => ({
        episodeIdNum: i + 1,
        title: null,
        thumbnail: null,
        source: "numbered",
      }));
      if (!totalEpsFromAniList) totalEpsFromAniList = 12;
    }

    return NextResponse.json({
      episodes: finalEpisodes,
      miruroEpisodes: miruroEpsResult,
      allAnimeId,
      totalEpisodes: totalEpsFromAniList || finalEpisodes.length,
      _meta: {
        hasMiruro: hasMiruroEps,
        hasAnilist: hasAnilistEps,
        hasAllAnime: hasAllAnimeEps,
        title: animeTitle,
        totalFromAniList: totalEpsFromAniList,
      }
    });
  } catch (err: any) {
    console.error("[episodes] Unhandled error:", err?.message || err);
    return NextResponse.json({
      episodes: [],
      miruroEpisodes: { sub: [], dub: [] },
      allAnimeId: null,
      totalEpisodes: null,
      _meta: { error: err?.message || "Unknown error" }
    });
  }
}
