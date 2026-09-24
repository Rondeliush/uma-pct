import { useEffect, useState } from "react"
import type {
  Dispatch,
  SetStateAction,
} from "react"

import type { CM } from "../types/types"

import CMCard from "./CMCard"
import AddCMButton from "./AddCMButton"
import CMFilters from "./CMFilters"

import type {
  CMFinalFilter,
  CMPlaceFilter,
} from "./CMFilters"

import { calculateFinalQualificationFromAttempts } from "./CMCalculations"

import {
  loadCmViewModeFromStore,
  saveCmViewModeToStore,
} from "../storage/appStore"

import {
  loadProfileData,
  updateProfileData,
} from "../profiles/profileDataStore"

const CMS_PER_PAGE = 10

type CMSortMode =
  | "number-desc"
  | "number-asc"
  | "added-desc"
  | "added-asc"

type ChampionsMeetingPageProps = {
  cms: CM[]
  setCms: Dispatch<SetStateAction<CM[]>>
  profileId?: string | null
}

function ChampionsMeetingPage({
  cms,
  setCms,
  profileId = null,
}: ChampionsMeetingPageProps) {
  const [hoveredCmNumber, setHoveredCmNumber] =
    useState<number | null>(null)

  const [showScrollTop, setShowScrollTop] =
    useState(false)

  const [isFiltersOpen, setIsFiltersOpen] =
    useState(false)

  const [selectedLengths, setSelectedLengths] =
    useState<CM["length"][]>([])

  const [selectedSurfaces, setSelectedSurfaces] =
    useState<CM["surface"][]>([])

  const [
    selectedRacecourses,
    setSelectedRacecourses,
  ] = useState<string[]>([])

  const [selectedUmaIds, setSelectedUmaIds] =
    useState<string[]>([])

  const [selectedFinals, setSelectedFinals] =
    useState<CMFinalFilter[]>([])

  const [selectedPlaces, setSelectedPlaces] =
    useState<CMPlaceFilter[]>([])

  const [currentCmPage, setCurrentCmPage] =
    useState(1)

  const [cmSortMode, setCmSortMode] =
    useState<CMSortMode>("number-desc")

const [cmViewMode, setCmViewMode] =
  useState<"detailed" | "compact">("detailed")

const [
  isCmViewModeReady,
  setIsCmViewModeReady,
] = useState(false)

const [
  loadedCmViewProfileId,
  setLoadedCmViewProfileId,
] = useState<
  string | null | undefined
>(undefined)

useEffect(() => {
  let cancelled = false

  const loadCmViewMode = async () => {
    setIsCmViewModeReady(false)
    setLoadedCmViewProfileId(undefined)

    if (profileId) {
      const profileData =
        await loadProfileData(profileId)

      if (
        cancelled ||
        !profileData
      ) {
        return
      }

      setCmViewMode(
        profileData.cmViewMode
      )

      setLoadedCmViewProfileId(
        profileId
      )

      setIsCmViewModeReady(true)

      return
    }

    const savedViewMode =
      await loadCmViewModeFromStore()

    if (cancelled) {
      return
    }

    const nextViewMode =
      savedViewMode ?? "detailed"

    setCmViewMode(nextViewMode)

    if (savedViewMode === null) {
      await saveCmViewModeToStore(
        nextViewMode
      )
    }

    if (!cancelled) {
      setLoadedCmViewProfileId(null)
      setIsCmViewModeReady(true)
    }
  }

  void loadCmViewMode()

  return () => {
    cancelled = true
  }
}, [profileId])

useEffect(() => {
  if (
    !isCmViewModeReady ||
    loadedCmViewProfileId !== profileId
  ) {
    return
  }

  if (profileId) {
    void updateProfileData(
      profileId,
      (currentData) => ({
        ...currentData,
        cmViewMode,
      })
    )

    return
  }

  void saveCmViewModeToStore(
    cmViewMode
  )
}, [
  cmViewMode,
  isCmViewModeReady,
  profileId,
  loadedCmViewProfileId,
])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener(
      "scroll",
      handleScroll
    )

    handleScroll()

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      )
    }
  }, [])

  useEffect(() => {
    setCurrentCmPage(1)
  }, [
    selectedLengths,
    selectedSurfaces,
    selectedRacecourses,
    selectedUmaIds,
    selectedFinals,
    selectedPlaces,
    cmSortMode,
  ])

  const racecourseOptions = Array.from(
    new Set(
      cms
        .map((cm) => cm.track)
        .filter(
          (track) => track.trim() !== ""
        )
    )
  ).sort()

  const umaIdsInCms = Array.from(
    new Set(
      cms.flatMap((cm) =>
        (cm.participants ?? []).map(
          (participant) =>
            participant.umaId
        )
      )
    )
  )

  /*
   * ------------------------------------------------
   * CM OVERVIEW STATISTICS
   * ------------------------------------------------
   */

  const totalRaces = cms.reduce(
    (total, cm) =>
      total +
      (cm.attempts ?? []).reduce(
        (attemptTotal, attempt) =>
          attemptTotal +
          attempt.racesPlayed,
        0
      ),
    0
  )

  const totalRaceWins = cms.reduce(
    (total, cm) =>
      total +
      (cm.attempts ?? []).reduce(
        (attemptTotal, attempt) =>
          attemptTotal +
          (attempt.umaWins ?? []).reduce(
            (winsTotal, uma) =>
              winsTotal + uma.wins,
            0
          ),
        0
      ),
    0
  )

  const finalWins = cms.filter((cm) => {
    const place = String(
      cm.finalPlace ?? ""
    )
      .trim()
      .toLowerCase()

    return (
      place === "1st" ||
      place === "1st place" ||
      place === "1"
    )
  }).length

  const overallWinRate =
    totalRaces > 0
      ? (totalRaceWins / totalRaces) * 100
      : 0

  /*
   * ------------------------------------------------
   * FILTERS
   * ------------------------------------------------
   */

  const filteredCms = cms.filter((cm) => {
    const matchesLength =
      selectedLengths.length === 0 ||
      selectedLengths.includes(cm.length)

    const matchesSurface =
      selectedSurfaces.length === 0 ||
      selectedSurfaces.includes(cm.surface)

    const matchesRacecourse =
      selectedRacecourses.length === 0 ||
      selectedRacecourses.includes(
        cm.track
      )

    const matchesUma =
      selectedUmaIds.length === 0 ||
      (cm.participants ?? []).some(
        (participant) =>
          selectedUmaIds.includes(
            participant.umaId
          )
      )

    const finalQualification =
      calculateFinalQualificationFromAttempts(
        cm.attempts ?? []
      )

    const matchesFinal =
      selectedFinals.length === 0 ||
      selectedFinals.some((final) => {
        if (final === "Eliminated") {
          return cm.phase === "eliminated"
        }

        return (
          finalQualification === final
        )
      })

    const matchesPlace =
      selectedPlaces.length === 0 ||
      selectedPlaces.includes(
        cm.finalPlace as CMPlaceFilter
      )

    return (
      matchesLength &&
      matchesSurface &&
      matchesRacecourse &&
      matchesUma &&
      matchesFinal &&
      matchesPlace
    )
  })

  /*
   * ------------------------------------------------
   * SORTING
   * ------------------------------------------------
   */

  const sortedCms = (() => {
    if (cmSortMode === "number-desc") {
      return [...filteredCms].sort(
        (a, b) => b.number - a.number
      )
    }

    if (cmSortMode === "number-asc") {
      return [...filteredCms].sort(
        (a, b) => a.number - b.number
      )
    }

    if (cmSortMode === "added-desc") {
      return [...filteredCms].reverse()
    }

    return [...filteredCms]
  })()

  /*
   * ------------------------------------------------
   * PAGINATION
   * ------------------------------------------------
   */

  const totalCmPages = Math.max(
    1,
    Math.ceil(
      sortedCms.length / CMS_PER_PAGE
    )
  )

  useEffect(() => {
    setCurrentCmPage((current) =>
      Math.min(current, totalCmPages)
    )
  }, [totalCmPages])

  const paginatedCms = sortedCms.slice(
    (currentCmPage - 1) *
      CMS_PER_PAGE,
    currentCmPage * CMS_PER_PAGE
  )

  const activeFilterCount = [
    selectedLengths.length > 0,
    selectedSurfaces.length > 0,
    selectedRacecourses.length > 0,
    selectedUmaIds.length > 0,
    selectedFinals.length > 0,
    selectedPlaces.length > 0,
  ].filter(Boolean).length

    return (
      <div className="relative">
        {/* PAGE CONTENT */}
        <div className="relative z-10 space-y-5">

          {/* ======================================= */}
          {/* PAGE HEADER */}
          {/* ======================================= */}

      <section className="relative px-6 py-4">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative text-center">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-blue-400">
            Competitive Event
          </div>

          <h1 className="mt-1 bg-gradient-to-r from-blue-200 via-white to-violet-200 bg-clip-text text-4xl font-black tracking-tight text-transparent">
            Champions Meeting
          </h1>

          <div className="mx-auto mt-4 h-[2px] w-80 bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
        </div>
      </section>

      {/* ======================================= */}
      {/* STATISTICS */}
      {/* ======================================= */}

      <section
        data-guide="cm-overview-stats"
        className="mx-auto grid w-full max-w-[1050px] gap-3 md:grid-cols-2 xl:grid-cols-4"
      >

        {/* CM EVENTS */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-900/60 bg-gray-950/75 px-5 py-5 shadow-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent" />

          <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
            CM Events
          </div>

          <div className="mt-2 text-3xl font-black tabular-nums text-white">
            {cms.length}
          </div>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-blue-400/20">
          <svg
            viewBox="0 0 64 64"
            className="h-16 w-16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10 47h44l4-27-14 10-12-18-12 18L6 20l4 27Zm4 5h36v4H14v-4Z" />
          </svg>
        </div>
        </div>

        {/* RACE WINS */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-900/60 bg-gray-950/75 px-5 py-5 shadow-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />

          <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-400">
            Race Wins
          </div>

          <div className="mt-2 text-3xl font-black tabular-nums text-white">
            {totalRaceWins.toLocaleString()}
          </div>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400/25">
            <svg
              viewBox="0 0 64 64"
              className="h-16 w-16"
              aria-hidden="true"
            >
              {/* POLE */}
              <path
                d="M14 8v48"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* FLAG OUTLINE */}
              <path
                d="M17 12c11-5 22 6 34 0v24c-12 6-23-5-34 0V12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* CHECKER CELLS */}
              <path
                d="M18 12c4-1.6 8-1.1 12 .3v10.5c-4-1.4-8-1.9-12-.4V12Z"
                fill="currentColor"
              />

              <path
                d="M40 14.5c3.5.3 7.1-.2 10-1.5v10.5c-3 1.3-6.5 1.8-10 1.4V14.5Z"
                fill="currentColor"
              />

              <path
                d="M29 23c3.7 1.3 7.4 2 11 1.9v10.4c-3.7.1-7.4-.6-11-1.9V23Z"
                fill="currentColor"
              />

              <path
                d="M18 22.4c3.7-1.5 7.4-1 11 .6v10.4c-3.6-1.6-7.3-2.1-11-.6V22.4Z"
                fill="currentColor"
                opacity="0.35"
              />
            </svg>
          </div>
        </div>

        {/* FINAL WINS */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-900/60 bg-gray-950/75 px-5 py-5 shadow-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent" />

          <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
            Final Wins
          </div>

          <div className="mt-2 text-3xl font-black tabular-nums text-white">
            {finalWins}
          </div>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-violet-400/20">
          <svg
            viewBox="0 0 64 64"
            className="h-16 w-16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20 8h24v8h10v7c0 9-6 16-15 18-1 5-3 8-5 10h10v5H20v-5h10c-2-2-4-5-5-10-9-2-15-9-15-18v-7h10V8Zm0 13h-5v2c0 6 3 10 9 12-2-4-3-9-4-14Zm24 0c-1 5-2 10-4 14 6-2 9-6 9-12v-2h-5Z" />
          </svg>
        </div>
        </div>

        {/* WIN RATE */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/60 bg-gray-950/75 px-5 py-5 shadow-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-sky-300 to-transparent" />

          <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
            Win Rate
          </div>

          <div className="mt-2 text-3xl font-black tabular-nums text-white">
            {overallWinRate.toFixed(2)}%
          </div>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sky-400/25">
          <svg
            viewBox="0 0 64 64"
            className="h-16 w-16"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="30"
              cy="34"
              r="20"
              strokeWidth="4"
            />

            <circle
              cx="30"
              cy="34"
              r="12"
              strokeWidth="4"
            />

            <circle
              cx="30"
              cy="34"
              r="4"
              fill="currentColor"
              stroke="none"
            />

            {/* ARROW */}
            <path
              d="M31 33 49 15"
              strokeWidth="4"
            />

            <path
              d="M43 15h6v6"
              strokeWidth="4"
            />
          </svg>
        </div>
        </div>

      </section>

      {/* ======================================= */}
      {/* CONTROLS */}
      {/* ======================================= */}

      <section>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">

          {/* LEFT */}
          <div className="flex items-center gap-2 justify-self-start">

            <div data-guide="cm-add">
            <AddCMButton
              cms={cms}
              setCms={setCms}
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
              className={`h-10 rounded-lg border px-4 text-sm font-semibold transition ${
              isFiltersOpen
                ? "border-sky-400 bg-blue-600 text-white shadow-lg shadow-blue-950/50"
                : "border-blue-800/70 bg-gray-900 text-gray-300 hover:border-blue-500 hover:bg-blue-950 hover:text-white"
            }`}
            >
              <span>☰ Filters</span>

              {activeFilterCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-black text-blue-950">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <select
              value={cmSortMode}
              onChange={(event) =>
                setCmSortMode(
                  event.target
                    .value as CMSortMode
                )
              }
              className="h-10 rounded-lg border border-blue-800/70 bg-gray-900 px-3 text-sm font-semibold text-gray-300 outline-none transition hover:border-blue-500 hover:bg-blue-950 focus:border-sky-500"
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

          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-center gap-1 rounded-xl border border-blue-950/70 bg-black/20 p-1">

            <button
              type="button"
              onClick={() =>
                setCurrentCmPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1
                    )
                )
              }
              disabled={
                currentCmPage === 1
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-950 bg-gray-900/90 text-sm font-bold text-gray-300 transition hover:border-blue-700 hover:bg-blue-950/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              ←
            </button>

            {Array.from(
              {
                length: totalCmPages,
              },
              (_, index) => index + 1
            ).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() =>
                  setCurrentCmPage(page)
                }
                className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold transition ${
                  currentCmPage === page
                    ? "border border-sky-400 bg-blue-600 text-white shadow-lg shadow-blue-950/60"
                    : "border border-transparent text-gray-400 hover:border-blue-900 hover:bg-blue-950/40 hover:text-white"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setCurrentCmPage(
                  (current) =>
                    Math.min(
                      totalCmPages,
                      current + 1
                    )
                )
              }
              disabled={
                currentCmPage ===
                totalCmPages
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-950 bg-gray-900/90 text-sm font-bold text-gray-300 transition hover:border-blue-700 hover:bg-blue-950/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              →
            </button>

          </div>

          {/* VIEW MODE */}
          <div className="flex items-center justify-self-end gap-3">

            <span className="text-sm font-semibold text-gray-500">
              View:
            </span>

            <div className="flex rounded-xl border border-blue-950 bg-gray-900/90 p-1">

              <button
                type="button"
                onClick={() =>
                  setCmViewMode(
                    "detailed"
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  cmViewMode ===
                  "detailed"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/50"
                    : "text-gray-400 hover:bg-blue-950/40 hover:text-white"
                }`}
              >
                Detailed
              </button>

              <button
                type="button"
                onClick={() =>
                  setCmViewMode(
                    "compact"
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  cmViewMode ===
                  "compact"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/50"
                    : "text-gray-400 hover:bg-blue-950/40 hover:text-white"
                }`}
              >
                Compact
              </button>

            </div>
          </div>

        </div>

      </section>

      {/* ======================================= */}
      {/* FILTERS */}
      {/* ======================================= */}

      <CMFilters
        isOpen={isFiltersOpen}
        selectedLengths={selectedLengths}
        setSelectedLengths={setSelectedLengths}
        selectedSurfaces={selectedSurfaces}
        setSelectedSurfaces={
          setSelectedSurfaces
        }
        selectedRacecourses={
          selectedRacecourses
        }
        setSelectedRacecourses={
          setSelectedRacecourses
        }
        racecourseOptions={
          racecourseOptions
        }
        selectedUmaIds={
          selectedUmaIds
        }
        setSelectedUmaIds={
          setSelectedUmaIds
        }
        umaIdsInCms={umaIdsInCms}
        selectedFinals={
          selectedFinals
        }
        setSelectedFinals={
          setSelectedFinals
        }
        selectedPlaces={
          selectedPlaces
        }
        setSelectedPlaces={
          setSelectedPlaces
        }
        filteredCount={
          filteredCms.length
        }
        totalCount={cms.length}
      />

      {/* ======================================= */}
      {/* CM LIST */}
      {/* ======================================= */}

      {filteredCms.length === 0 &&
      activeFilterCount > 0 ? (
        <div className="rounded-2xl border border-blue-950/70 bg-gray-950/75 px-6 py-12 text-center shadow-xl">
          <div className="text-lg font-semibold text-gray-300">
            No Champions Meetings match the selected filters.
          </div>
        </div>
      ) : (
        <>
          {cmViewMode ===
            "compact" && (
            <div className="mb-2 flex items-center gap-6 rounded-xl border border-blue-950/70 bg-gray-950/75 px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-500">
              <div className="w-20 shrink-0">
                CM
              </div>

              <div className="w-40 shrink-0">
                Name
              </div>

              <div className="w-36 shrink-0">
                Racecourse
              </div>

              <div className="w-24 shrink-0">
                Length
              </div>

              <div className="w-24 shrink-0">
                Win Rate
              </div>

              <div className="min-w-28 shrink-0">
                Result
              </div>

              <div className="min-w-28 shrink-0">
                Umas
              </div>
            </div>
          )}

          <div
            className={
              cmViewMode === "detailed"
                ? "cm-overview"
                : ""
            }
            onMouseLeave={() =>
              setHoveredCmNumber(null)
            }
          >
            {paginatedCms.map(
              (cm) => (
                <CMCard
                  key={cm.number}
                  cm={cm}
                  setCms={setCms}
                  compact={
                    cmViewMode ===
                    "compact"
                  }
                  compactDimmed={
                    cmViewMode ===
                      "compact" &&
                    hoveredCmNumber !==
                      null &&
                    hoveredCmNumber !==
                      cm.number
                  }
                  onCompactHoverStart={() =>
                    setHoveredCmNumber(
                      cm.number
                    )
                  }
                />
              )
            )}
          </div>
        </>
      )}

      {/* ======================================= */}
      {/* BACK TO TOP */}
      {/* ======================================= */}

      {showScrollTop && (
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          className="fixed bottom-6 right-6 z-[100] flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-500 bg-gray-950/90 text-2xl font-bold text-sky-400 shadow-xl backdrop-blur transition hover:-translate-y-1 hover:bg-blue-600 hover:text-white hover:shadow-2xl"
          title="Back to top"
        >
          ↑
        </button>
      )}
      </div>
    </div>
  )
}

export default ChampionsMeetingPage