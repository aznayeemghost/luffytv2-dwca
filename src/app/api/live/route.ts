import { NextResponse } from "next/server";

// ============================================================
// LIVE TV & SPORTS API — Multiple API sources
// Primary: streamed.pk (best data, has stream sources)
// Secondary: thesportsdb.com (match schedules, team logos)
// ============================================================

const STREAMED_BASE = "https://streamed.pk";
const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";
const TIMEOUT = 12000;

interface TeamInfo {
  name: string;
  badge: string;
}

interface MatchSource {
  source: string;
  id: string;
}

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
  sources: MatchSource[];
  apiSource: string; // Which API provided this match
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

// ── SOURCE 1: streamed.pk ──
async function fetchSports(): Promise<SportCategory[]> {
  try {
    const res = await fetchWithTimeout(`${STREAMED_BASE}/api/sports`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((s: any) => ({ id: s.id || "", name: s.name || s.id || "" }));
  } catch {
    return [];
  }
}

async function fetchStreamedMatches(endpoint: string): Promise<LiveMatch[]> {
  try {
    const res = await fetchWithTimeout(`${STREAMED_BASE}${endpoint}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const homeTeam = m.teams?.home?.name || "";
      const awayTeam = m.teams?.away?.name || "";
      const homeBadge = m.teams?.home?.badge
        ? `${STREAMED_BASE}/api/images/badge/${m.teams.home.badge}.webp`
        : "";
      const awayBadge = m.teams?.away?.badge
        ? `${STREAMED_BASE}/api/images/badge/${m.teams.away.badge}.webp`
        : "";
      const poster = m.poster
        ? `${STREAMED_BASE}${m.poster}`
        : "";

      return {
        id: m.id || String(Math.random()),
        title: m.title || "Unknown Match",
        sport: m.category || "",
        sportName: m.category
          ? m.category.charAt(0).toUpperCase() + m.category.slice(1).replace(/-/g, " ")
          : "Other",
        date: m.date || 0,
        poster,
        popular: m.popular || false,
        homeTeam,
        awayTeam,
        homeBadge,
        awayBadge,
        sources: Array.isArray(m.sources)
          ? m.sources.map((s: any) => ({ source: s.source || "", id: s.id || "" }))
          : [],
        apiSource: "streamed.pk",
      };
    });
  } catch {
    return [];
  }
}

// ── SOURCE 2: thesportsdb.com ──
// Map thesportsdb sports to our sport categories
const SPORTSDB_SPORT_MAP: Record<string, string> = {
  "Soccer": "football",
  "Basketball": "basketball",
  "American Football": "american-football",
  "Ice Hockey": "hockey",
  "Baseball": "baseball",
  "Tennis": "tennis",
  "Fighting": "fight",
  "Motorsport": "motor-sports",
  "Rugby": "rugby",
  "Golf": "golf",
  "Cricket": "cricket",
  "Billiards": "billiards",
  "AFL": "afl",
  "Darts": "darts",
};

async function fetchSportsDBMatches(): Promise<LiveMatch[]> {
  try {
    // Fetch today's events across major sports
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const sportLeagues = [
      { sport: "Soccer", leagueId: "4335" },  // Premier League
      { sport: "Basketball", leagueId: "4387" }, // NBA
      { sport: "American Football", leagueId: "4391" }, // NFL
      { sport: "Ice Hockey", leagueId: "4380" }, // NHL
      { sport: "Baseball", leagueId: "4424" },   // MLB
      { sport: "Tennis", leagueId: "4464" },     // ATP
    ];

    const results = await Promise.allSettled(
      sportLeagues.map(async (sl) => {
        try {
          const res = await fetchWithTimeout(
            `${SPORTSDB_BASE}/eventsday.php?d=${today}&sp=${sl.leagueId}`
          );
          if (!res.ok) return [];
          const data = await res.json();
          const events = data.events || [];
          return events.map((e: any): LiveMatch => ({
            id: `tdb-${e.idEvent}`,
            title: e.strEvent || "Unknown Match",
            sport: SPORTSDB_SPORT_MAP[sl.sport] || "other",
            sportName: sl.sport,
            date: e.strTimestamp ? new Date(e.strTimestamp).getTime() : 0,
            poster: e.strThumb || e.strBanner || "",
            popular: false,
            homeTeam: e.strHomeTeam || "",
            awayTeam: e.strAwayTeam || "",
            homeBadge: e.strHomeTeamBadge || "",
            awayBadge: e.strAwayTeamBadge || "",
            sources: [], // thesportsdb doesn't provide stream sources
            apiSource: "thesportsdb",
          }));
        } catch {
          return [];
        }
      })
    );

    const matches: LiveMatch[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        matches.push(...result.value);
      }
    }
    return matches;
  } catch {
    return [];
  }
}

// ── Merge matches from multiple sources (dedupe by id) ──
function mergeMatches(lists: LiveMatch[][]): LiveMatch[] {
  const seen = new Set<string>();
  const merged: LiveMatch[] = [];

  for (const list of lists) {
    for (const m of list) {
      if (seen.has(m.id)) {
        // Merge data from different sources into existing match
        const existing = merged.find(x => x.id === m.id);
        if (existing) {
          // Add any new sources (from streamed.pk)
          for (const src of m.sources) {
            if (!existing.sources.some(s => s.source === src.source && s.id === src.id)) {
              existing.sources.push(src);
            }
          }
          // Fill missing data (from thesportsdb)
          if (m.homeTeam && !existing.homeTeam) existing.homeTeam = m.homeTeam;
          if (m.awayTeam && !existing.awayTeam) existing.awayTeam = m.awayTeam;
          if (m.homeBadge && !existing.homeBadge) existing.homeBadge = m.homeBadge;
          if (m.awayBadge && !existing.awayBadge) existing.awayBadge = m.awayBadge;
          if (m.poster && !existing.poster) existing.poster = m.poster;
          // Mark popular if any source says so
          if (m.popular) existing.popular = true;
          // Use earliest date
          if (m.date && (!existing.date || m.date < existing.date)) existing.date = m.date;
        }
        continue;
      }
      seen.add(m.id);
      merged.push(m);
    }
  }

  // Sort: popular first, then by date descending
  return merged.sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return b.date - a.date;
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sport = url.searchParams.get("sport") || "";
  const filter = url.searchParams.get("filter") || "";

  try {
    // Fetch from ALL sources in parallel
    const [sportsResult, liveMatches, todayMatches, sportMatches, sportsDBMatches] = await Promise.allSettled([
      fetchSports(),
      fetchStreamedMatches("/api/matches/live"),
      fetchStreamedMatches("/api/matches/all-today"),
      sport ? fetchStreamedMatches(`/api/matches/${sport}`) : Promise.resolve([]),
      fetchSportsDBMatches(),
    ]);

    const sports: SportCategory[] = sportsResult.status === "fulfilled" ? sportsResult.value : [];

    // Collect all match lists
    const allMatchLists: LiveMatch[][] = [];
    if (liveMatches.status === "fulfilled" && liveMatches.value.length > 0) {
      allMatchLists.push(liveMatches.value);
    }
    if (todayMatches.status === "fulfilled" && todayMatches.value.length > 0) {
      allMatchLists.push(todayMatches.value);
    }
    if (sportMatches.status === "fulfilled" && sportMatches.value.length > 0) {
      allMatchLists.push(sportMatches.value);
    }
    // Add thesportsdb matches (supplementary data, no streams)
    if (sportsDBMatches.status === "fulfilled" && sportsDBMatches.value.length > 0) {
      allMatchLists.push(sportsDBMatches.value);
    }

    let matches = mergeMatches(allMatchLists);

    // Filter by sport if specified
    if (sport) {
      matches = matches.filter(m => m.sport === sport);
    }

    // Filter by live/popular
    if (filter === "live") {
      const liveIds = liveMatches.status === "fulfilled"
        ? new Set(liveMatches.value.map(m => m.id))
        : new Set<string>();
      matches = matches.filter(m => liveIds.has(m.id));
    }
    if (filter === "popular") {
      matches = matches.filter(m => m.popular);
    }

    // Only show matches that have streams OR are from thesportsdb (informational)
    // Actually, show all matches - some thesportsdb matches might not have streams
    // but they show upcoming schedules which is useful

    return NextResponse.json({
      matches,
      sports,
      total: matches.length,
      sources: {
        streamed: liveMatches.status === "fulfilled" ? liveMatches.value.length : 0,
        thesportsdb: sportsDBMatches.status === "fulfilled" ? sportsDBMatches.value.length : 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch live data", details: error.message },
      { status: 500 }
    );
  }
}
