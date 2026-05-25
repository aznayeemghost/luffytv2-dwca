"use client";

import { useAppStore } from "./store";

export default function BookmarksPage() {
  const { bookmarks, navigate } = useAppStore();

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">My List</h1>
        <p className="text-sm text-zinc-500 mt-1">{bookmarks.length} items saved</p>
      </div>

      {bookmarks.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {bookmarks.map(bm => (
            <button
              key={bm.id}
              onClick={() => navigate({ page: "anime", id: bm.animeId })}
              className="content-card group text-left"
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-[#1e293b] rounded-xl">
                {bm.thumbnail && (
                  <img src={bm.thumbnail} alt={bm.animeName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <div className="w-10 h-10 rounded-full bg-purple-500/90 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </div>
                </div>
              </div>
              <h3 className="mt-2 text-xs text-zinc-300 line-clamp-2 group-hover:text-purple-400 transition-colors">{bm.animeName}</h3>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl bg-[#111827] border border-white/[0.04] p-8">
          <p className="text-zinc-400 text-sm">Your list is empty</p>
          <p className="text-zinc-600 text-xs mt-2">Start adding anime to your watchlist</p>
          <button onClick={() => navigate({ page: "home" })} className="mt-4 px-4 py-2 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all">
            Browse
          </button>
        </div>
      )}
    </div>
  );
}
