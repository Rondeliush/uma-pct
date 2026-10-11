import type { CM } from "../types/types"
import type { RaceStatistics } from "./umaStatistics"
import { getRecordedTrackId } from "./trackDetailsStatistics"
import { calculateTrackEventResults, withWinRate } from "./trackStatistics"

export type TrackEventHistoryEntry = RaceStatistics & Pick<CM, "number" | "name"> & {
  distance: number | null
  surface: CM["surface"] | null
  direction: CM["direction"] | null
  condition: CM["condition"] | null
  weather: CM["weather"] | null
}

/** One row per saved CM, using the same recorded team batches as Track Overall Statistics. */
export function getTrackEventHistory(cms: CM[], trackId: string): TrackEventHistoryEntry[] {
  const events = new Map<CM["number"], Omit<TrackEventHistoryEntry, "winRate">>()
  for (const cm of cms) {
    if (getRecordedTrackId(cm.track ?? "") !== trackId) continue
    const { races, wins, hasRecordedEvent } = calculateTrackEventResults(cm)
    if (!hasRecordedEvent) continue
    const event = events.get(cm.number) ?? {
      number: cm.number,
      name: cm.name,
      distance: Number.isFinite(cm.distance) && cm.distance > 0 ? cm.distance : null,
      surface: cm.surface || null,
      direction: cm.direction || null,
      condition: cm.condition || null,
      weather: cm.weather || null,
      races: 0,
      wins: 0,
    }
    event.races += races
    event.wins += wins
    events.set(cm.number, event)
  }
  return Array.from(events.values(), withWinRate).sort((a, b) => b.number - a.number)
}
