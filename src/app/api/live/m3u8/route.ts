import { NextResponse } from "next/server";

// ============================================================
// M3U8 STREAM EXTRACTOR — Extracts M3U8 from embed pages
// Then returns the M3U8 URL for hls.js to play directly.
// If the M3U8 server blocks CORS, returns the embed URL for new-tab fallback.
// ============================================================

export const runtime = "edge";

const EMBED_BASE = "https://embedsports.top";
const TIMEOUT = 10000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const source = url.searchParams.get("source") || "";
  const id = url.searchParams.get("id") || "";
  const streamNo = url.searchParams.get("no") || "1";
  const embedUrlParam = url.searchParams.get("embedUrl") || "";

  // Determine the embed URL
  let embedUrl: string;
  if (embedUrlParam) {
    const embedMatch = embedUrlParam.match(/embed\/([^/]+)\/([^/]+)\/(\d+)/);
    if (embedMatch) {
      embedUrl = embedUrlParam;
    } else {
      return NextResponse.json({ error: "Invalid embed URL format" }, { status: 400 });
    }
  } else if (source && id) {
    embedUrl = `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`;
  } else {
    return NextResponse.json({ error: "Missing source/id or embedUrl" }, { status: 400 });
  }

  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), TIMEOUT);

    // Step 1: Fetch embed page HTML
    const res = await fetch(embedUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({
        error: `Embed page returned ${res.status}`,
        embedUrl,
        fallback: "newtab",
      });
    }

    const html = await res.text();

    // Step 2: Extract window key variable
    const keyMatch = html.match(/window\['([^']+)'\]\s*=\s*'([^']+)'/);
    if (!keyMatch) {
      // Try to find M3U8 URL directly in the HTML
      const directM3u8 = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
      if (directM3u8) {
        return NextResponse.json({
          m3u8Url: directM3u8[0],
          embedUrl,
          method: "direct",
        });
      }

      return NextResponse.json({
        error: "Could not extract stream key",
        embedUrl,
        fallback: "newtab",
      });
    }

    const keyValue = keyMatch[2];

    // Step 3: POST to /fetch to get the M3U8 token/URL
    // Try different body formats
    const fetchAttempts = [
      // Format 1: Just the key value as JSON
      { body: JSON.stringify({ key: keyValue }), ct: "application/json" },
      // Format 2: Key value as the variable name
      { body: JSON.stringify({ [keyMatch[1]]: keyValue }), ct: "application/json" },
      // Format 3: Raw text
      { body: keyValue, ct: "text/plain" },
    ];

    for (const attempt of fetchAttempts) {
      try {
        const ctrl2 = new AbortController();
        const timeoutId2 = setTimeout(() => ctrl2.abort(), 8000);

        const fetchRes = await fetch(`${EMBED_BASE}/fetch`, {
          method: "POST",
          signal: ctrl2.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Referer: embedUrl,
            Origin: EMBED_BASE,
            "Content-Type": attempt.ct,
            Accept: "*/*",
          },
          body: attempt.body,
        });
        clearTimeout(timeoutId2);

        if (fetchRes.ok) {
          const data = await fetchRes.text();
          try {
            const json = JSON.parse(data);
            // Check various response formats
            const m3u8Url = json.url || json.stream || json.source || json.src || json.playlist || json.hls || null;
            if (m3u8Url) {
              return NextResponse.json({ m3u8Url, embedUrl, method: "fetch" });
            }
            if (json.token) {
              const constructedUrl = `https://lb3.strmd.top/secure/${json.token}/rtmp/stream/${id}/1/playlist.m3u8`;
              return NextResponse.json({ m3u8Url: constructedUrl, embedUrl, method: "token" });
            }
          } catch {
            // Not JSON - check if it contains an M3U8 URL
            if (data.includes(".m3u8")) {
              const m3u8Match = data.match(/https?:\/\/[^\s"']+.m3u8[^\s"']*/);
              if (m3u8Match) {
                return NextResponse.json({ m3u8Url: m3u8Match[0], embedUrl, method: "fetch-text" });
              }
            }
          }
        }
      } catch {
        // Continue to next attempt
      }
    }

    // Step 4: Look for M3U8 URLs directly in HTML
    const m3u8Patterns = [
      /https?:\/\/[^\s"']+\.strmd\.top[^\s"']*\.m3u8[^\s"']*/,
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/,
    ];
    for (const pattern of m3u8Patterns) {
      const match = html.match(pattern);
      if (match) {
        return NextResponse.json({ m3u8Url: match[0], embedUrl, method: "html-scan" });
      }
    }

    // All extraction methods failed — return embed URL for new-tab fallback
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
