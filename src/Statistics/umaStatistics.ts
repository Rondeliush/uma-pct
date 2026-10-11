import { calculateAttemptRaces, calculateAttemptWins } from "../CMs/CMCalculations"
import { getCMFinalResults, getResultConfiguration } from "../CMs/cmParticipantConfiguration"
import type { CM, UmaCharacter, UmaVersion } from "../types/types"

export const MIN_RACES_FOR_WIN_RATE = 10

export type UmaStatisticsSort = "win-rate" | "wins" | "races" | "name-az" | "name-za"

export type RaceStatistics = {
  races: number
  wins: number
  winRate: number | null
}

export type DistanceStatistics = RaceStatistics & { distance: number }

export type UmaStatisticsEntry = {
  // Use the exact historical version ID, including unresolved IDs.
  versionId: string
  name: string
  avatar: string
  unresolved: boolean
}

export type UmaPerformance = RaceStatistics & UmaStatisticsEntry & {
  cmEvents: number
  finalAppearances: number
  finalWins: number
  distances: DistanceStatistics[]
}

export type UmaPerformanceListEntry = UmaPerformance & { hasRecordedData: boolean }

function withWinRate<T extends { races: number; wins: number }>(totals: T) {
  return {
    ...totals,
    winRate: totals.races > 0 ? (totals.wins / totals.races) * 100 : null,
  }
}

function versionEntry(version: UmaVersion): UmaStatisticsEntry {
  return {
    versionId: version.id,
    name: version.displayName,
    avatar: version.avatar ?? "",
    unresolved: false,
  }
}

function compareNames(a: UmaStatisticsEntry, b: UmaStatisticsEntry) {
  return a.name.localeCompare(b.name, "en", { sensitivity: "base" })
    || a.versionId.localeCompare(b.versionId)
}

/** All Database versions, including archived/custom ones, plus unresolved history. */
export function getUmaStatisticsCatalogue(versions: UmaVersion[], history: UmaStatisticsEntry[] = []) {
  const knownIds = new Set(versions.map((version) => version.id))
  return [
    ...versions.map(versionEntry),
    ...history.filter((entry) => entry.unresolved && !knownIds.has(entry.versionId)),
  ].sort(compareNames)
}

/** Fill catalogue gaps for presentation, keeping the existing performance sort. */
export function getUmaPerformanceList(catalogue: UmaStatisticsEntry[], recorded: UmaPerformance[], sort: UmaStatisticsSort): UmaPerformanceListEntry[] {
  const performanceById = new Map(recorded.map((uma) => [uma.versionId, uma]))
  const performance = catalogue.map((uma): UmaPerformance => performanceById.get(uma.versionId) ?? {
    ...uma, cmEvents: 0, races: 0, wins: 0, winRate: null, finalAppearances: 0, finalWins: 0, distances: [],
  })
  const sorted = sortUmaPerformance(performance, sort).map((uma) => ({ ...uma, hasRecordedData: performanceById.has(uma.versionId) }))
  return sort === "name-az" || sort === "name-za" ? sorted : [
    ...sorted.filter((uma) => uma.hasRecordedData),
    ...sorted.filter((uma) => !uma.hasRecordedData),
  ]
}

export function formatUmaWinRate(winRate: number | null) {
  return winRate === null ? "—" : `${winRate.toFixed(1)}%`
}

