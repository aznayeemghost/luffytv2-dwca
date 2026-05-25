import { NextResponse } from "next/server";

// ============================================================
// M3U8 STREAM EXTRACTOR — Extracts M3U8 URL from embed pages
// Fast approach: server-side extraction, native hls.js playback
// ============================================================

const EMBED_BASE = "https://embedsports.top";
const TIMEOUT = 12000;

function makeAbort(): AbortController {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT);
  return ctrl;
}

async function extractM3U8(source: string, id: string, streamNo: string): Promise<{ m3u8Url?: string; embedUrl: string; error?: string }> {
  const embedUrl = `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`;

  try {
    const ctrl = makeAbort();
    const res = await fetch(embedUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      return { embedUrl, error: `Embed page returned ${res.status}` };
    }

    const html = await res.text();

    // Extract the window key variable
    const keyMatch = html.match(/window\['([^']+)'\]\s*=\s*'([^']+)'/);
    if (keyMatch) {
      const keyValue = keyMatch[2];

      // Try POST to /fetch with different body formats
      const fetchAttempts = [
        { body: JSON.stringify({ key: keyValue, source, id, streamNo: parseInt(streamNo) || 1 }), ct: "application/json" },
        { body: `key=${encodeURIComponent(keyValue)}&source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&streamNo=${streamNo}`, ct: "application/x-www-form-urlencoded" },
        { body: keyValue, ct: "text/plain" },
      ];

      for (const attempt of fetchAttempts) {
        try {
          const ctrl2 = makeAbort();
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

          if (fetchRes.ok) {
            const data = await fetchRes.text();
            try {
              const json = JSON.parse(data);
              if (json.url) return { m3u8Url: json.url, embedUrl };
              if (json.token) {
                const m3u8Url = `https://lb3.strmd.top/secure/${json.token}/rtmp/stream/${id}/1/playlist.m3u8`;
                return { m3u8Url, embedUrl };
              }
              if (json.stream) return { m3u8Url: json.stream, embedUrl };
              if (json.source) return { m3u8Url: json.source, embedUrl };
              if (json.src) return { m3u8Url: json.src, embedUrl };
              if (json.playlist) return { m3u8Url: json.playlist, embedUrl };
              if (json.hls) return { m3u8Url: json.hls, embedUrl };
            } catch {
              if (data.includes(".m3u8")) {
                const m3u8Match = data.match(/https?:\/\/[^\s"']+.m3u8[^\s"']*/);
                if (m3u8Match) return { m3u8Url: m3u8Match[0], embedUrl };
              }
            }
          }
        } catch { /* continue */ }
      }
    }

    // Look for M3U8 URLs directly in the HTML/JS
    const m3u8Patterns = [
      /https?:\/\/[^\s"']+\.strmd\.top[^\s"']*\.m3u8[^\s"']*/,
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/,
      /"(https?:\/\/[^"]+playlist\.m3u8[^"]*)"/,
      /'(https?:\/\/[^']+playlist\.m3u8[^']*)'/,
    ];
    for (const pattern of m3u8Patterns) {
      const match = html.match(pattern);
      if (match) return { m3u8Url: match[1] || match[0], embedUrl };
    }

    return { embedUrl, error: "Could not extract M3U8 URL - use iframe fallback" };
  } catch (err: any) {
    return { embedUrl, error: err.message || "Failed to fetch embed page" };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const source = url.searchParams.get("source") || "";
  const id = url.searchParams.get("id") || "";
  const streamNo = url.searchParams.get("no") || "1";
  const embedUrlParam = url.searchParams.get("embedUrl") || "";

  if (embedUrlParam) {
    const embedMatch = embedUrlParam.match(/embed\/([^/]+)\/([^/]+)\/(\d+)/);
    if (embedMatch) {
      const result = await extractM3U8(embedMatch[1], embedMatch[2], embedMatch[3]);
      return NextResponse.json(result);
    }
  }

  if (!source || !id) {
    return NextResponse.json({ error: "Missing source or id" }, { status: 400 });
  }

  const result = await extractM3U8(source, id, streamNo);
  return NextResponse.json(result);
}
