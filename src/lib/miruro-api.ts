// Miruro API Client - Direct m3u8 streaming for sub & dub
// Based on the Python MiruroScraper API with auto-provider switching
// If one provider fails, automatically tries the next one
// Also includes alternative API endpoints for reliability

const MIRURO_API = "https://miruro-api.vercel.app";
// Backup API endpoints — tried in order if primary fails
const MIRURO_BACKUP_APIS = [
  "https://miruro-api.vercel.app",
  "https://api.miruro.tv",
  "https://miruro-api.fly.dev",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  Accept: "application/json",
  Origin: "https://miruro.tv",
  Referer: "https://miruro.tv/",
};

// Provider priority order — miku FIRST (user requested), then other reliable providers
// NO kiwi as primary — miku is the main provider, kiwi is backup only
const PROVIDER_PRIORITY = [
  "miku", "ax-mimi", "ax-wave", "ax-shiro", "ax-yuki", "ax-zen", "bee", "kiwi", "zoro",
  "arc", "jet",
];

// Which providers support HLS vs embed
const PROVIDER_CAPABILITIES: Record<string, { hls: boolean; embed: boolean }> = {
  "miku":     { hls: true, embed: true },
  "kiwi":     { hls: true, embed: true },
  "ax-mimi":  { hls: true, embed: false },
  "ax-wave":  { hls: true, embed: false },
  "ax-shiro": { hls: true, embed: false },
  "ax-yuki":  { hls: true, embed: false },
  "ax-zen":   { hls: true, embed: false },
  "bee":      { hls: true, embed: false },
  "zoro":     { hls: false, embed: true },
  "arc":      { hls: true, embed: false },
  "jet":      { hls: true, embed: false },
};

// Cache for working API base URL
let workingApiBase: string | null = null;
let lastApiCheck = 0;
const API_CHECK_INTERVAL = 5 * 60 * 1000; // 5 min

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // Reduced from 15s to 10s
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        if (i < retries) {
          await new Promise(r => setTimeout(r, 800 * (i + 1))); // Reduced wait time
          continue;
        }
      }
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

// Try multiple API base URLs for reliability
async function fetchWithBaseUrlFallback(path: string, options: RequestInit): Promise<Response> {
  // Try the known working base first
  const basesToTry = workingApiBase
    ? [workingApiBase, ...MIRURO_BACKUP_APIS.filter(b => b !== workingApiBase)]
    : [...MIRURO_BACKUP_APIS];

  let lastError: Error | null = null;

  for (const base of basesToTry) {
    try {
      const url = `${base}${path}`;
      const res = await fetchWithRetry(url, options);
      if (res.ok) {
        // Cache the working base URL
        workingApiBase = base;
        lastApiCheck = Date.now();
        return res;
      }
      // If 404, this API exists but doesn't have the data — no point trying other bases
      if (res.status === 404) return res;
      // For other errors, try next base
      lastError = new Error(`API ${base} returned ${res.status}`);
    } catch (err: any) {
      lastError = err;
      // Try next base URL
      continue;
    }
  }

  // All bases failed — reset cached base
  workingApiBase = null;
  throw lastError || new Error("All Miruro API bases failed");
}

// ---- Types ----
export interface MiruroAnimeResult {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  type?: string;
  format?: string;
  status?: string;
  description?: string;
  season?: string;
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  coverImage?: { extraLarge?: string; large?: string; medium?: string; color?: string };
  bannerImage?: string;
  genres?: string[];
  averageScore?: number;
  popularity?: number;
  trending?: number;
  countryOfOrigin?: string;
  isAdult?: boolean;
}

export interface MiruroEpisode {
  number: number;
  slug: string;
  id?: string;
  title?: string;
  thumbnail?: string;
  image?: string;
  isFiller?: boolean;
  filler?: boolean;
  airDate?: string;
  description?: string;
}

export interface MiruroWatchSource {
  url: string;
  quality?: string;
  isM3U8?: boolean;
  sourceType?: "internal" | "external";
  sourceName?: string;
  type?: string;
}

