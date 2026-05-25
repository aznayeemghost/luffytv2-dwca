import { NextResponse } from "next/server";

// ============================================================
// LIVE STREAM RESOLVER — Multi-provider with M3U8 + Embed support
// PRIMARY: streamfree.app (CDN has CORS! M3U8 tokens from embed page)
// SECONDARY: cdnlivetv.tv (762 channels, M3U8 from player page)
// TERTIARY: dami-tv.pro (M3U8 from HLS endpoint)
// BACKUP: streamed.pk → embedsports.top (iframe embed playback)
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
  m3u8Url: string;        // M3U8 URL (empty string if embed-only)
  quality: string;
  source: string;
  viewers: number;
  provider: string;
  embedUrl?: string;
  corsEnabled: boolean;    // Can hls.js load this directly?
  referer?: string;        // Referer needed for M3U8 requests
  streamType: "m3u8" | "embed";  // NEW: explicit stream type
}

// ── PROVIDER 1: streamfree.app (BEST — CDN has CORS!) ──
async function resolveStreamfree(category: string, streamKey: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];

  try {
    const embedUrl = `https://streamfree.app/embed/${category}/${streamKey}`;
    const html = await GEThtml(embedUrl, { Referer: "https://streamfree.app/" });

    let tokens: Record<string, { _t: string; _e: number; _n: string }> = {};

    const patterns = [
      /const\s+_0x\s*=\s*(\{[^}]+\})/s,
      /var\s+_0x\s*=\s*(\{[^}]+\})/s,
      /window\._0x\s*=\s*(\{[^}]+\})/s,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          let jsonStr = match[1].replace(/'/g, '"').replace(/(\w+)\s*:/g, '"$1":').replace(/""/g, '"');
          tokens = JSON.parse(jsonStr);
          break;
        } catch { continue; }
      }
    }

    if (Object.keys(tokens).length === 0) {
      const tokenRegex = /"(\d{3,4}p)"\s*:\s*\{[^}]*"_t"\s*:\s*"([^"]+)"[^}]*"_e"\s*:\s*(\d+)[^}]*"_n"\s*:\s*"([^"]+)"[^}]*\}/g;
      let m;
      while ((m = tokenRegex.exec(html)) !== null) {
        tokens[m[1]] = { _t: m[2], _e: parseInt(m[3]), _n: m[4] };
      }
    }

    if (Object.keys(tokens).length === 0) {
      const anyToken = html.match(/"_t"\s*:\s*"([^"]+)"/);
      const anyExpiry = html.match(/"_e"\s*:\s*(\d+)/);
      const anyNonce = html.match(/"_n"\s*:\s*"([^"]+)"/);
      if (anyToken && anyExpiry && anyNonce) {
        tokens["720p"] = { _t: anyToken[1], _e: parseInt(anyExpiry[1]), _n: anyNonce[1] };
      }
    }

    if (Object.keys(tokens).length === 0) {
      const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
      if (m3u8Match) {
        results.push({
          id: `sf-direct-${streamKey}`, streamNo: 1, language: "English", hd: true,
          m3u8Url: m3u8Match[0], quality: "720p", source: "streamfree", viewers: 0,
          provider: "streamfree", corsEnabled: true, referer: "https://streamfree.app/",
          streamType: "m3u8",
        });
        return results;
      }
      return [];
    }

    let cdnDomain = "https://streamfree.app";
    try {
      const keyData = await GETjson(`https://streamfree.app/get-stream-key/${streamKey}`, { Referer: "https://streamfree.app/" });
      if (keyData.server_domain) cdnDomain = keyData.server_domain.replace(/\/$/, "");
    } catch {
      try {
        const cdnData = await GETjson(`https://streamfree.app/get-stream-key/${streamKey}?force_server=cdn`, { Referer: "https://streamfree.app/" });
        if (cdnData.server_domain) cdnDomain = cdnData.server_domain.replace(/\/$/, "");
      } catch {}
    }

    let streamNo = 1;
    const qualityOrder = ["2160p", "1080p", "720p", "540p"];
    for (const quality of qualityOrder) {
      const token = tokens[quality];
      if (!token) continue;
      const m3u8Url = `${cdnDomain}/live/${streamKey}${quality}/index.m3u8?_t=${encodeURIComponent(token._t)}&_e=${token._e}&_n=${encodeURIComponent(token._n)}`;
      results.push({
        id: `sf-${quality}-${streamKey}`, streamNo, language: "English", hd: quality !== "540p",
        m3u8Url, quality, source: "streamfree", viewers: 0, provider: "streamfree",
        corsEnabled: true, referer: "https://streamfree.app/", streamType: "m3u8",
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
    const playerUrl = `https://cdnlivetv.tv/api/v1/channels/player/?name=${encodeURIComponent(channelName)}&code=${channelCode}&user=cdnlivetv&plan=free`;
    const html = await GEThtml(playerUrl, { Referer: "https://cdnlivetv.tv/" });
    const m3u8Patterns = [
      /https?:\/\/edge\.cdnlivetv\.ru\/secure\/[^\s"']+\.m3u8[^\s"']*/g,
      /https?:\/\/[^\s"']*cdnlivetv[^\s"']*\.m3u8[^\s"']*/g,
      /https?:\/\/[^\s"']+\.m3u8\?token=[^\s"']+/g,
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g,
    ];
    let m3u8Url = "";
    for (const pattern of m3u8Patterns) {
      const matches = html.match(pattern);
      if (matches?.length) { m3u8Url = matches[0]; break; }
    }
    if (!m3u8Url) {
      const srcPattern = html.match(/src\s*[:=]\s*["']([^"']+)["']/);
      if (srcPattern && srcPattern[1].includes(".m3u8")) m3u8Url = srcPattern[1];
    }
    if (m3u8Url) {
      results.push({
        id: `cdn-${channelName}-${channelCode}`, streamNo: 1, language: "English", hd: true,
        m3u8Url, quality: "720p", source: "cdnlivetv", viewers: 0, provider: "cdnlivetv",
        corsEnabled: false, referer: "https://cdnlivetv.tv/", streamType: "m3u8",
      });
    }
  } catch {}
  return results;
}

// ── PROVIDER 3: dami-tv.pro ──
async function resolveDamiTV(matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    try {
      const m3u8Url = `https://dami-tv.pro/live-hls/channel/${encodeURIComponent(matchId)}/playlist.m3u8`;
      const res = await fetch(m3u8Url, { signal: makeCtrl().signal, headers: { "User-Agent": UA, Referer: "https://dami-tv.pro/" } });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("mpegurl") || ct.includes("octet-stream")) {
          results.push({
            id: `dami-hls-${matchId}`, streamNo: 1, language: "English", hd: true,
            m3u8Url, quality: "720p", source: "damitv-hls", viewers: 0, provider: "damitv",
            corsEnabled: false, referer: "https://dami-tv.pro/", streamType: "m3u8",
          });
        }
      }
    } catch {}
    try {
      const data = await GETjson(`https://dami-tv.pro/papi/stream/ppv/${encodeURIComponent(matchId)}`, { Referer: "https://dami-tv.pro/" });
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s.embedUrl) {
            // Try M3U8 extraction, but also keep embed as fallback
            let m3u8Url = "";
            try {
              const embedHtml = await GEThtml(s.embedUrl, { Referer: "https://dami-tv.pro/" });
              const m3u8Match = embedHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
              if (m3u8Match) m3u8Url = m3u8Match[0];
            } catch {}

            if (m3u8Url) {
              results.push({
                id: `dami-ppv-${matchId}-${s.streamNo}`, streamNo: s.streamNo || results.length + 1,
                language: s.language || "English", hd: s.hd !== false, m3u8Url, quality: s.hd ? "720p" : "480p",
                source: s.source || "damitv", viewers: s.viewers || 0, provider: "damitv",
                corsEnabled: false, referer: "https://dami-tv.pro/", embedUrl: s.embedUrl, streamType: "m3u8",
              });
            } else {
              // Embed fallback — will be played via iframe
              results.push({
                id: `dami-embed-${matchId}-${s.streamNo}`, streamNo: s.streamNo || results.length + 1,
                language: s.language || "English", hd: s.hd !== false, m3u8Url: "", quality: s.hd ? "720p" : "480p",
                source: s.source || "damitv", viewers: s.viewers || 0, provider: "damitv",
                corsEnabled: false, referer: "https://dami-tv.pro/", embedUrl: s.embedUrl, streamType: "embed",
              });
            }
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
      try {
        const embedHtml = await GEThtml(s.url, { Referer: "https://watchfooty.st/" });
        const m3u8Match = embedHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (m3u8Match) {
          results.push({
            id: `wf-${matchId}-${streamNo}`, streamNo, language: s.language || "English", hd: s.quality === "HD",
            m3u8Url: m3u8Match[0], quality: s.quality === "HD" ? "720p" : "480p",
            source: s.source || "watchfooty", viewers: 0, provider: "watchfooty",
            corsEnabled: false, referer: "https://watchfooty.st/", streamType: "m3u8",
          });
          streamNo++;
        }
      } catch {}
    }
  } catch {}
  return results;
}

