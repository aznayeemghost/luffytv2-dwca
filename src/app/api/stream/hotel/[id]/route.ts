import { NextResponse } from "next/server";

// Hotel Stream Provider — StreamedPK Hotel + EmbedSports fallback
// GET /api/stream/hotel/[id]
export const runtime = "edge";

const TIMEOUT = 12000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = "hotel";

  try {
    const res = await fetch(`https://streamed.pk/api/stream/${source}/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "User-Agent": UA, Accept: "application/json" },
    });

    const data = res.ok ? await res.json() : [];
    const streams = Array.isArray(data) ? data : [];

    const results = streams
      .filter((s: any) => s.embedUrl)
      .map((s: any, i: number) => ({
        id: `sp-${source}-${s.id || i}`,
        streamNo: s.streamNo || i + 1,
        language: s.language || "English",
        hd: s.hd !== false,
        m3u8Url: "",
        quality: s.hd ? "HD" : "SD",
        source: `Hotel S${s.streamNo || i + 1}`,
        viewers: s.viewers || 0,
        provider: "streamed",
        corsEnabled: false,
        referer: "https://streamed.pk/",
        embedUrl: s.embedUrl,
        streamType: "embed" as const,
      }));

    // EmbedSports fallback — ONLY if StreamedPK API returned streams for this provider
    // Try M3U8 extraction first (like GitHub commit bd254ef), then embed fallback
    if (results.length > 0) {
      const seenEmbedUrls = new Set(results.map((r: any) => r.embedUrl));
      for (let server = 1; server <= 2; server++) {
        const embedsportsUrl = `https://embedsports.top/embed/${source}/${id}/${server}`;
        if (seenEmbedUrls.has(embedsportsUrl)) continue;

        // Try M3U8 extraction from embed page
        let m3u8Url = "";
        try {
          const esRes = await fetch(embedsportsUrl, {
            signal: AbortSignal.timeout(TIMEOUT),
            headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", Referer: "https://embedsports.top/" },
          });
          if (esRes.ok) {
            const html = await esRes.text();
            const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
            if (m3u8Match) m3u8Url = m3u8Match[0];
          }
        } catch {}

        const sourceName = source.charAt(0).toUpperCase() + source.slice(1);
        if (m3u8Url) {
          results.push({
            id: `es-${source}-${id}-s${server}`,
            streamNo: results.length + 1,
            language: "English",
            hd: true,
            m3u8Url,
            quality: "HD",
            source: `${sourceName} S${server} (EmbedSports)`,
            viewers: 0,
            provider: "embedsports",
            corsEnabled: false,
            referer: "https://embedsports.top/",
            embedUrl: embedsportsUrl,
            streamType: "m3u8" as const,
          });
        } else {
          results.push({
            id: `es-${source}-${id}-s${server}`,
            streamNo: results.length + 1,
            language: "English",
            hd: true,
            m3u8Url: "",
            quality: "HD",
            source: `${sourceName} S${server} (EmbedSports)`,
            viewers: 0,
            provider: "embedsports",
            corsEnabled: false,
            referer: "https://embedsports.top/",
            embedUrl: embedsportsUrl,
            streamType: "embed" as const,
          });
        }
      }
    }

    return NextResponse.json({ streams: results, total: results.length, source });
  } catch (err: any) {
    return NextResponse.json({ streams: [], total: 0, error: err.message, source }, { status: 500 });
  }
}
