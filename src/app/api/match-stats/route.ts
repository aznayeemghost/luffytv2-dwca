import { NextResponse } from "next/server";

// ============================================================
// MATCH STATS API — Proxy to WatchFooty match statistics
// Endpoint: GET /api/match-stats?id=123
// Proxies: https://api.watchfooty.st/api/v1/match/[id]/stats
// Returns: Full match details + boxscore, rosters, commentary, venue
// ============================================================

export const runtime = "edge";

const TIMEOUT = 15000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function makeCtrl() {
  const c = new AbortController();
  setTimeout(() => c.abort(), TIMEOUT);
  return c;
}

// ── Deep conversion: {value, displayValue} objects → primitives ──
// WatchFooty API returns many fields as {value: X, displayValue: "X"} objects.
// React cannot render objects as children, so we must recursively convert them.
function deepToPrimitive(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepToPrimitive);
  if (typeof obj === "object") {
    // Check for the {value, displayValue} pattern
    const keys = Object.keys(obj);
    if (keys.length <= 2 && ("value" in obj || "displayValue" in obj)) {
      // This is a WatchFooty value object — extract the primitive
      if ("value" in obj) return deepToPrimitive(obj.value);
      if ("displayValue" in obj) return deepToPrimitive(obj.displayValue);
    }
    // Recursively convert all nested properties
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = deepToPrimitive(v);
    }
    return result;
  }
  return obj;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("id");

  if (!matchId) {
    return NextResponse.json(
      { error: "Missing match id parameter. Use ?id=123" },
      { status: 400 }
    );
  }

  try {
    // Fetch match details and stats in parallel
    const [statsRes, detailsRes] = await Promise.allSettled([
      fetch(`https://api.watchfooty.st/api/v1/match/${encodeURIComponent(matchId)}/stats`, {
        signal: makeCtrl().signal,
        headers: { "User-Agent": UA, Accept: "application/json" },
      }),
      fetch(`https://api.watchfooty.st/api/v1/match/${encodeURIComponent(matchId)}`, {
        signal: makeCtrl().signal,
        headers: { "User-Agent": UA, Accept: "application/json" },
      }),
    ]);

    let stats = null;
    let details = null;

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const rawStats = await statsRes.value.json();
      stats = deepToPrimitive(rawStats);
    }

    if (detailsRes.status === "fulfilled" && detailsRes.value.ok) {
      const rawDetails = await detailsRes.value.json();
      details = deepToPrimitive(rawDetails);
      // Prepend WatchFooty base URL to relative image paths
      if (details.teams) {
        if (details.teams.home?.logoUrl && !details.teams.home.logoUrl.startsWith("http")) {
          details.teams.home.logoUrl = `https://api.watchfooty.st${details.teams.home.logoUrl}`;
        }
        if (details.teams.away?.logoUrl && !details.teams.away.logoUrl.startsWith("http")) {
          details.teams.away.logoUrl = `https://api.watchfooty.st${details.teams.away.logoUrl}`;
        }
        if (details.teams.home?.logo && !details.teams.home.logo.startsWith("http")) {
          details.teams.home.logo = `https://api.watchfooty.st${details.teams.home.logo}`;
        }
        if (details.teams.away?.logo && !details.teams.away.logo.startsWith("http")) {
          details.teams.away.logo = `https://api.watchfooty.st${details.teams.away.logo}`;
        }
      }
      if (details.leagueLogo && !details.leagueLogo.startsWith("http")) {
        details.leagueLogo = `https://api.watchfooty.st${details.leagueLogo}`;
      }
      if (details.poster && !details.poster.startsWith("http")) {
        details.poster = `https://api.watchfooty.st${details.poster}`;
      }
    }

    return NextResponse.json({
      matchId,
      details: details || null,
      statistics: stats?.statistics || stats || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch match stats", details: error.message, matchId, details: null, statistics: null },
      { status: 500 }
    );
  }
}
