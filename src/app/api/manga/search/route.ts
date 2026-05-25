import { NextRequest, NextResponse } from "next/server";
import { searchManga } from "@/lib/manga-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  try {
    const results = await searchManga(q, 20);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
