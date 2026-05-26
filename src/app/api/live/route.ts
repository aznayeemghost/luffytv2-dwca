import { NextResponse } from "next/server";

// ============================================================
// LIVE TV & SPORTS — Multi-Source Aggregator
// Sources: streamfree.app (M3U8), cdnlivetv.tv (762 channels),
//          dami-tv.pro (match data), watchfooty.st (match data + streams),
//          streamed.pk (backup), ESPN (schedules),
//          sportsembed.su (embeds), embedsports.top (embeds)
// ============================================================

const TIMEOUT = 10000;
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
  // WatchFooty extended fields
  watchfootyStreams?: { id: string; url: string; quality: string; language: string; isRedirect: boolean; nsfw: boolean; ads: boolean }[];
  league?: string;
  leagueLogo?: string;
  homeScore?: number;
  awayScore?: number;
  currentMinute?: string;
}

interface SportCategory { id: string; name: string; displayName?: string; liveCount?: number; }

// ── SOURCE 1: streamfree.app (PRIMARY — M3U8 with CORS CDN!) ──
async function fetchStreamfreeStreams(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://streamfree.app/streams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== "object") return [];

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

// ── SOURCE 2: dami-tv.pro (ALL matches + embed URLs, replaces dead cdnlivetv) ──
async function fetchDamiTVStreams(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://dami-tv.pro/papi/api/streams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.streams || !Array.isArray(data.streams)) return [];

    const matches: LiveMatch[] = [];
    for (const category of data.streams) {
      if (!Array.isArray(category.streams)) continue;
      for (const s of category.streams) {
        const sport = mapCategoryToSport(s.category_name || category.category || "");
        const homeTeam = s.teams?.home?.name || extractTeam(s.name || "", 0);
        const awayTeam = s.teams?.away?.name || extractTeam(s.name || "", 1);
        const homeBadge = s.teams?.home?.badge || "";
        const awayBadge = s.teams?.away?.badge || "";
        const ts = s.starts_at ? s.starts_at * 1000 : 0;
        matches.push({
          id: `dami-${s.id || s.uri_name || Math.random().toString(36).slice(2)}`,
          title: s.name || s.title || formatTitle(s.id || ""),
          sport,
          sportName: SPORT_NAMES[sport] || capitalize(s.category_name || category.category || ""),
          date: ts,
          poster: s.poster || "",
          popular: s.always_live === 1,
          homeTeam,
          awayTeam,
          homeBadge,
          awayBadge,
          isLive: s.status === "live",
          apiSource: "damitv",
          sources: [],
          damitvId: s.uri_name || s.id || "",
        });
      }
    }
    return matches;
  } catch { return []; }
}

// ── SOURCE 2b: dami-tv.pro TV channels (always-live streams as TV channels) ──
async function fetchDamiTVChannels(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://dami-tv.pro/papi/api/streams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.streams || !Array.isArray(data.streams)) return [];

    const channels: LiveMatch[] = [];
    for (const category of data.streams) {
      if (!Array.isArray(category.streams)) continue;
      for (const s of category.streams) {
        const sport = mapCategoryToSport(s.category_name || category.category || "");
        const homeTeam = s.teams?.home?.name || extractTeam(s.name || "", 0);
        const awayTeam = s.teams?.away?.name || extractTeam(s.name || "", 1);
        const ts = s.starts_at ? s.starts_at * 1000 : 0;
        channels.push({
          id: `dami-ch-${s.id || s.uri_name || Math.random().toString(36).slice(2)}`,
          title: s.name || s.title || formatTitle(s.id || ""),
          sport: s.status === "live" ? sport : "other",
          sportName: s.status === "live" ? (SPORT_NAMES[sport] || capitalize(s.category_name || "")) : "TV Channel",
          date: ts,
          poster: s.poster || "",
          popular: s.status === "live",
          homeTeam: s.status === "live" ? homeTeam : (s.name || ""),
          awayTeam: s.status === "live" ? awayTeam : (s.league || s.category_name || ""),
          homeBadge: s.teams?.home?.badge || s.poster || "",
          awayBadge: s.teams?.away?.badge || "",
          isLive: s.status === "live" || s.always_live === 1,
          apiSource: "damitv",
          sources: [],
          damitvId: s.uri_name || s.id || "",
          channelName: s.name || "",
          channelCode: s.category_name || category.category || "",
        });
      }
    }
    return channels;
  } catch { return []; }
}

// ── SOURCE 4: watchfooty.st (rich match data + embed URLs + scores + streams) ──
const WF_BASE = "https://api.watchfooty.st";

