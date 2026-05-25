import { NextRequest, NextResponse } from "next/server";
import { getChapterImages, getMangaDexChapterPages } from "@/lib/manga-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mangaId = request.nextUrl.searchParams.get("mangaId");
  const chapterId = request.nextUrl.searchParams.get("chapterId");
  if (!mangaId || !chapterId) {
    return NextResponse.json({ error: "mangaId and chapterId required" }, { status: 400 });
  }

  try {
    let pages = await getChapterImages(mangaId, chapterId);

    // If combined function failed, try MangaDex directly as last resort
    if (pages.length === 0) {
      try {
        pages = await getMangaDexChapterPages(chapterId);
      } catch { /* direct MangaDex also failed */ }
    }

    // Proxy images through our server to add the Referer header
    const proxiedPages = pages.map(page => ({
      ...page,
      proxiedUrl: `/api/manga/image?url=${encodeURIComponent(page.url)}`,
    }));
    return NextResponse.json({ pages: proxiedPages });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}
