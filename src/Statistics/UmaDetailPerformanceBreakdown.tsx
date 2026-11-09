import { useMemo, useState } from "react"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import type { UmaOverviewScope } from "./umaOverviewTypes"
import type { UmaResultLeague } from "./umaResultRankings"
import { getUmaDetailPerformanceScopes } from "./umaDetailPerformance"
import { UMA_DISTANCE_CATEGORIES } from "./umaDetailStatistics"
import type { UmaSurfaceFilter } from "./umaDetailStatistics"
import UmaStatisticsIcon from "./UmaStatisticsIcon"
import UmaDistancePerformance, { UmaDetailPerformanceTable } from "./UmaDistancePerformance"
import UmaRunningStylePerformance from "./UmaRunningStylePerformance"
import UmaRolePerformance from "./UmaRolePerformance"
import UmaEntrySourcePerformance from "./UmaEntrySourcePerformance"

const labels = { overall: "Overall", cm: "CM", loh: "LoH" }

export default function UmaDetailPerformanceBreakdown({ cms, lohs, versionId }: { cms: CM[]; lohs: LoH[]; versionId: string }) {
  const [scope, setScope] = useState<UmaOverviewScope>("overall")
  const [league, setLeague] = useState<UmaResultLeague>("all")
  const [surface, setSurface] = useState<UmaSurfaceFilter>("All")
  const activeLeague = scope === "cm" ? league : "all"
  const scopes = useMemo(() => getUmaDetailPerformanceScopes(cms, lohs, versionId, activeLeague, surface), [cms, lohs, versionId, activeLeague, surface])
  const performance = scopes[scope]
  const scopeLabel = scope === "overall" ? "CM and LoH" : labels[scope]
  const categories = UMA_DISTANCE_CATEGORIES.map(category => ({
    ...(performance.categories.find(row => row.category === category) ?? { races: 0, wins: 0, winRate: null }), label: category,
  }))
  return <section className="uma-detail-category uma-detail-performance" data-scope={scope} aria-labelledby="uma-detail-performance-title">
    <div className="uma-detail-category-heading uma-detail-performance-heading">
      <h2 id="uma-detail-performance-title"><UmaStatisticsIcon name="activity" /><span>Performance</span></h2>
      <div className="uma-detail-performance-actions">
        <div className="uma-detail-performance-filters">
          {scope === "cm" && <select className="uma-detail-performance-filter uma-detail-performance-league" aria-label="CM league" value={league} onChange={event => setLeague(event.target.value as UmaResultLeague)}>
            <option value="all">All leagues</option>
            <option value="Open League">Open</option>
            <option value="Graded League">Graded</option>
          </select>}
          <label className="uma-detail-performance-surface"><span>Surface:</span>
            <select className="uma-detail-performance-filter" aria-label="Surface" value={surface} onChange={event => setSurface(event.target.value as UmaSurfaceFilter)}>
              <option value="All">All</option>
              <option value="Turf">Turf</option>
              <option value="Dirt">Dirt</option>
            </select>
          </label>
        </div>
        <div className="uma-detail-performance-scopes" role="group" aria-label="Performance Breakdown scope">
          {(["overall", "cm", "loh"] as const).map(value => <button type="button" key={value} aria-pressed={scope === value} onClick={() => setScope(value)}>{labels[value]}</button>)}
        </div>
      </div>
    </div>
    <div className="uma-detail-performance-grid">
      <UmaDistancePerformance events={performance.events} />
      <section className="uma-statistics-panel uma-detail-shortcuts" aria-labelledby="uma-detail-shortcuts-title">
        <div className="uma-statistics-section-heading"><h2 id="uma-detail-shortcuts-title">Distance Categories</h2></div>
        <UmaDetailPerformanceTable label="Category" rows={categories} />
        {performance.uncategorizedRaces > 0 && <p className="uma-detail-note">{performance.uncategorizedRaces.toLocaleString("en")} races have no saved distance category.</p>}
      </section>
      <UmaRunningStylePerformance cms={cms} versionId={versionId} performance={performance.runningStyles} scopeLabel={scopeLabel} />
      <UmaRolePerformance cms={cms} versionId={versionId} performance={performance.roles} scopeLabel={scopeLabel} />
      <UmaEntrySourcePerformance cms={cms} versionId={versionId} performance={performance.entrySources} scopeLabel={scopeLabel} />
      <section className="uma-statistics-panel uma-detail-surface" aria-labelledby="uma-detail-surface-title">
        <div className="uma-statistics-section-heading"><h2 id="uma-detail-surface-title">Surface Performance</h2></div>
        {performance.surfaces.length ? <UmaDetailPerformanceTable label="Surface" rows={performance.surfaces.map(row => ({ ...row, label: row.surface }))} /> : <p className="uma-detail-note">No recorded races on a known surface.</p>}
        {performance.unknownSurfaceRaces > 0 && <p className="uma-detail-note">{performance.unknownSurfaceRaces.toLocaleString("en")} races have no saved surface.</p>}
      </section>
    </div>
  </section>
}
