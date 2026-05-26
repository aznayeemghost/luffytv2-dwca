import { NextResponse } from "next/server";

// Echo Stream Provider — MULTI-SOURCE (StreamedPK Echo + streamfree + EmbedSports)
// GET /api/stream/echo/[id]?category=sports
// Echo has multiple sources: StreamedPK Echo, streamfree.app embed, and EmbedSports fallback
export const runtime = "edge";

const TIMEOUT = 12000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function GEThtml(url: string, extraHeaders: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", ...extraHeaders } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const category = url.searchParams.get("category") || "sports";
  const source = "echo";
  const results: any[] = [];

  // ── SOURCE 1: StreamedPK Echo ──
  try {
    const res = await fetch(`https://streamed.pk/api/stream/${source}/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "User-Agent": UA, Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      const streams = Array.isArray(data) ? data : [];
      for (const s of streams) {
        if (!s.embedUrl) continue;
        results.push({
          id: `sp-${source}-${s.id || results.length}`,
          streamNo: s.streamNo || results.length + 1,
          language: s.language || "English",
          hd: s.hd !== false,
          m3u8Url: "",
          quality: s.hd ? "HD" : "SD",
          source: "Echo (StreamedPK)",
          viewers: s.viewers || 0,
          provider: "streamed",
          corsEnabled: false,
          referer: "https://streamed.pk/",
          embedUrl: s.embedUrl,
          streamType: "embed",
        });
      }
    }
  } catch {}

  // ── SOURCE 2: streamfree.app (Echo = streamfree embed) ──
  try {
    const streamfreeEmbedUrl = `https://streamfree.app/embed/${category}/${id}`;
    // Add the embed URL as a source — streamfree is a reliable embed provider
    results.push({
      id: `sf-embed-${id}`,
      streamNo: results.length + 1,
      language: "English",
      hd: true,
      m3u8Url: "",
      quality: "720p",
      source: "Echo (StreamFree)",
      viewers: 0,
      provider: "streamfree",
      corsEnabled: false,
      referer: "https://streamfree.app/",
      embedUrl: streamfreeEmbedUrl,
      streamType: "embed",
    });

    // Try to extract M3U8 from streamfree embed page
    try {
      const html = await GEThtml(streamfreeEmbedUrl, { Referer: "https://streamfree.app/" });

      // Extract tokens for M3U8 URL construction
      const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
      if (m3u8Match) {
        results.push({
          id: `sf-m3u8-${id}`,
          streamNo: results.length + 1,
          language: "English",
          hd: true,
          m3u8Url: m3u8Match[0],
          quality: "720p",
          source: "Echo (StreamFree HLS)",
          viewers: 0,
          provider: "streamfree",
          corsEnabled: true,
          referer: "https://streamfree.app/",
          streamType: "m3u8",
        });
      }
    } catch {}
  } catch {}

  // ── SOURCE 3: EmbedSports ──
  try {
    const embedsportsUrl = `https://embedsports.top/embed/${category}/${id}`;
    results.push({
      id: `es-embed-${id}`,
      streamNo: results.length + 1,
      language: "English",
      hd: true,
      m3u8Url: "",
      quality: "HD",
      source: "Echo (EmbedSports)",
      viewers: 0,
      provider: "embedsports",
      corsEnabled: false,
      referer: "https://embedsports.top/",
      embedUrl: embedsportsUrl,
      streamType: "embed",
    });

    // Try to extract M3U8 from EmbedSports page
    try {
      const html = await GEThtml(embedsportsUrl, { Referer: "https://embedsports.top/" });
      const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
      if (m3u8Matches) {
        const seen = new Set<string>();
        for (const m3u8Url of m3u8Matches) {
          if (seen.has(m3u8Url)) continue;
          seen.add(m3u8Url);
          results.push({
            id: `es-m3u8-${id}-${results.length}`,
            streamNo: results.length + 1,
            language: "English",
            hd: results.length === 0,
            m3u8Url,
            quality: results.length === 0 ? "720p" : "480p",
            source: "Echo (EmbedSports HLS)",
            viewers: 0,
            provider: "embedsports",
            corsEnabled: false,
            referer: "https://embedsports.top/",
            streamType: "m3u8",
          });
        }
      }
    } catch {}
  } catch {}

  // ── SOURCE 4: SportsEmbed ──
  try {
    const seUrl = `https://sportsembed.su/embed/${category}/${id}`;
    results.push({
      id: `se-embed-${id}`,
      streamNo: results.length + 1,
      language: "English",
      hd: true,
      m3u8Url: "",
      quality: "HD",
      source: "Echo (SportsEmbed)",
      viewers: 0,
      provider: "sportsembed",
      corsEnabled: false,
      referer: "https://sportsembed.su/",
      embedUrl: seUrl,
      streamType: "embed",
    });
  } catch {}

  // Sort: M3U8 CORS first, then embed, then other M3U8
  results.sort((a, b) => {
    if (a.streamType === "m3u8" && a.corsEnabled && !(b.streamType === "m3u8" && b.corsEnabled)) return -1;
    if (b.streamType === "m3u8" && b.corsEnabled && !(a.streamType === "m3u8" && a.corsEnabled)) return 1;
    if (a.streamType === "embed" && b.streamType !== "embed") return -1;
    if (b.streamType === "embed" && a.streamType !== "embed") return 1;
    return 0;
  });

  return NextResponse.json({ streams: results, total: results.length, source: "echo", multiSource: true });
}
