import { useState } from "react"

type LoHTab =
  | "overview"
  | "umaStatistics"
  | "teams"
  | "history"

function LeagueOfHeroesPage() {
  const [activeTab, setActiveTab] =
    useState<LoHTab>("overview")


  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
        <section className="px-5 pt-4">
        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-rose-400">
            League of Heroes
          </div>

          <h1 className="mt-1 text-3xl font-black text-white">
            Dashboard - Work in progress (waiting for upcoming LoH mode update)
          </h1>
        </div>

        {/* TABS */}
            <div className="w-fit rounded-full border border-rose-800/50 bg-gradient-to-r from-rose-950/95 via-pink-950/55 to-rose-950/95 px-3 shadow-[0_0_18px_rgba(190,24,93,0.15)]">
            <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`relative px-5 py-3 text-sm font-bold transition ${
              activeTab === "overview"
                ? "text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Overview

            {activeTab === "overview" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("umaStatistics")
            }
            className={`relative px-5 py-3 text-sm font-bold transition ${
              activeTab === "umaStatistics"
                ? "text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Uma Statistics

            {activeTab === "umaStatistics" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("teams")}
            className={`relative px-5 py-3 text-sm font-bold transition ${
              activeTab === "teams"
                ? "text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Teams

            {activeTab === "teams" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`relative px-5 py-3 text-sm font-bold transition ${
              activeTab === "history"
                ? "text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            History

            {activeTab === "history" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-rose-500" />
            )}
          </button>
        </div>
        </div>


      </section>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
      <div className="loh-overview space-y-8">

          {/* MAIN STATS */}
          <section className="grid grid-cols-4 gap-5">

            <div className="loh-card-sweep overflow-hidden rounded-2xl border border-rose-900/40 bg-slate-950/70">
                <div className="border-b border-rose-500/30 bg-gradient-to-r from-rose-950/95 via-pink-900/70 to-rose-950/95 px-5 py-3">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-100">
                    Events
                    </div>
                </div>

                <div className="px-5 py-4">
                    <div className="text-5xl font-black text-white">
                    0
                    </div>
                </div>
                </div>

            <div className="loh-card-sweep overflow-hidden rounded-2xl border border-rose-900/40 bg-slate-950/70">
            <div className="border-b border-rose-500/30 bg-gradient-to-r from-rose-950/95 via-pink-900/70 to-rose-950/95 px-5 py-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-100">
                Total League Score
                </div>
            </div>

            <div className="px-5 py-4">
                <div className="text-5xl font-black text-white">
                -
                </div>
            </div>
            </div>

            <div className="loh-card-sweep overflow-hidden rounded-2xl border border-rose-900/40 bg-slate-950/70">
                <div className="border-b border-rose-500/30 bg-gradient-to-r from-rose-950/95 via-pink-900/70 to-rose-950/95 px-5 py-3">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-100">
                    Best Event Score
                    </div>
                </div>

                <div className="px-5 py-4">
                    <div className="text-5xl font-black text-white">
                    -
                    </div>
                </div>
                </div>

            <div className="loh-card-sweep overflow-hidden rounded-2xl border border-rose-900/40 bg-slate-950/70">
            <div className="border-b border-rose-500/30 bg-gradient-to-r from-rose-950/95 via-pink-900/70 to-rose-950/95 px-5 py-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-100">
                Best Rank
                </div>
            </div>

            <div className="px-5 py-4">
                <div className="text-5xl font-black text-white">
                -
                </div>
            </div>
            </div>

          </section>

          {/* OVERVIEW CONTENT */}
          <section className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] gap-5">

            {/* RECENT EVENTS */}
                <div className="loh-card-sweep overflow-hidden rounded-2xl border border-rose-900/40 bg-gray-950/70">

                {/* HEADER */}
                <div className="border-b border-rose-800/50 bg-gradient-to-r from-rose-950/95 via-pink-950/65 to-rose-950/95 px-5 py-3">
                    <h2 className="text-xl font-black text-white">
                    Recent Events
                    </h2>
                </div>

                <div className="p-5">
                    <p className="mb-4 text-sm text-gray-500">
                    Your latest League of Heroes results.
                    </p>
              </div>

              <div className="space-y-3">
                <div className="p-5">
                <div className="py-10 text-center">
                  <div className="font-bold text-gray-300">
                    No events yet.
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    Your 3 latest LoH events will appear here.
                  </div>
                </div>
              </div>
              </div>

            </div>

            {/* UMA RANKING */}
                <div className="loh-card-sweep overflow-hidden rounded-2xl border border-rose-900/40 bg-gray-950/70">

                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-rose-800/50 bg-gradient-to-r from-rose-950/95 via-pink-950/65 to-rose-950/95 px-5 py-3">
                    <h2 className="text-xl font-black text-white">
                    Uma Ranking
                    </h2>

                    <button
                    type="button"
                    onClick={() =>
                        setActiveTab("umaStatistics")
                    }
                    className="text-sm font-bold text-rose-200 transition hover:text-white"
                    >
                    View All →
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-5">

                    <p className="mb-4 text-sm text-gray-500">
                    Best performing Umas across League of Heroes.
                    </p>

                    {/* TABLE HEADER */}
                    <div className="grid grid-cols-[48px_minmax(0,1fr)_110px_80px_80px_80px_80px] gap-3 border-b border-gray-800 px-3 pb-3 text-xs font-black uppercase tracking-wide text-gray-500">
                    <div>#</div>
                    <div>Uma</div>
                    <div className="text-center">
                        Career Pts
                    </div>
                    <div className="text-center">
                        Events
                    </div>
                    <div className="text-center">
                        Races
                    </div>
                    <div className="text-center">
                        Wins
                    </div>
                    <div className="text-center">
                        Top 3
                    </div>
                    </div>

                    {/* EMPTY TABLE */}
                    <div className="py-14 text-center">
                    <div className="font-bold text-gray-300">
                      No Uma statistics yet.
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      Rankings will appear after you record LoH events.
                    </div>
                  </div>

                </div>

                </div>

          </section>

        </div>
      )}

      {/* UMA STATISTICS */}
      {activeTab === "umaStatistics" && (
        <div className="rounded-2xl border border-gray-700 bg-gray-950/70 px-6 py-16 text-center">
          <div className="text-xl font-black text-white">
            Uma Statistics
          </div>

          <div className="mt-2 text-sm text-gray-500">
            Full LoH Uma statistics will be added here.
          </div>
        </div>
      )}

      {/* TEAMS */}
      {activeTab === "teams" && (
        <div className="rounded-2xl border border-gray-700 bg-gray-950/70 px-6 py-16 text-center">
          <div className="text-xl font-black text-white">
            Teams
          </div>

          <div className="mt-2 text-sm text-gray-500">
            Your League of Heroes teams will be shown here.
          </div>
        </div>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-gray-700 bg-gray-950/70 px-6 py-16 text-center">
          <div className="text-xl font-black text-white">
            LoH History
          </div>

          <div className="mt-2 text-sm text-gray-500">
            All recorded League of Heroes events will appear here.
          </div>
        </div>
      )}

    </div>
  )
}

export default LeagueOfHeroesPage