export interface MiruroWatchResult {
  sources: MiruroWatchSource[];
  subtitles?: { url: string; lang: string; language: string }[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  headers?: Record<string, string>;
  provider: string;
  allProviders?: string[];
  triedProviders?: string[];
}

export interface MiruroSearchResult {
  currentPage: number;
  hasNextPage: boolean;
  results: MiruroAnimeResult[];
}

// ---- Episode Data with Providers ----
export interface MiruroProviderEpisodes {
  episodes: {
    sub: MiruroEpisode[];
    dub: MiruroEpisode[];
  };
  meta?: { title?: string };
}

export interface MiruroEpisodesResponse {
  providers: Record<string, MiruroProviderEpisodes>;
  mappings?: Record<string, any>;
}

export interface NormalizedEpisodesResult {
  sub: MiruroEpisode[];
  dub: MiruroEpisode[];
  defaultProvider: string;
  allProviders: string[];
  providersMap: Record<string, MiruroProviderEpisodes>;
}

// ---- API Functions ----

export async function miruroSearch(query: string, page = 1): Promise<MiruroSearchResult> {
  try {
    const res = await fetchWithBaseUrlFallback(
      `/search?q=${encodeURIComponent(query)}&page=${page}`,
      { headers: HEADERS, next: { revalidate: 120 } }
    );
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return await res.json();
  } catch {
    return { currentPage: page, hasNextPage: false, results: [] };
  }
}

export async function miruroInfo(anilistId: number): Promise<MiruroAnimeResult | null> {
  try {
    const res = await fetchWithBaseUrlFallback(`/info/${anilistId}`, {
      headers: HEADERS, next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || data || null;
  } catch {
    return null;
  }
}

export async function miruroTrending(page = 1, perPage = 20): Promise<MiruroAnimeResult[]> {
  try {
    const res = await fetchWithBaseUrlFallback(
      `/trending?page=${page}&perPage=${perPage}`,
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || data?.media || [];
  } catch {
    return [];
  }
}

export async function miruroPopular(page = 1, perPage = 20): Promise<MiruroAnimeResult[]> {
  try {
    const res = await fetchWithBaseUrlFallback(
      `/popular?page=${page}&perPage=${perPage}`,
      { headers: HEADERS, next: { revalidate: 600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || data?.media || [];
  } catch {
    return [];
  }
}

export async function miruroRecent(page = 1, perPage = 20): Promise<MiruroAnimeResult[]> {
  try {
    const res = await fetchWithBaseUrlFallback(
      `/recent?page=${page}&perPage=${perPage}`,
      { headers: HEADERS, next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || data?.media || [];
  } catch {
    return [];
  }
}

/**
 * Pick the best provider based on episode count with priority as tiebreaker
 * Matches the Python _pick_best_provider logic
 */
function pickBestProvider(providers: Record<string, MiruroProviderEpisodes>): string | null {
  if (!providers || Object.keys(providers).length === 0) return null;

  let bestName: string | null = null;
  let bestCount = -1;

  // First pass: check providers in priority order
  for (const name of PROVIDER_PRIORITY) {
    if (!(name in providers)) continue;
    const providerData = providers[name];
    if (!providerData || !providerData.episodes) continue;
    const subCount = (providerData.episodes.sub || []).length;
    if (subCount > bestCount) {
      bestCount = subCount;
      bestName = name;
    }
  }

  if (bestName) return bestName;

  // Fallback: any provider with data
  for (const [name, data] of Object.entries(providers)) {
    if (!data || !data.episodes) continue;
    const subCount = (data.episodes.sub || []).length;
    if (subCount > bestCount) {
      bestCount = subCount;
      bestName = name;
    }
  }

  return bestName;
}

/**
 * Normalize episodes from a specific provider
 */
function normalizeProviderEpisodes(
  providerData: MiruroProviderEpisodes,
  providerName: string
): { sub: MiruroEpisode[]; dub: MiruroEpisode[] } {
  const subEps = (providerData.episodes?.sub || []).map(ep => ({
    number: ep.number,
    slug: ep.slug || ep.id || String(ep.number),
    id: ep.id || ep.slug || String(ep.number),
    title: ep.title || `Episode ${ep.number}`,
    thumbnail: ep.thumbnail || ep.image || "",
    isFiller: ep.isFiller || ep.filler || false,
    airDate: ep.airDate || "",
  }));

  const dubEps = (providerData.episodes?.dub || []).map(ep => ({
    number: ep.number,
    slug: ep.slug || ep.id || String(ep.number),
    id: ep.id || ep.slug || String(ep.number),
    title: ep.title || `Episode ${ep.number}`,
    thumbnail: ep.thumbnail || ep.image || "",
    isFiller: ep.isFiller || ep.filler || false,
    airDate: ep.airDate || "",
  }));

  // Deduplicate by episode number
  const dedup = (eps: MiruroEpisode[]): MiruroEpisode[] => {
    const seen = new Set<number>();
    return eps.filter(ep => {
      if (seen.has(ep.number)) return false;
      seen.add(ep.number);
      return true;
    });
  };

  return { sub: dedup(subEps), dub: dedup(dubEps) };
}

/**
 * Fetch episodes from Miruro API — with multi-provider support
 * Picks the best provider automatically and returns normalized data
 */
export async function miruroEpisodes(anilistId: number): Promise<NormalizedEpisodesResult> {
  try {
    const res = await fetchWithBaseUrlFallback(`/episodes/${anilistId}`, {
      headers: HEADERS, next: { revalidate: 600 },
    });
    if (!res.ok) return { sub: [], dub: [], defaultProvider: "", allProviders: [], providersMap: {} };
    const data = await res.json();

    // New format: data has providers object
    if (data?.providers && typeof data.providers === "object") {
      const providers: Record<string, MiruroProviderEpisodes> = data.providers;
      const bestProvider = pickBestProvider(providers);

      if (!bestProvider) {
        return { sub: [], dub: [], defaultProvider: "", allProviders: Object.keys(providers), providersMap: providers };
      }

      const normalized = normalizeProviderEpisodes(providers[bestProvider], bestProvider);

      return {
        sub: normalized.sub,
        dub: normalized.dub,
        defaultProvider: bestProvider,
        allProviders: Object.keys(providers),
        providersMap: providers,
      };
    }

    // Legacy format: data.episodes.sub / data.episodes.dub
    if (data?.episodes) {
      const sub = data.episodes.sub || data.episodes;
      const dub = data.episodes.dub || [];
      return {
        sub: Array.isArray(sub) ? sub : [],
        dub: Array.isArray(dub) ? dub : [],
        defaultProvider: "miku",
        allProviders: ["miku"],
        providersMap: {},
      };
    }

    // Array format
    if (Array.isArray(data)) {
      return { sub: data, dub: [], defaultProvider: "miku", allProviders: ["miku"], providersMap: {} };
    }

    return { sub: [], dub: [], defaultProvider: "", allProviders: [], providersMap: {} };
  } catch {
    return { sub: [], dub: [], defaultProvider: "", allProviders: [], providersMap: {} };
  }
}

/**
 * Get list of available providers for a specific episode number
 * Used for auto-switching when a provider fails
 */
export function getAvailableProvidersForEpisode(
  providersMap: Record<string, MiruroProviderEpisodes>,
  episodeNum: number,
  category: "sub" | "dub"
): string[] {
  const available: string[] = [];

  for (const providerName of PROVIDER_PRIORITY) {
    const providerData = providersMap[providerName];
    if (!providerData?.episodes) continue;

    const eps = category === "dub" ? providerData.episodes.dub : providerData.episodes.sub;
    if (eps.some(ep => ep.number === episodeNum)) {
      available.push(providerName);
    }
  }

  // Add any providers not in priority list that have the episode
  for (const [name, data] of Object.entries(providersMap)) {
    if (available.includes(name)) continue;
    if (!data?.episodes) continue;
    const eps = category === "dub" ? data.episodes.dub : data.episodes.sub;
    if (eps.some(ep => ep.number === episodeNum)) {
      available.push(name);
    }
  }

  return available;
}

/**
 * Get episode slug/id for a specific provider and episode number
 */
export function getEpisodeSlugForProvider(
  providersMap: Record<string, MiruroProviderEpisodes>,
  providerName: string,
  episodeNum: number,
  category: "sub" | "dub"
): string | null {
  const providerData = providersMap[providerName];
  if (!providerData?.episodes) return null;

  const eps = category === "dub" ? providerData.episodes.dub : providerData.episodes.sub;
  const ep = eps.find(e => e.number === episodeNum);
  if (!ep) return null;
  return ep.slug || ep.id || String(ep.number);
}

// Classify a URL as internal (direct play) or external (iframe/redirect)
function classifySource(url: string): "internal" | "external" {
  if (!url) return "internal";
  const externalPatterns = [
    "/embed", "/e/", "vibeplayer", "otakuvid", "megaplay",
    "mp4upload", "vidnest", "ok.ru", "allanime.uns",
    "streamtape", "doodstream", "mixdrop",
  ];
  const lower = url.toLowerCase();
  if (externalPatterns.some(p => lower.includes(p))) return "external";
  return "internal";
}

/**
 * Watch a single provider — returns stream data or null
 * Uses base URL fallback for reliability
 */
export async function miruroWatchProvider(
  provider: string,
  anilistId: number,
  translationType: "sub" | "dub",
  episodeSlug: string
): Promise<MiruroWatchResult | null> {
  try {
    const path = `/watch/${provider}/${anilistId}/${translationType}/${episodeSlug}`;
    const res = await fetchWithBaseUrlFallback(path, {
      headers: HEADERS, next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const sources = data?.sources || data?.data?.sources || [];
    if (sources.length === 0) return null;

    const subtitles = data?.subtitles || data?.data?.subtitles || [];
    const intro = data?.intro || data?.data?.intro;
    const outro = data?.outro || data?.data?.outro;
    const headers = data?.headers || data?.data?.headers;

    return {
      sources: sources.map((s: MiruroWatchSource) => ({
        ...s,
        isM3U8: s.isM3U8 || s.url?.includes(".m3u8"),
        sourceType: classifySource(s.url),
      })),
      subtitles,
      intro,
      outro,
      headers,
      provider,
    };
  } catch {
    return null;
  }
}

/**
 * Watch with auto-switching — tries providers in priority order
 * If the first provider fails, automatically tries the next one
 * This is the main function used by the API routes
 */
export async function miruroWatch(
  provider: string,
  anilistId: number,
  translationType: "sub" | "dub",
  episodeSlug: string,
  providersMap?: Record<string, MiruroProviderEpisodes>,
  episodeNum?: number
): Promise<MiruroWatchResult & { triedProviders: string[] }> {
  const triedProviders: string[] = [];

  // Build provider list to try
  let providersToTry: string[] = [];

  // If we have providersMap and episodeNum, get providers that have this episode
  if (providersMap && episodeNum) {
    providersToTry = getAvailableProvidersForEpisode(providersMap, episodeNum, translationType);
  }

  // Always start with the requested provider if it's in the list
  if (provider && !providersToTry.includes(provider)) {
    providersToTry.unshift(provider);
  } else if (provider && providersToTry.includes(provider)) {
    // Move requested provider to front
    providersToTry = providersToTry.filter(p => p !== provider);
    providersToTry.unshift(provider);
  }

  // If no providers found, fall back to priority list
  if (providersToTry.length === 0) {
    providersToTry = [...PROVIDER_PRIORITY];
  }

  // Try each provider in order — with fast timeout so we don't waste time
  for (const currentProvider of providersToTry) {
    triedProviders.push(currentProvider);

    // Get the correct slug for this provider if we have the map
    let slug = episodeSlug;
    if (providersMap && episodeNum) {
      const providerSlug = getEpisodeSlugForProvider(providersMap, currentProvider, episodeNum, translationType);
      if (providerSlug) slug = providerSlug;
      else continue; // This provider doesn't have this episode, skip
    }

    console.log(`[MiruroWatch] Trying provider: ${currentProvider} (slug: ${slug})`);
    const result = await miruroWatchProvider(currentProvider, anilistId, translationType, slug);

    if (result && result.sources.length > 0) {
      console.log(`[MiruroWatch] Success with provider: ${currentProvider} (${result.sources.length} sources)`);
      return {
        ...result,
        allProviders: providersToTry,
        triedProviders,
      };
    }

    console.log(`[MiruroWatch] Provider ${currentProvider} failed, trying next...`);
  }

  // All providers failed
  return {
    sources: [],
    subtitles: [],
    intro: undefined,
    outro: undefined,
    headers: {},
    provider: triedProviders[triedProviders.length - 1] || provider,
    allProviders: providersToTry,
    triedProviders,
  };
}

export const MIRURO_PROVIDERS = PROVIDER_PRIORITY;
export type MiruroProvider = typeof PROVIDER_PRIORITY[number];

export function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    "miku": "Miku",
    "kiwi": "Kiwi",
    "ax-mimi": "Ax-Mimi",
    "ax-wave": "Ax-Wave",
    "ax-shiro": "Ax-Shiro",
    "ax-yuki": "Ax-Yuki",
    "ax-zen": "Ax-Zen",
    "bee": "Bee",
    "zoro": "Zoro",
    "arc": "Arc",
    "jet": "Jet",
  };
  return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}
