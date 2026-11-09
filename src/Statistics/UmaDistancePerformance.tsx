import { useRef } from "react"
import { getUmaDistancePerformance } from "./umaDetailStatistics"
import type { UmaSurfaceFilter } from "./umaDetailStatistics"
import { formatUmaWinRate } from "./umaStatistics"
import type { RaceStatistics } from "./umaStatistics"

type PerformanceRow = RaceStatistics & { label: string }
type DistanceMode = "exact" | "categories"

export function UmaDistancePerformanceControls({ idPrefix, mode, surface, onModeChange, onSurfaceChange }: {
  idPrefix: string
  mode: DistanceMode
  surface: UmaSurfaceFilter
  onModeChange: (mode: DistanceMode) => void
  onSurfaceChange: (surface: UmaSurfaceFilter) => void
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <div className="uma-detail-distance-controls">
      <div className="uma-detail-distance-tabs" role="tablist" aria-label="Distance performance mode">
        {(["exact", "categories"] as const).map((tab, index) => (
          <button key={tab} ref={(button) => { tabRefs.current[index] = button }} type="button" role="tab" id={`${idPrefix}-${tab}`} aria-controls={`${idPrefix}-content`} aria-selected={mode === tab} tabIndex={mode === tab ? 0 : -1} onClick={() => onModeChange(tab)} onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
            event.preventDefault()
            const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index
            onModeChange(nextIndex === 0 ? "exact" : "categories")
            tabRefs.current[nextIndex]?.focus()
          }}>{tab === "exact" ? "Exact Distance" : "Categories"}</button>
        ))}
      </div>
      <label className="uma-detail-surface-filter">Surface:
        <select value={surface} onChange={(event) => onSurfaceChange(event.target.value as UmaSurfaceFilter)}>
          <option value="All">All</option><option value="Turf">Turf</option><option value="Dirt">Dirt</option>
        </select>
      </label>
    </div>
  )
}

export function UmaDetailPerformanceTable({ label, rows, id }: { label: string; rows: PerformanceRow[]; id?: string }) {
  return (
    <table id={id} className="uma-statistics-distance-table">
      <thead><tr><th scope="col">{label}</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th></tr></thead>
      <tbody>{rows.map((row) => (
        <tr key={row.label} data-surface={label === "Surface" ? row.label : undefined}><th scope="row">{row.label}</th><td>{row.races.toLocaleString("en")}</td><td data-stat="wins">{row.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(row.winRate)}</td></tr>
      ))}</tbody>
    </table>
  )
}

export default function UmaDistancePerformance({ events }: { events: Parameters<typeof getUmaDistancePerformance>[0] }) {
  const performance = getUmaDistancePerformance(events)
  const rows = performance.distances.map((distance) => ({ ...distance, label: `${distance.distance} m` }))

  return (
    <section className="uma-statistics-panel uma-detail-distance" aria-labelledby="uma-detail-distance-title">
      <div className="uma-statistics-section-heading uma-detail-distance-heading">
        <h2 id="uma-detail-distance-title">Distance Performance</h2>
      </div>
      <div id="uma-detail-distance-content" className="uma-detail-distance-scroll" role="region" aria-labelledby="uma-detail-distance-title" tabIndex={rows.length > 4 ? 0 : undefined}>
        {rows.length > 0 ? <UmaDetailPerformanceTable id="uma-detail-distance-rows" label="Distance" rows={rows} /> : <p className="uma-detail-note">No recorded races at a known distance.</p>}
      </div>
    </section>
  )
}
