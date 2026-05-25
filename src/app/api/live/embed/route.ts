import { NextResponse } from "next/server";

// ============================================================
// LIVE STREAM RESOLVER — Extracts M3U8 URLs from multiple providers
// PRIMARY: streamfree.app (CDN has CORS! M3U8 tokens from embed page)
// SECONDARY: cdnlivetv.tv (762 channels, M3U8 from player page)
// TERTIARY: dami-tv.pro (M3U8 from HLS endpoint)
// BACKUP: watchfooty.st → sportsembed.su embeds, streamed.pk → embedsports.top
// ============================================================

export const runtime = "edge";

const TIMEOUT = 12000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function makeCtrl() { const c = new AbortController(); setTimeout(() => c.abort(), TIMEOUT); return c; }
async function GEThtml(url: string, extraHeaders: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, { signal: makeCtrl().signal, headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", ...extraHeaders } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}
async function GETjson(url: string, extraHeaders: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { signal: makeCtrl().signal, headers: { "User-Agent": UA, Accept: "application/json", ...extraHeaders } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

interface StreamResult {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  m3u8Url: string;
  quality: string;
  source: string;
  viewers: number;
  provider: string;
  embedUrl?: string;
  corsEnabled: boolean; // Can hls.js load this directly?
  referer?: string; // Referer needed for M3U8 requests
}

// ── PROVIDER 1: streamfree.app (BEST — CDN has CORS!) ──
async function resolveStreamfree(category: string, streamKey: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];

  try {
    // Step 1: Fetch the embed page to extract auth tokens
    const embedUrl = `https://streamfree.app/embed/${category}/${streamKey}`;
    const html = await GEThtml(embedUrl, { Referer: "https://streamfree.app/" });

    // Step 2: Extract the _0x token object from the embed page JavaScript
    // Pattern: const _0x = { "1080p": {"_e": ..., "_n": "...", "_t": "..."}, ... };
    let tokens: Record<string, { _t: string; _e: number; _n: string }> = {};

    // Try multiple patterns to find the token object
    const patterns = [
      // Pattern 1: const _0x = {...}
      /const\s+_0x\s*=\s*(\{[^}]+\})/s,
      // Pattern 2: var _0x = {...}
      /var\s+_0x\s*=\s*(\{[^}]+\})/s,
      // Pattern 3: window._0x = {...}
      /window\._0x\s*=\s*(\{[^}]+\})/s,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          // Clean up the JSON-like string (might have single quotes or unquoted keys)
          let jsonStr = match[1]
            .replace(/'/g, '"')
            .replace(/(\w+)\s*:/g, '"$1":')
            .replace(/""/g, '"');
          tokens = JSON.parse(jsonStr);
          break;
        } catch { continue; }
      }
    }

    // If structured tokens not found, try regex for individual token patterns
    if (Object.keys(tokens).length === 0) {
      // Look for patterns like: "_t":"SSVvzo3ftlH7A03Bci8bxg","_e":1779741907,"_n":"38e179593e2a70dc"
      const tokenRegex = /"(\d{3,4}p)"\s*:\s*\{[^}]*"_t"\s*:\s*"([^"]+)"[^}]*"_e"\s*:\s*(\d+)[^}]*"_n"\s*:\s*"([^"]+)"[^}]*\}/g;
      let m;
      while ((m = tokenRegex.exec(html)) !== null) {
        tokens[m[1]] = { _t: m[2], _e: parseInt(m[3]), _n: m[4] };
      }
    }

    // Last resort: scan for any quality + token combinations
    if (Object.keys(tokens).length === 0) {
      // Try to find tokens in any JS object
      const anyToken = html.match(/"_t"\s*:\s*"([^"]+)"/);
      const anyExpiry = html.match(/"_e"\s*:\s*(\d+)/);
      const anyNonce = html.match(/"_n"\s*:\s*"([^"]+)"/);
      if (anyToken && anyExpiry && anyNonce) {
        tokens["720p"] = { _t: anyToken[1], _e: parseInt(anyExpiry[1]), _n: anyNonce[1] };
      }
    }

    if (Object.keys(tokens).length === 0) {
      // Try direct M3U8 URL in HTML
      const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
      if (m3u8Match) {
        results.push({
          id: `sf-direct-${streamKey}`,
          streamNo: 1,
          language: "English",
          hd: true,
          m3u8Url: m3u8Match[0],
          quality: "720p",
          source: "streamfree",
          viewers: 0,
          provider: "streamfree",
          corsEnabled: true,
          referer: "https://streamfree.app/",
        });
        return results;
      }
      return [];
    }

    // Step 3: Get the CDN domain from /get-stream-key endpoint
    let cdnDomain = "https://streamfree.app"; // fallback to origin
    try {
      const keyData = await GETjson(`https://streamfree.app/get-stream-key/${streamKey}`, { Referer: "https://streamfree.app/" });
      if (keyData.server_domain) {
        cdnDomain = keyData.server_domain.replace(/\/$/, "");
      }
    } catch {
      // Try forcing CDN server
      try {
        const cdnData = await GETjson(`https://streamfree.app/get-stream-key/${streamKey}?force_server=cdn`, { Referer: "https://streamfree.app/" });
        if (cdnData.server_domain) cdnDomain = cdnData.server_domain.replace(/\/$/, "");
      } catch {}
    }

    // Step 4: Construct M3U8 URLs for each quality
    let streamNo = 1;
    const qualityOrder = ["2160p", "1080p", "720p", "540p"];
    for (const quality of qualityOrder) {
      const token = tokens[quality];
      if (!token) continue;

      // M3U8 URL format: {cdn_domain}/live/{key}{quality}/index.m3u8?_t=...&_e=...&_n=...
      const m3u8Url = `${cdnDomain}/live/${streamKey}${quality}/index.m3u8?_t=${encodeURIComponent(token._t)}&_e=${token._e}&_n=${encodeURIComponent(token._n)}`;

      results.push({
        id: `sf-${quality}-${streamKey}`,
        streamNo,
        language: "English",
        hd: quality !== "540p",
        m3u8Url,
        quality,
        source: "streamfree",
        viewers: 0,
        provider: "streamfree",
        corsEnabled: true, // CDN mirrors Origin header!
        referer: "https://streamfree.app/",
      });
      streamNo++;
    }

  } catch (err: any) {
    console.error("streamfree resolve error:", err.message);
  }

  return results;
}

