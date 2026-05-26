"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";

// ============================================================
// NOVEL PAGE — Browse, search, and discover novels
// Inspired by LNReader, Tsundoku, IReader
// ============================================================

interface NovelResult {
  id: string;
  title: string;
  cover: string;
  author: string;
  genres: string[];
  rating: number;
  chapters: number;
  status: string;
  source: string;
  sourceId: string;
  description: string;
}

interface NovelSource {
  id: string;
  name: string;
  lang: string;
  icon: string;
  url: string;
  type: string;
}

// Featured/popular novels for the home screen
const featuredNovels: NovelResult[] = [
  { id: "omniscient-readers-viewpoint", title: "Omniscient Reader's Viewpoint", cover: "", author: "Sing-Shong", genres: ["Action", "Adventure", "Fantasy", "Sci-Fi"], rating: 4.8, chapters: 551, status: "Completed", source: "ReadLightNovel", sourceId: "readlightnovel", description: "Only I know the end of this world. Kim Dokja spent years reading a web novel — when it becomes reality, he's the only one who knows how it ends." },
  { id: "lord-of-the-mysteries", title: "Lord of the Mysteries", cover: "", author: "Cuttlefish That Loves Diving", genres: ["Action", "Fantasy", "Mystery", "Supernatural"], rating: 4.8, chapters: 1394, status: "Completed", source: "NovelFull", sourceId: "novelfull", description: "In the wake of the steam revolution, Klein Moretti discovers a world of Beyonders, Sealed Artifacts, and ancient deities." },
  { id: "solo-leveling", title: "Solo Leveling", cover: "", author: "Chugong", genres: ["Action", "Adventure", "Fantasy"], rating: 4.7, chapters: 270, status: "Completed", source: "ReadLightNovel", sourceId: "readlightnovel", description: "The weakest hunter gains the power to level up infinitely in a world of deadly monsters and gates." },
  { id: "shadow-slave", title: "Shadow Slave", cover: "", author: "Guiltythree", genres: ["Action", "Adventure", "Fantasy", "Supernatural"], rating: 4.5, chapters: 1800, status: "Ongoing", source: "NovelFull", sourceId: "novelfull", description: "Chosen by the Nightmare Spell, Sunny must navigate a treacherous world of dreams with his mysterious Shadow power." },
  { id: "the-beginning-after-the-end", title: "The Beginning After The End", cover: "", author: "TurtleMe", genres: ["Action", "Fantasy", "Isekai"], rating: 4.6, chapters: 450, status: "Ongoing", source: "NovelFull", sourceId: "novelfull", description: "King Grey is reincarnated into a world of magic and monsters, getting a second chance at life." },
  { id: "mushoku-tensei", title: "Mushoku Tensei", cover: "", author: "Rifujin na Magonote", genres: ["Adventure", "Drama", "Fantasy", "Isekai"], rating: 4.5, chapters: 286, status: "Completed", source: "ReadLightNovel", sourceId: "readlightnovel", description: "A jobless man is reincarnated in a fantasy world, determined to live a fulfilling life." },
  { id: "overlord", title: "Overlord", cover: "", author: "Kugane Maruyama", genres: ["Action", "Adventure", "Fantasy", "Isekai"], rating: 4.4, chapters: 170, status: "Ongoing", source: "NovelFull", sourceId: "novelfull", description: "The supreme overlord of the Great Tomb of Nazarick finds himself in a new world." },
  { id: "release-that-witch", title: "Release That Witch", cover: "", author: "Er Mu", genres: ["Adventure", "Drama", "Fantasy", "Harem"], rating: 4.4, chapters: 1498, status: "Completed", source: "NovelFull", sourceId: "novelfull", description: "A modern engineer transmigrates into a prince's body and starts a revolution." },
  { id: "the-legendary-mechanic", title: "The Legendary Mechanic", cover: "", author: "Qi Peijia", genres: ["Action", "Adventure", "Sci-Fi", "Mecha"], rating: 4.3, chapters: 1463, status: "Ongoing", source: "NovelFull", sourceId: "novelfull", description: "An NPC in a game gains self-awareness and begins breaking the system." },
  { id: "second-life-ranker", title: "Second Life Ranker", cover: "", author: "Nong Nong", genres: ["Action", "Adventure", "Fantasy"], rating: 4.3, chapters: 400, status: "Ongoing", source: "NovelFull", sourceId: "novelfull", description: "Yeon-woo enters the Tower to avenge his twin brother's death." },
  { id: "villain-to-kill", title: "Villain to Kill", cover: "", author: "Sing-Shong", genres: ["Action", "Fantasy", "Supernatural"], rating: 4.2, chapters: 200, status: "Ongoing", source: "NovelFull", sourceId: "novelfull", description: "A villain with the power of a psychic must hide his true nature." },
  { id: "a-returners-magic-should-be-special", title: "A Returner's Magic Should Be Special", cover: "", author: "Yook So-Nan", genres: ["Action", "Fantasy", "School Life"], rating: 4.2, chapters: 300, status: "Ongoing", source: "NovelFull", sourceId: "novelfull", description: "Sent back 13 years, Desir gets a second chance to save humanity." },
];

