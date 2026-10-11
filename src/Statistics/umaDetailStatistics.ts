import { calculateAttemptRaces, calculateFinalQualificationFromAttempts } from "../CMs/CMCalculations"
import { getCMFinalResults, getResultConfiguration } from "../CMs/cmParticipantConfiguration"
import { CM_FINAL_PLACEMENTS } from "../CMs/cmFinalPlacements"
import type { CM, CMFinalPlacement, TrackLength, TrackSurface } from "../types/types"
import { MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"
import type { DistanceStatistics, RaceStatistics } from "./umaStatistics"
import { calculateUmaRunningStyleStatistics } from "./umaRunningStyleStatistics"
import type { UmaRunningStyleRow } from "./umaRunningStyleStatistics"
import { getUmaRunningStyleDisplayRows } from "./umaRunningStylePresentation"

type FinalPlace = "1st" | "2nd" | "3rd"
type FinalGroup = "Final A" | "Final B"
type FinalPlacements = Record<CMFinalPlacement, number>
export type UmaSurfaceFilter = "All" | TrackSurface
export const UMA_DISTANCE_CATEGORIES = ["Sprint", "Mile", "Medium", "Long"] as const
type DistanceCategory = (typeof UMA_DISTANCE_CATEGORIES)[number]

// Use the project's saved distance taxonomy; Short is displayed as Sprint.
const categoryLabels: Record<TrackLength, DistanceCategory> = {
  Short: "Sprint", Mile: "Mile", Medium: "Medium", Long: "Long",
}

export function recordedCategory(length: string): DistanceCategory | null {
  if (length === "Sprint") return "Sprint"
  if (length === "Miles") return "Mile"
  return Object.hasOwn(categoryLabels, length) ? categoryLabels[length as TrackLength] : null
}

export type UmaEventStatistics = RaceStatistics & {
  number: number
  name: string
  track: string
  surface: string
  distance: number
  category: DistanceCategory | null
  final: { group: FinalGroup | null; teamPlace: FinalPlace; placement: CMFinalPlacement | null; won: boolean } | null
}

export type UmaDetailStatistics = RaceStatistics & {
  cmEvents: number
  finalAppearances: number
  finalWins: number
  knownFinalPlacements: number
  unrecordedFinalPlacements: number
  podiumFinishes: number
  podiumRate: number | null
  finalWinRate: number | null
  bestFinalPlacement: CMFinalPlacement | null
  finals: { group: FinalGroup | null; appearances: number; placements: FinalPlacements; unknownPlacements: number }[]
  distances: DistanceStatistics[]
  runningStyles: UmaRunningStyleRow[]
  events: UmaEventStatistics[]
}

const withWinRate = <T extends { races: number; wins: number }>(totals: T) => ({
  ...totals,
  winRate: totals.races > 0 ? totals.wins / totals.races * 100 : null,
})

/** Reuse the already aggregated version event totals for both distance modes. */
export function getUmaDistancePerformance(events: Pick<UmaEventStatistics, "races" | "wins" | "distance" | "category" | "surface">[], surface: UmaSurfaceFilter = "All") {
  const distances = new Map<number, { distance: number; races: number; wins: number }>()
  const categories = new Map<DistanceCategory, { category: DistanceCategory; races: number; wins: number }>()
  let uncategorizedRaces = 0
  for (const event of events) {
    if (event.races <= 0 || (surface !== "All" && event.surface !== surface)
      || !Number.isFinite(event.distance) || event.distance <= 0) continue
    const distance = distances.get(event.distance) ?? { distance: event.distance, races: 0, wins: 0 }
    distance.races += event.races
    distance.wins += event.wins
    distances.set(event.distance, distance)
    if (!event.category) { uncategorizedRaces += event.races; continue }
    const category = categories.get(event.category) ?? { category: event.category, races: 0, wins: 0 }
    category.races += event.races
    category.wins += event.wins
    categories.set(event.category, category)
  }
  return {
    distances: Array.from(distances.values()).sort((a, b) => a.distance - b.distance).map(withWinRate),
    categories: UMA_DISTANCE_CATEGORIES.flatMap((category) => {
      const totals = categories.get(category)
      return totals ? [withWinRate(totals)] : []
    }),
    uncategorizedRaces,
  }
}

/** Additional views of the same recorded rounds and finals, without resampling races. */
export function getUmaDetailInsights(statistics: UmaDetailStatistics) {
  const surfaces = (["Turf", "Dirt"] as const).flatMap((surface) => {
    const events = statistics.events.filter((event) => event.surface === surface && event.races > 0)
    if (events.length === 0) return []
    return [withWinRate({ surface, races: events.reduce((sum, event) => sum + event.races, 0), wins: events.reduce((sum, event) => sum + event.wins, 0) })]
  })
  const raceEvents = statistics.events.filter((event) => event.races > 0)
  const rankBest = (a: RaceStatistics, b: RaceStatistics) => (b.winRate ?? 0) - (a.winRate ?? 0) || b.races - a.races
  const bestDistance = statistics.distances.filter((distance) => distance.races >= MIN_RACES_FOR_WIN_RATE)
    .sort((a, b) => rankBest(a, b) || a.distance - b.distance)[0] ?? null
  const bestCM = raceEvents.filter((event) => event.races >= MIN_RACES_FOR_WIN_RATE)
    .sort((a, b) => rankBest(a, b) || b.number - a.number || a.name.localeCompare(b.name, "en"))[0] ?? null
  return {
    surfaces,
    unknownSurfaceRaces: raceEvents.filter((event) => event.surface !== "Turf" && event.surface !== "Dirt").reduce((sum, event) => sum + event.races, 0),
    highlights: {
      bestDistance,
      mostUsedDistance: [...statistics.distances].sort((a, b) => b.races - a.races || a.distance - b.distance)[0] ?? null,
      // Stable sorting retains the canonical running-style and Turf/Dirt table order on ties.
      bestRunningStyle: statistics.runningStyles.filter((style) => style.races >= MIN_RACES_FOR_WIN_RATE).sort(rankBest)[0] ?? null,
      mostUsedRunningStyle: statistics.runningStyles.filter((style) => style.races > 0).sort((a, b) => b.races - a.races)[0] ?? null,
      bestSurface: surfaces.filter((surface) => surface.races >= MIN_RACES_FOR_WIN_RATE).sort(rankBest)[0] ?? null,
      bestCM,
    },
    eventPerformance: {
      weightedWinRate: statistics.winRate,
      bestEventWinRate: bestCM?.winRate ?? null,
      finalAppearanceRate: statistics.cmEvents > 0 ? statistics.finalAppearances / statistics.cmEvents * 100 : null,
      finalWinRate: statistics.finalWinRate,
    },
  }
}

export function getFinalGroup(cm: CM): FinalGroup | null {
  const attempts = cm.attempts ?? []
  // Qualification is derived, not stored. Missing rounds cannot establish a group.
  if (!attempts.some((attempt) => attempt.day === 1 || attempt.day === 2)
    || !attempts.some((attempt) => attempt.day === 3 || attempt.day === 4)) return null
  const qualification = calculateFinalQualificationFromAttempts(attempts)
  return qualification === "Final A" || qualification === "Final B" ? qualification : null
}

/** One stored Uma version/reference only; round totals follow the Overview convention. */
export function calculateUmaDetailStatistics(
  cms: CM[],
  versionId: string,
): UmaDetailStatistics {
  const events: UmaEventStatistics[] = []
  const finals: UmaDetailStatistics["finals"] = (["Final A", "Final B", null] as const)
    .map((group) => ({ group, appearances: 0, placements: { first: 0, second: 0, third: 0, fourth_or_lower: 0 }, unknownPlacements: 0 }))
  let races = 0
  let wins = 0
  let finalAppearances = 0
  let finalWins = 0

  cms.forEach((cm) => {
    let eventRaces = 0
    let eventWins = 0
    ;(cm.attempts ?? []).forEach((attempt) => {
      const results = (attempt.umaWins ?? []).filter((result) => getResultConfiguration(cm, result).umaVersionId === versionId)
      const attemptRaces = calculateAttemptRaces(attempt)
      if (results.length === 0 || attemptRaces <= 0) return
      // Count a race once even if the same version has multiple participant records.
      eventRaces += attemptRaces
      eventWins += results.reduce((total, result) => total + result.wins, 0)
    })

    const selectedFinalists = getCMFinalResults(cm).filter((result) => result.configuration.umaVersionId === versionId)
    // Keep one appearance per version/event, using its best recorded individual finish.
    const placement = CM_FINAL_PLACEMENTS.find((place) => selectedFinalists.some((result) => result.placement === place)) ?? null
    const teamPlace = cm.finalPlace
    const hasFinal = selectedFinalists.length > 0
      && (teamPlace === "1st" || teamPlace === "2nd" || teamPlace === "3rd")
    const final: UmaEventStatistics["final"] = hasFinal ? {
      group: getFinalGroup(cm),
      teamPlace,
      placement,
      won: placement === "first",
    } : null
    if (eventRaces === 0 && !final) return

    if (final) {
      finalAppearances += 1
      if (final.won) finalWins += 1
      const group = finals.find((record) => record.group === final.group)!
      group.appearances += 1
      if (final.placement === null) group.unknownPlacements += 1
      else group.placements[final.placement] += 1
    }
    races += eventRaces
    wins += eventWins
    events.push(withWinRate({
      number: cm.number,
      name: cm.name,
      track: cm.track,
      surface: cm.surface,
      distance: cm.distance,
      category: recordedCategory(cm.length),
      races: eventRaces,
      wins: eventWins,
      final,
    }))
  })

  const unrecordedFinalPlacements = finals.reduce((sum, group) => sum + group.unknownPlacements, 0)
  const knownFinalPlacements = finalAppearances - unrecordedFinalPlacements
  const podiumFinishes = finals.reduce((sum, group) => sum + group.placements.first + group.placements.second + group.placements.third, 0)
  const bestFinalPlacement = CM_FINAL_PLACEMENTS.find((place) => finals.some((group) => group.placements[place] > 0)) ?? null

  return withWinRate({
    races,
    wins,
    cmEvents: events.length,
    finalAppearances,
    finalWins,
    knownFinalPlacements,
    unrecordedFinalPlacements,
    podiumFinishes,
    podiumRate: knownFinalPlacements > 0 ? podiumFinishes / knownFinalPlacements * 100 : null,
    finalWinRate: knownFinalPlacements > 0 ? finalWins / knownFinalPlacements * 100 : null,
    bestFinalPlacement,
    finals: finals.filter((record) => record.appearances > 0),
    distances: getUmaDistancePerformance(events).distances,
    runningStyles: getUmaRunningStyleDisplayRows(calculateUmaRunningStyleStatistics(cms, versionId)),
    events: events.sort((a, b) => b.number - a.number),
  })
}
