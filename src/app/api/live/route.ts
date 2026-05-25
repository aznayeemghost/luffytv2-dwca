import { NextResponse } from "next/server";

// ============================================================
// LIVE TV & SPORTS — Multi-Source Aggregator
// Sources: streamfree.app (M3U8), cdnlivetv.tv (762 channels),
//          dami-tv.pro (match data), watchfooty.st (match data),
//          streamed.pk (backup), ESPN (schedules),
//          sportsembed.su (embeds), embedsports.top (embeds)
// ============================================================

const TIMEOUT = 6000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function makeCtrl() { const c = new AbortController(); setTimeout(() => c.abort(), TIMEOUT); return c; }
async function httpGet(url: string, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url, { signal: makeCtrl().signal, headers: { "User-Agent": UA, Accept: "application/json", ...headers } });
}

// Sport color mapping
const SPORT_COLORS: Record<string, string> = {
  football: "#22c55e", basketball: "#ef4444", "american-football": "#dc2626", hockey: "#06b6d4",
  baseball: "#3b82f6", tennis: "#a855f7", fight: "#f97316", fighting: "#f97316", "motor-sports": "#eab308",
  racing: "#eab308", rugby: "#10b981", golf: "#84cc16", cricket: "#f59e0b", billiards: "#8b5cf6",
  afl: "#14b8a6", "australian-football": "#14b8a6", darts: "#f43f5e", other: "#6b7280",
  futsal: "#06b6d4", motorsport: "#eab308", cycling: "#84cc16", horse_racing: "#eab308",
  "horse_racing_(uk)": "#eab308", combat: "#f97316", volleyball: "#f59e0b",
};

const SPORT_NAMES: Record<string, string> = {
  football: "Football", basketball: "Basketball", "american-football": "American Football",
  hockey: "Hockey", baseball: "Baseball", tennis: "Tennis", fight: "Fight / MMA / Boxing",
  fighting: "Fight / MMA / Boxing", "motor-sports": "Motor Sports", racing: "Motor Sports",
  motorsport: "Motor Sports", rugby: "Rugby", golf: "Golf", cricket: "Cricket",
  billiards: "Billiards", afl: "AFL", "australian-football": "AFL", darts: "Darts",
  other: "Other", futsal: "Futsal", cycling: "Cycling", horse_racing: "Horse Racing",
  "horse_racing_(uk)": "Horse Racing", combat: "Combat", volleyball: "Volleyball",
};

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
  isLive: boolean;
  apiSource: string;
  sources: { source: string; id: string }[];
  // Provider-specific fields for stream resolution
  streamKey?: string;
  streamCategory?: string;
  channelCode?: string;
  channelName?: string;
  damitvId?: string;
  watchfootyId?: number;
  sportsrcCategory?: string;
  sportsrcId?: string;
}

interface SportCategory { id: string; name: string; }

// ── SOURCE 1: streamfree.app (PRIMARY — M3U8 with CORS CDN!) ──
async function fetchStreamfreeStreams(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://streamfree.app/streams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== "object") return [];

    // Handle {streams: {category: [...]}} or {category: [...]} formats
    const root = data.streams && typeof data.streams === "object" ? data.streams : data;
    const matches: LiveMatch[] = [];
    for (const [category, streams] of Object.entries(root)) {
      if (!Array.isArray(streams)) continue;
      for (const s of streams as any[]) {
        const sport = mapCategoryToSport(s.category || category);
        const homeTeam = s.home_team || s.team1?.name || extractTeam(s.title || s.name || "", 0);
        const awayTeam = s.away_team || s.team2?.name || extractTeam(s.title || s.name || "", 1);
        const homeBadge = s.home_logo || s.home_badge || s.team1?.logo || "";
        const awayBadge = s.away_logo || s.away_badge || s.team2?.logo || "";
        const ts = s.match_timestamp ? s.match_timestamp * 1000 :
                   s.starts_at ? s.starts_at * 1000 :
                   s.date ? new Date(s.date).getTime() : 0;
        matches.push({
          id: `sf-${s.stream_key || s.key || s.id || Math.random().toString(36).slice(2)}`,
          title: s.title || s.name || formatTitle(s.stream_key || ""),
          sport,
          sportName: SPORT_NAMES[sport] || capitalize(s.category || category),
          date: ts,
          poster: s.poster || s.image || s.thumbnail_url ? `https://streamfree.app${s.thumbnail_url}` : "",
          popular: s.featured || s.popular || false,
          homeTeam,
          awayTeam,
          homeBadge,
          awayBadge,
          isLive: s.live || s.is_live || s.status === "live" || false,
          apiSource: "streamfree",
          sources: [],
          streamKey: s.stream_key || s.key || s.id || "",
          streamCategory: s.category || category,
        });
      }
    }
    return matches;
  } catch { return []; }
}

