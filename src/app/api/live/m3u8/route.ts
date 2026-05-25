import { NextResponse } from "next/server";

// ============================================================
// M3U8 EXTRACTOR — Quick extraction from embed pages
// Tries to find M3U8 URLs in the HTML of embed pages
// Returns the M3U8 URL for hls.js to play directly or via proxy
// ============================================================

export const runtime = "edge";

const TIMEOUT = 10000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const embedUrl = url.searchParams.get("embedUrl") || "";
  const referer = url.searchParams.get("referer") || "";

  if (!embedUrl) {
    return NextResponse.json({ error: "Missing embedUrl" }, { status: 400 });
  }

  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), TIMEOUT);

    const refererValue = referer || (() => {
      try { return new URL(embedUrl).origin + "/"; } catch { return ""; }
    })();

    const res = await fetch(embedUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        Referer: refererValue,
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ error: `Embed page returned ${res.status}`, embedUrl, fallback: "newtab" });
    }

    const html = await res.text();

    // Try to find M3U8 URLs directly in the HTML
    const m3u8Patterns = [
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g,
    ];

    for (const pattern of m3u8Patterns) {
      const matches = html.match(pattern);
      if (matches?.length) {
        return NextResponse.json({
          m3u8Url: matches[0],
          embedUrl,
          method: "direct",
          allUrls: matches.slice(0, 5),
        });
      }
    }

    return NextResponse.json({
      error: "M3U8 extraction failed — use new tab fallback",
      embedUrl,
      fallback: "newtab",
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || "Failed to extract stream",
      embedUrl,
      fallback: "newtab",
    });
  }
}
