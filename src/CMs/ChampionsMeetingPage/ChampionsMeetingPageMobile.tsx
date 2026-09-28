import ChampionsMeetingPageDesktop from "./ChampionsMeetingPageDesktop"

import {
  getChampionsMeetingOverviewStats,
} from "./useChampionsMeetingPage"

import type {
  ChampionsMeetingPageViewProps,
} from "./ChampionsMeetingPageDesktop"

import AddCMButton from "../AddCMButton"

import type {
  CMSortMode,
} from "./useChampionsMeetingPage"

import CMCard from "../CMCard"

function ChampionsMeetingPageMobile(
  props: ChampionsMeetingPageViewProps
) {
  const {
    totalRaceWins,
    finalWins,
    overallWinRate,
  } = getChampionsMeetingOverviewStats(
    props.cms
  )

  const {
  isFiltersOpen,
  setIsFiltersOpen,
  activeFilterCount,
  cmSortMode,
  setCmSortMode,
  currentCmPage,
  setCurrentCmPage,
  totalCmPages,
  cmViewMode,
  setCmViewMode,
  filteredCms,
  paginatedCms,
} = props.pageState


  return (
    <div className="space-y-5">
      {/* HEADER */}
      <section className="relative py-2">
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-400">
            Competitive Event
          </div>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            Champions Meeting
          </h1>

          <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
        </div>
      </section>

      {/* STATISTICS */}
      <section
        data-guide="cm-overview-stats"
        className="grid grid-cols-2 gap-2"
      >
        <div className="rounded-xl border border-blue-900/60 bg-gray-950/75 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-400">
            CM Events
          </div>

          <div className="mt-1 text-2xl font-black text-white">
            {props.cms.length}
          </div>
        </div>

        <div className="rounded-xl border border-indigo-900/60 bg-gray-950/75 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-400">
            Race Wins
          </div>

          <div className="mt-1 text-2xl font-black text-white">
            {totalRaceWins.toLocaleString()}
          </div>
        </div>

        <div className="rounded-xl border border-violet-900/60 bg-gray-950/75 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-400">
            Final Wins
          </div>

          <div className="mt-1 text-2xl font-black text-white">
            {finalWins}
          </div>
        </div>

        <div className="rounded-xl border border-sky-900/60 bg-gray-950/75 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-400">
            Win Rate
          </div>

          <div className="mt-1 text-2xl font-black text-white">
            {overallWinRate.toFixed(2)}%
          </div>
        </div>
      </section>

      {/* CONTROLS */}
<section className="space-y-2">
  <div className="grid grid-cols-2 gap-2">
    <div
        data-guide="cm-add"
        className="[&>button]:w-full"
        >
        <AddCMButton
            cms={props.cms}
            setCms={props.setCms}
            onCreated={() =>
            setCurrentCmPage(1)
            }
        />
        </div>

    <button
      type="button"
      onClick={() =>
        setIsFiltersOpen(
          (current) => !current
        )
      }
      aria-expanded={isFiltersOpen}
      className={`h-10 rounded-lg border px-3 text-sm font-semibold transition ${
        isFiltersOpen
          ? "border-sky-400 bg-blue-600 text-white"
          : "border-blue-800/70 bg-gray-900 text-gray-300"
      }`}
    >
      ☰ Filters

      {activeFilterCount > 0 && (
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-black text-blue-950">
          {activeFilterCount}
        </span>
      )}
    </button>
  </div>

  <select
    value={cmSortMode}
    onChange={(event) =>
      setCmSortMode(
        event.target.value as CMSortMode
      )
    }
    className="h-10 w-full rounded-lg border border-blue-800/70 bg-gray-900 px-3 text-sm font-semibold text-gray-300 outline-none"
  >
    <option value="number-desc">
      CM Number ↓
    </option>

    <option value="number-asc">
      CM Number ↑
    </option>

    <option value="added-desc">
      Recently Added
    </option>

    <option value="added-asc">
      Oldest Added
    </option>
  </select>

  <div className="flex rounded-xl border border-blue-950 bg-gray-900/90 p-1">
    <button
      type="button"
      onClick={() =>
        setCmViewMode("detailed")
      }
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
        cmViewMode === "detailed"
          ? "bg-blue-600 text-white"
          : "text-gray-400"
      }`}
    >
      Detailed
    </button>

    <button
      type="button"
      onClick={() =>
        setCmViewMode("compact")
      }
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
        cmViewMode === "compact"
          ? "bg-blue-600 text-white"
          : "text-gray-400"
      }`}
    >
      Compact
    </button>
  </div>

  <div className="flex items-center justify-center gap-2">
    <button
      type="button"
      onClick={() =>
        setCurrentCmPage((current) =>
          Math.max(1, current - 1)
        )
      }
      disabled={currentCmPage === 1}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-950 bg-gray-900 text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
    >
      ←
    </button>

    <div className="min-w-16 text-center text-sm font-bold text-gray-300">
      {currentCmPage} / {totalCmPages}
    </div>

    <button
      type="button"
      onClick={() =>
        setCurrentCmPage((current) =>
          Math.min(
            totalCmPages,
            current + 1
          )
        )
      }
      disabled={
        currentCmPage === totalCmPages
      }
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-950 bg-gray-900 text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
    >
      →
    </button>
  </div>
</section>

      <ChampionsMeetingPageDesktop
        {...props}
        hideOverview
        hideControls
        hideList
        hideBackToTop
        />

        {/* CM LIST */}
        {filteredCms.length === 0 &&
        activeFilterCount > 0 ? (
        <div className="rounded-2xl border border-blue-950/70 bg-gray-950/75 px-4 py-10 text-center shadow-xl">
            <div className="text-sm font-semibold text-gray-300">
            No Champions Meetings match
            the selected filters.
            </div>
        </div>
        ) : (
        <div className="cm-overview">
            {paginatedCms.map((cm) => (
            <CMCard
              key={cm.number}
              cm={cm}
              setCms={props.setCms}
              mobile
              compact={
                cmViewMode === "compact"
              }
            />
            ))}
        </div>
        )}
    </div>
  )
}

export default ChampionsMeetingPageMobile