// ── PROVIDER 5: streamed.pk → embedsports.top ──
// KEY FIX: embedsports.top uses obfuscated JS — M3U8 extraction FAILS
// So we return embed URLs as streamType "embed" for iframe playback
async function resolveStreamedPK(sources: { source: string; id: string }[]): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  const sourcePriority: Record<string, number> = { admin: 1, delta: 2, golf: 3, echo: 4, bravo: 5, alpha: 6, charlie: 7, foxtrot: 8 };

  for (const src of sources) {
    try {
      const data = await GETjson(`https://streamed.pk/api/stream/${src.source}/${encodeURIComponent(src.id)}`);
      if (!Array.isArray(data)) continue;

      for (const s of data) {
        if (!s.embedUrl) continue;

        // Try M3U8 extraction first (works for some providers)
        let m3u8Url = "";
        try {
          const embedHtml = await GEThtml(s.embedUrl, { Referer: "https://embedsports.top/" });
          const m3u8Match = embedHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
          if (m3u8Match) m3u8Url = m3u8Match[0];
        } catch {}

        const sourceLabel = src.source.charAt(0).toUpperCase() + src.source.slice(1);

        if (m3u8Url) {
          results.push({
            id: `sp-${src.source}-${s.streamNo}`, streamNo: s.streamNo || results.length + 1,
            language: s.language || "English", hd: s.hd !== false, m3u8Url, quality: s.hd ? "HD" : "SD",
            source: sourceLabel, viewers: s.viewers || 0, provider: "streamed",
            corsEnabled: false, referer: "https://embedsports.top/", embedUrl: s.embedUrl, streamType: "m3u8",
          });
        } else {
          // Embed fallback — will be played via iframe through /api/embed/proxy
          results.push({
            id: `sp-embed-${src.source}-${s.streamNo}`, streamNo: s.streamNo || results.length + 1,
            language: s.language || "English", hd: s.hd !== false, m3u8Url: "", quality: s.hd ? "HD" : "SD",
            source: sourceLabel, viewers: s.viewers || 0, provider: "streamed",
            corsEnabled: false, referer: "https://embedsports.top/", embedUrl: s.embedUrl, streamType: "embed",
          });
        }
      }
    } catch {}
  }

  // Sort by source priority
  results.sort((a, b) => (sourcePriority[a.source.toLowerCase()] || 50) - (sourcePriority[b.source.toLowerCase()] || 50));
  return results;
}