function mapWfSport(sport: string): string {
  const m: Record<string, string> = {
    football: "football", basketball: "basketball", "american-football": "american-football",
    hockey: "hockey", baseball: "baseball", tennis: "tennis", fighting: "fight",
    fight: "fight", motorsport: "motor-sports", "motor-sports": "motor-sports",
    racing: "motor-sports", rugby: "rugby", golf: "golf", cricket: "cricket",
    afl: "afl", "australian-football": "afl", darts: "darts", futsal: "futsal",
    cycling: "cycling", horse_racing: "horse_racing", combat: "fight",
    volleyball: "volleyball", billiards: "billiards",
  };
  return m[sport?.toLowerCase()] || sport || "other";
}

async function fetchWatchfootyLive(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/matches/live`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const sport = mapWfSport(m.sport || "other");
      const streams = Array.isArray(m.streams) ? m.streams.map((s: any) => ({
        id: String(s.id || ""),
        url: s.url || "",
        quality: s.quality || "hd",
        language: s.language || "english",
        isRedirect: s.isRedirect || false,
        nsfw: s.nsfw || false,
        ads: s.ads || false,
      })) : [];
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || m.sport || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : (m.timestamp ? m.timestamp * 1000 : 0),
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `${WF_BASE}${m.poster}`) : "",
        popular: true,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logoUrl ? (m.teams.home.logoUrl.startsWith("http") ? m.teams.home.logoUrl : `${WF_BASE}${m.teams.home.logoUrl}`) : (m.teams?.home?.logo ? (m.teams.home.logo.startsWith("http") ? m.teams.home.logo : `${WF_BASE}${m.teams.home.logo}`) : ""),
        awayBadge: m.teams?.away?.logoUrl ? (m.teams.away.logoUrl.startsWith("http") ? m.teams.away.logoUrl : `${WF_BASE}${m.teams.away.logoUrl}`) : (m.teams?.away?.logo ? (m.teams.away.logo.startsWith("http") ? m.teams.away.logo : `${WF_BASE}${m.teams.away.logo}`) : ""),
        isLive: m.status === "in" || m.status === "live" || true,
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
        watchfootyStreams: streams,
        league: m.league || "",
        leagueLogo: m.leagueLogo ? (m.leagueLogo.startsWith("http") ? m.leagueLogo : `${WF_BASE}${m.leagueLogo}`) : "",
        homeScore: m.scores?.home ?? undefined,
        awayScore: m.scores?.away ?? undefined,
        currentMinute: m.currentMinute || undefined,
      };
    });
  } catch { return []; }
}

async function fetchWatchfootyAll(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/matches/all`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const sport = mapWfSport(m.sport || "other");
      const streams = Array.isArray(m.streams) ? m.streams.map((s: any) => ({
        id: String(s.id || ""),
        url: s.url || "",
        quality: s.quality || "hd",
        language: s.language || "english",
        isRedirect: s.isRedirect || false,
        nsfw: s.nsfw || false,
        ads: s.ads || false,
      })) : [];
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || m.sport || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : (m.timestamp ? m.timestamp * 1000 : 0),
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `${WF_BASE}${m.poster}`) : "",
        popular: false,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logoUrl ? (m.teams.home.logoUrl.startsWith("http") ? m.teams.home.logoUrl : `${WF_BASE}${m.teams.home.logoUrl}`) : (m.teams?.home?.logo ? (m.teams.home.logo.startsWith("http") ? m.teams.home.logo : `${WF_BASE}${m.teams.home.logo}`) : ""),
        awayBadge: m.teams?.away?.logoUrl ? (m.teams.away.logoUrl.startsWith("http") ? m.teams.away.logoUrl : `${WF_BASE}${m.teams.away.logoUrl}`) : (m.teams?.away?.logo ? (m.teams.away.logo.startsWith("http") ? m.teams.away.logo : `${WF_BASE}${m.teams.away.logo}`) : ""),
        isLive: m.status === "in" || m.status === "live",
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
        watchfootyStreams: streams,
        league: m.league || "",
        leagueLogo: m.leagueLogo ? (m.leagueLogo.startsWith("http") ? m.leagueLogo : `${WF_BASE}${m.leagueLogo}`) : "",
        homeScore: m.scores?.home ?? undefined,
        awayScore: m.scores?.away ?? undefined,
        currentMinute: m.currentMinute || undefined,
      };
    });
  } catch { return []; }
}

