// Unified Manga API Client — Atsumaru (atsu.moe) as primary, MangaDex as fallback
// Atsumaru: Covers, details, chapters, search
// MangaDex: Fallback for chapter reading if Atsumaru fails

const ATSU_BASE = "https://atsu.moe";
const MANGADEX_API = "https://api.mangadex.org";

const ATSU_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.5",
  Referer: `${ATSU_BASE}/`,
};

const MANGADEX_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

// ============================================================
// Fetch helpers
// ============================================================

async function atsuFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { headers: ATSU_HEADERS, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function mangadexFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { headers: MANGADEX_HEADERS, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ============================================================
// Types
// ============================================================

export interface AtsuMangaEntry {
  id: string;
  title: string;
  englishTitle?: string;
  poster?: string;
  posterSmall?: string;
  posterMedium?: string;
  type?: string;
  isAdult?: boolean;
  status?: string;
  year?: number;
  authors?: string[];
  genres?: string[];
  description?: string;
  anilistId?: number;
  malId?: number;
  banner?: string;
  totalChapters?: number;
  mangadexId?: string;
  source?: string;
  cover?: string;
  slug?: string;
}

export interface AtsuMangaChapter {
  id: string;
  title: string;
  number: number;
  date?: string;
  scanGroup?: string;
  mangadexChapterId?: string;
  pages?: number;
  pageCount?: number;
}

export interface AtsuMangaDetail {
  id: string;
  title: string;
  englishTitle?: string;
  altTitles?: string[];
  poster?: string;
  banner?: string;
  description?: string;
  type?: string;
  status?: string;
  year?: number;
  authors?: string | string[];
  artists?: string[];
  genres?: string[];
  isAdult?: boolean;
  anilistId?: number;
  malId?: number;
  chapters?: AtsuMangaChapter[];
  totalChapters?: number;
  rating?: number;
  views?: number | string;
  mangadexId?: string;
  source?: string;
  cover?: string;
  slug?: string;
}

export interface AtsuChapterPage {
  index: number;
  url: string;
  proxiedUrl?: string;
  width?: number;
  height?: number;
}

export interface AtsuHomeSection {
  title: string;
  type: string;
  items: AtsuMangaEntry[];
}

// ============================================================
// Atsumaru Helpers
// ============================================================

/** Convert an API poster path to a full static URL */
function atsuPosterUrl(path: string | undefined | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const cleaned = path.replace(/^\/+/, "");
  const withStatic = cleaned.startsWith("static/") ? cleaned : `static/${cleaned}`;
  return `${ATSU_BASE}/${withStatic}`;
}

// ============================================================
// Atsumaru API Functions (PRIMARY)
// ============================================================

/** Get manga home/browse sections from Atsumaru */
export async function getAtsuHome(): Promise<AtsuHomeSection[]> {
  try {
    const res = await atsuFetch(`${ATSU_BASE}/api/home/page`);
    if (!res.ok) return [];
    const data = await res.json();

    const sections: AtsuHomeSection[] = [];
    const homePage = data?.homePage;
    if (homePage?.sections && Array.isArray(homePage.sections)) {
      for (const section of homePage.sections) {
        const key = section.key || "unknown";
        const title = section.title || key.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const items: AtsuMangaEntry[] = [];
        if (Array.isArray(section.items)) {
          for (const item of section.items) {
            const poster = atsuPosterUrl(item.image);
            items.push({
              id: String(item.id || ""),
              title: item.title || "",
              slug: String(item.id || ""),
              poster,
              cover: poster,
              type: item.type || undefined,
              isAdult: item.isAdult || false,
              source: "atsumaru",
            });
          }
        }
        if (items.length > 0) {
          sections.push({
            title,
            type: key.replace(/-/g, "_"),
            items,
          });
        }
      }
    }
    return sections;
  } catch (err) {
    console.error("[manga-api] Atsumaru home error:", err);
    return [];
  }
}

/** Get manga details from Atsumaru */
export async function getAtsuDetail(mangaId: string): Promise<AtsuMangaDetail | null> {
  try {
    const [detailsRes, infoRes] = await Promise.all([
      atsuFetch(`${ATSU_BASE}/api/manga/page?id=${encodeURIComponent(mangaId)}`),
      atsuFetch(`${ATSU_BASE}/api/manga/info?mangaId=${encodeURIComponent(mangaId)}`),
    ]);

    if (!detailsRes.ok && !infoRes.ok) return null;

    let detailsData: any = {};
    let infoData: any = {};

    if (detailsRes.ok) detailsData = await detailsRes.json();
    if (infoRes.ok) infoData = await infoRes.json();

    const mangaPage = detailsData?.mangaPage || {};

    // Extract banner
    let bannerUrl = "";
    if (mangaPage.banner?.url) {
      bannerUrl = atsuPosterUrl(mangaPage.banner.url);
    }

    // Extract poster
    let posterUrl = "";
    const posterData = mangaPage.poster;
    if (posterData && typeof posterData === "object") {
      posterUrl = atsuPosterUrl(posterData.largeImage || posterData.image);
    }
    if (!posterUrl) {
      posterUrl = atsuPosterUrl(infoData.poster || infoData.image);
    }

    // Extract chapters
    const chapters: AtsuMangaChapter[] = [];
    if (Array.isArray(infoData.chapters)) {
      for (const chap of infoData.chapters) {
        chapters.push({
          id: String(chap.id || ""),
          title: chap.title || `Chapter ${chap.number}`,
          number: chap.number || chapters.length + 1,
          pageCount: chap.pageCount || 0,
        });
      }
    }

    return {
      id: mangaId,
      slug: mangaId,
      title: infoData.title || "",
      type: infoData.type || "",
      views: mangaPage.views || "",
      source: "atsumaru",
      description: infoData.synopsis || infoData.description || "",
      authors: infoData.authors || "Unknown",
      status: infoData.status || "Unknown",
      genres: Array.isArray(infoData.genres) ? infoData.genres : [],
      anilistId: mangaPage.anilistId,
      malId: mangaPage.malId,
      banner: bannerUrl,
      poster: posterUrl,
      cover: posterUrl || bannerUrl,
      chapters,
    };
  } catch (err) {
    console.error("[manga-api] Atsumaru detail error:", err);
    return null;
  }
}

/** Get chapter images from Atsumaru */
export async function getAtsuChapterImages(mangaId: string, chapterId: string): Promise<AtsuChapterPage[]> {
  try {
    const res = await atsuFetch(
      `${ATSU_BASE}/api/read/chapter?mangaId=${encodeURIComponent(mangaId)}&chapterId=${encodeURIComponent(chapterId)}`
    );
    if (!res.ok) return [];
    const data = await res.json();

    const pages = data?.readChapter?.pages;
    if (!Array.isArray(pages)) return [];

    return pages
      .map((page: any, i: number) => {
        const img = page?.image;
        if (!img) return null;
        const url = img.startsWith("/") ? `${ATSU_BASE}${img}` : `${ATSU_BASE}/${img}`;
        return { index: i, url };
      })
      .filter(Boolean) as AtsuChapterPage[];
  } catch (err) {
    console.error("[manga-api] Atsumaru chapter images error:", err);
    return [];
  }
}

/** Search manga on Atsumaru */
export async function searchAtsu(query: string, limit = 20): Promise<AtsuMangaEntry[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `${ATSU_BASE}/collections/manga/documents/search?filter_by=&q=${encoded}&limit=${limit}` +
      `&query_by=title%2CenglishTitle%2CotherNames%2Cauthors&query_by_weights=4%2C3%2C2%2C1` +
      `&include_fields=id%2Ctitle%2CenglishTitle%2Cposter%2CposterSmall%2CposterMedium%2Ctype%2CisAdult%2Cstatus%2Cyear` +
      `&num_typos=4%2C3%2C2%2C1`;

    const res = await atsuFetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const results: AtsuMangaEntry[] = [];
    const hits = data?.hits || [];
    for (const hit of hits) {
      const doc = hit?.document;
      if (!doc) continue;
      const poster = atsuPosterUrl(doc.poster || doc.posterMedium || doc.posterSmall);
      results.push({
        id: String(doc.id),
        title: doc.title || doc.englishTitle || "",
        englishTitle: doc.englishTitle,
        slug: String(doc.id),
        poster,
        cover: poster,
        type: doc.type || undefined,
        isAdult: doc.isAdult || false,
        status: doc.status || undefined,
        source: "atsumaru",
      });
    }
    return results;
  } catch (err) {
    console.error("[manga-api] Atsumaru search error:", err);
    return [];
  }
}

// ============================================================
// MangaDex Fallback Functions
// ============================================================

function buildMangaDexListParams(extra: Record<string, string> = {}): URLSearchParams {
  const params = new URLSearchParams();
  params.append("includes[]", "cover_art");
  params.append("contentRating[]", "safe");
  params.append("contentRating[]", "suggestive");
  params.append("hasAvailableChapters", "true");
  params.append("availableTranslatedLanguage[]", "en");
  for (const [key, value] of Object.entries(extra)) {
    params.append(key, value);
  }
  return params;
}

function getMangaDexTitle(attributes: any): string {
  if (!attributes?.title) return "Unknown";
  if (typeof attributes.title === "string") return attributes.title;
  return attributes.title.en || attributes.title["ja-ro"] || attributes.title.ja ||
    Object.values(attributes.title)[0] as string || "Unknown";
}

function getMangaDexEnglishTitle(attributes: any): string | undefined {
  if (!attributes?.altTitles) return undefined;
  for (const alt of attributes.altTitles) {
    if (alt.en) return alt.en;
  }
  return undefined;
}

function getMangaDexCoverFileName(relationships: any[]): string | null {
  if (!Array.isArray(relationships)) return null;
  for (const rel of relationships) {
    if (rel.type === "cover_art" && rel.attributes?.fileName) {
      return rel.attributes.fileName;
    }
  }
  return null;
}

function getMangaDexCoverUrl(mangaId: string, coverFileName: string): string {
  return `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}`;
}

function getMangaDexAuthors(relationships: any[], type: "author" | "artist"): string[] {
  if (!Array.isArray(relationships)) return [];
  return relationships
    .filter(r => r.type === type && r.attributes?.name)
    .map(r => r.attributes.name);
}

function getMangaDexGenres(attributes: any): string[] {
  if (!attributes?.tags) return [];
  return attributes.tags
    .filter((t: any) => t.attributes?.name)
    .map((t: any) => {
      const name = t.attributes.name;
      return typeof name === "string" ? name : (name.en || Object.values(name)[0] as string);
    });
}

function getMangaDexStatus(attributes: any): string | undefined {
  const status = attributes?.status;
  if (!status) return undefined;
  const map: Record<string, string> = {
    ongoing: "Ongoing", completed: "Completed", hiatus: "Hiatus", cancelled: "Cancelled",
  };
  return map[status.toLowerCase()] || status;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapMangaDexEntry(manga: any): AtsuMangaEntry {
  const attrs = manga.attributes || {};
  const coverFileName = getMangaDexCoverFileName(manga.relationships || []);
  const poster = coverFileName ? getMangaDexCoverUrl(manga.id, coverFileName) : undefined;

  return {
    id: manga.id,
    mangadexId: manga.id,
    title: getMangaDexTitle(attrs),
    englishTitle: getMangaDexEnglishTitle(attrs),
    poster,
    cover: poster,
    type: attrs.publicationDemographic ? capitalizeFirst(attrs.publicationDemographic) : undefined,
    isAdult: attrs.contentRating === "pornographic" || attrs.contentRating === "erotica",
    status: getMangaDexStatus(attrs),
    year: attrs.year || undefined,
    authors: getMangaDexAuthors(manga.relationships || [], "author"),
    genres: getMangaDexGenres(attrs),
    description: attrs.description?.en || attrs.description?.["ja-ro"] ||
      (typeof attrs.description === "string" ? attrs.description : undefined),
    totalChapters: attrs.lastChapter ? parseInt(attrs.lastChapter) || undefined : undefined,
    source: "mangadex",
  };
}

export async function searchMangaDex(query: string, limit = 20): Promise<AtsuMangaEntry[]> {
  try {
    const params = buildMangaDexListParams({ title: query, limit: String(limit) });
    const res = await mangadexFetch(`${MANGADEX_API}/manga?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(mapMangaDexEntry);
  } catch { return []; }
}

export async function getMangaDexChapterPages(chapterId: string): Promise<AtsuChapterPage[]> {
  try {
    const res = await mangadexFetch(`${MANGADEX_API}/at-home/server/${chapterId}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.chapter) return [];
    const baseUrl = data.baseUrl;
    const hash = data.chapter.hash;
    const pages = data.chapter.data;
    if (!Array.isArray(pages)) return [];
    return pages.map((filename: string, i: number) => ({
      index: i,
      url: `${baseUrl}/data/${hash}/${filename}`,
    }));
  } catch { return []; }
}

export async function getMangaDexDetail(mangaId: string): Promise<AtsuMangaDetail | null> {
  try {
    const infoRes = await mangadexFetch(
      `${MANGADEX_API}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`
    );
    if (!infoRes.ok) return null;
    const infoData = await infoRes.json();
    const manga = infoData?.data;
    if (!manga) return null;

    const attrs = manga.attributes || {};
    const coverFileName = getMangaDexCoverFileName(manga.relationships || []);
    const poster = coverFileName ? getMangaDexCoverUrl(manga.id, coverFileName) : undefined;

    let chapters: AtsuMangaChapter[] = [];
    let totalChapters = 0;
    let offset = 0;
    const chapterLimit = 100;
    let hasMore = true;

    while (hasMore) {
      const chaptersRes = await mangadexFetch(
        `${MANGADEX_API}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=${chapterLimit}&offset=${offset}`
      );
      if (!chaptersRes.ok) break;
      const chaptersData = await chaptersRes.json();
      totalChapters = chaptersData?.total || 0;
      const batch = chaptersData?.data || [];
      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const ch of batch) {
        if (!ch.attributes?.chapter) continue;
        chapters.push({
          id: ch.id,
          mangadexChapterId: ch.id,
          title: ch.attributes?.title || `Chapter ${ch.attributes?.chapter}`,
          number: parseFloat(ch.attributes?.chapter) || (chapters.length + 1),
          date: ch.attributes?.publishAt || ch.attributes?.readableAt,
          scanGroup: ch.relationships?.find((r: any) => r.type === "scanlation_group")?.attributes?.name,
          pages: ch.attributes?.pages,
        });
      }
      offset += chapterLimit;
      hasMore = offset < totalChapters;
    }

    const seen = new Set<number>();
    chapters = chapters.filter(ch => {
      const key = Math.round(ch.number * 100) / 100;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    chapters.sort((a, b) => a.number - b.number);

    return {
      id: manga.id,
      mangadexId: manga.id,
      title: getMangaDexTitle(attrs),
      englishTitle: getMangaDexEnglishTitle(attrs),
      altTitles: attrs.altTitles ? attrs.altTitles.map((t: any) => Object.values(t)[0] as string) : [],
      poster,
      banner: undefined,
      description: attrs.description?.en || attrs.description?.["ja-ro"] ||
        (typeof attrs.description === "string" ? attrs.description : undefined),
      type: attrs.publicationDemographic ? capitalizeFirst(attrs.publicationDemographic) : undefined,
      status: getMangaDexStatus(attrs),
      year: attrs.year || undefined,
      authors: getMangaDexAuthors(manga.relationships || [], "author"),
      artists: getMangaDexAuthors(manga.relationships || [], "artist"),
      genres: getMangaDexGenres(attrs),
      isAdult: attrs.contentRating === "pornographic" || attrs.contentRating === "erotica",
      totalChapters: totalChapters || (attrs.lastChapter ? parseInt(attrs.lastChapter) : undefined) || 0,
      chapters,
      source: "mangadex",
    };
  } catch { return null; }
}

// ============================================================
// Combined API Functions — Atsumaru primary, MangaDex fallback
// ============================================================

/** Get manga home sections — Atsumaru primary */
export async function getMangaHome(): Promise<AtsuHomeSection[]> {
  // Try Atsumaru first
  const atsuSections = await getAtsuHome();
  if (atsuSections.length >= 2) return atsuSections;

  // Fallback: MangaDex
  console.log("[manga-api] Atsumaru home insufficient, falling back to MangaDex");
  try {
    const sections: AtsuHomeSection[] = [];
    const [trending, recent, topRated] = await Promise.all([
      (async () => { const params = buildMangaDexListParams({ "order[followedCount]": "desc", limit: "20" }); const r = await mangadexFetch(`${MANGADEX_API}/manga?${params}`); return r.ok ? (await r.json()).data?.map(mapMangaDexEntry) || [] : []; })(),
      (async () => { const params = buildMangaDexListParams({ "order[updatedAt]": "desc", limit: "20" }); const r = await mangadexFetch(`${MANGADEX_API}/manga?${params}`); return r.ok ? (await r.json()).data?.map(mapMangaDexEntry) || [] : []; })(),
      (async () => { const params = buildMangaDexListParams({ "order[rating]": "desc", limit: "20" }); const r = await mangadexFetch(`${MANGADEX_API}/manga?${params}`); return r.ok ? (await r.json()).data?.map(mapMangaDexEntry) || [] : []; })(),
    ]);
    if (trending.length) sections.push({ title: "Trending Manga", type: "trending", items: trending });
    if (topRated.length) sections.push({ title: "Popular Manga", type: "popular", items: topRated });
    if (recent.length) sections.push({ title: "Recently Updated", type: "recent", items: recent });
    return sections;
  } catch { return atsuSections; }
}

/** Search manga — Atsumaru primary, MangaDex fallback */
export async function searchManga(query: string, limit = 20): Promise<AtsuMangaEntry[]> {
  const atsuResults = await searchAtsu(query, limit);
  if (atsuResults.length > 0) return atsuResults;
  return searchMangaDex(query, limit);
}

/** Get manga detail — Atsumaru primary, MangaDex fallback */
export async function getMangaDetail(mangaId: string): Promise<AtsuMangaDetail | null> {
  // Try Atsumaru first
  const atsuDetail = await getAtsuDetail(mangaId);
  if (atsuDetail && atsuDetail.title) return atsuDetail;

  // Fallback to MangaDex
  console.log("[manga-api] Atsumaru detail failed for:", mangaId, "— trying MangaDex");
  return getMangaDexDetail(mangaId);
}

/** Get chapter images — Atsumaru primary, MangaDex fallback */
export async function getChapterImages(mangaId: string, chapterId: string): Promise<AtsuChapterPage[]> {
  // Try Atsumaru first
  const atsuPages = await getAtsuChapterImages(mangaId, chapterId);
  if (atsuPages.length > 0) return atsuPages;

  // Fallback to MangaDex
  console.log("[manga-api] Atsumaru chapter images failed, trying MangaDex for:", chapterId);
  return getMangaDexChapterPages(chapterId);
}

// Re-export for direct use
export { mapMangaDexEntry };
