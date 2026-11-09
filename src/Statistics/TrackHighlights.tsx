import { useMemo } from "react"
import { getTrackImage } from "../data/trackData"
import HomeIcon from "../Home/HomeIcon"
import type { HomeIconName } from "../Home/HomeIcon"
import TrackStatisticsLink from "./TrackStatisticsLink"
import UmaStatisticsIcon from "./UmaStatisticsIcon"
import { getRecordedTrackId } from "./trackDetailsStatistics"
import { sortTrackPerformance } from "./trackStatistics"
import type { TrackPerformance } from "./trackStatistics"
import { formatUmaWinRate, MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"

type Props = { tracks: TrackPerformance[]; turfTracks: TrackPerformance[]; dirtTracks: TrackPerformance[]; onOpenTrack: (id: string) => void }

export default function TrackHighlights({ tracks, turfTracks, dirtTracks, onOpenTrack }: Props) {
  const highlights = useMemo(() => {
    const best = (rows: TrackPerformance[]) => sortTrackPerformance(rows.filter(row => row.races >= MIN_RACES_FOR_WIN_RATE), "win-rate")[0]
    return [
      { title: "Best Track", icon: "trophy", track: best(tracks), metric: "Win Rate", rate: true },
      { title: "Most Raced Track", icon: "route", track: sortTrackPerformance(tracks.filter(row => row.races > 0), "races")[0], metric: "Races" },
      { title: "Most Wins Track", icon: "crown", track: sortTrackPerformance(tracks.filter(row => row.wins > 0), "wins")[0], metric: "Wins" },
      { title: "Best Turf Track", icon: "surface", track: best(turfTracks), metric: "Win Rate", rate: true },
      { title: "Best Dirt Track", icon: "surface", track: best(dirtTracks), metric: "Win Rate", rate: true },
    ] satisfies { title: string; icon: HomeIconName; track: TrackPerformance | undefined; metric: string; rate?: boolean }[]
  }, [tracks, turfTracks, dirtTracks])

  return <section className="uma-statistics-panel track-statistics-highlights" aria-labelledby="track-highlights-title">
    <div className="uma-statistics-section-heading"><h2 id="track-highlights-title"><UmaStatisticsIcon name="trophy" />Track Highlights</h2></div>
    <div className="track-highlights-grid">{highlights.map(({ title, icon, track, metric, rate }) => {
      const id = track ? getRecordedTrackId(track.racetrack) : null
      const background = track ? getTrackImage(track.racetrack) : null
      const content = <>
        <HomeIcon name={icon} />
        <span className="track-highlight-identity"><span>{title}</span><strong>{track?.racetrack ?? "—"}</strong></span>
        <span className="track-highlight-value"><span>{metric}</span><strong>{rate ? formatUmaWinRate(track?.winRate ?? null) : track ? (metric === "Races" ? track.races : track.wins).toLocaleString("en") : "—"}</strong></span>
      </>
      return <div key={title} className="track-highlight" data-highlight={title} title={rate ? `At least ${MIN_RACES_FOR_WIN_RATE} recorded races on this ${title.includes("Turf") ? "Turf " : title.includes("Dirt") ? "Dirt " : ""}track.` : undefined}>
        {background && <img className="track-highlight-background" src={background} alt="" loading="lazy" decoding="async" />}
        {id && track ? <TrackStatisticsLink trackId={id} onOpenTrack={onOpenTrack} label={`Open ${track.racetrack} statistics`}>{content}</TrackStatisticsLink> : <div className="track-highlight-content">{content}</div>}
      </div>
    })}</div>
  </section>
}
