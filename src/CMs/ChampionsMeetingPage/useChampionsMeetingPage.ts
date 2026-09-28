import {
  useEffect,
  useState,
} from "react"

import type { CM } from "../../types/types"

import type {
  CMFinalFilter,
  CMPlaceFilter,
} from "../CMFilters"

import {
  loadCmViewModeFromStore,
  saveCmViewModeToStore,
} from "../../storage/appStore"

import {
  loadProfileData,
  updateProfileData,
} from "../../profiles/profileDataStore"

import {
  calculateFinalQualificationFromAttempts,
} from "../CMCalculations"

export type CMSortMode =
  | "number-desc"
  | "number-asc"
  | "added-desc"
  | "added-asc"

export function getChampionsMeetingOverviewStats(
  cms: CM[]
) {
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

  return {
    totalRaces,
    totalRaceWins,
    finalWins,
    overallWinRate,
  }
}


export function useChampionsMeetingPage(
    cms: CM[],
    profileId: string | null = null
    ) {
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

  const CMS_PER_PAGE = 10

  const [cmViewMode, setCmViewMode] =
  useState<"detailed" | "compact">(
    "detailed"
  )

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

const racecourseOptions = Array.from(
  new Set(
    cms
      .map((cm) => cm.track)
      .filter(
        (track) => track.trim() !== ""
      )
  )
).sort()

const {
  totalRaces,
  totalRaceWins,
  finalWins,
  overallWinRate,
} = getChampionsMeetingOverviewStats(cms)

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

const activeFilterCount = [
  selectedLengths.length > 0,
  selectedSurfaces.length > 0,
  selectedRacecourses.length > 0,
  selectedUmaIds.length > 0,
  selectedFinals.length > 0,
  selectedPlaces.length > 0,
].filter(Boolean).length

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

const totalCmPages = Math.max(
  1,
  Math.ceil(
    sortedCms.length / CMS_PER_PAGE
  )
)

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

useEffect(() => {
  setCurrentCmPage((current) =>
    Math.min(current, totalCmPages)
  )
}, [totalCmPages])

const paginatedCms = sortedCms.slice(
  (currentCmPage - 1) * CMS_PER_PAGE,
  currentCmPage * CMS_PER_PAGE
)

  return {
    hoveredCmNumber,
    setHoveredCmNumber,
    showScrollTop,
    setShowScrollTop,
    isFiltersOpen,
    setIsFiltersOpen,
    selectedLengths,
    setSelectedLengths,
    selectedSurfaces,
    setSelectedSurfaces,
    selectedRacecourses,
    setSelectedRacecourses,
    selectedUmaIds,
    setSelectedUmaIds,
    selectedFinals,
    setSelectedFinals,
    selectedPlaces,
    setSelectedPlaces,
    currentCmPage,
    setCurrentCmPage,
    cmSortMode,
    setCmSortMode,
    cmViewMode,
    setCmViewMode,
    totalRaces,
    totalRaceWins,
    finalWins,
    overallWinRate,
    racecourseOptions,
    umaIdsInCms,
    filteredCms,
    activeFilterCount,
    sortedCms,
    totalCmPages,
    paginatedCms,
  }
}

export type ChampionsMeetingPageState =
  ReturnType<
    typeof useChampionsMeetingPage
  >