const genreCategories = [
  "All", "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Harem", "Isekai", "Martial Arts", "Mystery", "Romance",
  "Sci-Fi", "Slice of Life", "Supernatural",
];

const genreColors: Record<string, string> = {
  Action: "#ef4444", Adventure: "#22c55e", Comedy: "#f59e0b", Drama: "#3b82f6",
  Fantasy: "#a855f7", Harem: "#ec4899", Isekai: "#6366f1", "Martial Arts": "#f97316",
  Mystery: "#06b6d4", Romance: "#f472b6", "Sci-Fi": "#10b981", "Slice of Life": "#84cc16",
  Supernatural: "#8b5cf6",
};

// ── Novel Card ──
function NovelCard({ novel, onClick }: { novel: NovelResult; onClick: (n: NovelResult) => void }) {
  return (
    <button
      onClick={() => onClick(novel)}
      className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] text-left w-full"
    >
      <div className="p-4">
        <div className="flex gap-3">
          {/* Cover */}
          <div className="w-14 h-20 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
            {novel.cover ? (
              <img src={novel.cover} alt={novel.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <svg className="w-7 h-7 text-white/15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white/90 line-clamp-2 leading-snug group-hover:text-white transition-colors">
              {novel.title}
            </h3>
            {novel.author && (
              <p className="text-[10px] text-white/30 mt-1 truncate">{novel.author}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {novel.genres.slice(0, 2).map(g => (
                <span
                  key={g}
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: `${genreColors[g] || "#6b7280"}15`,
                    color: genreColors[g] || "#6b7280",
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            {novel.rating > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                {novel.rating}
              </span>
            )}
            <span className="text-[10px] text-white/20">{novel.chapters} ch</span>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${novel.status === "Completed" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>
            {novel.status}
          </span>
        </div>
      </div>
    </button>
  );
}

// ============================================================
// NOVEL PAGE — Main component
// ============================================================
export default function NovelPage() {
  const navigate = useAppStore(s => s.navigate);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [searchResults, setSearchResults] = useState<NovelResult[]>([]);
  const [sources, setSources] = useState<NovelSource[]>([]);
  const [selectedSource, setSelectedSource] = useState("all");
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  // Fetch sources on mount
  useEffect(() => {
    fetch("/api/novel/sources")
      .then(r => r.json())
      .then(data => setSources(data.sources || []))
      .catch(() => {});
  }, []);

  // Search novels
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchMode(false);
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setSearchMode(true);
    try {
      const res = await fetch(`/api/novel/search?q=${encodeURIComponent(searchQuery)}&source=${selectedSource}`);
      const data = await res.json();
      setSearchResults(data.novels || []);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking a novel
  const handleNovelClick = (novel: NovelResult) => {
    navigate({
      page: "novel-detail",
      novelId: novel.id,
      novelTitle: novel.title,
      novelCover: novel.cover || "",
      novelAuthor: novel.author || "",
      novelSource: novel.sourceId || "readlightnovel",
    } as any);
  };

  // Filter featured by genre
  const filteredFeatured = activeGenre === "All"
    ? featuredNovels
    : featuredNovels.filter(n => n.genres.includes(activeGenre));

  // Display novels
  const displayNovels = searchMode ? searchResults : filteredFeatured;

  return (
    <div className="min-h-screen pb-8">
      {/* ── Hero ── */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
        <div className="relative pt-6 pb-6 text-center">
          {/* Book icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#a855f7]/10 border border-[#a855f7]/20 mb-4">
            <svg className="w-6 h-6 text-[#a855f7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>

          <h1
            className="text-2xl sm:text-3xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Novels
          </h1>
          <p className="text-sm text-white/30 max-w-md mx-auto">
            Light novels, web novels, and more. Read or listen with AI-powered Text-to-Speech.
          </p>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="mb-6">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search novels by title, author, or genre..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#a855f7]/40 focus:bg-white/[0.06] transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-[#a855f7] text-white text-[12px] font-bold uppercase tracking-wider hover:bg-[#9333ea] transition-all"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* ── Source filter ── */}
      {sources.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <button
            onClick={() => setSelectedSource("all")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedSource === "all"
                ? "bg-[#a855f7] text-white"
                : "bg-white/[0.03] text-white/35 hover:text-white/55 border border-white/[0.04]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            All Sources
          </button>
          {sources.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSource(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedSource === s.id
                  ? "bg-[#a855f7] text-white"
                  : "bg-white/[0.03] text-white/35 hover:text-white/55 border border-white/[0.04]"
              }`}
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              <span>{s.icon}</span>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Genre filter ── */}
      {!searchMode && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide -mx-1 px-1">
          {genreCategories.map(genre => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                activeGenre === genre
                  ? "text-white"
                  : "bg-white/[0.03] text-white/35 hover:text-white/55 border border-white/[0.04]"
              }`}
              style={{
                fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                ...(activeGenre === genre
                  ? {
                      background: genre === "All"
                        ? "linear-gradient(135deg, #a855f730, #a855f715)"
                        : `linear-gradient(135deg, ${genreColors[genre] || "#a855f7"}30, ${genreColors[genre] || "#a855f7"}15)`,
                      border: `1px solid ${genre === "All" ? "#a855f7" : genreColors[genre] || "#a855f7"}40`,
                    }
                  : {}),
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* ── Search mode header ── */}
      {searchMode && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSearchMode(false); setSearchQuery(""); setSearchResults([]); }}
              className="text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-white/50">
              {loading ? "Searching..." : `${displayNovels.length} result${displayNovels.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#a855f7]/30 border-t-[#a855f7] animate-spin" />
          <p className="text-sm text-white/30">Searching novels...</p>
        </div>
      )}

      {/* ── Novels grid ── */}
      {!loading && displayNovels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayNovels.map(novel => (
            <NovelCard key={novel.id} novel={novel} onClick={handleNovelClick} />
          ))}
        </div>
      )}

      {/* ── No results ── */}
      {!loading && searchMode && displayNovels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-4xl">📚</div>
          <p className="text-sm text-white/40">No novels found</p>
          <p className="text-[10px] text-white/20">Try a different search term</p>
        </div>
      )}

      {/* ── App comparison info ── */}
      {!searchMode && (
        <div className="mt-12 pt-6 border-t border-white/[0.04]">
          <h3
            className="text-xs font-bold text-white/25 uppercase tracking-wider mb-4 text-center"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Supported by these reader communities
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl mx-auto">
            {[
              { name: "LNReader", desc: "200+ sources", icon: "📖" },
              { name: "IReader", desc: "Modern + Desktop", icon: "📱" },
              { name: "Tsundoku", desc: "Mihon for novels", icon: "📚" },
              { name: "Shosetsu", desc: "Lightweight", icon: "✨" },
              { name: "QuickNovel", desc: "Beginner friendly", icon: "🚀" },
            ].map(app => (
              <div key={app.name} className="text-center p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                <div className="text-xl mb-1">{app.icon}</div>
                <p className="text-[11px] font-bold text-white/50">{app.name}</p>
                <p className="text-[9px] text-white/20">{app.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-8 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => navigate({ page: "watchnow" })}
            className="text-[10px] text-[#a855f7]/50 hover:text-[#a855f7] transition-colors"
          >
            ← Back to Watch Now
          </button>
        </div>
      </div>
    </div>
  );
}