// ── PROVIDER 2: cdnlivetv.tv (762 TV channels) ──
async function resolveCDNLivetv(channelName: string, channelCode: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    // Fetch player page with proper Referer
    const playerUrl = `https://cdnlivetv.tv/api/v1/channels/player/?name=${encodeURIComponent(channelName)}&code=${channelCode}&user=cdnlivetv&plan=free`;
    const html = await GEThtml(playerUrl, { Referer: "https://cdnlivetv.tv/" });

    // Extract M3U8 URL from the player page
    // The page uses obfuscated JS, but the M3U8 URL is in the format:
    // https://edge.cdnlivetv.ru/secure/api/v1/{cc}-{name}/playlist.m3u8?token=...&signature=...
    const m3u8Patterns = [
      /https?:\/\/edge\.cdnlivetv\.ru\/secure\/[^\s"']+\.m3u8[^\s"']*/g,
      /https?:\/\/[^\s"']*cdnlivetv[^\s"']*\.m3u8[^\s"']*/g,
      /https?:\/\/[^\s"']+\.m3u8\?token=[^\s"']+/g,
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g,
    ];

    let m3u8Url = "";
    for (const pattern of m3u8Patterns) {
      const matches = html.match(pattern);
      if (matches?.length) {
        m3u8Url = matches[0];
        break;
      }
    }

    // If no direct M3U8 found, try to extract from obfuscated JS
    if (!m3u8Url) {
      // Look for base64-encoded or hex-encoded URLs
      const srcPattern = html.match(/src\s*[:=]\s*["']([^"']+)["']/);
      if (srcPattern) {
        const src = srcPattern[1];
        if (src.includes(".m3u8")) m3u8Url = src;
      }
    }

    if (m3u8Url) {
      results.push({
        id: `cdn-${channelName}-${channelCode}`,
        streamNo: 1,
        language: "English",
        hd: true,
        m3u8Url,
        quality: "720p",
        source: "cdnlivetv",
        viewers: 0,
        provider: "cdnlivetv",
        corsEnabled: false, // cdnlivetv M3U8 has origin-specific CORS
        referer: "https://cdnlivetv.tv/",
      });
    }
  } catch {}

  return results;
}

// ── PROVIDER 3: dami-tv.pro ──
async function resolveDamiTV(matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    // Method 1: Try direct HLS endpoint
    try {
      const m3u8Url = `https://dami-tv.pro/live-hls/channel/${encodeURIComponent(matchId)}/playlist.m3u8`;
      const res = await fetch(m3u8Url, {
        signal: makeCtrl().signal,
        headers: { "User-Agent": UA, Referer: "https://dami-tv.pro/" },
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("mpegurl") || ct.includes("octet-stream")) {
          results.push({
            id: `dami-hls-${matchId}`,
            streamNo: 1,
            language: "English",
            hd: true,
            m3u8Url,
            quality: "720p",
            source: "damitv-hls",
            viewers: 0,
            provider: "damitv",
            corsEnabled: false,
            referer: "https://dami-tv.pro/",
          });
        }
      }
    } catch {}

    // Method 2: Try PPV embed API
    try {
      const data = await GETjson(`https://dami-tv.pro/papi/stream/ppv/${encodeURIComponent(matchId)}`, { Referer: "https://dami-tv.pro/" });
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s.embedUrl) {
            // Try to extract M3U8 from the embed page
            try {
              const embedHtml = await GEThtml(s.embedUrl, { Referer: "https://dami-tv.pro/" });
              const m3u8Match = embedHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
              if (m3u8Match) {
                results.push({
                  id: `dami-ppv-${matchId}-${s.streamNo}`,
                  streamNo: s.streamNo || results.length + 1,
                  language: s.language || "English",
                  hd: s.hd !== false,
                  m3u8Url: m3u8Match[0],
                  quality: s.hd ? "720p" : "480p",
                  source: s.source || "damitv",
                  viewers: s.viewers || 0,
                  provider: "damitv",
                  corsEnabled: false,
                  referer: "https://dami-tv.pro/",
                  embedUrl: s.embedUrl,
                });
              }
            } catch {}
          }
        }
      }
    } catch {}
  } catch {}

  return results;
}

