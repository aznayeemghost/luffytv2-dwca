import { NextResponse } from "next/server";

// ============================================================
// LIVE TV & SPORTS API — SportSRC as PRIMARY (WORKING!)
// Primary: SportSRC (matches + embed URLs that work in iframes!)
// Secondary: ESPN Hidden API (scores + schedules)
// Tertiary: streamed.pk (backup data)
// ============================================================

const SPORTSRC_BASE = "https://api.sportsrc.org";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const STREAMED_BASE = "https://streamed.pk";
const TIMEOUT = 12000;

// SportSRC category mapping
const SPORTSRC_CATEGORIES = [
  "football", "basketball", "american-football", "hockey", "baseball",
  "motor-sports", "fight", "tennis", "rugby", "golf", "billiards",
  "afl", "darts", "cricket", "other",
];

// ESPN sport endpoints
const ESPN_SPORTS = [
  { sport: "basketball", league: "nba", id: "basketball" },
  { sport: "football", league: "nfl", id: "american-football" },
  { sport: "soccer", league: "eng.1", id: "football" },
  { sport: "soccer", league: "usa.1", id: "football" },
  { sport: "soccer", league: "esp.1", id: "football" },
  { sport: "hockey", league: "nhl", id: "hockey" },
  { sport: "baseball", league: "mlb", id: "baseball" },
  { sport: "tennis", league: "atp", id: "tennis" },
];

interface LiveMatch {
  id: string;
  title: string;
  sport: string;
  sportName: string;
  date: number;
  poster: string;
  popular: boolean;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string;
  awayBadge: string;
  sources: { source: string; id: string }[];
  apiSource: string;
  // SportSRC-specific: include category + match ID for direct stream fetching
  sportsrcCategory?: string;
  sportsrcId?: string;
}

interface SportCategory {
  id: string;
  name: string;
}

function makeTimeout(): AbortController {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT);
  return ctrl;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = makeTimeout();
  return fetch(url, {
    signal: ctrl.signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
  });
}

