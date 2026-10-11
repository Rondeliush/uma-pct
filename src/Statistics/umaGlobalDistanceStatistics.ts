import { calculateAttemptRaces, calculateAttemptWins } from "../CMs/CMCalculations"
import type { CM } from "../types/types"
import { getUmaDistancePerformance, recordedCategory, UMA_DISTANCE_CATEGORIES } from "./umaDetailStatistics"
import type { UmaSurfaceFilter } from "./umaDetailStatistics"

/** Feed team-level batches to the shared distance grouping, without multiplying Uma participations. */
export function getGlobalUmaDistancePerformance(cms: CM[], surface: UmaSurfaceFilter = "All") {
  const events = cms.flatMap((cm) => (cm.attempts ?? []).map((attempt) => ({
    distance: cm.distance,
    category: recordedCategory(cm.length),
    surface: cm.surface,
    races: calculateAttemptRaces(attempt),
    wins: calculateAttemptWins(attempt),
  })))
  const performance = getUmaDistancePerformance(events, surface)
  return { ...performance, categories: UMA_DISTANCE_CATEGORIES.map((category) =>
    performance.categories.find((row) => row.category === category) ?? { category, races: 0, wins: 0, winRate: null },
  ) }
}