async function fetchWatchfootyPopularLive(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/matches/popular/live`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const sport = mapWfSport(m.sport || "other");
      const streams = Array.isArray(m.streams) ? m.streams.map((s: any) => ({
        id: String(s.id || ""),
        url: s.url || "",
        quality: s.quality || "hd",
        language: s.language || "english",
        isRedirect: s.isRedirect || false,
        nsfw: s.nsfw || false,
        ads: s.ads || false,
      })) : [];
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || m.sport || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : (m.timestamp ? m.timestamp * 1000 : 0),
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `${WF_BASE}${m.poster}`) : "",
        popular: true,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logoUrl ? (m.teams.home.logoUrl.startsWith("http") ? m.teams.home.logoUrl : `${WF_BASE}${m.teams.home.logoUrl}`) : (m.teams?.home?.logo ? (m.teams.home.logo.startsWith("http") ? m.teams.home.logo : `${WF_BASE}${m.teams.home.logo}`) : ""),
        awayBadge: m.teams?.away?.logoUrl ? (m.teams.away.logoUrl.startsWith("http") ? m.teams.away.logoUrl : `${WF_BASE}${m.teams.away.logoUrl}`) : (m.teams?.away?.logo ? (m.teams.away.logo.startsWith("http") ? m.teams.away.logo : `${WF_BASE}${m.teams.away.logo}`) : ""),
        isLive: true,
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
        watchfootyStreams: streams,
        league: m.league || "",
        leagueLogo: m.leagueLogo ? (m.leagueLogo.startsWith("http") ? m.leagueLogo : `${WF_BASE}${m.leagueLogo}`) : "",
        homeScore: m.scores?.home ?? undefined,
        awayScore: m.scores?.away ?? undefined,
        currentMinute: m.currentMinute || undefined,
      };
    });
  } catch { return []; }
}

// ── Fetch WatchFooty sports list ──
async function fetchWatchfootySports(): Promise<SportCategory[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/sports`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((s: any) => ({
      id: mapWfSport(s.name || s.id || ""),
      name: SPORT_NAMES[mapWfSport(s.name || s.id || "")] || s.displayName || capitalize(s.name || ""),
      displayName: s.displayName || s.name || "",
    }));
  } catch { return []; }
}