// ── PROVIDER 4: watchfooty.st → sportsembed.su ──
async function resolveWatchfooty(matchId: number): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const data = await GETjson(`https://api.watchfooty.st/api/v1/match/${matchId}`);
    const streams = data.streams || [];
    let streamNo = 1;

    for (const s of streams) {
      if (!s.url) continue;
      // Try to extract M3U8 from the embed page
      try {
        const embedHtml = await GEThtml(s.url, { Referer: "https://watchfooty.st/" });
        const m3u8Match = embedHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (m3u8Match) {
          results.push({
            id: `wf-${matchId}-${streamNo}`,
            streamNo,
            language: s.language || "English",
            hd: s.quality === "HD",
            m3u8Url: m3u8Match[0],
            quality: s.quality === "HD" ? "720p" : "480p",
            source: s.source || "watchfooty",
            viewers: 0,
            provider: "watchfooty",
            corsEnabled: false,
            referer: "https://watchfooty.st/",
          });
          streamNo++;
        }
      } catch {}
    }
  } catch {}

  return results;
}

// ── PROVIDER 5: streamed.pk → embedsports.top ──
async function resolveStreamedPK(sources: { source: string; id: string }[]): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  const sourcePriority: Record<string, number> = { delta: 1, admin: 2, golf: 3, echo: 4, bravo: 5 };

  for (const src of sources) {
    try {
      const data = await GETjson(`https://streamed.pk/api/stream/${src.source}/${src.id}`);
      if (!Array.isArray(data)) continue;

      for (const s of data) {
        if (!s.embedUrl) continue;
        // Try to extract M3U8 from the embed page
        try {
          const embedHtml = await GEThtml(s.embedUrl, { Referer: "https://embedsports.top/" });
          const m3u8Match = embedHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
          if (m3u8Match) {
            results.push({
              id: `sp-${src.source}-${s.streamNo}`,
              streamNo: s.streamNo || results.length + 1,
              language: s.language || "English",
              hd: s.hd !== false,
              m3u8Url: m3u8Match[0],
              quality: s.hd ? "720p" : "480p",
              source: s.source || src.source,
              viewers: s.viewers || 0,
              provider: "streamed",
              corsEnabled: false,
              referer: "https://embedsports.top/",
              embedUrl: s.embedUrl,
            });
          }
        } catch {}
      }
    } catch {}
  }

  // Sort by source priority
  results.sort((a, b) => (sourcePriority[a.source] || 50) - (sourcePriority[b.source] || 50));
  return results;
}

// ── PROVIDER 6: sportsembed.su (direct embed M3U8 extraction) ──
async function resolveSportsembedSu(category: string, matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const embedUrl = `https://sportsembed.su/embed/${category}/${matchId}`;
    const html = await GEThtml(embedUrl, { Referer: "https://sportsembed.su/" });
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
    if (m3u8Matches) {
      const seen = new Set<string>();
      for (const url of m3u8Matches) {
        if (seen.has(url)) continue;
        seen.add(url);
        results.push({
          id: `se-${category}-${matchId}-${results.length + 1}`,
          streamNo: results.length + 1,
          language: "English",
          hd: results.length === 0,
          m3u8Url: url,
          quality: results.length === 0 ? "720p" : "480p",
          source: "sportsembed",
          viewers: 0,
          provider: "sportsembed",
          corsEnabled: false,
          referer: "https://sportsembed.su/",
          embedUrl,
        });
      }
    }
  } catch {}
  return results;
}

