import { NextResponse } from "next/server";

// ============================================================
// EDGE M3U8 PROXY — Fast Edge Runtime proxy for M3U8 manifests
// Runs on Vercel's Edge Network for LOW LATENCY
// Only used when M3U8 server blocks CORS (streamfree CDN usually doesn't need this)
// ============================================================

export const runtime = "edge";

const ALLOWED_HOSTS = [
  "streamfree.app",
  "afafjhahkjfhkajsf.shop",  // streamfree CDN (may rotate)
  "cdn-lab.shop",
  "lb1.strmd.top", "lb2.strmd.top", "lb3.strmd.top",
  "lb4.strmd.top", "lb5.strmd.top", "lb6.strmd.top",
  "lb7.strmd.top", "lb8.strmd.top", "lb9.strmd.top",
  "lb10.strmd.top", "lb11.strmd.top", "lb12.strmd.top",
  "strmd.top",
  "edge.cdnlivetv.ru",
  "cdnlivetv.ru",
  "dami-tv.pro",
  "sportsembed.su",
  "embedsports.top",
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join("/");
  const url = new URL(req.url);

  let targetUrl: string;
  if (pathStr.startsWith("http:/") || pathStr.startsWith("https:/")) {
    targetUrl = pathStr.startsWith("http:/") && !pathStr.startsWith("http://")
      ? pathStr.replace("http:/", "http://")
      : pathStr.startsWith("https:/") && !pathStr.startsWith("https://")
        ? pathStr.replace("https:/", "https://")
        : pathStr;
  } else {
    const targetParam = url.searchParams.get("url");
    if (targetParam) {
      targetUrl = targetParam;
    } else {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }

  let targetHost: string;
  try { targetHost = new URL(targetUrl).hostname; } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(h => targetHost === h || targetHost.endsWith(`.${h}`));
  if (!isAllowed) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  const cleanParams = new URLSearchParams(url.searchParams);
  cleanParams.delete("url");
  const referer = cleanParams.get("referer") || "";
  if (referer) cleanParams.delete("referer");
  const cleanQs = cleanParams.toString();
  const fullUrl = cleanQs ? `${targetUrl}&${cleanQs}` : targetUrl;

  try {
    // Determine the correct Referer based on the target host
    let refererValue = referer;
    if (!refererValue) {
      if (targetHost.includes("streamfree") || targetHost.includes("cdn-lab") || targetHost.includes("afafjhahkjfhkajsf")) {
        refererValue = "https://streamfree.app/";
      } else if (targetHost.includes("cdnlivetv")) {
        refererValue = "https://cdnlivetv.tv/";
      } else if (targetHost.includes("dami-tv")) {
        refererValue = "https://dami-tv.pro/";
      } else if (targetHost.includes("strmd")) {
        refererValue = "https://embedsports.top/";
      } else if (targetHost.includes("sportsembed")) {
        refererValue = "https://sportsembed.su/";
      } else if (targetHost.includes("embedsports")) {
        refererValue = "https://embedsports.top/";
      }
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "*/*",
      Referer: refererValue,
    };

    if (refererValue) {
      try { headers["Origin"] = new URL(refererValue).origin; } catch {}
    }

    const range = req.headers.get("range");
    if (range) headers["Range"] = range;

    const res = await fetch(fullUrl, { headers, redirect: "follow" });
    const body = await res.arrayBuffer();

    const responseHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "public, max-age=5",
    };

    for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const val = res.headers.get(h);
      if (val) responseHeaders[h] = val;
    }

    // For M3U8 manifests, rewrite relative URLs to go through the proxy
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("mpegurl") || fullUrl.includes(".m3u8")) {
      let manifest = new TextDecoder().decode(body);

      // Rewrite absolute URLs from allowed hosts to go through proxy
      for (const host of ALLOWED_HOSTS) {
        manifest = manifest.replace(
          new RegExp(`https?://${host.replace(/\./g, "\\.")}/`, "g"),
          `/api/live/proxy/https://${host}/`
        );
      }

      // Rewrite relative segment URLs
      const baseUrl = fullUrl.substring(0, fullUrl.lastIndexOf("/") + 1);
      manifest = manifest.replace(
        /^([^#\n][^\s]+(\.ts|\.js|\.m3u8)[^\n]*)$/gm,
        (match, segment) => {
          if (segment.startsWith("http") || segment.startsWith("/api/")) return match;
          return `/api/live/proxy/${baseUrl}${segment}`;
        }
      );

      return new NextResponse(new TextEncoder().encode(manifest), { status: res.status, headers: responseHeaders });
    }

    return new NextResponse(body, { status: res.status, headers: responseHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: "Edge proxy failed", detail: err.message }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
