import { useMemo, useState } from "react"
import type { CM } from "../types/types"
import { UmaDetailPerformanceTable, UmaDistancePerformanceControls } from "./UmaDistancePerformance"
import type { UmaSurfaceFilter } from "./umaDetailStatistics"
import { getTrackPerformanceBreakdowns } from "./trackPerformanceBreakdowns"

export default function TrackStatisticsBreakdowns({ cms, trackId }: { cms: CM[]; trackId: string }) {
  const [mode, setMode] = useState<"exact" | "categories">("exact")
  const [surface, setSurface] = useState<UmaSurfaceFilter>("All")
  const { distance, conditions, unknownConditionRaces } = useMemo(() => getTrackPerformanceBreakdowns(cms, trackId, surface), [cms, trackId, surface])
  const rows = mode === "exact"
    ? distance.distances.map((row) => ({ ...row, label: `${row.distance} m` }))
    : distance.categories.map((row) => ({ ...row, label: row.category }))
  return (
    <div className="track-detail-breakdowns">
      <section className="uma-statistics-panel" aria-labelledby="track-detail-distance-title">
        <div className="uma-statistics-section-heading"><h2 id="track-detail-distance-title">Distance Performance</h2></div>
        <UmaDistancePerformanceControls idPrefix="track-detail-distance" mode={mode} surface={surface} onModeChange={setMode} onSurfaceChange={setSurface} />
        <div id="track-detail-distance-content" role="tabpanel" aria-labelledby={`track-detail-distance-${mode}`} tabIndex={0}>
          {rows.length > 0 ? <UmaDetailPerformanceTable label={mode === "exact" ? "Distance" : "Category"} rows={rows} />
            : <p className="uma-statistics-summary-note">No rounds with a recorded distance{surface !== "All" ? ` on ${surface}` : ""} yet.</p>}
          {mode === "categories" && distance.uncategorizedRaces > 0 && <p className="uma-statistics-summary-note">{distance.uncategorizedRaces.toLocaleString("en")} races have no saved distance category and are excluded here.</p>}
        </div>
      </section>
      <section className="uma-statistics-panel" aria-labelledby="track-detail-condition-title">
        <div className="uma-statistics-section-heading"><h2 id="track-detail-condition-title">Ground Condition Performance</h2></div>
        <UmaDetailPerformanceTable label="Condition" rows={conditions.map((row) => ({ ...row, label: row.condition }))} />
        {!conditions.some((row) => row.races > 0) && unknownConditionRaces === 0 && <p className="uma-statistics-summary-note">No recorded round races at this track yet.</p>}
        {unknownConditionRaces > 0 && <p className="uma-statistics-summary-note">{unknownConditionRaces.toLocaleString("en")} races have no valid recorded ground condition and are excluded here.</p>}
      </section>
    </div>
  )
}
