import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { CM } from "../types/types"
import AllTracks from "./AllTracks"
import TrackStatisticsDetailPage from "./TrackStatisticsDetailPage"
import TrackStatisticsLink from "./TrackStatisticsLink"
import TrackGlobalMetadataPerformance from "./TrackGlobalMetadataPerformance"
import { getRecordedTrackId } from "./trackDetailsStatistics"
import { calculateTrackStatistics, sortTrackPerformance } from "./trackStatistics"
import type { TrackStatisticsSort } from "./trackStatistics"
import { formatUmaWinRate, MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"
import "./UmaStatisticsPage.css"
import "./TrackStatisticsPage.css"

export default function TrackStatisticsPage({ cms, navigation, trackId, onOpenTrack, onBack, onOpenCm }: {
  cms: CM[]
  navigation: ReactNode
  trackId: string | null
  onOpenTrack: (trackId: string) => void
  onBack: () => void
  onOpenCm: (cmNumber: CM["number"]) => void
}) {
  const [sort, setSort] = useState<TrackStatisticsSort>("win-rate")
  const statistics = useMemo(() => calculateTrackStatistics(cms), [cms])
  const tracks = useMemo(() => sortTrackPerformance(statistics.tracks, sort), [statistics.tracks, sort])
  if (trackId !== null) return <TrackStatisticsDetailPage trackId={trackId} cms={cms} onBack={onBack} onOpenCm={onOpenCm} />
  return (
    <main className="uma-statistics" aria-labelledby="track-statistics-title">
      {navigation}
      <header className="uma-statistics-header">
        <div>
          <h1 id="track-statistics-title">Track Statistics</h1>
          <p>Explore performance across racetracks and race conditions.</p>
        </div>
      </header>
      <AllTracks onOpenTrack={onOpenTrack} />
      <div id="track-statistics-content" className="uma-statistics-summary-grid track-statistics-grid">
        <section className="uma-statistics-panel" aria-labelledby="track-statistics-overall-title">
          <div className="uma-statistics-section-heading"><h2 id="track-statistics-overall-title">Overall Statistics</h2></div>
          <dl className="uma-statistics-overall-values">
            <div><dt>Tracks Used</dt><dd>{statistics.overall.tracksUsed.toLocaleString("en")}</dd></div>
            <div><dt>Recorded Races</dt><dd>{statistics.overall.races.toLocaleString("en")}</dd></div>
            <div><dt>Race Wins</dt><dd>{statistics.overall.wins.toLocaleString("en")}</dd></div>
            <div><dt>Race Win Rate</dt><dd className="uma-statistics-rate">{formatUmaWinRate(statistics.overall.winRate)}</dd></div>
          </dl>
        </section>
        <section className="uma-statistics-panel" aria-labelledby="track-statistics-performance-title">
          <div className="uma-statistics-section-heading track-statistics-performance-heading">
            <div>
              <h2 id="track-statistics-performance-title">Track Performance</h2>
              <p>{sort === "win-rate" ? `Win rate prioritizes tracks with ${MIN_RACES_FOR_WIN_RATE}+ races.` : "Recorded Champions Meeting race results."}</p>
            </div>
            <label className="uma-statistics-sort">
              <span>Sort by</span>
              <select id="track-statistics-sort" value={sort} disabled={tracks.length === 0} onChange={(event) => setSort(event.target.value as TrackStatisticsSort)}>
                <option value="win-rate">Win Rate</option><option value="races">Races</option><option value="wins">Wins</option><option value="events">Events</option><option value="racetrack">Racetrack</option>
              </select>
            </label>
          </div>
          {tracks.length > 0 ? (
            <table className="uma-statistics-distance-table track-statistics-table">
              <caption className="sr-only">Recorded Champions Meeting performance by racetrack.</caption>
              <thead><tr>
                <th scope="col"><span className="track-statistics-wide-label">Racetrack</span><span className="track-statistics-compact-label">Track</span></th>
                <th scope="col">Events</th><th scope="col">Races</th><th scope="col">Wins</th>
                <th scope="col"><span className="track-statistics-wide-label">Win Rate</span><span className="track-statistics-compact-label">WR</span></th>
              </tr></thead>
              <tbody>{tracks.map((track) => {
                const id = getRecordedTrackId(track.racetrack)
                return <tr key={track.racetrack} data-racetrack={track.racetrack} data-track-id={id ?? undefined} onClick={(event) => {
                  if (id && !(event.target as HTMLElement).closest("a")) onOpenTrack(id)
                }}>
                  <th scope="row">{id ? <TrackStatisticsLink trackId={id} onOpenTrack={onOpenTrack} label={`Open ${track.racetrack} statistics`}>{track.racetrack}</TrackStatisticsLink> : track.racetrack}</th><td>{track.events.toLocaleString("en")}</td><td>{track.races.toLocaleString("en")}</td><td>{track.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(track.winRate)}</td>
                </tr>
              })}</tbody>
            </table>
          ) : <p className="uma-statistics-summary-note">No recorded Champions Meeting racetrack results yet.</p>}
        </section>
      </div>
      <TrackGlobalMetadataPerformance cms={cms} />
    </main>
  )
}
