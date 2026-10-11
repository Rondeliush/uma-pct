import { useMemo } from "react"
import type { CM } from "../types/types"
import UnavailablePage from "../components/UnavailablePage"
import { calculateTrackDetailsStatistics } from "./trackDetailsStatistics"
import { formatUmaWinRate } from "./umaStatistics"
import TrackStatisticsBreakdowns from "./TrackStatisticsBreakdowns"
import TrackWeatherSeasonPerformance from "./TrackWeatherSeasonPerformance"
import TrackEventHistory from "./TrackEventHistory"
import "./UmaStatisticsDetailPage.css"
import "./TrackStatisticsDetailPage.css"

export default function TrackStatisticsDetailPage({ trackId, cms, onBack, onOpenCm }: {
  trackId: string
  cms: CM[]
  onBack: () => void
  onOpenCm: (cmNumber: CM["number"]) => void
}) {
  const statistics = useMemo(() => calculateTrackDetailsStatistics(cms, trackId), [cms, trackId])
  const backAction = (
    <button type="button" className="uma-detail-back uma-statistics-text-button" onClick={onBack}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m14 6-6 6 6 6M8 12h12" /></svg>
      Track Statistics
    </button>
  )
  if (!statistics) return <UnavailablePage />
  const { track, overall, courses } = statistics
  return (
    <main className="uma-statistics" aria-labelledby="track-detail-title" data-track-id={track.id}>
      {backAction}
      <header className="uma-statistics-header">
        <div><h1 id="track-detail-title" tabIndex={-1}>{track.name} Statistics</h1><p>Explore competitive performance at {track.name} Racecourse.</p></div>
      </header>
      <div className="track-detail-summary">
        <div className="track-detail-hero"><img src={track.image} alt="" decoding="async" /></div>
        <section className="uma-statistics-panel track-detail-overall" aria-labelledby="track-detail-overall-title">
          <div className="uma-statistics-section-heading"><h2 id="track-detail-overall-title">Overall Statistics</h2></div>
          <dl className="uma-statistics-overall-values">
            <div><dt>Events</dt><dd>{overall.events.toLocaleString("en")}</dd></div>
            <div><dt>Recorded Races</dt><dd>{overall.races.toLocaleString("en")}</dd></div>
            <div><dt>Race Wins</dt><dd>{overall.wins.toLocaleString("en")}</dd></div>
            <div><dt>Race Win Rate</dt><dd className="uma-statistics-rate">{formatUmaWinRate(overall.winRate)}</dd></div>
          </dl>
        </section>
      </div>
      <div className="track-detail-panels">
        <section className="uma-statistics-panel" aria-labelledby="track-detail-course-title">
          <div className="uma-statistics-section-heading"><h2 id="track-detail-course-title">Course Performance</h2></div>
          {courses.length > 0 ? <table className="uma-statistics-distance-table track-course-table">
            <caption className="sr-only">Recorded course configurations at {track.name}.</caption>
            <thead><tr>
              <th scope="col">Distance</th><th scope="col">Surface</th>
              <th scope="col"><span className="track-course-wide-label">Direction</span><span className="track-course-compact-label">Dir.</span></th>
              <th scope="col">Events</th><th scope="col">Races</th><th scope="col">Wins</th>
              <th scope="col"><span className="track-course-wide-label">Win Rate</span><span className="track-course-compact-label">WR</span></th>
            </tr></thead>
            <tbody>{courses.map((course) => <tr key={course.key} data-course={course.key}>
              <th scope="row">{course.distance === null ? "—" : `${course.distance.toLocaleString("en")} m`}</th>
              <td>{course.surface ?? "—"}</td><td>{course.direction ?? "—"}</td><td>{course.events.toLocaleString("en")}</td><td>{course.races.toLocaleString("en")}</td><td>{course.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(course.winRate)}</td>
            </tr>)}</tbody>
          </table> : <p className="uma-statistics-summary-note">No recorded competitive data for this track yet.</p>}
        </section>
      </div>
      <TrackStatisticsBreakdowns key={track.id} cms={cms} trackId={track.id} />
      <TrackWeatherSeasonPerformance cms={cms} trackId={track.id} />
      <TrackEventHistory key={`history-${track.id}`} cms={cms} trackId={track.id} onOpenCm={onOpenCm} />
    </main>
  )
}