// ── Fetch WatchFooty top leagues ──
async function fetchWatchfootyTopLeagues(sport?: string): Promise<string[]> {
  try {
    const url = sport
      ? `${WF_BASE}/api/v1/top-leagues/${encodeURIComponent(sport)}`
      : `${WF_BASE}/api/v1/top-leagues`;
    const res = await httpGet(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(String) : [];
  } catch { return []; }
}

// ── Fetch WatchFooty top teams ──
async function fetchWatchfootyTopTeams(sport?: string): Promise<string[]> {
  try {
    const url = sport
      ? `${WF_BASE}/api/v1/top-teams/${encodeURIComponent(sport)}`
      : `${WF_BASE}/api/v1/top-teams`;
    const res = await httpGet(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(String) : [];
  } catch { return []; }
}

// ── Fetch WatchFooty popular matches ──
async function fetchWatchfootyPopular(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/matches/popular`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const sport = mapWfSport(m.sport || "other");
      const streams = Array.isArray(m.streams) ? m.streams.map((s: any) => ({
        id: String(s.id || ""),
        url: s.url || "",
        quality: s.quality || "hd",
        language: s.language || "english",
        isRedirect: s.isRedirect || false,
        nsfw: s.nsfw || false,
        ads: s.ads || false,
      })) : [];
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || m.sport || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : (m.timestamp ? m.timestamp * 1000 : 0),
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `${WF_BASE}${m.poster}`) : "",
        popular: true,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logoUrl ? (m.teams.home.logoUrl.startsWith("http") ? m.teams.home.logoUrl : `${WF_BASE}${m.teams.home.logoUrl}`) : (m.teams?.home?.logo ? (m.teams.home.logo.startsWith("http") ? m.teams.home.logo : `${WF_BASE}${m.teams.home.logo}`) : ""),
        awayBadge: m.teams?.away?.logoUrl ? (m.teams.away.logoUrl.startsWith("http") ? m.teams.away.logoUrl : `${WF_BASE}${m.teams.away.logoUrl}`) : (m.teams?.away?.logo ? (m.teams.away.logo.startsWith("http") ? m.teams.away.logo : `${WF_BASE}${m.teams.away.logo}`) : ""),
        isLive: m.status === "in" || m.status === "live",
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
        watchfootyStreams: streams,
        league: m.league || "",
        leagueLogo: m.leagueLogo ? (m.leagueLogo.startsWith("http") ? m.leagueLogo : `${WF_BASE}${m.leagueLogo}`) : "",
        homeScore: m.scores?.home ?? undefined,
        awayScore: m.scores?.away ?? undefined,
        currentMinute: m.currentMinute || undefined,
      };
    });
  } catch { return []; }
}

// ── SOURCE 5: streamed.pk (9 stream sources: alpha–intel) ──
async function fetchStreamedPK(endpoint: string): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`https://streamed.pk${endpoint}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const sources = Array.isArray(m.sources) ? m.sources.map((s: any) => ({ source: s.source || "", id: s.id || "" })) : [];
      const isLiveEndpoint = endpoint.includes("/live");

      return {
        id: `sp-${m.id || Math.random()}`,
        title: m.title || "Match",
        sport: mapCategoryToSport(m.category || m.sport || "other"),
        sportName: SPORT_NAMES[mapCategoryToSport(m.category || m.sport || "other")] || capitalize(m.category || "other"),
        date: m.date ? (typeof m.date === "number" ? (m.date > 1e12 ? m.date : m.date * 1000) : new Date(m.date).getTime()) : 0,
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `https://streamed.pk${m.poster}`) : "",
        popular: m.popular || false,
        homeTeam: m.teams?.home?.name || m.home_team || extractTeam(m.title || "", 0),
        awayTeam: m.teams?.away?.name || m.away_team || extractTeam(m.title || "", 1),
        homeBadge: m.teams?.home?.badge ? (m.teams.home.badge.startsWith("http") ? m.teams.home.badge : `https://streamed.pk/api/images/badge/${m.teams.home.badge}.webp`) : (m.home_logo || ""),
        awayBadge: m.teams?.away?.badge ? (m.teams.away.badge.startsWith("http") ? m.teams.away.badge : `https://streamed.pk/api/images/badge/${m.teams.away.badge}.webp`) : (m.away_logo || ""),
        isLive: isLiveEndpoint || m.live || m.isLive || m.status === "live" || false,
        apiSource: "streamed",
        sources,
      };
    });
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
            homeScore: home?.score ? parseInt(home.score) : undefined,
            awayScore: away?.score ? parseInt(away.score) : undefined,
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
  // ALSO merge additional sources from fill into base (don't lose StreamedPK sources!)
  else if (fill.sources.length > 0) {
    const existingKeys = new Set(base.sources.map(s => `${s.source}:${s.id}`));
    const newSources = fill.sources.filter(s => !existingKeys.has(`${s.source}:${s.id}`));
    if (newSources.length > 0) result.sources = [...base.sources, ...newSources];
  }
  // WatchFooty fields — prefer WatchFooty data for scores, streams, league
  if (!base.watchfootyStreams && fill.watchfootyStreams && fill.watchfootyStreams.length > 0) result.watchfootyStreams = fill.watchfootyStreams;
  if (!base.league && fill.league) result.league = fill.league;
  if (!base.leagueLogo && fill.leagueLogo) result.leagueLogo = fill.leagueLogo;
  if (base.homeScore === undefined && fill.homeScore !== undefined) result.homeScore = fill.homeScore;
  if (base.awayScore === undefined && fill.awayScore !== undefined) result.awayScore = fill.awayScore;
  if (!base.currentMinute && fill.currentMinute) result.currentMinute = fill.currentMinute;
  if (!base.watchfootyId && fill.watchfootyId) result.watchfootyId = fill.watchfootyId;
  // Also pick missing DamiTV and SportsEmbed IDs
  if (!base.damitvId && fill.damitvId) result.damitvId = fill.damitvId;
  if (!base.sportsrcCategory && fill.sportsrcCategory) result.sportsrcCategory = fill.sportsrcCategory;
  if (!base.sportsrcId && fill.sportsrcId) result.sportsrcId = fill.sportsrcId;
  if (!base.channelCode && fill.channelCode) result.channelCode = fill.channelCode;
  if (!base.channelName && fill.channelName) result.channelName = fill.channelName;
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

