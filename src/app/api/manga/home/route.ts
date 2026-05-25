import { NextResponse } from "next/server";
import { getMangaHome } from "@/lib/manga-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sections = await getMangaHome();
    return NextResponse.json({ sections });
  } catch {
    return NextResponse.json({ sections: [] });
  }
}
