import { TRACK_CONDITIONS } from "../types/types"
import type { CM } from "../types/types"
import { getRecordedTrackId } from "./trackDetailsStatistics"
import { getTrackMetadataPerformance } from "./trackMetadataStatistics"
import { getGlobalUmaDistancePerformance } from "./umaGlobalDistanceStatistics"
import type { UmaSurfaceFilter } from "./umaDetailStatistics"

/** Both cards use selected-track team results; the surface filter only affects distance. */
export function getTrackPerformanceBreakdowns(cms: CM[], trackId: string, surface: UmaSurfaceFilter = "All") {
  const events = cms.filter((cm) => cm.track && getRecordedTrackId(cm.track) === trackId)
  const conditions = getTrackMetadataPerformance(events, "condition", TRACK_CONDITIONS)
  return {
    distance: getGlobalUmaDistancePerformance(events, surface),
    conditions: conditions.rows.map(({ label, ...totals }) => ({ condition: label, ...totals })),
    unknownConditionRaces: conditions.unknownRaces,
  }
}