// ── SOURCE 2: cdnlivetv.tv (762 TV channels + sports events) ──
async function fetchCDNLivetvChannels(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://api.cdnlivetv.tv/api/v1/channels/?user=cdnlivetv&plan=free");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.channels) return [];

    return data.channels.map((ch: any): LiveMatch => ({
      id: `cdn-${ch.name}-${ch.code}`,
      title: `${ch.name} (${ch.code.toUpperCase()})`,
      sport: "other",
      sportName: "TV Channel",
      date: 0,
      poster: ch.image || "",
      popular: ch.status === "online",
      homeTeam: ch.name || "",
      awayTeam: ch.code?.toUpperCase() || "",
      homeBadge: ch.image || "",
      awayBadge: "",
      isLive: ch.status === "online",
      apiSource: "cdnlivetv",
      sources: [],
      channelCode: ch.code,
      channelName: ch.name,
    }));
  } catch { return []; }
}

async function fetchCDNLivetvSports(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://api.cdnlivetv.tv/api/v1/events/sports/?user=cdnlivetv&plan=free");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.events) return [];

    return data.events.map((ev: any): LiveMatch => {
      const sport = ev.sport?.toLowerCase() || "other";
      return {
        id: `cdn-sport-${ev.id || Math.random()}`,
        title: ev.title || ev.name || "Sports Event",
        sport,
        sportName: SPORT_NAMES[sport] || capitalize(sport),
        date: ev.date ? new Date(ev.date).getTime() : (ev.start_time ? ev.start_time * 1000 : 0),
        poster: ev.poster || ev.image || "",
        popular: false,
        homeTeam: ev.home_team || extractTeam(ev.title || "", 0),
        awayTeam: ev.away_team || extractTeam(ev.title || "", 1),
        homeBadge: ev.home_logo || "",
        awayBadge: ev.away_logo || "",
        isLive: ev.status === "live" || ev.live || false,
        apiSource: "cdnlivetv-sport",
        sources: [],
        channelName: ev.channel || "",
      };
    });
  } catch { return []; }
}

// ── SOURCE 3: dami-tv.pro (match data + embed URLs) ──
async function fetchDamiTVStreams(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://dami-tv.pro/papi/api/streams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.streams) return [];

    const matches: LiveMatch[] = [];
    for (const category of data.streams) {
      if (!Array.isArray(category.streams)) continue;
      for (const s of category.streams) {
        const sport = mapCategoryToSport(s.category_name || category.name || "");
        matches.push({
          id: `dami-${s.id || Math.random()}`,
          title: s.name || s.title || "Match",
          sport,
          sportName: SPORT_NAMES[sport] || capitalize(s.category_name || category.name || ""),
          date: s.starts_at ? s.starts_at * 1000 : 0,
          poster: s.poster || "",
          popular: s.always_live === 1,
          homeTeam: s.teams?.home?.name || extractTeam(s.name || "", 0),
          awayTeam: s.teams?.away?.name || extractTeam(s.name || "", 1),
          homeBadge: s.teams?.home?.badge || "",
          awayBadge: s.teams?.away?.badge || "",
          isLive: s.status === "live",
          apiSource: "damitv",
          sources: [],
          damitvId: s.id || s.uri_name || "",
        });
      }
    }
    return matches;
  } catch { return []; }
}

// ── SOURCE 4: watchfooty.st (rich match data + embed URLs) ──
async function fetchWatchfootyLive(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://api.watchfooty.st/api/v1/matches/live");
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const sport = m.sport || "other";
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : 0,
        poster: m.poster || "",
        popular: false,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logo || "",
        awayBadge: m.teams?.away?.logo || "",
        isLive: true,
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
      };
    });
  } catch { return []; }
}