// ── SOURCE 1: SportSRC (PRIMARY — has everything including working embed URLs) ──
async function fetchSportSRCSports(): Promise<SportCategory[]> {
  try {
    const res = await fetchWithTimeout(`${SPORTSRC_BASE}/?data=sports`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data.map((s: any) => ({ id: s.id || "", name: s.name || s.id || "" }));
  } catch {
    return [];
  }
}

async function fetchSportSRCMatches(category: string): Promise<LiveMatch[]> {
  try {
    const res = await fetchWithTimeout(`${SPORTSRC_BASE}/?data=matches&category=${encodeURIComponent(category)}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return [];

    return data.data.map((m: any): LiveMatch => ({
      id: m.id || String(Math.random()),
      title: m.title || "Unknown Match",
      sport: m.category || category,
      sportName: m.category
        ? m.category.charAt(0).toUpperCase() + m.category.slice(1).replace(/-/g, " ")
        : category,
      date: m.date || 0,
      poster: m.poster || "",
      popular: m.popular || false,
      homeTeam: m.teams?.home?.name || "",
      awayTeam: m.teams?.away?.name || "",
      homeBadge: m.teams?.home?.badge || "",
      awayBadge: m.teams?.away?.badge || "",
      sources: [], // Fetched on-demand when user clicks "Watch"
      apiSource: "sportsrc",
      sportsrcCategory: m.category || category,
      sportsrcId: m.id,
    }));
  } catch {
    return [];
  }
}

// ── SOURCE 2: ESPN Hidden API (schedules + scores, no streams) ──
async function fetchESPNMatches(): Promise<LiveMatch[]> {
  const matches: LiveMatch[] = [];

  const results = await Promise.allSettled(
    ESPN_SPORTS.map(async (espn) => {
      try {
        const res = await fetchWithTimeout(`${ESPN_BASE}/${espn.sport}/${espn.league}/scoreboard`);
        if (!res.ok) return [];
        const data = await res.json();
        const events = data.events || [];

        return events.map((e: any): LiveMatch => {
          const competitions = e.competitions?.[0];
          const homeTeam = competitions?.competitors?.find((c: any) => c.homeAway === "home");
          const awayTeam = competitions?.competitors?.find((c: any) => c.homeAway === "away");

          return {
            id: `espn-${e.id}`,
            title: e.name || "Unknown Match",
            sport: espn.id,
            sportName: espn.sport === "soccer" ? "Football" : espn.sport.charAt(0).toUpperCase() + espn.sport.slice(1),
            date: e.date ? new Date(e.date).getTime() : 0,
            poster: competitions?.odds?.[0]?.detail || "",
            popular: false,
            homeTeam: homeTeam?.team?.displayName || "",
            awayTeam: awayTeam?.team?.displayName || "",
            homeBadge: homeTeam?.team?.logo || "",
            awayBadge: awayTeam?.team?.logo || "",
            sources: [],
            apiSource: "espn",
          };
        });
      } catch {
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      matches.push(...result.value);
    }
  }
  return matches;
}

// ── SOURCE 3: streamed.pk (backup match data) ──
async function fetchStreamedMatches(endpoint: string): Promise<LiveMatch[]> {
  try {
    const res = await fetchWithTimeout(`${STREAMED_BASE}${endpoint}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => ({
      id: m.id || String(Math.random()),
      title: m.title || "Unknown Match",
      sport: m.category || "",
      sportName: m.category
        ? m.category.charAt(0).toUpperCase() + m.category.slice(1).replace(/-/g, " ")
        : "Other",
      date: m.date || 0,
      poster: m.poster ? `${STREAMED_BASE}${m.poster}` : "",
      popular: m.popular || false,
      homeTeam: m.teams?.home?.name || "",
      awayTeam: m.teams?.away?.name || "",
      homeBadge: m.teams?.home?.badge ? `${STREAMED_BASE}/api/images/badge/${m.teams.home.badge}.webp` : "",
      awayBadge: m.teams?.away?.badge ? `${STREAMED_BASE}/api/images/badge/${m.teams.away.badge}.webp` : "",
      sources: Array.isArray(m.sources) ? m.sources.map((s: any) => ({ source: s.source || "", id: s.id || "" })) : [],
      apiSource: "streamed.pk",
    }));
  } catch {
    return [];
  }
}

// ── Merge matches from multiple sources ──
function mergeMatches(lists: LiveMatch[][]): LiveMatch[] {
  const seen = new Set<string>();
  const merged: LiveMatch[] = [];

  for (const list of lists) {
    for (const m of list) {
      // Create a dedup key based on team names or title similarity
      const key = m.homeTeam && m.awayTeam
        ? `${m.sport}:${m.homeTeam.toLowerCase()}:${m.awayTeam.toLowerCase()}`
        : m.id;

      if (seen.has(key)) {
        const existing = merged.find(x => {
          const xkey = x.homeTeam && x.awayTeam
            ? `${x.sport}:${x.homeTeam.toLowerCase()}:${x.awayTeam.toLowerCase()}`
            : x.id;
          return xkey === key;
        });
        if (existing) {
          // Merge: prefer SportSRC data (has embed URLs), fill missing from other sources
          if (m.homeBadge && !existing.homeBadge) existing.homeBadge = m.homeBadge;
          if (m.awayBadge && !existing.awayBadge) existing.awayBadge = m.awayBadge;
          if (m.poster && !existing.poster) existing.poster = m.poster;
          if (m.popular) existing.popular = true;
          // Add SportSRC reference if available
          if (m.sportsrcId && !existing.sportsrcId) {
            existing.sportsrcId = m.sportsrcId;
            existing.sportsrcCategory = m.sportsrcCategory;
          }
          // Add streamed.pk sources
          if (m.sources?.length > 0 && existing.sources.length === 0) {
            existing.sources = m.sources;
          }
          // Use earliest date
          if (m.date && (!existing.date || m.date < existing.date)) existing.date = m.date;
        }
        continue;
      }
      seen.add(key);
      merged.push(m);
    }
  }

  return merged.sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return a.date - b.date;
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sport = url.searchParams.get("sport") || "";
  const filter = url.searchParams.get("filter") || "";

  try {
    // Fetch from SportSRC FIRST (primary — has working embed URLs)
    const categoriesToFetch = sport ? [sport] : SPORTSRC_CATEGORIES;

    // Fetch SportSRC matches in parallel (batched - max 5 at a time to avoid rate limits)
    const sportsrcBatches: Promise<LiveMatch[]>[] = [];
    for (let i = 0; i < categoriesToFetch.length; i += 5) {
      const batch = categoriesToFetch.slice(i, i + 5);
      sportsrcBatches.push(
        Promise.all(batch.map(cat => fetchSportSRCMatches(cat))).then(results => results.flat())
      );
    }
    const sportsrcResults = await Promise.all(sportsrcBatches);
    const sportsrcMatches = sportsrcResults.flat();

    // Also fetch SportSRC sports list
    const sportsPromise = fetchSportSRCSports();

    // Fetch ESPN + streamed.pk in parallel (secondary sources)
    const [espnResult, sportsResult, streamedLive, streamedToday] = await Promise.allSettled([
      fetchESPNMatches(),
      sportsPromise,
      fetchStreamedMatches("/api/matches/live"),
      fetchStreamedMatches("/api/matches/all-today"),
    ]);

    const espnMatches = espnResult.status === "fulfilled" ? espnResult.value : [];
    const sports: SportCategory[] = sportsResult.status === "fulfilled" ? sportsResult.value : [];
    const streamedLiveMatches = streamedLive.status === "fulfilled" ? streamedLive.value : [];
    const streamedTodayMatches = streamedToday.status === "fulfilled" ? streamedToday.value : [];

    // Merge all sources
    const allMatchLists: LiveMatch[][] = [
      sportsrcMatches,  // PRIMARY — has sportsrcId for fetching embeds
      espnMatches,
      streamedLiveMatches,
      streamedTodayMatches,
    ];

    let matches = mergeMatches(allMatchLists);

    // Filter by sport if specified
    if (sport) {
      matches = matches.filter(m => m.sport === sport);
    }

    // Filter for live matches
    if (filter === "live") {
      const now = Date.now();
      matches = matches.filter(m => {
        // A match is "live" if it started within the last 3 hours and hasn't ended
        if (!m.date) return false;
        return m.date <= now && m.date > now - 10800000;
      });
    }

    // Count by source
    const sourceCounts = {
      sportsrc: sportsrcMatches.length,
      espn: espnMatches.length,
      streamed: (streamedLiveMatches.length + streamedTodayMatches.length),
    };

    return NextResponse.json({
      matches,
      sports,
      total: matches.length,
      sources: sourceCounts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch live data", details: error.message },
      { status: 500 }
    );
  }
}
