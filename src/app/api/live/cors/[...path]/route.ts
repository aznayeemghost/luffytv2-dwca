import { NextResponse } from "next/server";

// ============================================================
// LIGHTWEIGHT CORS PROXY for M3U8/TS segments
// Adds CORS headers so hls.js can play streams from any origin
// Only proxies M3U8 manifests and TS segments (not full pages)
// ============================================================

const TIMEOUT = 15000;
const ALLOWED_HOSTS = [
  "lb3.strmd.top",
  "lb1.strmd.top",
  "lb2.strmd.top",
  "strmd.top",
  "cdn.strmd.top",
];

function makeAbort(): AbortController {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT);
  return ctrl;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join("/");
  const url = new URL(req.url);

  // The target URL is passed as the path after /api/live/cors/
  // Format: /api/live/cors/https://lb3.strmd.top/secure/xxx/...
  // Or we reconstruct it from the path

  let targetUrl: string;

  // Check if the path starts with http:// or https://
  if (pathStr.startsWith("http:/") || pathStr.startsWith("https:/")) {
    // Reconstruct full URL from path
    targetUrl = pathStr.startsWith("http:/") && !pathStr.startsWith("http://")
      ? pathStr.replace("http:/", "http://")
      : pathStr.startsWith("https:/") && !pathStr.startsWith("https://")
        ? pathStr.replace("https:/", "https://")
        : pathStr;
  } else {
    // Use the url parameter
    const targetParam = url.searchParams.get("url");
    if (targetParam) {
      targetUrl = targetParam;
    } else {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }
  }

  // Validate host
  let targetHost: string;
  try {
    targetHost = new URL(targetUrl).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(h => targetHost === h || targetHost.endsWith(`.${h}`));
  if (!isAllowed) {
    return NextResponse.json({ error: "Host not allowed", host: targetHost }, { status: 403 });
  }

  // Copy query params
  const qs = url.searchParams.toString();
  const cleanParams = new URLSearchParams(url.searchParams);
  cleanParams.delete("url");
  const cleanQs = cleanParams.toString();
  const fullUrl = cleanQs ? `${targetUrl}?${cleanQs}` : targetUrl;

  try {
    const ctrl = makeAbort();
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "*/*",
    };

    // Forward range headers for TS segment seeking
    const range = req.headers.get("range");
    if (range) headers["Range"] = range;

    const res = await fetch(fullUrl, {
      signal: ctrl.signal,
      headers,
      redirect: "follow",
    });

    const body = await res.arrayBuffer();

    const responseHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length",
    };

    // Forward relevant response headers
    for (const h of ["content-type", "content-length", "content-range", "cache-control", "accept-ranges"]) {
      const val = res.headers.get(h);
      if (val) responseHeaders[h] = val;
    }

    // For M3U8 manifests, rewrite URLs to go through our proxy
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("mpegurl") || contentType.includes("octet-stream") || fullUrl.includes(".m3u8")) {
      let manifest = new TextDecoder().decode(body);

      // Rewrite M3U8 URLs to go through our CORS proxy
      // Replace https://lb3.strmd.top/... with /api/live/cors/https://lb3.strmd.top/...
      for (const host of ALLOWED_HOSTS) {
        manifest = manifest.replace(
          new RegExp(`https?://${host.replace(/\./g, "\\.")}/`, "g"),
          `/api/live/cors/https://${host}/`
        );
      }

      // Also rewrite relative URLs in the manifest (for TS segments)
      // If the manifest contains relative paths like "1.ts", make them absolute
      if (!manifest.includes("/api/live/cors/")) {
        const baseUrl = fullUrl.substring(0, fullUrl.lastIndexOf("/") + 1);
        manifest = manifest.replace(
          /^([^#\n][^\s]+\.ts[^\n]*)$/gm,
          (match, segment) => {
            if (segment.startsWith("http")) return match;
            return `/api/live/cors/${baseUrl}${segment}`;
          }
        );
      }

      return new NextResponse(new TextEncoder().encode(manifest), {
        status: res.status,
        headers: responseHeaders,
      });
    }

    return new NextResponse(body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "CORS proxy failed", detail: err.message },
      { status: 502 }
    );
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