async function fetchWatchfootyAll(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://api.watchfooty.st/api/v1/matches/all");
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const sport = m.sport || "other";
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : 0,
        poster: m.poster || "",
        popular: false,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logo || "",
        awayBadge: m.teams?.away?.logo || "",
        isLive: m.status === "live",
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
      };
    });
  } catch { return []; }
}

// ── SOURCE 5: streamed.pk (backup) ──
async function fetchStreamedPK(endpoint: string): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`https://streamed.pk${endpoint}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => ({
      id: `sp-${m.id || Math.random()}`,
      title: m.title || "Match",
      sport: m.category || "other",
      sportName: SPORT_NAMES[m.category] || capitalize(m.category || "other"),
      date: m.date || 0,
      poster: m.poster ? `https://streamed.pk${m.poster}` : "",
      popular: m.popular || false,
      homeTeam: m.teams?.home?.name || "",
      awayTeam: m.teams?.away?.name || "",
      homeBadge: m.teams?.home?.badge ? `https://streamed.pk/api/images/badge/${m.teams.home.badge}.webp` : "",
      awayBadge: m.teams?.away?.badge ? `https://streamed.pk/api/images/badge/${m.teams.away.badge}.webp` : "",
      isLive: false,
      apiSource: "streamed",
      sources: Array.isArray(m.sources) ? m.sources.map((s: any) => ({ source: s.source || "", id: s.id || "" })) : [],
    }));
  } catch { return []; }
}

// ── SOURCE 6: ESPN (schedules + scores) ──
async function fetchESPNMatches(): Promise<LiveMatch[]> {
  const espnSports = [
    { sport: "basketball", league: "nba" },
    { sport: "football", league: "nfl" },
    { sport: "soccer", league: "eng.1" },
    { sport: "hockey", league: "nhl" },
    { sport: "baseball", league: "mlb" },
  ];
  const matches: LiveMatch[] = [];
  const results = await Promise.allSettled(
    espnSports.map(async (espn) => {
      try {
        const res = await httpGet(`https://site.api.espn.com/apis/site/v2/sports/${espn.sport}/${espn.league}/scoreboard`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.events || []).map((e: any): LiveMatch => {
          const comp = e.competitions?.[0];
          const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
          const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
          const sport = espn.sport === "soccer" ? "football" : espn.sport;
          return {
            id: `espn-${e.id}`,
            title: e.name || "Match",
            sport,
            sportName: SPORT_NAMES[sport] || capitalize(sport),
            date: e.date ? new Date(e.date).getTime() : 0,
            poster: "",
            popular: false,
            homeTeam: home?.team?.displayName || "",
            awayTeam: away?.team?.displayName || "",
            homeBadge: home?.team?.logo || "",
            awayBadge: away?.team?.logo || "",
            isLive: comp?.status?.type?.name === "in" || false,
            apiSource: "espn",
            sources: [],
          };
        });
      } catch { return []; }
    })
  );
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) matches.push(...r.value);
  }
  return matches;
}

// ── SOURCE 7: sportsembed.su (embed URLs for live sports) ──
async function fetchSportsembedSu(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://sportsembed.su/api/events/live", { Referer: "https://sportsembed.su/" });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((ev: any): LiveMatch => {
      const sport = mapCategoryToSport(ev.sport || ev.category || "other");
      return {
        id: `se-${ev.id || Math.random()}`,
        title: ev.title || ev.name || "Live Event",
        sport,
        sportName: SPORT_NAMES[sport] || capitalize(ev.sport || "Sports"),
        date: ev.date ? new Date(ev.date).getTime() : (ev.start_time ? ev.start_time * 1000 : 0),
        poster: ev.poster || ev.image || "",
        popular: ev.featured || false,
        homeTeam: ev.home_team || ev.teams?.home?.name || extractTeam(ev.title || "", 0),
        awayTeam: ev.away_team || ev.teams?.away?.name || extractTeam(ev.title || "", 1),
        homeBadge: ev.home_logo || ev.teams?.home?.logo || "",
        awayBadge: ev.away_logo || ev.teams?.away?.logo || "",
        isLive: true,
        apiSource: "sportsembed",
        sources: [],
        sportsrcCategory: ev.category || ev.sport || "",
        sportsrcId: ev.id || "",
      };
    });
  } catch { return []; }
}

