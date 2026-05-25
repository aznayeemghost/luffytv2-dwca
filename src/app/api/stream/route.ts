import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stream proxy - proxies video streams with correct referer/CORS headers
// Vercel-compatible using fetch with proper streaming

const ALLOWED_HOSTS = [
  "allanimenews.com", "cdn.allanimenews.com", "allanime.day",
  "vibeplayer.site", "otakuvid.online", "otakuhg.site", "myvidplay.com",
  "mp4upload.com", "ibyteimg.com",
  "flixcloud.cc", "fetch1.flixcloud.cc", "fetch2.flixcloud.cc",
  "s4.anilist.co", "kwik.cx", "kwik.si",
  "megaplay.buzz", "megaplay.online",
  "cimovix.store", "cdn.cimovix.store",
  "wixmp.com", "cdn.wixmp.com", "fast4speed.rsvp",
  "cdn1.animex.tech", "cdn2.animex.tech", "animex.tech",
  "ax1.cdnpool.space", "ax2.cdnpool.space", "cdnpool.space",
  "streamruby.net", "cdn.streamruby.net",
  "vidplay.online", "vidstreaming.xyz",
  "gogoplay1.com", "gogoplay2.com", "gogoplay4.com", "gogoplay5.com",
  "bunnycdn.ru", "vz-777.bunnycdn.ru",
  "miruro.tv", "api.miruro.tv", "miruro-api.vercel.app",
  "anikotoapi.site", "api.tatakai.me",
  "rubystm.com", "as-cdn21.top", "toonstream.dad", "toonstream.vip",
  "hindianimedb.simoonabdulla.workers.dev",
  "m3u8play.com", "streamtape.com", "doodstream.com", "mixdrop.co", "mixdrop.sx",
  "1ani.me", "cdn-eu.1ani.me",
  "bysekoze.com", "vidnest.net", "ok.ru", "allanime.uns",
  "fastshare.cloud", "animepahe.com", "animepahe.ru",
  "amazonaws.com", "cloudfront.net",
  "consumet.org", "api.consumet.org",
  "aniwatch-api-one.vercel.app",
];

function getRefererForUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("kwik") || hostname.includes("kiwi")) return "https://kwik.cx/";
    if (hostname.includes("megaplay")) return "https://anikototv.to/";
    if (hostname.includes("allanime") || hostname.includes("allmanga") || hostname.includes("animenews")) return "https://allmanga.to/";
    if (hostname.includes("streamruby")) return "https://streamruby.net/";
    if (hostname.includes("vidplay")) return "https://vidplay.online/";
    if (hostname.includes("gogoplay")) return "https://gogoplay.io/";
    if (hostname.includes("anikotoapi")) return "https://anikototv.to/";
    if (hostname.includes("tatakai")) return "https://tatakai.me/";
    if (hostname.includes("rubystm")) return "https://rubystm.com/";
    if (hostname.includes("toonstream")) return "https://toonstream.dad/";
    if (hostname.includes("consumet")) return "https://consumet.org/";
    if (hostname.includes("aniwatch")) return "https://aniwatch.to/";
    return new URL(url).origin + "/";
  } catch {
    return "https://example.com/";
  }
}

function guessContentType(url: string): string {
  if (url.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (url.endsWith(".ts")) return "video/mp2t";
  if (url.endsWith(".mp4")) return "video/mp4";
  if (url.endsWith(".vtt")) return "text/vtt";
  return "video/mp4";
}

function handleM3u8(content: string, originalUrl: string, referer: string): NextResponse {
  const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf("/") + 1);
  const refererParam = referer ? `&referer=${encodeURIComponent(referer)}` : "";

  const rewritten = content.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      if (trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
          const full = uri.startsWith("http") ? uri
            : uri.startsWith("/") ? new URL(uri, baseUrl).href
            : baseUrl + uri;
          return `URI="/api/stream?url=${encodeURIComponent(full)}${refererParam}"`;
        });
      }
      return line;
    }
    const full = trimmed.startsWith("http") ? trimmed
      : trimmed.startsWith("/") ? new URL(trimmed, baseUrl).href
      : baseUrl + trimmed;
    return `/api/stream?url=${encodeURIComponent(full)}${refererParam}`;
  }).join("\n");

  return new NextResponse(rewritten, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const customReferer = searchParams.get("referer");

    if (!url) {
      return NextResponse.json({ error: "url parameter required" }, { status: 400 });
    }

    const targetUrl = decodeURIComponent(url);
    const referer = customReferer || getRefererForUrl(targetUrl);
    const range = request.headers.get("range");

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
      Accept: "*/*",
      "Accept-Encoding": "identity",
      Referer: referer,
      Origin: new URL(referer).origin,
    };

    if (range) headers["Range"] = range;

    const res = await fetch(targetUrl, { headers, redirect: "follow" });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || guessContentType(targetUrl);

    // For m3u8 playlists, rewrite URLs to proxy through us
    if (contentType.includes("mpegurl") || targetUrl.endsWith(".m3u8")) {
      const m3u8Content = await res.text();
      return handleM3u8(m3u8Content, targetUrl, referer);
    }

    // Stream the response body directly
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    // Forward relevant headers from upstream
    const cl = res.headers.get("content-length");
    const cr = res.headers.get("content-range");
    const ar = res.headers.get("accept-ranges");
    if (cl) responseHeaders.set("Content-Length", cl);
    if (cr) responseHeaders.set("Content-Range", cr);
    if (ar) responseHeaders.set("Accept-Ranges", ar);

    return new NextResponse(res.body, {
      status: res.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Stream proxy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
