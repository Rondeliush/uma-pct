import { useMemo, useState } from "react"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import UnavailablePage from "../components/UnavailablePage"
import { getIndividualTrackStatistics } from "./trackIndividualStatistics"
import type { TrackOverviewScope, TrackOverviewSurface, TrackOverviewLeague } from "./trackOverviewStatistics"
import { formatUmaWinRate, MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"
import TrackDetailPerformance from "./TrackDetailPerformance"
import TrackEventHistory from "./TrackEventHistory"
import HomeIcon from "../Home/HomeIcon"
import UmaStatisticsIcon from "./UmaStatisticsIcon"
import { TrackConditionIcon } from "../components/EventIcons"
import "./UmaStatisticsDetailPage.css"
import "./TrackStatisticsDetailPage.css"

export default function TrackStatisticsDetailPage({ trackId, cms, lohs, onBack, onOpenCm, onOpenLoH }: {
  trackId: string
  cms: CM[]
  lohs: LoH[]
  onBack: () => void
  onOpenCm: (cmNumber: CM["number"]) => void
  onOpenLoH: (number: number) => void
}) {
  const [scope, setScope] = useState<TrackOverviewScope>("overall")
  const [surface, setSurface] = useState<TrackOverviewSurface>("all")
  const [league, setLeague] = useState<TrackOverviewLeague>("all")
  const details = useMemo(() => getIndividualTrackStatistics(cms, lohs, trackId, scope, surface, league), [cms, lohs, trackId, scope, surface, league])
  const backAction = (
    <button type="button" className="track-detail-back" onClick={onBack}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m14 6-6 6 6 6M8 12h12" /></svg>
      Track Statistics
    </button>
  )
  if (!details) return <UnavailablePage />
  const { track, overall, highlights, statistics } = details
  const highlightItems = [
    { kind: "distance", label: "Best Distance", value: highlights.distance ? `${highlights.distance.distance}m` : "\u2014" },
    { kind: "condition", label: "Best Ground Condition", value: highlights.condition?.label ?? "\u2014" },
    { kind: "weather", label: "Best Weather", value: highlights.weather?.label ?? "\u2014" },
    { kind: "season", label: "Best Season", value: highlights.season?.label ?? "\u2014" },
  ] as const
  return (
    <main className="uma-statistics track-statistics-overview track-statistics-detail" aria-labelledby="track-detail-title" data-track-id={track.id} data-scope={scope}>
      <nav aria-label="Track statistics navigation">{backAction}</nav>
      <header className="track-detail-title">
        <h1 id="track-detail-title" tabIndex={-1}><UmaStatisticsIcon name="flag" />{track.name} Statistics</h1><p>Explore competitive performance at {track.name} Racecourse.</p>
      </header>
      <div className="track-detail-layout">
        <aside className="track-detail-sidebar" aria-label={`${track.name} overview`}>
          <div className="track-detail-hero"><img src={track.image} alt={`${track.name} Racecourse`} decoding="async" /></div>
          <section className="uma-statistics-panel track-detail-overall" aria-labelledby="track-detail-overall-title">
            <div className="uma-statistics-section-heading"><h2 id="track-detail-overall-title"><UmaStatisticsIcon name="activity" />Overview</h2></div>
            <dl className="track-detail-metrics">
              <div><dt>Events</dt><dd>{overall.events.toLocaleString("en")}</dd></div>
              <div><dt>Recorded Races</dt><dd>{overall.races.toLocaleString("en")}</dd></div>
              <div><dt>Race Wins</dt><dd className="track-statistics-wins">{overall.wins.toLocaleString("en")}</dd></div>
              <div><dt>Race Win Rate</dt><dd className="uma-statistics-rate">{formatUmaWinRate(overall.winRate)}</dd></div>
            </dl>
          </section>
          <section className="uma-statistics-panel track-detail-highlights" aria-labelledby="track-detail-highlights-title">
            <div className="uma-statistics-section-heading"><h2 id="track-detail-highlights-title"><HomeIcon name="star" />Track Highlights</h2></div>
            <dl>{highlightItems.map(item => <div key={item.kind} title={`Best win rate with at least ${MIN_RACES_FOR_WIN_RATE} recorded races.`}>
              <TrackConditionIcon kind={item.kind} /><dt>{item.label}</dt><dd>{item.value}</dd>
            </div>)}</dl>
          </section>
        </aside>
        <TrackDetailPerformance statistics={statistics} scope={scope} onScope={setScope} surface={surface} onSurface={setSurface} league={league} onLeague={setLeague} />
      </div>
      <TrackEventHistory key={`history-${track.id}`} cms={cms} lohs={lohs} trackId={track.id} onOpenCm={onOpenCm} onOpenLoH={onOpenLoH} />
    </main>
  )
}