// ── SOURCE 8: embedsports.top (stream embeds) ──
async function fetchEmbedsportsTop(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://embedsports.top/api/events", { Referer: "https://embedsports.top/" });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) && !data?.events) return [];
    const events = Array.isArray(data) ? data : (data.events || []);

    return events.map((ev: any): LiveMatch => {
      const sport = mapCategoryToSport(ev.sport || ev.category || "other");
      return {
        id: `es-${ev.id || Math.random()}`,
        title: ev.title || ev.name || "Sports Event",
        sport,
        sportName: SPORT_NAMES[sport] || capitalize(ev.sport || "Sports"),
        date: ev.date ? new Date(ev.date).getTime() : (ev.start ? ev.start * 1000 : 0),
        poster: ev.poster || ev.image || "",
        popular: ev.featured || false,
        homeTeam: ev.home_team || ev.teams?.home?.name || extractTeam(ev.title || "", 0),
        awayTeam: ev.away_team || ev.teams?.away?.name || extractTeam(ev.title || "", 1),
        homeBadge: ev.home_logo || ev.teams?.home?.logo || "",
        awayBadge: ev.away_logo || ev.teams?.away?.logo || "",
        isLive: ev.live || ev.status === "live" || false,
        apiSource: "embedsports",
        sources: [],
        sportsrcCategory: ev.category || ev.sport || "",
        sportsrcId: ev.id || "",
      };
    });
  } catch { return []; }
}

// ── Merge & Deduplicate ──
function mergeMatches(lists: LiveMatch[][]): LiveMatch[] {
  const seen = new Map<string, LiveMatch>();
  for (const list of lists) {
    for (const m of list) {
      const key = m.homeTeam && m.awayTeam
        ? `${m.sport}:${m.homeTeam.toLowerCase().trim()}:${m.awayTeam.toLowerCase().trim()}`
        : m.id;
      const existing = seen.get(key);
      if (existing) {
        // Merge: prefer streamfree (has M3U8), fill missing fields
        if (m.apiSource === "streamfree" && existing.apiSource !== "streamfree") {
          seen.set(key, { ...m, ...pickMissing(m, existing) });
        } else {
          // Fill in missing fields from new match
          Object.assign(existing, pickMissing(existing, m));
        }
        continue;
      }
      seen.set(key, m);
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return a.date - b.date;
  });
}

function pickMissing(base: LiveMatch, fill: LiveMatch): Partial<LiveMatch> {
  const result: Partial<LiveMatch> = {};
  if (!base.homeBadge && fill.homeBadge) result.homeBadge = fill.homeBadge;
  if (!base.awayBadge && fill.awayBadge) result.awayBadge = fill.awayBadge;
  if (!base.poster && fill.poster) result.poster = fill.poster;
  if (!base.homeTeam && fill.homeTeam) result.homeTeam = fill.homeTeam;
  if (!base.awayTeam && fill.awayTeam) result.awayTeam = fill.awayTeam;
  if (!base.streamKey && fill.streamKey) result.streamKey = fill.streamKey;
  if (!base.streamCategory && fill.streamCategory) result.streamCategory = fill.streamCategory;
  if (fill.popular) result.popular = true;
  if (fill.isLive) result.isLive = true;
  if (base.sources.length === 0 && fill.sources.length > 0) result.sources = fill.sources;
  return result;
}