// ── PROVIDER 6: sportsembed.su ──
async function resolveSportsembedSu(category: string, matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const embedUrl = `https://sportsembed.su/embed/${category}/${matchId}`;
    const html = await GEThtml(embedUrl, { Referer: "https://sportsembed.su/" });
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
    if (m3u8Matches) {
      const seen = new Set<string>();
      for (const url of m3u8Matches) {
        if (seen.has(url)) continue; seen.add(url);
        results.push({
          id: `se-${category}-${matchId}-${results.length + 1}`, streamNo: results.length + 1,
          language: "English", hd: results.length === 0, m3u8Url: url,
          quality: results.length === 0 ? "720p" : "480p", source: "sportsembed", viewers: 0,
          provider: "sportsembed", corsEnabled: false, referer: "https://sportsembed.su/",
          embedUrl, streamType: "m3u8",
        });
      }
    }
  } catch {}
  return results;
}

// ── PROVIDER 7: embedsports.top ──
async function resolveEmbedsportsTop(category: string, matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const embedUrl = `https://embedsports.top/embed/${category}/${matchId}`;
    const html = await GEThtml(embedUrl, { Referer: "https://embedsports.top/" });
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
    if (m3u8Matches) {
      const seen = new Set<string>();
      for (const url of m3u8Matches) {
        if (seen.has(url)) continue; seen.add(url);
        results.push({
          id: `es-${category}-${matchId}-${results.length + 1}`, streamNo: results.length + 1,
          language: "English", hd: results.length === 0, m3u8Url: url,
          quality: results.length === 0 ? "720p" : "480p", source: "embedsports", viewers: 0,
          provider: "embedsports", corsEnabled: false, referer: "https://embedsports.top/",
          embedUrl, streamType: "m3u8",
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

  const resolvePromises: Promise<StreamResult[]>[] = [];

  if (streamKey && streamCategory) resolvePromises.push(resolveStreamfree(streamCategory, streamKey));
  if (channelName && channelCode) resolvePromises.push(resolveCDNLivetv(channelName, channelCode));
  if (damitvId) resolvePromises.push(resolveDamiTV(damitvId));
  if (watchfootyId) resolvePromises.push(resolveWatchfooty(parseInt(watchfootyId)));
  if (parsedSources.length > 0) resolvePromises.push(resolveStreamedPK(parsedSources));

  const sportsrcCategory = url.searchParams.get("sportsrcCategory") || streamCategory || "";
  const sportsrcId = url.searchParams.get("sportsrcId") || matchId || "";
  if (provider === "sportsembed" || (sportsrcCategory && sportsrcId)) {
    resolvePromises.push(resolveSportsembedSu(sportsrcCategory, sportsrcId));
  }
  if (provider === "embedsports" || (sportsrcCategory && sportsrcId)) {
    resolvePromises.push(resolveEmbedsportsTop(sportsrcCategory, sportsrcId));
  }

  if (resolvePromises.length === 0 && matchId) {
    resolvePromises.push(resolveDamiTV(matchId));
    if (parsedSources.length === 0) {
      resolvePromises.push(resolveStreamedPK([{ source: "admin", id: matchId }]));
    }
    resolvePromises.push(resolveSportsembedSu("sports", matchId));
    resolvePromises.push(resolveEmbedsportsTop("sports", matchId));
  }

  const allResults = await Promise.all(resolvePromises);
  const allStreams = allResults.flat();

  // Deduplicate: by m3u8Url for M3U8 streams, by embedUrl for embed streams
  const seen = new Set<string>();
  const uniqueStreams = allStreams.filter(s => {
    const key = s.streamType === "m3u8" && s.m3u8Url ? s.m3u8Url : (s.embedUrl || `${s.id}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: M3U8 first, then CORS-enabled first, then by quality
  const qualityOrder: Record<string, number> = { "2160p": 1, "1080p": 2, "HD": 2, "720p": 3, "SD": 4, "540p": 5, "480p": 6 };
  uniqueStreams.sort((a, b) => {
    // M3U8 streams first
    if (a.streamType === "m3u8" && b.streamType !== "m3u8") return -1;
    if (a.streamType !== "m3u8" && b.streamType === "m3u8") return 1;
    // Then CORS enabled
    if (a.corsEnabled && !b.corsEnabled) return -1;
    if (!a.corsEnabled && b.corsEnabled) return 1;
    return (qualityOrder[a.quality] || 99) - (qualityOrder[b.quality] || 99);
  });

  return NextResponse.json({
    streams: uniqueStreams,
    total: uniqueStreams.length,
    hasCORSStream: uniqueStreams.some(s => s.corsEnabled),
    hasEmbedStream: uniqueStreams.some(s => s.streamType === "embed"),
  });
}
