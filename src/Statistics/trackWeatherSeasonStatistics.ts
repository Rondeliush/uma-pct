import { TRACK_WEATHER, TRACK_SEASONS } from "../types/types"
import type { CM } from "../types/types"
import { getRecordedTrackId } from "./trackDetailsStatistics"
import { getTrackMetadataPerformance } from "./trackMetadataStatistics"

/** Weather and season independently attribute the same recorded team races at this track. */
export function getTrackWeatherSeasonPerformance(cms: CM[], trackId: string) {
  const events = cms.filter((cm) => cm.track && getRecordedTrackId(cm.track) === trackId)
  const weather = getTrackMetadataPerformance(events, "weather", TRACK_WEATHER)
  const seasons = getTrackMetadataPerformance(events, "season", TRACK_SEASONS)
  return {
    weather: weather.rows.map(({ label, ...totals }) => ({ weather: label, ...totals })),
    seasons: seasons.rows.map(({ label, ...totals }) => ({ season: label, ...totals })),
    unknownWeatherRaces: weather.unknownRaces,
    unknownSeasonRaces: seasons.unknownRaces,
  }
}