// ── Helpers ──
function capitalize(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : ""; }
function mapCategoryToSport(cat: string): string {
  const m: Record<string, string> = {
    basketball: "basketball", hockey: "hockey", baseball: "baseball", soccer: "football",
    football: "american-football", tennis: "tennis", cricket: "cricket", racing: "motor-sports",
    combat: "fight", fighting: "fight", afl: "afl", rugby: "rugby", golf: "golf",
    "motor-sports": "motor-sports", motorsport: "motor-sports", darts: "darts",
  };
  return m[cat?.toLowerCase()] || "other";
}
function extractTeam(title: string, index: 0 | 1): string {
  if (!title) return "";
  const parts = title.split(/\s+vs\.?\s+|\s+@\s+|\s+-\s+/i);
  return parts[index]?.trim() || "";
}
function formatTitle(key: string): string {
  if (!key) return "";
  return key.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── SPORTS LIST ──
const ALL_SPORTS: SportCategory[] = [
  { id: "football", name: "Football" },
  { id: "basketball", name: "Basketball" },
  { id: "american-football", name: "American Football" },
  { id: "hockey", name: "Hockey" },
  { id: "baseball", name: "Baseball" },
  { id: "tennis", name: "Tennis" },
  { id: "fight", name: "Fight / MMA / Boxing" },
  { id: "motor-sports", name: "Motor Sports" },
  { id: "rugby", name: "Rugby" },
  { id: "golf", name: "Golf" },
  { id: "cricket", name: "Cricket" },
  { id: "other", name: "TV Channels / Other" },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sport = url.searchParams.get("sport") || "";
  const filter = url.searchParams.get("filter") || "";
  const mode = url.searchParams.get("mode") || ""; // "tv" for channels only

  try {
    // Fetch from ALL sources in parallel
    const [streamfree, cdnChannels, cdnSports, damitv, wfLive, wfAll, streamedLive, streamedToday, espn, sportsembed, embedsports] = await Promise.allSettled([
      fetchStreamfreeStreams(),
      mode === "tv" ? fetchCDNLivetvChannels() : Promise.resolve([]),
      fetchCDNLivetvSports(),
      fetchDamiTVStreams(),
      fetchWatchfootyLive(),
      fetchWatchfootyAll(),
      fetchStreamedPK("/api/matches/live"),
      fetchStreamedPK("/api/matches/all-today"),
      fetchESPNMatches(),
      fetchSportsembedSu(),
      fetchEmbedsportsTop(),
    ]);

    const allLists: LiveMatch[][] = [
      streamfree.status === "fulfilled" ? streamfree.value : [],
      cdnChannels.status === "fulfilled" ? cdnChannels.value : [],
      cdnSports.status === "fulfilled" ? cdnSports.value : [],
      damitv.status === "fulfilled" ? damitv.value : [],
      wfLive.status === "fulfilled" ? wfLive.value : [],
      wfAll.status === "fulfilled" ? wfAll.value : [],
      streamedLive.status === "fulfilled" ? streamedLive.value : [],
      streamedToday.status === "fulfilled" ? streamedToday.value : [],
      espn.status === "fulfilled" ? espn.value : [],
      sportsembed.status === "fulfilled" ? sportsembed.value : [],
      embedsports.status === "fulfilled" ? embedsports.value : [],
    ];

    let matches = mergeMatches(allLists);

    // Filter by sport
    if (sport) {
      matches = matches.filter(m => m.sport === sport);
    }

    // Filter for live matches
    if (filter === "live") {
      const now = Date.now();
      matches = matches.filter(m => {
        if (m.isLive) return true;
        if (!m.date) return false;
        return m.date <= now && m.date > now - 10800000;
      });
    }

    // For TV mode: if no cdnlivetv channels found, convert streamfree "always live" channels
    if (mode === "tv") {
      const cdnChannelsFound = matches.some(m => m.apiSource === "cdnlivetv");
      if (!cdnChannelsFound) {
        // Use streamfree "always live" streams as TV channels
        const alwaysLive = matches.filter(m => m.apiSource === "streamfree" && m.streamKey && !m.homeTeam && !m.awayTeam);
        for (const m of alwaysLive) {
          m.sport = "other";
          m.sportName = "TV Channel";
          m.channelName = m.title;
          m.channelCode = m.streamCategory || "";
          m.isLive = true;
        }
        // Also use all streamfree sources as channels for TV view
        const streamfreeAsChannels = matches.filter(m => m.apiSource === "streamfree" && m.streamKey);
        for (const m of streamfreeAsChannels) {
          if (!m.channelName) {
            m.channelName = m.homeTeam || m.title;
            m.channelCode = m.streamCategory || "";
          }
          if (m.sportName !== "TV Channel") {
            m.sportName = m.sportName || "TV Channel";
          }
        }
      }
    }

    // Count by source
    const sourceCounts: Record<string, number> = {};
    for (const m of matches) {
      sourceCounts[m.apiSource] = (sourceCounts[m.apiSource] || 0) + 1;
    }

    return NextResponse.json({
      matches,
      sports: ALL_SPORTS,
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
