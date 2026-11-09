import { useMemo, useState } from "react"
import type { CM, UmaVersion } from "../types/types"
import type { LoH } from "../LoH/types"
import AllUmasSelector from "./AllUmasSelector"
import UmaDatabaseIcon from "../Umas/UmaDatabaseIcon"
import UmaStatisticsIcon from "./UmaStatisticsIcon"
import UmaOverviewBreakdown from "./UmaOverviewBreakdown"
import type { BreakdownTab } from "./UmaOverviewBreakdown"
import UmaOverviewResults from "./UmaOverviewResults"
import UmaStatisticsShowcase from "./UmaStatisticsShowcase"
import UmaStatisticsName from "./UmaStatisticsName"
import { formatUmaWinRate } from "./umaStatistics"
import { rankUmaOverview } from "./umaRankingStatistics"
import { UMA_RESULT_METRICS } from "./umaResultRankings"
import type { UmaResultEventType, UmaResultLeague, UmaResultMetric } from "./umaResultRankings"
import type { UmaStatisticsEntry } from "./umaStatistics"
import type { UmaRunningStyleRow } from "./umaRunningStyleStatistics"
import type { UmaOverviewData, UmaOverviewScope } from "./umaOverviewTypes"
import "./UmaOverview.css"

type Props = {
  cms: CM[]
  lohs: LoH[]
  scopes: Record<UmaOverviewScope, UmaOverviewData>
  versions: UmaVersion[]
  active: boolean
  statistics: UmaOverviewData
  runningStyles: UmaRunningStyleRow[]
  scope: UmaOverviewScope
  onScope: (scope: UmaOverviewScope) => void
  catalogue: UmaStatisticsEntry[]
  onCompare: (trigger: HTMLButtonElement) => void
  onSelect: (versionId: string, trigger: HTMLButtonElement) => void
}

