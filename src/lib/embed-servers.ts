// Embed Server Providers for Luffy TV
//
// Servers are categorized by content type and ID type:
// - Anime servers (1-6) → use AniList ID (iframe embeds)
// - Miruro/Megaplay servers (11-14) → use AniList ID + MAL ID (iframe embeds via megaplay.buzz)
// - Hindi servers → dedicated Hindi Dub servers (AniList ID) — ONLY anixtv
// - Movie/TV servers → use TMDB ID (iframe embeds)
//
// Megaplay.buzz replaces the old broken Miruro HLS player.
// All megaplay servers are direct iframe embeds that WORK.

export interface EmbedServer {
  id: string;
  name: string;           // Display name: "Server 1", "Server 2", etc.
  priority: number;
  supportsSub: boolean;
  supportsDub: boolean;
  supportsHindi: boolean;
  idType: "tmdb" | "anilist";  // What ID this server uses
  color: string;
  category: "anime" | "tmdb" | "hindi";
  noSandbox?: boolean;    // If true, this server needs iframe without sandbox
  generateUrl: (params: EmbedUrlParams) => string;
}

export interface EmbedUrlParams {
  anilistId?: number;
  malId?: number;
  tmdbId?: number;
  imdbId?: string;
  episode: number;
  season?: number;
  translation: "sub" | "dub" | "hindi";
  title?: string;
}

// =====================================================
// EMBED SERVER DEFINITIONS
// =====================================================

// ============================================================
// AniList-based servers — use AniList ID for anime embeds
// These are iframe embed servers that use the AniList ID directly
// ============================================================

const vidnestAnime: EmbedServer = {
  id: "vidnest-anime",
  name: "Server 1",
  priority: 0,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#8B5CF6",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "dub" ? "dub" : "sub";
    return `https://vidnest.fun/anime/${p.anilistId}/${p.episode}/${lang}`;
  },
};

const vidnestAnimepahe: EmbedServer = {
  id: "vidnest-animepahe",
  name: "Server 2",
  priority: 1,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#A855F7",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "dub" ? "dub" : "sub";
    return `https://vidnest.fun/animepahe/${p.anilistId}/${p.episode}/${lang}`;
  },
};

const videasyAnime: EmbedServer = {
  id: "videasy-anime",
  name: "Server 3",
  priority: 2,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#8B5CF6",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://player.videasy.net/anime/${p.anilistId}/${p.episode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=8B5CF6`;
  },
};

const vidplusAnime: EmbedServer = {
  id: "vidplus-anime",
  name: "Server 4",
  priority: 3,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#EC4899",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const isDub = p.translation === "dub";
    return `https://player.vidplus.to/embed/anime/${p.anilistId}/${p.episode}?autoplay=true&autonext=true&nextbutton=true&dub=${isDub}&primarycolor=8B5CF6`;
  },
};

const tryembedAnime: EmbedServer = {
  id: "tryembed-anime",
  name: "Server 5",
  priority: 4,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#10B981",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "dub" ? "dub" : "sub";
    return `https://tryembed.us.cc/embed/anime/${p.anilistId}/${p.episode}/${lang}?autoplay=true&autoSkip=true`;
  },
};

const megaplayAniSub: EmbedServer = {
  id: "megaplay-ani-sub",
  name: "Server 6",
  priority: 5,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "anilist",
  color: "#F59E0B",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/sub`;
  },
};

const megaplayAniDub: EmbedServer = {
  id: "megaplay-ani-dub",
  name: "Server 7",
  priority: 6,
  supportsSub: false,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#FB923C",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/dub`;
  },
};

// ============================================================
// Megaplay/Miruro MAL-based servers — use MAL ID
// These are the "Server 11-14" the user requested
// megaplay.buzz /stream/mal/ endpoint
// ============================================================

