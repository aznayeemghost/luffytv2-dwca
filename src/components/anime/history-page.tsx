"use client";

import { useAppStore } from "./store";

export default function HistoryPage() {
  const { history, navigate } = useAppStore();

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Watch History</h1>
        <p className="text-sm text-zinc-500 mt-1">{history.length} episodes logged</p>
      </div>

      {history.length > 0 ? (
        <div className="space-y-2">
          {history.map(item => (
            <button
              key={item.id}
              onClick={() => navigate({ page: "watch", id: item.animeId, episode: item.episodeNum })}
              className="w-full flex items-center gap-3 p-3 bg-[#111827] border border-white/[0.04] hover:border-purple-500/20 rounded-xl transition-all text-left group"
            >
              <div className="w-16 h-10 rounded-lg overflow-hidden bg-[#1e293b] shrink-0">
                {item.thumbnail && <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-300 truncate group-hover:text-purple-400 transition-colors">
                  {item.animeName}
                </p>
                <p className="text-xs text-zinc-500">
                  Episode {item.episodeNum} &middot; {Math.round(item.progress)}% complete
                </p>
              </div>
              <div className="w-20 h-1.5 bg-[#1e293b] rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${item.progress}%` }} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl bg-[#111827] border border-white/[0.04] p-8">
          <p className="text-zinc-400 text-sm">No watch history yet</p>
          <p className="text-zinc-600 text-xs mt-2">Start watching to build your history</p>
          <button onClick={() => navigate({ page: "home" })} className="mt-4 px-4 py-2 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all">
            Browse
          </button>
        </div>
      )}
    </div>
  );
}
