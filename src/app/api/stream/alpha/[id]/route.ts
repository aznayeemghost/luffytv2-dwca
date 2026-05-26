import { NextResponse } from "next/server";

// Alpha Stream Provider — Proxies StreamedPK Alpha source
// GET /api/stream/alpha/[id]
export const runtime = "edge";

const TIMEOUT = 12000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = "alpha";

  try {
    const res = await fetch(`https://streamed.pk/api/stream/${source}/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "User-Agent": UA, Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ streams: [], total: 0, error: `StreamedPK returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
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
        source: "Alpha",
        viewers: s.viewers || 0,
        provider: "streamed",
        corsEnabled: false,
        referer: "https://streamed.pk/",
        embedUrl: s.embedUrl,
        streamType: "embed" as const,
      }));

    // Also add EmbedSports fallback for this match
    const embedsportsUrl = `https://embedsports.top/embed/sports/${id}`;
    results.push({
      id: `es-fallback-${id}`,
      streamNo: results.length + 1,
      language: "English",
      hd: true,
      m3u8Url: "",
      quality: "HD",
      source: "EmbedSports",
      viewers: 0,
      provider: "embedsports",
      corsEnabled: false,
      referer: "https://embedsports.top/",
      embedUrl: embedsportsUrl,
      streamType: "embed" as const,
    });

    return NextResponse.json({ streams: results, total: results.length, source });
  } catch (err: any) {
    return NextResponse.json({ streams: [], total: 0, error: err.message, source }, { status: 500 });
  }
}
