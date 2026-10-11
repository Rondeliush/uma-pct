import { useMemo } from "react"
import type { CM } from "../types/types"
import { UmaDetailPerformanceTable } from "./UmaDistancePerformance"
import { getTrackWeatherSeasonPerformance } from "./trackWeatherSeasonStatistics"

export default function TrackWeatherSeasonPerformance({ cms, trackId }: { cms: CM[]; trackId: string }) {
  const { weather, seasons, unknownWeatherRaces, unknownSeasonRaces } = useMemo(() => getTrackWeatherSeasonPerformance(cms, trackId), [cms, trackId])
  return (
    <div className="track-detail-breakdowns track-detail-weather-season">
      <section className="uma-statistics-panel" aria-labelledby="track-detail-weather-title">
        <div className="uma-statistics-section-heading"><h2 id="track-detail-weather-title">Weather Performance</h2></div>
        <UmaDetailPerformanceTable label="Weather" rows={weather.map((row) => ({ ...row, label: row.weather }))} />
        {!weather.some((row) => row.races > 0) && unknownWeatherRaces === 0 && <p className="uma-statistics-summary-note">No recorded round races at this track yet.</p>}
        {unknownWeatherRaces > 0 && <p className="uma-statistics-summary-note">{unknownWeatherRaces.toLocaleString("en")} races have no valid recorded weather and are excluded here.</p>}
      </section>
      <section className="uma-statistics-panel" aria-labelledby="track-detail-season-title">
        <div className="uma-statistics-section-heading"><h2 id="track-detail-season-title">Season Performance</h2></div>
        <UmaDetailPerformanceTable label="Season" rows={seasons.map((row) => ({ ...row, label: row.season }))} />
        {!seasons.some((row) => row.races > 0) && unknownSeasonRaces === 0 && <p className="uma-statistics-summary-note">No recorded round races at this track yet.</p>}
        {unknownSeasonRaces > 0 && <p className="uma-statistics-summary-note">{unknownSeasonRaces.toLocaleString("en")} races have no valid recorded season and are excluded here.</p>}
      </section>
    </div>
  )
}
