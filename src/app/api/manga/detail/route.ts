import { NextRequest, NextResponse } from "next/server";
import { getMangaDetail } from "@/lib/manga-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const detail = await getMangaDetail(id);
    if (detail) return NextResponse.json(detail);
    return NextResponse.json({ error: "Manga not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch manga details" }, { status: 500 });
  }
}
