import { NextResponse } from "next/server";

// Echo Stream Provider — MULTI-SOURCE (StreamedPK Echo + StreamFree + EmbedSports)
// GET /api/stream/echo/[id]?category=sports
// Echo has multiple sources: StreamedPK Echo (returns EmbedSports URLs!),
// streamfree.app embed, and direct EmbedSports fallback with multiple servers
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
  const seenEmbedUrls = new Set<string>();

  // ── SOURCE 1: StreamedPK Echo ──
  // The StreamedPK API returns embedUrl fields that ALREADY point to EmbedSports
  // with the correct URL format: embedsports.top/embed/echo/{slug}/{server}
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
        seenEmbedUrls.add(s.embedUrl);
        results.push({
          id: `sp-${source}-${s.id || results.length}`,
          streamNo: s.streamNo || results.length + 1,
          language: s.language || "English",
          hd: s.hd !== false,
          m3u8Url: "",
          quality: s.hd ? "HD" : "SD",
          source: `Echo S${s.streamNo || results.length + 1}`,
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

  // ── SOURCES 2-4: Only add fallback sources if StreamedPK confirmed this match exists ──
  // This prevents showing broken streams for providers that don't have this match
  if (results.length > 0) {
    // ── SOURCE 2: EmbedSports direct fallback ──
    // URL format: embedsports.top/embed/{provider}/{slug}/{server_number}
    // The id from StreamedPK sources IS the slug for EmbedSports
    // Echo has servers 1-4
    // Try M3U8 extraction first (like GitHub commit bd254ef), then embed fallback
    try {
      for (let server = 1; server <= 4; server++) {
        const embedsportsUrl = `https://embedsports.top/embed/${source}/${id}/${server}`;
        if (seenEmbedUrls.has(embedsportsUrl)) continue; // Skip if StreamedPK already returned this URL
        
        // Try M3U8 extraction from embed page
        let m3u8Url = "";
        try {
          const html = await GEThtml(embedsportsUrl, { Referer: "https://embedsports.top/" });
          const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
          if (m3u8Match) m3u8Url = m3u8Match[0];
        } catch {}

        if (m3u8Url) {
          results.push({
            id: `es-${source}-${id}-s${server}`,
            streamNo: results.length + 1,
            language: "English",
            hd: true,
            m3u8Url,
            quality: "HD",
            source: `Echo S${server} (EmbedSports)`,
            viewers: 0,
            provider: "embedsports",
            corsEnabled: false,
            referer: "https://embedsports.top/",
            embedUrl: embedsportsUrl,
            streamType: "m3u8",
          });
        } else {
          results.push({
            id: `es-${source}-${id}-s${server}`,
            streamNo: results.length + 1,
            language: "English",
            hd: true,
            m3u8Url: "",
            quality: "HD",
            source: `Echo S${server} (EmbedSports)`,
            viewers: 0,
            provider: "embedsports",
            corsEnabled: false,
            referer: "https://embedsports.top/",
            embedUrl: embedsportsUrl,
            streamType: "embed",
          });
        }
      }
    } catch {}

    // ── SOURCE 3: streamfree.app (Echo = streamfree embed) ──
    try {
      const streamfreeEmbedUrl = `https://streamfree.app/embed/${category}/${id}`;
      results.push({
        id: `sf-embed-${id}`,
        streamNo: results.length + 1,
        language: "English",
        hd: true,
        m3u8Url: "",
        quality: "720p",
        source: "Echo StreamFree",
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
        const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (m3u8Match) {
          results.push({
            id: `sf-m3u8-${id}`,
            streamNo: results.length + 1,
            language: "English",
            hd: true,
            m3u8Url: m3u8Match[0],
            quality: "720p",
            source: "Echo StreamFree HLS",
            viewers: 0,
            provider: "streamfree",
            corsEnabled: true,
            referer: "https://streamfree.app/",
            streamType: "m3u8",
          });
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
        source: "Echo SportsEmbed",
        viewers: 0,
        provider: "sportsembed",
        corsEnabled: false,
        referer: "https://sportsembed.su/",
        embedUrl: seUrl,
        streamType: "embed",
      });
    } catch {}
  }

  // Sort: StreamedPK embeds first (most reliable), then other embeds, then M3U8
  results.sort((a, b) => {
    if (a.provider === "streamed" && b.provider !== "streamed") return -1;
    if (b.provider === "streamed" && a.provider !== "streamed") return 1;
    if (a.streamType === "m3u8" && a.corsEnabled && !(b.streamType === "m3u8" && b.corsEnabled)) return -1;
    if (b.streamType === "m3u8" && b.corsEnabled && !(a.streamType === "m3u8" && a.corsEnabled)) return 1;
    if (a.streamType === "embed" && b.streamType !== "embed") return -1;
    if (b.streamType === "embed" && a.streamType !== "embed") return 1;
    return 0;
  });

  return NextResponse.json({ streams: results, total: results.length, source: "echo", multiSource: true });
}