const megaplayMalSub: EmbedServer = {
  id: "megaplay-mal-sub",
  name: "Server 11",
  priority: 10,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "anilist",
  color: "#06B6D4",
  category: "anime",
  generateUrl: (p) => {
    // Use MAL ID if available, otherwise fall back to AniList endpoint
    if (p.malId) {
      return `https://megaplay.buzz/stream/mal/${p.malId}/${p.episode}/sub`;
    }
    if (p.anilistId) {
      return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/sub`;
    }
    return "";
  },
};

const megaplayMalDub: EmbedServer = {
  id: "megaplay-mal-dub",
  name: "Server 12",
  priority: 11,
  supportsSub: false,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#3B82F6",
  category: "anime",
  generateUrl: (p) => {
    if (p.malId) {
      return `https://megaplay.buzz/stream/mal/${p.malId}/${p.episode}/dub`;
    }
    if (p.anilistId) {
      return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/dub`;
    }
    return "";
  },
};

const megaplayAniSub2: EmbedServer = {
  id: "megaplay-ani-sub2",
  name: "Server 13",
  priority: 12,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "anilist",
  color: "#A78BFA",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/sub`;
  },
};

const megaplayAniDub2: EmbedServer = {
  id: "megaplay-ani-dub2",
  name: "Server 14",
  priority: 13,
  supportsSub: false,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#8B5CF6",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/dub`;
  },
};

// ============================================================
// Hindi-specific servers — ONLY anixtv as requested by user
// "in hindi sector only one server that is hindi server 1 anixtv ok"
// ============================================================

const anixtvHindi: EmbedServer = {
  id: "anixtv-hindi",
  name: "Hindi Server 1",
  priority: 0,  // Top priority for Hindi
  supportsSub: false,
  supportsDub: false,
  supportsHindi: true,
  idType: "anilist",
  color: "#FF6B35",
  category: "hindi",
  noSandbox: true,  // anixtv doesn't work with sandbox
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const title = p.title ? encodeURIComponent(p.title) : "Anime";
    return `https://anixtv.in/anime-watch?action=hindi_1_player&id=${p.anilistId}&season=1&episode=${p.episode}&title=${title}`;
  },
};

// ============================================================
// TMDB-based servers — use TMDB ID for Movies and TV Shows
// Based on documentation from each provider
// ============================================================

const vidcore: EmbedServer = {
  id: "vidcore",
  name: "Server 1",
  priority: 0,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#EF4444",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidcore.net/tv/${p.tmdbId}/${p.season}/${p.episode}?autoPlay=true`;
    }
    return `https://vidcore.net/movie/${p.tmdbId}?autoPlay=true`;
  },
};

const vidplays: EmbedServer = {
  id: "vidplays",
  name: "Server 2",
  priority: 1,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#14B8A6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidplays.fun/embed/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidplays.fun/embed/movie/${p.tmdbId}`;
  },
};

const vidfast: EmbedServer = {
  id: "vidfast",
  name: "Server 3",
  priority: 2,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#3B82F6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidfast.pro/tv/${p.tmdbId}/${p.season}/${p.episode}?autoPlay=true&nextButton=true&autoNext=true`;
    }
    return `https://vidfast.pro/movie/${p.tmdbId}?autoPlay=true`;
  },
};

const vidnestTv: EmbedServer = {
  id: "vidnest-tv",
  name: "Server 4",
  priority: 3,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#7C3AED",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    const season = p.season || 1;
    return `https://vidnest.fun/tv/${p.tmdbId}/${season}/${p.episode}`;
  },
};

const videasyTv: EmbedServer = {
  id: "videasy-tv",
  name: "Server 5",
  priority: 4,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#8B5CF6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://player.videasy.net/tv/${p.tmdbId}/${p.season}/${p.episode}?color=8B5CF6&nextEpisode=true&autoplayNextEpisode=true`;
    }
    return `https://player.videasy.net/movie/${p.tmdbId}?color=8B5CF6`;
  },
};

const vidplus: EmbedServer = {
  id: "vidplus",
  name: "Server 6",
  priority: 5,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#EC4899",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://player.vidplus.to/embed/tv/${p.tmdbId}/${p.season}/${p.episode}?autoplay=true&autonext=true&nextbutton=true&primarycolor=8B5CF6`;
    }
    return `https://player.vidplus.to/embed/movie/${p.tmdbId}?autoplay=true&primarycolor=8B5CF6`;
  },
};

