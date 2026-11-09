import type { UmaPerformance, RaceStatistics } from "./umaStatistics"
import type { UmaRunningStyleRow } from "./umaRunningStyleStatistics"
import type { UmaRoleRow } from "./umaRoleStatistics"
import type { getUmaDistancePerformance } from "./umaDetailStatistics"

export type UmaOverviewScope = "overall" | "cm" | "loh"
export type OverviewUma = UmaPerformance & { lohEvents?: number; extraStageAppearances?: number; rawPoints?: number | null }
export type UmaOverviewData = {
  umas: OverviewUma[]
  overall: RaceStatistics & { umasUsed: number }
  surfaces: (RaceStatistics & { surface: "Turf" | "Dirt" })[]
  distances: (RaceStatistics & { distance: number })[]
  categories: ReturnType<typeof getUmaDistancePerformance>["categories"]
  uncategorizedRaces: number
  runningStyles: UmaRunningStyleRow[]
  roles: UmaRoleRow[]
}