// ── PROVIDER 7: embedsports.top (direct embed M3U8 extraction) ──
async function resolveEmbedsportsTop(category: string, matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const embedUrl = `https://embedsports.top/embed/${category}/${matchId}`;
    const html = await GEThtml(embedUrl, { Referer: "https://embedsports.top/" });
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
    if (m3u8Matches) {
      const seen = new Set<string>();
      for (const url of m3u8Matches) {
        if (seen.has(url)) continue;
        seen.add(url);
        results.push({
          id: `es-${category}-${matchId}-${results.length + 1}`,
          streamNo: results.length + 1,
          language: "English",
          hd: results.length === 0,
          m3u8Url: url,
          quality: results.length === 0 ? "720p" : "480p",
          source: "embedsports",
          viewers: 0,
          provider: "embedsports",
          corsEnabled: false,
          referer: "https://embedsports.top/",
          embedUrl,
        });
      }
    }
  } catch {}
  return results;
}

// ── MAIN HANDLER ──
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "";
  const streamKey = url.searchParams.get("streamKey") || "";
  const streamCategory = url.searchParams.get("streamCategory") || "";
  const channelName = url.searchParams.get("channelName") || "";
  const channelCode = url.searchParams.get("channelCode") || "";
  const damitvId = url.searchParams.get("damitvId") || "";
  const watchfootyId = url.searchParams.get("watchfootyId") || "";
  const sources = url.searchParams.get("sources") || "";
  const matchId = url.searchParams.get("matchId") || "";

  if (!provider && !matchId) {
    return NextResponse.json({ error: "Missing provider or matchId" }, { status: 400 });
  }

  let parsedSources: { source: string; id: string }[] = [];
  if (sources) {
    try { parsedSources = JSON.parse(sources); if (!Array.isArray(parsedSources)) parsedSources = []; } catch { parsedSources = []; }
  }

  // Resolve based on provider
  const resolvePromises: Promise<StreamResult[]>[] = [];

  // Always try streamfree if we have key + category
  if (streamKey && streamCategory) {
    resolvePromises.push(resolveStreamfree(streamCategory, streamKey));
  }

  // Always try cdnlivetv if we have channel info
  if (channelName && channelCode) {
    resolvePromises.push(resolveCDNLivetv(channelName, channelCode));
  }

  // Always try dami-tv if we have match ID
  if (damitvId) {
    resolvePromises.push(resolveDamiTV(damitvId));
  }

  // Always try watchfooty if we have match ID
  if (watchfootyId) {
    resolvePromises.push(resolveWatchfooty(parseInt(watchfootyId)));
  }

  // Always try streamed.pk if we have sources
  if (parsedSources.length > 0) {
    resolvePromises.push(resolveStreamedPK(parsedSources));
  }

  // Try sportsembed.su if provider matches or we have category + id
  const sportsrcCategory = url.searchParams.get("sportsrcCategory") || streamCategory || "";
  const sportsrcId = url.searchParams.get("sportsrcId") || matchId || "";
  if (provider === "sportsembed" || (sportsrcCategory && sportsrcId)) {
    resolvePromises.push(resolveSportsembedSu(sportsrcCategory, sportsrcId));
  }

  // Try embedsports.top if provider matches or as fallback
  if (provider === "embedsports" || (sportsrcCategory && sportsrcId)) {
    resolvePromises.push(resolveEmbedsportsTop(sportsrcCategory, sportsrcId));
  }

  // If no specific provider data, try based on provider field
  if (resolvePromises.length === 0 && matchId) {
    // Fallback: try all providers with the match ID
    resolvePromises.push(resolveDamiTV(matchId));
    if (parsedSources.length === 0) {
      resolvePromises.push(resolveStreamedPK([{ source: "admin", id: matchId }]));
    }
    // Also try sportsembed.su and embedsports.top as fallbacks
    resolvePromises.push(resolveSportsembedSu("sports", matchId));
    resolvePromises.push(resolveEmbedsportsTop("sports", matchId));
  }

  const allResults = await Promise.all(resolvePromises);
  const allStreams = allResults.flat();

  // Deduplicate by M3U8 URL
  const seen = new Set<string>();
  const uniqueStreams = allStreams.filter(s => {
    if (!s.m3u8Url) return false;
    if (seen.has(s.m3u8Url)) return false;
    seen.add(s.m3u8Url);
    return true;
  });

  // Sort: streamfree first (CORS enabled!), then by quality
  const qualityOrder: Record<string, number> = { "2160p": 1, "1080p": 2, "720p": 3, "540p": 4 };
  uniqueStreams.sort((a, b) => {
    if (a.corsEnabled && !b.corsEnabled) return -1;
    if (!a.corsEnabled && b.corsEnabled) return 1;
    return (qualityOrder[a.quality] || 99) - (qualityOrder[b.quality] || 99);
  });

  return NextResponse.json({
    streams: uniqueStreams,
    total: uniqueStreams.length,
    hasCORSStream: uniqueStreams.some(s => s.corsEnabled),
  });
}
