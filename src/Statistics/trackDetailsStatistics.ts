import { getTrackName, trackImages } from "../data/trackData"
import type { CM } from "../types/types"
import { calculateTrackEventResults, calculateTrackStatistics, withWinRate } from "./trackStatistics"
import type { RaceStatistics } from "./umaStatistics"

export type TrackCoursePerformance = RaceStatistics & {
  key: string
  distance: number | null
  surface: CM["surface"] | null
  direction: CM["direction"] | null
  events: number
}

/** External recorded names are resolved by TrackData; navigation always uses its ID. */
export function getRecordedTrackId(name: string) {
  const canonicalName = getTrackName(name)
  return trackImages.find((track) => track.name === canonicalName)?.id ?? null
}

export function calculateTrackDetailsStatistics(cms: CM[], trackId: string) {
  const track = trackImages.find((entry) => entry.id === trackId)
  if (!track) return null
  const matchingEvents = cms.filter((cm) => cm.track && getTrackName(cm.track) === track.name)
  const overall = calculateTrackStatistics(matchingEvents).tracks.find((row) => row.racetrack === track.name)
    ?? { racetrack: track.name, events: 0, races: 0, wins: 0, winRate: null }
  const grouped = new Map<string, Omit<TrackCoursePerformance, "events" | "winRate"> & { eventNumbers: Set<number> }>()
  for (const cm of matchingEvents) {
    const { races, wins, hasRecordedEvent } = calculateTrackEventResults(cm)
    if (!hasRecordedEvent) continue
    const distance = Number.isFinite(cm.distance) && cm.distance > 0 ? cm.distance : null
    const surface = cm.surface || null
    const direction = cm.direction || null
    const key = JSON.stringify([distance, surface, direction])
    const totals = grouped.get(key) ?? { key, distance, surface, direction, eventNumbers: new Set<number>(), races: 0, wins: 0 }
    totals.eventNumbers.add(cm.number)
    totals.races += races
    totals.wins += wins
    grouped.set(key, totals)
  }
  const courses = Array.from(grouped.values(), ({ eventNumbers, ...totals }): TrackCoursePerformance =>
    withWinRate({ ...totals, events: eventNumbers.size }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
      || (a.surface ?? "").localeCompare(b.surface ?? "", "en")
      || (a.direction ?? "").localeCompare(b.direction ?? "", "en"))
  return { track, overall, courses }
}