const peachify: EmbedServer = {
  id: "peachify",
  name: "Server 7",
  priority: 6,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: true,
  idType: "tmdb",
  color: "#F472B6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    const params = new URLSearchParams({
      autoPlay: "true",
      autoNext: "30",
      showNextBtn: "true",
      accent: "8B5CF6",
    });
    if (p.translation === "hindi") {
      params.set("dub", "Hindi");
      params.set("sub", "English");
    } else if (p.translation === "dub") {
      params.set("dub", "English");
    }
    if (p.season && p.season > 0) {
      return `https://peachify.top/embed/tv/${p.tmdbId}/${p.season}/${p.episode}?${params}`;
    }
    return `https://peachify.top/embed/movie/${p.tmdbId}?${params}`;
  },
};

const embedmaster: EmbedServer = {
  id: "embedmaster",
  name: "Server 8",
  priority: 7,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#6366F1",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://embedmaster.link/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://embedmaster.link/movie/${p.tmdbId}`;
  },
};

const vidlink: EmbedServer = {
  id: "vidlink",
  name: "Server 9",
  priority: 8,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#8B5CF6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidlink.pro/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidlink.pro/movie/${p.tmdbId}`;
  },
};

const vidsrcme: EmbedServer = {
  id: "vidsrcme",
  name: "Server 10",
  priority: 9,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#22C55E",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    const season = p.season || 1;
    return `https://vidsrcme.ru/embed/tv?tmdb=${p.tmdbId}&season=${season}&episode=${p.episode}`;
  },
};

// ============================================================
// ALL SERVERS — raw definitions
// ============================================================

const ALL_SERVERS: EmbedServer[] = [
  // AniList-based anime servers (iframe embeds) — Servers 1-7
  vidnestAnime, vidnestAnimepahe, videasyAnime, vidplusAnime,
  tryembedAnime, megaplayAniSub, megaplayAniDub,
  // Megaplay/Miruro servers — Servers 11-14 (user requested these names)
  megaplayMalSub, megaplayMalDub, megaplayAniSub2, megaplayAniDub2,
  // Hindi servers (only anixtv)
  anixtvHindi,
  // TMDB-based Movie/TV servers
  vidcore, vidplays, vidfast, vidnestTv, videasyTv,
  vidplus, peachify, embedmaster, vidlink, vidsrcme,
];

/**
 * Get servers available for Anime content (SUB/DUB)
 * Includes: anilist-based servers only (iframe embeds + megaplay)
 * Excludes: Hindi-specific servers and TMDB-based servers
 * Megaplay servers 11-14 are included for SUB/DUB
 */
export function getAnimeServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s =>
    s.idType === "anilist" && s.category !== "hindi"
  );
  // Keep the pre-assigned names (Server 1-7 and Server 11-14)
  return servers;
}

/**
 * Get servers available for Hindi Dub
 * Only anixtv — user requested "in hindi sector only one server that is hindi server 1 anixtv"
 */
export function getHindiServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s => s.category === "hindi");
  return servers.map((s, i) => ({
    ...s,
    name: i === 0 ? "Hindi Server 1 AnixTV" : `Hindi Server ${i + 1}`,
    priority: i,
  }));
}

/**
 * Get servers available for Movie/TV content
 * Includes: TMDB-based servers only
 */
export function getTmdbServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s => s.idType === "tmdb");
  return servers.map((s, i) => ({
    ...s,
    name: `Server ${i + 1}`,
    priority: i,
  }));
}

/**
 * Get all servers (legacy)
 */
export const EMBED_SERVERS = ALL_SERVERS;

/**
 * Generate embed URL for a specific server and episode
 */
export function getEmbedUrl(serverId: string, params: EmbedUrlParams): string {
  const server = ALL_SERVERS.find(s => s.id === serverId);
  if (!server) return "";
  return server.generateUrl(params);
}

/**
 * Check if any Hindi Dub server is available for the given AniList ID
 */
export function hasHindiSupport(anilistId?: number): boolean {
  if (!anilistId) return false;
  const hindiServers = getHindiServers();
  return hindiServers.length > 0;
}
