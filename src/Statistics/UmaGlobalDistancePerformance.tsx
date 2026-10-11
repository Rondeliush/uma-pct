import { useMemo, useState } from "react"
import { UmaDetailPerformanceTable, UmaDistancePerformanceControls } from "./UmaDistancePerformance"
import { getGlobalUmaDistancePerformance } from "./umaGlobalDistanceStatistics"
import type { CM } from "../types/types"
import type { UmaSurfaceFilter } from "./umaDetailStatistics"

export default function UmaGlobalDistancePerformance({ cms }: { cms: CM[] }) {
  const [mode, setMode] = useState<"exact" | "categories">("exact")
  const [surface, setSurface] = useState<UmaSurfaceFilter>("All")
  const performance = useMemo(() => getGlobalUmaDistancePerformance(cms, surface), [cms, surface])
  const rows = mode === "exact"
    ? performance.distances.map((row) => ({ ...row, label: `${row.distance} m` }))
    : performance.categories.map((row) => ({ ...row, label: row.category }))

  return (
    <section className="uma-statistics-panel" aria-labelledby="uma-statistics-distance-title">
      <div className="uma-statistics-section-heading"><h2 id="uma-statistics-distance-title">Distance Performance</h2></div>
      <UmaDistancePerformanceControls idPrefix="uma-statistics-distance" mode={mode} surface={surface} onModeChange={setMode} onSurfaceChange={setSurface} />
      <div id="uma-statistics-distance-content" role="tabpanel" aria-labelledby={`uma-statistics-distance-${mode}`} tabIndex={0}>
        {rows.length > 0 ? <UmaDetailPerformanceTable label="Distance" rows={rows} />
          : <p className="uma-statistics-summary-note">No rounds with a recorded distance{surface !== "All" ? ` on ${surface}` : ""} yet.</p>}
        {mode === "categories" && performance.uncategorizedRaces > 0 && <p className="uma-statistics-summary-note">{performance.uncategorizedRaces.toLocaleString("en")} races have no saved distance category and are excluded here.</p>}
      </div>
    </section>
  )
}