export default function UmaOverview({ cms, lohs, scopes, versions, active, statistics, runningStyles, scope, onScope, catalogue, onCompare, onSelect }: Props) {
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>("Umas Used")
  const [resultMetrics, setResultMetrics] = useState<Record<UmaResultEventType, UmaResultMetric>>({ cm: "final-a-appearances", loh: "raw-points" })
  const [resultLeague, setResultLeague] = useState<UmaResultLeague>("all")
  const resultType = scope === "loh" ? "loh" : "cm"
  const resultMetric = resultMetrics[resultType]
  const showingResults = breakdownTab === "Results"
  const changeBreakdownTab = (tab: BreakdownTab) => {
    setBreakdownTab(tab)
    if (tab === "Results" && scope === "overall") onScope("cm")
  }
  const insights = useMemo(() => {
    const uma = rankUmaOverview(statistics.umas, "races")[0]?.uma ?? null
    const totalUmaRaces = statistics.umas.reduce((sum, row) => sum + row.races, 0)
    return {
      style: [...runningStyles].filter(row => row.races > 0).sort((a, b) => b.races - a.races)[0] ?? null,
      uma,
      umaUsage: uma && totalUmaRaces > 0 ? uma.races / totalUmaRaces * 100 : null,
      role: [...statistics.roles].filter(row => row.races > 0).sort((a, b) => b.races - a.races)[0] ?? null,
      rate: scope === "cm" ? rankUmaOverview(statistics.umas, "win-rate")[0] ?? null : null,
      points: scope === "loh" ? rankUmaOverview(statistics.umas, "raw-points")[0] ?? null : null,
    }
  }, [runningStyles, statistics.umas, statistics.roles, scope])

  return <div className="uma-overview-redesign">
    <UmaStatisticsShowcase cms={cms} scopes={scopes} versions={versions} active={active} onSelect={onSelect} />
    <AllUmasSelector umas={catalogue} onSelect={onSelect} onCompare={onCompare} />
    <div className="uma-overview-stats-group">
    <section className="uma-overview-stats" data-scope={scope} data-results={showingResults} aria-labelledby="uma-overview-stats-title">
      <header className="uma-overview-stats-heading"><h2 id="uma-overview-stats-title" className="uma-statistics-eyebrow">Stats</h2></header>
      <div className="uma-overview-stats-content">
      <div className="uma-overview-stats-sidebar">
        <div className="uma-overview-scope-control">
        <div className="uma-overview-scope-heading">
        <div className="uma-overview-scope-switch" data-results={showingResults} role="group" aria-label="Statistics scope">
          {(["overall", "cm", "loh"] as const).map(value => <button key={value} type="button" data-scope-option={value}
            aria-pressed={scope === value} aria-hidden={showingResults && value === "overall"} disabled={showingResults && value === "overall"}
            onClick={() => onScope(value)}>{value === "overall" ? "Overall" : value === "cm" ? "CM" : "LoH"}</button>)}
        </div>
        </div>
        <div className="uma-overview-result-controls" data-open={showingResults} aria-hidden={!showingResults} inert={!showingResults}>
          <div className="uma-overview-result-controls-inner">
            <div className="uma-overview-result-filters">
              <label><span className="sr-only">Statistic</span><select aria-label="Results statistic" value={resultMetric} onChange={event => setResultMetrics(current => ({ ...current, [resultType]: event.target.value as UmaResultMetric }))}>
                {UMA_RESULT_METRICS[resultType].map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select></label>
              {resultType === "cm" && <label><span className="sr-only">League</span><select aria-label="Results CM league" value={resultLeague} onChange={event => setResultLeague(event.target.value as UmaResultLeague)}>
                <option value="all">All leagues</option><option value="Graded League">Graded</option><option value="Open League">Open</option>
              </select></label>}
            </div>
          </div>
        </div>
        </div>
        <dl className="uma-overview-totals">
          <div><dt><UmaDatabaseIcon name="grid" />Umas Used</dt><dd>{statistics.overall.umasUsed.toLocaleString("en")}</dd></div>
          <div><dt><UmaStatisticsIcon name="flag" />Total Races</dt><dd>{statistics.overall.races.toLocaleString("en")}</dd></div>
          <div><dt><UmaStatisticsIcon name="trophy" />Total Wins</dt><dd>{statistics.overall.wins.toLocaleString("en")}</dd></div>
          <div><dt><UmaStatisticsIcon name="activity" />Overall Win Rate</dt><dd>{formatUmaWinRate(statistics.overall.winRate)}</dd></div>
        </dl>
        <div className="uma-overview-highlights">
          <div><UmaStatisticsIcon name="activity" /><span><small>Most Used Running Style</small><strong>{insights.style?.label ?? "—"}</strong></span><span className="uma-overview-highlight-rate"><small>Usage</small><b>{formatUmaWinRate(insights.style?.usage ?? null)}</b></span></div>
          <div><UmaDatabaseIcon name="grid" /><span><small>Most Used Uma</small><strong>{insights.uma ? <UmaStatisticsName name={insights.uma.name} /> : "—"}</strong></span><span className="uma-overview-highlight-rate"><small>Usage</small><b>{formatUmaWinRate(insights.umaUsage)}</b></span></div>
          {scope === "loh"
            ? <div><UmaStatisticsIcon name="trophy" /><span><small>Top Raw Points Uma</small><strong>{insights.points ? <UmaStatisticsName name={insights.points.uma.name} /> : "—"}</strong></span><span className="uma-overview-highlight-rate"><small>Raw PT</small><b>{insights.points?.value?.toLocaleString("en") ?? "—"}</b></span></div>
            : scope === "cm"
            ? <div><UmaStatisticsIcon name="activity" /><span><small>Highest Win Rate</small><strong>{insights.rate ? <UmaStatisticsName name={insights.rate.uma.name} /> : "—"}</strong></span><span className="uma-overview-highlight-rate"><small>Win Rate</small><b>{formatUmaWinRate(insights.rate?.value ?? null)}</b></span></div>
            : <div><UmaStatisticsIcon name="record" /><span><small>Most Used Role</small><strong>{insights.role?.label ?? "—"}</strong></span><span className="uma-overview-highlight-rate"><small>Usage</small><b>{formatUmaWinRate(insights.role?.usage ?? null)}</b></span></div>}
        </div>
      </div>
      <UmaOverviewBreakdown statistics={statistics} scope={scope} active={breakdownTab} onTabChange={changeBreakdownTab} onSelect={onSelect}
        results={<UmaOverviewResults cms={cms} lohs={lohs} scopes={scopes} scope={resultType} metric={resultMetric} league={resultLeague} onSelect={onSelect} />} />
      </div>
    </section>
    </div>
  </div>
}
