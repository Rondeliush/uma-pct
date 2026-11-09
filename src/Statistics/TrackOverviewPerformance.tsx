import { useId, useRef, useState } from "react"
import TrackGlobalMetadataPerformance from "./TrackGlobalMetadataPerformance"
import TrackStatisticsLink from "./TrackStatisticsLink"
import { UmaDetailPerformanceTable } from "./UmaDistancePerformance"
import { getRecordedTrackId } from "./trackDetailsStatistics"
import type { getTrackOverviewStatistics } from "./trackOverviewStatistics"
import type { TrackStatisticsSort } from "./trackStatistics"
import { formatUmaWinRate } from "./umaStatistics"

const tabs = [
  { id: "track", label: "Track", title: "Track Performance" },
  { id: "conditions", label: "Conditions", title: "Conditions Performance" },
  { id: "distance", label: "Distance", title: "Distance Performance" },
] as const

type Props = {
  statistics: ReturnType<typeof getTrackOverviewStatistics>
  tracks: ReturnType<typeof getTrackOverviewStatistics>["tracks"]
  scopeLabel: string
  sort: TrackStatisticsSort
  onSort: (sort: TrackStatisticsSort) => void
  onOpenTrack: (id: string) => void
}

export default function TrackOverviewPerformance({ statistics, tracks, scopeLabel, sort, onSort, onOpenTrack }: Props) {
  const [active, setActive] = useState<typeof tabs[number]["id"]>("track")
  const [distanceMode, setDistanceMode] = useState<"exact" | "categories">("exact")
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const index = tabs.findIndex(tab => tab.id === active)
  const selected = tabs[index]
  const distanceRows = distanceMode === "exact"
    ? statistics.distances.map(row => ({ ...row, label: `${row.distance}m` }))
    : statistics.distanceCategories.map(row => ({ ...row, label: row.category }))
  const selectTab = (index: number) => { setActive(tabs[index].id); scrollRef.current?.scrollTo({ top: 0 }) }

  return <section className="uma-statistics-panel track-overview-performance" aria-labelledby={`${id}-heading`}>
    <header className="track-performance-heading">
      <h3 id={`${id}-heading`} className="sr-only">{scopeLabel} performance</h3>
      <div className="track-performance-tabs" role="tablist" aria-label="Track performance categories">
        {tabs.map((tab, i) => <button key={tab.id} type="button" role="tab" ref={el => { tabRefs.current[i] = el }}
          id={`${id}-tab-${i}`} aria-selected={active === tab.id} aria-controls={`${id}-content`} tabIndex={active === tab.id ? 0 : -1}
          onClick={() => selectTab(i)} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
            event.preventDefault()
            const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (i + (event.key === "ArrowLeft" ? tabs.length - 1 : 1)) % tabs.length
            selectTab(next); tabRefs.current[next]?.focus()
          }}>{tab.label}</button>)}
      </div>
    </header>
    <div className="track-performance-tools">
      <span>{selected.title}</span>
      {active === "track" && <label className="uma-statistics-sort"><span>Sort by</span>
        <select id="track-statistics-sort" value={sort} disabled={tracks.length === 0} onChange={event => onSort(event.target.value as TrackStatisticsSort)}>
          <option value="win-rate">Win Rate</option><option value="races">Races</option><option value="wins">Wins</option><option value="events">Events</option><option value="racetrack">Racetrack</option>
        </select>
      </label>}
      {active === "distance" && <label className="uma-statistics-sort"><span>View</span>
        <select aria-label="Distance view" value={distanceMode} onChange={event => { setDistanceMode(event.target.value as typeof distanceMode); scrollRef.current?.scrollTo({ top: 0 }) }}>
          <option value="exact">Exact Distance</option><option value="categories">Categories</option>
        </select>
      </label>}
    </div>
    <div id={`${id}-content`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} tabIndex={0} className="track-performance-content">
      <div ref={scrollRef} className="track-statistics-table-scroll">
        {active === "track" ? tracks.length > 0 ? <table className="uma-statistics-distance-table track-statistics-table">
          <caption className="sr-only">{scopeLabel} performance by racetrack.</caption>
          <thead><tr><th scope="col"><span className="track-statistics-wide-label">Racetrack</span><span className="track-statistics-compact-label">Track</span></th><th scope="col">Events</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col"><span className="track-statistics-wide-label">Win Rate</span><span className="track-statistics-compact-label">WR</span></th></tr></thead>
          <tbody>{tracks.map(track => {
            const trackId = getRecordedTrackId(track.racetrack)
            return <tr key={track.racetrack} data-racetrack={track.racetrack} data-track-id={trackId ?? undefined} onClick={event => {
              if (trackId && !(event.target as HTMLElement).closest("a")) onOpenTrack(trackId)
            }}>
              <th scope="row">{trackId ? <TrackStatisticsLink trackId={trackId} onOpenTrack={onOpenTrack} label={`Open ${track.racetrack} statistics`}>{track.racetrack}</TrackStatisticsLink> : track.racetrack}</th>
              <td>{track.events.toLocaleString("en")}</td><td>{track.races.toLocaleString("en")}</td><td>{track.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(track.winRate)}</td>
            </tr>
          })}</tbody>
        </table> : <p className="uma-statistics-summary-note" role="status">No recorded racetrack results for the selected filters.</p>
          : active === "distance" ? distanceRows.length > 0
            ? <UmaDetailPerformanceTable label={distanceMode === "exact" ? "Distance" : "Category"} rows={distanceRows} />
            : <p className="uma-statistics-summary-note" role="status">No recorded races at a known distance for the selected filters.</p>
          : <TrackGlobalMetadataPerformance performance={statistics.metadata} />}
      </div>
    </div>
  </section>
}