/** Read-only, version-level view of the existing CM round records. */
export function calculateUmaStatistics(
  cms: CM[],
  characters: UmaCharacter[],
  versions: UmaVersion[],
) {
  const characterById = new Map(characters.map((character) => [character.id, character]))
  const versionById = new Map(versions.map((version) => [version.id, version]))

  type MutablePerformance = Omit<UmaPerformance, "winRate" | "distances"> & {
    distances: Map<number, { distance: number; races: number; wins: number }>
  }
  const performanceByVersion = new Map<string, MutablePerformance>()
  const distanceTotals = new Map<number, { distance: number; races: number; wins: number }>()
  const surfaceTotals = [
    { surface: "Turf" as const, races: 0, wins: 0 },
    { surface: "Dirt" as const, races: 0, wins: 0 },
  ]
  const overall = { races: 0, wins: 0 }

  const getPerformance = (versionId: string) => {
    const version = versionById.get(versionId)
    // Exact version IDs are authoritative. Base-only/deleted IDs never inherit a version.
    const character = characterById.get(versionId)
    let performance = performanceByVersion.get(versionId)
    if (!performance) {
      performance = {
        ...(version ? versionEntry(version) : {
          versionId,
          name: character ? `${character.name} (Legacy / unresolved)` : `Unresolved Uma (${versionId || "missing ID"})`,
          avatar: "",
          unresolved: true,
        }),
        races: 0,
        wins: 0,
        cmEvents: 0,
        finalAppearances: 0,
        finalWins: 0,
        distances: new Map(),
      }
      performanceByVersion.set(versionId, performance)
    }
    return performance
  }

  const addDistance = (
    target: typeof distanceTotals,
    distance: number,
    races: number,
    wins: number,
  ) => {
    if (!Number.isFinite(distance) || distance <= 0 || races <= 0) return
    const totals = target.get(distance) ?? { distance, races: 0, wins: 0 }
    totals.races += races
    totals.wins += wins
    target.set(distance, totals)
  }

  cms.forEach((cm) => {
    const surface = surfaceTotals.find((totals) => totals.surface === cm.surface)
    const versionsInEvent = new Set<string>()
    const countEvent = (performance: MutablePerformance) => {
      if (versionsInEvent.has(performance.versionId)) return
      versionsInEvent.add(performance.versionId)
      performance.cmEvents += 1
    }
    ;(cm.attempts ?? []).forEach((attempt) => {
      const races = calculateAttemptRaces(attempt)
      const wins = calculateAttemptWins(attempt)
      // Team totals count an actual race once, not once per team member.
      overall.races += races
      overall.wins += wins
      addDistance(distanceTotals, cm.distance, races, wins)
      if (surface && races > 0) {
        surface.races += races
        surface.wins += wins
      }

      const attemptVersions = new Map<string, { performance: MutablePerformance; wins: number }>()
      ;(attempt.umaWins ?? []).forEach((result) => {
        const versionId = getResultConfiguration(cm, result).umaVersionId
        if (versionId === null) return
        const performance = getPerformance(versionId)
        const entry = attemptVersions.get(performance.versionId) ?? { performance, wins: 0 }
        entry.wins += result.wins
        attemptVersions.set(performance.versionId, entry)
      })
      attemptVersions.forEach(({ performance, wins: versionWins }) => {
        if (races > 0) countEvent(performance)
        performance.races += races
        performance.wins += versionWins
        addDistance(performance.distances, cm.distance, races, versionWins)
      })
    })

    // A chosen final lineup alone does not establish that the final was raced.
    if (!["1st", "2nd", "3rd"].includes(cm.finalPlace)) return
    const finalVersions = new Set<string>()
    const winningVersions = new Set<string>()
    getCMFinalResults(cm).forEach((result) => {
      if (result.configuration.umaVersionId === null) return
      const performance = getPerformance(result.configuration.umaVersionId)
      countEvent(performance)
      finalVersions.add(performance.versionId)
      if (cm.finalPlace === "1st" && result.won) {
        winningVersions.add(performance.versionId)
      }
    })
    finalVersions.forEach((id) => { performanceByVersion.get(id)!.finalAppearances += 1 })
    winningVersions.forEach((id) => { performanceByVersion.get(id)!.finalWins += 1 })
  })

  const umas: UmaPerformance[] = Array.from(performanceByVersion.values())
    .filter((performance) => performance.races > 0 || performance.finalAppearances > 0)
    .map((performance) => withWinRate({
      ...performance,
      distances: Array.from(performance.distances.values())
        .sort((a, b) => a.distance - b.distance)
        .map(withWinRate),
    }))

  return {
    umas,
    overall: { ...withWinRate(overall), umasUsed: umas.length },
    distances: Array.from(distanceTotals.values())
      .sort((a, b) => a.distance - b.distance)
      .map(withWinRate),
    surfaces: surfaceTotals.map(withWinRate),
  }
}

export function sortUmaPerformance(umas: UmaPerformance[], sort: UmaStatisticsSort) {
  return [...umas].sort((a, b) => {
    const nameOrder = compareNames(a, b)
    switch (sort) {
      case "name-az": return nameOrder
      case "name-za": return -nameOrder
      case "wins": return b.wins - a.wins || b.races - a.races || nameOrder
      case "races": return b.races - a.races || b.wins - a.wins || nameOrder
      default: {
        const sampleOrder = Number(b.races >= MIN_RACES_FOR_WIN_RATE)
          - Number(a.races >= MIN_RACES_FOR_WIN_RATE)
        return sampleOrder || (b.winRate ?? -1) - (a.winRate ?? -1)
          || b.races - a.races || nameOrder
      }
    }
  })
}

export function getUmaBestDistance(uma: UmaPerformance) {
  return uma.distances
    .filter((distance) => distance.races >= MIN_RACES_FOR_WIN_RATE)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0)
      || b.races - a.races || a.distance - b.distance)[0] ?? null
}
