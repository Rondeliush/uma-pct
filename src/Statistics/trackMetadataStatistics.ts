import { TRACK_CONDITIONS, TRACK_WEATHER, TRACK_SEASONS, TRACK_DIRECTIONS } from "../types/types"
import type { CM } from "../types/types"
import { calculateTrackEventResults, withWinRate } from "./trackStatistics"

/** Shared by track details and overview: only saved canonical metadata attributes team races. */
export function getTrackMetadataPerformance<T extends string>(cms: CM[], field: "condition" | "weather" | "season" | "direction", values: readonly T[]) {
  const totals = new Map<string, { label: T; races: number; wins: number }>(
    values.map((label) => [label, { label, races: 0, wins: 0 }]),
  )
  let unknownRaces = 0
  for (const cm of cms) {
    const { races, wins } = calculateTrackEventResults(cm)
    if (races <= 0) continue
    const row = totals.get(cm[field])
    if (!row) { unknownRaces += races; continue }
    row.races += races
    row.wins += wins
  }
  return { rows: Array.from(totals.values(), withWinRate), unknownRaces }
}

/** Use the same complete CM scope as Overall Statistics, even when the track name is unknown. */
export function getGlobalTrackMetadataPerformance(cms: CM[]) {
  return {
    conditions: getTrackMetadataPerformance(cms, "condition", TRACK_CONDITIONS),
    weather: getTrackMetadataPerformance(cms, "weather", TRACK_WEATHER),
    seasons: getTrackMetadataPerformance(cms, "season", TRACK_SEASONS),
    directions: getTrackMetadataPerformance(cms, "direction", TRACK_DIRECTIONS),
  }
}
