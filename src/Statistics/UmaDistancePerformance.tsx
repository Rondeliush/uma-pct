import { useRef, useState } from "react"
import { getUmaDistancePerformance, UMA_DISTANCE_CATEGORIES } from "./umaDetailStatistics"
import type { UmaEventStatistics, UmaSurfaceFilter } from "./umaDetailStatistics"
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

export default function UmaDistancePerformance({ events }: { events: UmaEventStatistics[] }) {
  const [mode, setMode] = useState<"exact" | "categories">("exact")
  const [surface, setSurface] = useState<UmaSurfaceFilter>("All")
  const [expanded, setExpanded] = useState(false)
  const performance = getUmaDistancePerformance(events, surface)
  const distances = expanded ? performance.distances : performance.distances.slice(0, 5)
  const rows = mode === "exact"
    ? distances.map((distance) => ({ ...distance, label: `${distance.distance} m` }))
    : UMA_DISTANCE_CATEGORIES.map((category) => ({
      ...(performance.categories.find((row) => row.category === category) ?? { races: 0, wins: 0, winRate: null }),
      label: category,
    }))

  return (
    <section className="uma-statistics-panel uma-detail-distance" aria-labelledby="uma-detail-distance-title">
      <div className="uma-statistics-section-heading"><h2 id="uma-detail-distance-title">Distance Performance</h2></div>
      <UmaDistancePerformanceControls idPrefix="uma-detail-distance" mode={mode} surface={surface} onModeChange={setMode} onSurfaceChange={(value) => { setSurface(value); setExpanded(false) }} />
      <div id="uma-detail-distance-content" role="tabpanel" aria-labelledby={`uma-detail-distance-${mode}`} tabIndex={0}>
        {rows.length > 0 ? <UmaDetailPerformanceTable id="uma-detail-distance-rows" label={mode === "exact" ? "Distance" : "Category"} rows={rows} /> : <p className="uma-detail-note">No recorded round races {mode === "exact" ? "at a known distance" : "in a known distance category"}{surface !== "All" ? ` on ${surface}` : ""}.</p>}
        {mode === "exact" && performance.distances.length > 5 && (
          <button type="button" className="uma-statistics-text-button uma-detail-distance-toggle" aria-expanded={expanded} aria-controls="uma-detail-distance-rows" onClick={() => setExpanded((current) => !current)}>{expanded ? "Show less" : `Show all ${performance.distances.length} distances`}</button>
        )}
        {mode === "categories" && performance.uncategorizedRaces > 0 && <p className="uma-detail-note">{performance.uncategorizedRaces.toLocaleString("en")} races have no saved distance category and are excluded here.</p>}
      </div>
    </section>
  )
}
