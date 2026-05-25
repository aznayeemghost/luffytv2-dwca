import { NextResponse } from "next/server";

// ============================================================
// LIVE EMBED RESOLVER — Multiple providers, fast resolution
// Provider 1: streamed.pk → embedsports.top (primary)
// Provider 2: Direct embedsports.top URLs (backup)
// Provider 3: Construct alternative embed URLs
// ============================================================

const BASE = "https://streamed.pk";
const TIMEOUT = 8000; // Fast timeout

// Source priority: tested working sources first
const SOURCE_PRIORITY: Record<string, number> = {
  delta: 1,    // Live events - confirmed working
  admin: 2,    // PPV/Channels - confirmed working (multiple servers)
  golf: 3,     // Sports channels - confirmed working
  echo: 4,     // Sometimes works, sometimes empty
  bravo: 5,
  charlie: 6,
  alpha: 7,
  foxtrot: 8,
  hotel: 9,
  intel: 10,
};

// Alternative embed providers
const EMBED_PROVIDERS: Record<string, string> = {
  // Provider 1: embedsports.top (from streamed.pk - primary)
  embedsports: "https://embedsports.top/embed/{source}/{id}/{no}",
  // Provider 2: streamed.watch (same ecosystem)
  streamedwatch: "https://streamed.watch/embed/{source}/{id}/{no}",
};

function makeTimeout(): AbortController {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT);
  return ctrl;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId") || "";
  const sources = url.searchParams.get("sources") || "";

  if (!sources && !matchId) {
    return NextResponse.json({ error: "Missing sources or matchId" }, { status: 400 });
  }

  // Parse sources array
  let parsedSources: { source: string; id: string }[] = [];
  if (sources) {
    try {
      parsedSources = JSON.parse(sources);
      if (!Array.isArray(parsedSources)) parsedSources = [];
    } catch {
      return NextResponse.json({ error: "Invalid sources JSON" }, { status: 400 });
    }
  }

  // If no sources parsed, try fetching match data
  if (parsedSources.length === 0 && matchId) {
    try {
      const ctrl = makeTimeout();
      const res = await fetch(`${BASE}/api/matches/all-today`, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const match = data.find((m: any) => m.id === matchId);
          if (match?.sources) {
            parsedSources = match.sources;
          }
        }
      }
    } catch { /* fall through */ }
  }

  if (parsedSources.length === 0) {
    return NextResponse.json({ error: "No sources available", streams: [] }, { status: 404 });
  }

  // Sort sources by priority
  parsedSources.sort((a, b) => {
    const pa = SOURCE_PRIORITY[a.source] || 50;
    const pb = SOURCE_PRIORITY[b.source] || 50;
    return pa - pb;
  });

  // Fetch streams from ALL sources in parallel (fast)
  const streamResults = await Promise.allSettled(
    parsedSources.map(async (src) => {
      try {
        const ctrl = makeTimeout();
        const res = await fetch(`${BASE}/api/stream/${src.source}/${src.id}`, {
          signal: ctrl.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
          },
        });
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

  // Merge all streams from API
  const apiStreams: any[] = [];
  for (const result of streamResults) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      apiStreams.push(...result.value);
    }
  }

  // Also construct alternative embed URLs for each source (backup providers)
  const backupStreams: any[] = [];
  for (const src of parsedSources) {
    // Generate backup embed URLs using alternative providers
    backupStreams.push({
      id: `${src.source}-1-alt`,
      streamNo: 1,
      language: "English",
      hd: true,
      embedUrl: EMBED_PROVIDERS.streamedwatch
        .replace("{source}", src.source)
        .replace("{id}", src.id)
        .replace("{no}", "1"),
      source: src.source,
      viewers: 0,
      provider: "streamedwatch",
    });
  }

  // Combine: API streams first, then backup streams
  const allStreams = [...apiStreams, ...backupStreams];

  // Deduplicate by embedUrl, sort by priority
  const seen = new Set<string>();
  const uniqueStreams = allStreams
    .filter(s => {
      if (!s.embedUrl) return false;
      if (seen.has(s.embedUrl)) return false;
      seen.add(s.embedUrl);
      return true;
    })
    .sort((a, b) => {
      const pa = SOURCE_PRIORITY[a.source] || 50;
      const pb = SOURCE_PRIORITY[b.source] || 50;
      return pa - pb;
    });

  return NextResponse.json({
    streams: uniqueStreams,
    total: uniqueStreams.length,
  });
}
