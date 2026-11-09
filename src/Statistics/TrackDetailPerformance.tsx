import { useId, useRef, useState } from "react"
import type { getIndividualTrackStatistics } from "./trackIndividualStatistics"
import type { TrackOverviewScope, TrackOverviewSurface, TrackOverviewLeague } from "./trackOverviewStatistics"
import { UmaDetailPerformanceTable } from "./UmaDistancePerformance"
import TrackGlobalMetadataPerformance from "./TrackGlobalMetadataPerformance"
import HomeIcon from "../Home/HomeIcon"

type Props = {
  statistics: NonNullable<ReturnType<typeof getIndividualTrackStatistics>>["statistics"]
  scope: TrackOverviewScope; onScope: (scope: TrackOverviewScope) => void
  surface: TrackOverviewSurface; onSurface: (surface: TrackOverviewSurface) => void
  league: TrackOverviewLeague; onLeague: (league: TrackOverviewLeague) => void
}

export default function TrackDetailPerformance({ statistics, scope, onScope, surface, onSurface, league, onLeague }: Props) {
  const [active, setActive] = useState<"distance" | "conditions">("distance")
  const [mode, setMode] = useState<"exact" | "categories">("exact")
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const scroll = useRef<HTMLDivElement>(null)
  const id = useId()
  const rows = mode === "exact" ? statistics.distances.map(row => ({ ...row, label: `${row.distance}m` }))
    : statistics.distanceCategories.map(row => ({ ...row, label: row.category }))
  const selectTab = (tab: typeof active) => { setActive(tab); scroll.current?.scrollTo({ top: 0 }) }

  return <section className="uma-statistics-panel track-detail-performance" aria-labelledby="track-detail-performance-title">
    <div className="uma-statistics-section-heading track-detail-performance-heading">
      <h2 id="track-detail-performance-title"><HomeIcon name="surface" />Performance Breakdown</h2>
      <div className="track-detail-performance-controls">
        {scope === "cm" && <select aria-label="Track detail CM league" value={league} onChange={event => onLeague(event.target.value as TrackOverviewLeague)}>
          <option value="all">All Leagues</option><option value="Graded League">Graded</option><option value="Open League">Open</option>
        </select>}
        <label>Surface:<select aria-label="Track detail surface" value={surface} onChange={event => onSurface(event.target.value as TrackOverviewSurface)}>
          <option value="all">All</option><option value="Turf">Turf</option><option value="Dirt">Dirt</option>
        </select></label>
        <div className="track-stats-scope" role="group" aria-label="Track detail statistics scope">
          {(["overall", "cm", "loh"] as const).map(value => <button key={value} type="button" aria-pressed={scope === value} onClick={() => onScope(value)}>{value === "overall" ? "Overall" : value === "cm" ? "CM" : "LoH"}</button>)}
        </div>
      </div>
    </div>
    <div className="track-performance-heading">
      <div className="track-performance-tabs" role="tablist" aria-label="Track detail performance categories">
        {(["distance", "conditions"] as const).map((value, i) => <button key={value} type="button" ref={el => { refs.current[i] = el }} role="tab" id={`${id}-${value}`} aria-selected={active === value} aria-controls={`${id}-content`} tabIndex={active === value ? 0 : -1}
          onClick={() => selectTab(value)} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
            event.preventDefault()
            const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - i
            selectTab(next === 0 ? "distance" : "conditions"); refs.current[next]?.focus()
          }}>{value === "distance" ? "Distance" : "Conditions"}</button>)}
      </div>
    </div>
    <div className="track-performance-tools"><span>{active === "distance" ? "Distance Performance" : "Conditions Performance"}</span>
      {active === "distance" && <label className="uma-statistics-sort"><span>View</span><select aria-label="Track detail distance view" value={mode} onChange={event => { setMode(event.target.value as typeof mode); scroll.current?.scrollTo({ top: 0 }) }}>
        <option value="exact">Exact Distance</option><option value="categories">Categories</option>
      </select></label>}
    </div>
    <div id={`${id}-content`} role="tabpanel" aria-labelledby={`${id}-${active}`} tabIndex={0} className="track-performance-content">
      <div ref={scroll} className="track-statistics-table-scroll">
        {active === "conditions" ? <TrackGlobalMetadataPerformance performance={statistics.metadata} />
          : rows.length > 0 ? <UmaDetailPerformanceTable label={mode === "exact" ? "Distance" : "Category"} rows={rows} />
          : <p className="uma-statistics-summary-note" role="status">No recorded races at a known distance for the selected filters.</p>}
      </div>
    </div>
  </section>
}
