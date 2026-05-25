import { NextResponse } from "next/server";

// ============================================================
// LIVE EMBED RESOLVER — Multiple providers, fast resolution
// Provider 1: streamed.pk → embedsports.top (primary)
// Provider 2: streamed.watch (same ecosystem, backup)
// Provider 3: streambtw.com (independent provider)
// No M3U8 extraction, no CORS proxy. Just embed URLs.
// ============================================================

const BASE = "https://streamed.pk";
const TIMEOUT = 8000;

// Source priority
const SOURCE_PRIORITY: Record<string, number> = {
  delta: 1,
  admin: 2,
  golf: 3,
  echo: 4,
  bravo: 5,
  charlie: 6,
  alpha: 7,
  foxtrot: 8,
  hotel: 9,
  intel: 10,
};

// Multiple embed provider templates
const EMBED_PROVIDERS: { id: string; name: string; template: string }[] = [
  {
    id: "embedsports",
    name: "EmbedSports",
    template: "https://embedsports.top/embed/{source}/{id}/{no}",
  },
  {
    id: "streamedwatch",
    name: "StreamedWatch",
    template: "https://streamed.watch/embed/{source}/{id}/{no}",
  },
  {
    id: "streambtw",
    name: "StreamBTW",
    template: "https://streambtw.com/embed/{source}/{id}/{no}",
  },
];

function makeTimeout(): AbortController {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT);
  return ctrl;
}

function buildEmbedUrl(template: string, source: string, id: string, no: number): string {
  return template
    .replace("{source}", source)
    .replace("{id}", id)
    .replace("{no}", String(no));
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

  // If no sources parsed, try fetching match data from API
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

  // ── APPROACH 1: Fetch stream URLs from streamed.pk API (fast, returns embed URLs) ──
  const apiStreams: any[] = [];
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

  for (const result of streamResults) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      apiStreams.push(...result.value);
    }
  }

  // ── APPROACH 2: Construct embed URLs from multiple providers as backup ──
  const backupStreams: any[] = [];
  for (const src of parsedSources) {
    for (const provider of EMBED_PROVIDERS) {
      // Skip embedsports provider for backups since it's already in apiStreams
      if (provider.id === "embedsports") continue;

      backupStreams.push({
        id: `${src.source}-1-${provider.id}`,
        streamNo: 1,
        language: "English",
        hd: true,
        embedUrl: buildEmbedUrl(provider.template, src.source, src.id, 1),
        source: src.source,
        viewers: 0,
        provider: provider.id,
      });
    }
  }

  // Combine: API streams first (they're verified), then backup streams
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
