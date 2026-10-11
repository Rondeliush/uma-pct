import { calculateAttemptRaces, calculateAttemptWins } from "../CMs/CMCalculations"
import { getTrackName } from "../data/trackData"
import type { CM } from "../types/types"
import { MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"
import type { RaceStatistics } from "./umaStatistics"

export type TrackStatisticsSort = "win-rate" | "races" | "wins" | "events" | "racetrack"
export type TrackPerformance = RaceStatistics & { racetrack: string; events: number }

export const withWinRate = <T extends { races: number; wins: number }>(totals: T) => ({
  ...totals, winRate: totals.races > 0 ? totals.wins / totals.races * 100 : null,
})

export function calculateTrackEventResults(cm: CM) {
  const attempts = cm.attempts ?? []
  return {
    races: attempts.reduce((total, attempt) => total + calculateAttemptRaces(attempt), 0),
    wins: attempts.reduce((total, attempt) => total + calculateAttemptWins(attempt), 0),
    hasRecordedEvent: attempts.some((attempt) => calculateAttemptRaces(attempt) > 0)
      || ["1st", "2nd", "3rd"].includes(cm.finalPlace),
  }
}

/** CM round batches use the same team totals as global Uma statistics; finals only establish event use. */
export function calculateTrackStatistics(cms: CM[]) {
  const overall = { races: 0, wins: 0 }
  const tracks = new Map<string, { racetrack: string; eventNumbers: Set<number>; races: number; wins: number }>()
  for (const cm of cms) {
    const { races, wins, hasRecordedEvent } = calculateTrackEventResults(cm)
    overall.races += races
    overall.wins += wins
    if (!hasRecordedEvent || !cm.track?.trim()) continue
    const racetrack = getTrackName(cm.track) ?? cm.track
    const totals = tracks.get(racetrack) ?? { racetrack, eventNumbers: new Set<number>(), races: 0, wins: 0 }
    totals.eventNumbers.add(cm.number)
    totals.races += races
    totals.wins += wins
    tracks.set(racetrack, totals)
  }
  return {
    overall: { ...withWinRate(overall), tracksUsed: tracks.size },
    tracks: Array.from(tracks.values(), ({ racetrack, eventNumbers, races, wins }): TrackPerformance =>
      withWinRate({ racetrack, events: eventNumbers.size, races, wins })),
  }
}

export function sortTrackPerformance(tracks: TrackPerformance[], sort: TrackStatisticsSort) {
  return [...tracks].sort((a, b) => {
    const nameOrder = a.racetrack.localeCompare(b.racetrack, "en", { sensitivity: "base" })
      || a.racetrack.localeCompare(b.racetrack)
    switch (sort) {
      case "racetrack": return nameOrder
      case "events": return b.events - a.events || b.races - a.races || b.wins - a.wins || nameOrder
      case "races": return b.races - a.races || b.wins - a.wins || nameOrder
      case "wins": return b.wins - a.wins || b.races - a.races || nameOrder
      default: return Number(b.races >= MIN_RACES_FOR_WIN_RATE) - Number(a.races >= MIN_RACES_FOR_WIN_RATE)
        || (b.winRate ?? -1) - (a.winRate ?? -1) || b.races - a.races || nameOrder
    }
  })
}
