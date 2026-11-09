import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import AllTracks from "./AllTracks"
import TrackStatisticsDetailPage from "./TrackStatisticsDetailPage"
import TrackHighlights from "./TrackHighlights"
import { sortTrackPerformance } from "./trackStatistics"
import type { TrackStatisticsSort } from "./trackStatistics"
import { getTrackOverviewStatistics } from "./trackOverviewStatistics"
import type { TrackOverviewScope, TrackOverviewSurface, TrackOverviewLeague } from "./trackOverviewStatistics"
import { formatUmaWinRate } from "./umaStatistics"
import TrackOverviewPerformance from "./TrackOverviewPerformance"
import "./UmaStatisticsPage.css"
import "./TrackStatisticsPage.css"

export default function TrackStatisticsPage({ cms, lohs, navigation, trackId, onOpenTrack, onBack, onOpenCm, onOpenLoH }: {
  cms: CM[]
  lohs: LoH[]
  navigation: ReactNode
  trackId: string | null
  onOpenTrack: (trackId: string) => void
  onBack: () => void
  onOpenCm: (cmNumber: CM["number"]) => void
  onOpenLoH: (number: number) => void
}) {
  const [sort, setSort] = useState<TrackStatisticsSort>("win-rate")
  const [scope, setScope] = useState<TrackOverviewScope>("overall")
  const [surface, setSurface] = useState<TrackOverviewSurface>("all")
  const [league, setLeague] = useState<TrackOverviewLeague>("all")
  const statistics = useMemo(() => getTrackOverviewStatistics(cms, lohs, scope, surface, league), [cms, lohs, scope, surface, league])
  const tracks = useMemo(() => sortTrackPerformance(statistics.tracks, sort), [statistics.tracks, sort])
  const scopeLabel = scope === "cm" ? "Champions Meeting" : scope === "loh" ? "League of Heroes" : "Overall"
  if (trackId !== null) return <TrackStatisticsDetailPage key={trackId} trackId={trackId} cms={cms} lohs={lohs} onBack={onBack} onOpenCm={onOpenCm} onOpenLoH={onOpenLoH} />
  return (
    <main className="uma-statistics track-statistics-overview" data-scope={scope} aria-labelledby="track-statistics-title">
      {navigation}
      <h1 id="track-statistics-title" className="sr-only">Track Statistics</h1>
      <AllTracks onOpenTrack={onOpenTrack} />
      <TrackHighlights tracks={statistics.tracks} turfTracks={statistics.turfTracks} dirtTracks={statistics.dirtTracks} onOpenTrack={onOpenTrack} />
      <section className="track-stats" data-scope={scope} aria-labelledby="track-stats-title">
        <div className="uma-statistics-section-heading"><h2 id="track-stats-title">Stats</h2></div>
        <div className="track-stats-content">
          <aside className="track-stats-sidebar" aria-label={scopeLabel + " track summary"}>
            <div className="track-stats-scope" role="group" aria-label="Track statistics scope">
              {(["overall", "cm", "loh"] as const).map(value => <button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)}>{value === "overall" ? "Overall" : value === "cm" ? "CM" : "LoH"}</button>)}
            </div>
            <div className="track-stats-filters">
              <label><span>Surface</span><select aria-label="Track statistics surface" value={surface} onChange={event => setSurface(event.target.value as TrackOverviewSurface)}><option value="all">All Surfaces</option><option value="Turf">Turf</option><option value="Dirt">Dirt</option></select></label>
              {scope === "cm" && <label><span>League</span><select aria-label="Track statistics CM league" value={league} onChange={event => setLeague(event.target.value as TrackOverviewLeague)}><option value="all">All Leagues</option><option value="Graded League">Graded</option><option value="Open League">Open</option></select></label>}
            </div>
            <dl className="track-stats-totals">
              <div><dt>Tracks Used</dt><dd>{statistics.overall.tracksUsed.toLocaleString("en")}</dd></div>
              <div><dt>Recorded Races</dt><dd>{statistics.overall.races.toLocaleString("en")}</dd></div>
              <div><dt>Race Wins</dt><dd className="track-statistics-wins">{statistics.overall.wins.toLocaleString("en")}</dd></div>
              <div><dt>Race Win Rate</dt><dd className="uma-statistics-rate">{formatUmaWinRate(statistics.overall.winRate)}</dd></div>
            </dl>
          </aside>
          <TrackOverviewPerformance statistics={statistics} tracks={tracks} scopeLabel={scopeLabel} sort={sort} onSort={setSort} onOpenTrack={onOpenTrack} />
        </div>
      </section>
    </main>
  )
}