// ── SPORTS LIST (default fallback) ──
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
    // Fetch WatchFooty sports list + top leagues/teams in parallel with matches
    const wfSportsPromise = fetchWatchfootySports();
    const wfTopLeaguesPromise = fetchWatchfootyTopLeagues(sport || undefined);
    const wfTopTeamsPromise = fetchWatchfootyTopTeams(sport || undefined);

    // Fetch from ALL sources in parallel
    const [streamfree, damiChannels, damiSports, wfLive, wfAll, wfPopularLive, wfPopular, streamedLive, streamedToday, streamedUpcoming, espn, sportsembed, embedsports] = await Promise.allSettled([
      fetchStreamfreeStreams(),
      mode === "tv" ? fetchDamiTVChannels() : Promise.resolve([]),
      fetchDamiTVStreams(),
      fetchWatchfootyLive(),
      fetchWatchfootyAll(),
      fetchWatchfootyPopularLive(),
      fetchWatchfootyPopular(),
      fetchStreamedPK("/api/matches/live"),
      fetchStreamedPK("/api/matches/all-today"),
      fetchStreamedPK("/api/matches/upcoming"),
      fetchESPNMatches(),
      fetchSportsembedSu(),
      fetchEmbedsportsTop(),
    ]);

    const wfSports = await wfSportsPromise;
    const topLeagues = await wfTopLeaguesPromise;
    const topTeams = await wfTopTeamsPromise;

    const allLists: LiveMatch[][] = [
      streamfree.status === "fulfilled" ? streamfree.value : [],
      damiChannels.status === "fulfilled" ? damiChannels.value : [],
      damiSports.status === "fulfilled" ? damiSports.value : [],
      wfLive.status === "fulfilled" ? wfLive.value : [],
      wfAll.status === "fulfilled" ? wfAll.value : [],
      wfPopularLive.status === "fulfilled" ? wfPopularLive.value : [],
      wfPopular.status === "fulfilled" ? wfPopular.value : [],
      streamedLive.status === "fulfilled" ? streamedLive.value : [],
      streamedToday.status === "fulfilled" ? streamedToday.value : [],
      streamedUpcoming.status === "fulfilled" ? streamedUpcoming.value : [],
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

    // For TV mode: use dami-tv channels as the primary source, fall back to streamfree
    if (mode === "tv") {
      const damiChannelsFound = matches.some(m => m.apiSource === "damitv" && m.channelName);
      if (!damiChannelsFound) {
        const alwaysLive = matches.filter(m => m.apiSource === "streamfree" && m.streamKey && !m.homeTeam && !m.awayTeam);
        for (const m of alwaysLive) {
          m.sport = "other";
          m.sportName = "TV Channel";
          m.channelName = m.title;
          m.channelCode = m.streamCategory || "";
          m.isLive = true;
        }
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

    // Compute live counts per sport
    const liveCountBySport: Record<string, number> = {};
    for (const m of matches) {
      if (m.isLive) {
        liveCountBySport[m.sport] = (liveCountBySport[m.sport] || 0) + 1;
      }
    }

    // Build sports list: prefer WatchFooty sports, merge with defaults
    let sportsList: SportCategory[] = ALL_SPORTS;
    if (wfSports.length > 0) {
      // Merge WF sports into our list
      const merged = new Map<string, SportCategory>();
      // Add WF sports first
      for (const ws of wfSports) {
        if (!merged.has(ws.id)) {
          merged.set(ws.id, { ...ws, liveCount: liveCountBySport[ws.id] || 0 });
        } else {
          const existing = merged.get(ws.id)!;
          merged.set(ws.id, { ...existing, displayName: ws.displayName || existing.displayName, liveCount: liveCountBySport[ws.id] || 0 });
        }
      }
      // Add any remaining sports that have matches
      for (const s of ALL_SPORTS) {
        if (!merged.has(s.id) && matches.some(m => m.sport === s.id)) {
          merged.set(s.id, { ...s, liveCount: liveCountBySport[s.id] || 0 });
        }
      }
      // Add the "other" category at the end
      if (!merged.has("other")) {
        merged.set("other", { id: "other", name: "Other", liveCount: liveCountBySport["other"] || 0 });
      }
      sportsList = Array.from(merged.values());
    }

    // Add live counts to sports
    sportsList = sportsList.map(s => ({ ...s, liveCount: liveCountBySport[s.id] || 0 }));

    // Count by source
    const sourceCounts: Record<string, number> = {};
    for (const m of matches) {
      sourceCounts[m.apiSource] = (sourceCounts[m.apiSource] || 0) + 1;
    }

    // Count popular live matches
    const popularLiveCount = matches.filter(m => m.isLive && m.popular).length;

    return NextResponse.json({
      matches,
      sports: sportsList,
      total: matches.length,
      liveCount: Object.values(liveCountBySport).reduce((a, b) => a + b, 0),
      popularLiveCount,
      sources: sourceCounts,
      topLeagues,
      topTeams,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch live data", details: error.message },
      { status: 500 }
    );
  }
}
