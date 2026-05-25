import { NextResponse } from "next/server";

// ============================================================
// LIVE EMBED RESOLVER — SportSRC as PRIMARY (embed.streamapi.cc works in iframes!)
// Also includes streamed.pk as backup, and Daddylive for live TV
// ============================================================

const SPORTSRC_BASE = "https://api.sportsrc.org";
const STREAMED_BASE = "https://streamed.pk";
const DADDYLIVE_BASE = "https://daddylive.top";
const TIMEOUT = 10000;

// Source priority for streamed.pk
const SOURCE_PRIORITY: Record<string, number> = {
  delta: 1, admin: 2, golf: 3, echo: 4, bravo: 5,
  charlie: 6, alpha: 7, foxtrot: 8, hotel: 9, intel: 10,
};

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

// ── PROVIDER 1: SportSRC — fetch match detail which includes embed URLs ──
async function fetchSportSRCStreams(category: string, matchId: string): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(
      `${SPORTSRC_BASE}/?data=detail&category=${encodeURIComponent(category)}&id=${encodeURIComponent(matchId)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !data.data?.sources) return [];

    return data.data.sources.map((s: any, idx: number) => ({
      id: s.id || `sportsrc-${idx}`,
      streamNo: s.streamNo || idx + 1,
      language: s.language || "English",
      hd: s.hd !== false,
      embedUrl: s.embedUrl || "",
      source: s.source || "sportsrc",
      viewers: s.viewers || 0,
      provider: "sportsrc",
    }));
  } catch {
    return [];
  }
}

// ── PROVIDER 2: streamed.pk → embedsports.top ──
async function fetchStreamedPKStreams(sources: { source: string; id: string }[]): Promise<any[]> {
  const streams: any[] = [];

  const results = await Promise.allSettled(
    sources.map(async (src) => {
      try {
        const res = await fetchWithTimeout(`${STREAMED_BASE}/api/stream/${src.source}/${src.id}`);
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];
        return data.map((s: any) => ({
          id: s.id || `${src.source}-${s.streamNo}`,
          streamNo: s.streamNo || 1,
          language: s.language || "English",
          hd: s.hd || false,
          embedUrl: s.embedUrl || "",
          source: s.source || src.source,
          viewers: s.viewers || 0,
          provider: "embedsports",
        }));
      } catch {
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      streams.push(...result.value);
    }
  }
  return streams;
}

// ── PROVIDER 3: Daddylive — live TV channels ──
function getDaddyliveStreams(matchTitle: string): any[] {
  // Daddylive has fixed channel IDs for major sports networks
  // These are popular channels that often have live sports
  const channels = [
    { id: 664, name: "Sky Sports F1", source: "tv" },
    { id: 660, name: "Sky Sports Premier League", source: "tv" },
    { id: 662, name: "Sky Sports Football", source: "tv" },
    { id: 600, name: "ESPN", source: "tv" },
    { id: 601, name: "ESPN 2", source: "tv" },
    { id: 602, name: "NBA TV", source: "tv" },
    { id: 510, name: "Fox Sports 1", source: "tv" },
    { id: 511, name: "Fox Sports 2", source: "tv" },
  ];

  // Only add Daddylive channels if we have very few other options
  // These are general channels, not match-specific
  return channels.slice(0, 3).map((ch, idx) => ({
    id: `daddylive-${ch.id}`,
    streamNo: idx + 1,
    language: "English",
    hd: true,
    embedUrl: `${DADDYLIVE_BASE}/embed/stream.php?id=${ch.id}&player=1&source=${ch.source}`,
    source: ch.name.toLowerCase().replace(/\s+/g, "-"),
    viewers: 0,
    provider: "daddylive",
  }));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId") || "";
  const sources = url.searchParams.get("sources") || "";
  const sportsrcCategory = url.searchParams.get("sportsrcCategory") || "";
  const sportsrcId = url.searchParams.get("sportsrcId") || "";

  if (!sources && !matchId && !sportsrcId) {
    return NextResponse.json({ error: "Missing match info" }, { status: 400 });
  }

  // Parse sources
  let parsedSources: { source: string; id: string }[] = [];
  if (sources) {
    try {
      parsedSources = JSON.parse(sources);
      if (!Array.isArray(parsedSources)) parsedSources = [];
    } catch { parsedSources = []; }
  }

  // ── FETCH FROM ALL PROVIDERS IN PARALLEL ──
  const [sportsrcStreams, streamedStreams] = await Promise.all([
    // Provider 1: SportSRC (PRIMARY — working embed URLs!)
    (sportsrcId && sportsrcCategory)
      ? fetchSportSRCStreams(sportsrcCategory, sportsrcId)
      : matchId && !sportsrcId
        ? tryFetchSportSRCById(matchId)
        : Promise.resolve([]),

    // Provider 2: streamed.pk (backup)
    parsedSources.length > 0
      ? fetchStreamedPKStreams(parsedSources)
      : matchId
        ? tryFetchStreamedPKByMatchId(matchId)
        : Promise.resolve([]),
  ]);

  // Combine: SportSRC first (proven working), then streamed.pk, then Daddylive
  const allStreams = [
    ...sportsrcStreams,
    ...streamedStreams,
    // Only add Daddylive if we have fewer than 3 streams
    ...(sportsrcStreams.length + streamedStreams.length < 3
      ? getDaddyliveStreams(matchId)
      : []),
  ];

  // Deduplicate by embedUrl
  const seen = new Set<string>();
  const uniqueStreams = allStreams.filter(s => {
    if (!s.embedUrl) return false;
    if (seen.has(s.embedUrl)) return false;
    seen.add(s.embedUrl);
    return true;
  });

  // Sort: SportSRC first, then by priority
  uniqueStreams.sort((a, b) => {
    if (a.provider === "sportsrc" && b.provider !== "sportsrc") return -1;
    if (a.provider !== "sportsrc" && b.provider === "sportsrc") return 1;
    const pa = SOURCE_PRIORITY[a.source] || 50;
    const pb = SOURCE_PRIORITY[b.source] || 50;
    return pa - pb;
  });

  return NextResponse.json({
    streams: uniqueStreams,
    total: uniqueStreams.length,
    providers: {
      sportsrc: sportsrcStreams.length,
      streamed: streamedStreams.length,
      daddylive: Math.max(0, 3 - sportsrcStreams.length - streamedStreams.length),
    },
  });
}

// Helper: Try to find SportSRC streams by match ID (when category is unknown)
async function tryFetchSportSRCById(matchId: string): Promise<any[]> {
  // Try common categories
  const categories = ["football", "basketball", "american-football", "hockey", "baseball", "fight"];

  for (const category of categories) {
    try {
      const streams = await fetchSportSRCStreams(category, matchId);
      if (streams.length > 0) return streams;
    } catch { continue; }
  }
  return [];
}

// Helper: Try to fetch streams from streamed.pk by match ID
async function tryFetchStreamedPKByMatchId(matchId: string): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(`${STREAMED_BASE}/api/matches/all-today`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const match = data.find((m: any) => m.id === matchId);
    if (!match?.sources) return [];
    return fetchStreamedPKStreams(match.sources);
  } catch {
    return [];
  }
}
