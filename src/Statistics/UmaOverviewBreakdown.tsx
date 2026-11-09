import { useRef } from "react"
import type { ReactNode } from "react"
import { formatUmaWinRate } from "./umaStatistics"
import type { RaceStatistics } from "./umaStatistics"
import type { UmaOverviewData, UmaOverviewScope } from "./umaOverviewTypes"
import UmaOverviewUsed from "./UmaOverviewUsed"

const tabs = ["Umas Used", "Styles / Roles", "Results"] as const
export type BreakdownTab = typeof tabs[number]
type BreakdownRow = RaceStatistics & { label: string; usage?: number | null }

export default function UmaOverviewBreakdown({ statistics, scope, active, onTabChange, results, onSelect }: {
  statistics: UmaOverviewData
  scope: UmaOverviewScope
  active: BreakdownTab
  onTabChange: (tab: BreakdownTab) => void
  results: ReactNode
  onSelect: (versionId: string, trigger: HTMLButtonElement) => void
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scopeLabel = scope === "overall" ? "Overall" : scope === "cm" ? "Champions Meeting" : "League of Heroes"
  const groups: { label: string; rows: BreakdownRow[] }[] = [
    { label: "Running Styles", rows: statistics.runningStyles },
    { label: "Roles", rows: statistics.roles },
  ]
  const showUsage = active === "Styles / Roles"
  const hasData = groups.some(group => group.rows.some(row => row.races > 0))
  const activeIndex = tabs.indexOf(active)

  return <section className="uma-overview-breakdown" aria-labelledby="uma-overview-breakdown-title">
    <div className="uma-overview-breakdown-heading">
      <h3 id="uma-overview-breakdown-title">{scopeLabel}</h3>
      <div className="uma-overview-breakdown-tabs" role="tablist" aria-label="Performance">
        {tabs.map((tab, index) => <button key={tab} ref={el => { tabRefs.current[index] = el }} type="button" role="tab"
          id={`uma-breakdown-tab-${index}`} aria-controls="uma-overview-breakdown-content" aria-selected={active === tab} tabIndex={active === tab ? 0 : -1}
          onClick={() => onTabChange(tab)} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
            event.preventDefault()
            const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowLeft" ? tabs.length - 1 : 1)) % tabs.length
            onTabChange(tabs[next]); tabRefs.current[next]?.focus()
          }}>{tab}</button>)}
      </div>
    </div>
    <div id="uma-overview-breakdown-content" role="tabpanel" aria-labelledby={`uma-breakdown-tab-${activeIndex}`} tabIndex={0}>
      {active === "Umas Used" && <UmaOverviewUsed statistics={statistics} scope={scope} onSelect={onSelect} />}
      <div className="uma-overview-results-panel" hidden={active !== "Results"}>{results}</div>
      {showUsage && <>
        {hasData ? <div className="uma-overview-breakdown-scroll"><table aria-label={`${scopeLabel} styles and roles performance`}>
          <thead><tr><th scope="col">Category</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th><th scope="col">Usage</th></tr></thead>
          {groups.map(group => <tbody key={group.label}>
            <tr className="uma-overview-breakdown-group"><th scope="rowgroup" colSpan={5}>{group.label}</th></tr>
            {group.rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.races.toLocaleString("en")}</td><td>{row.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(row.winRate)}</td><td>{formatUmaWinRate(row.usage ?? null)}</td></tr>)}
          </tbody>)}
        </table></div> : <p className="uma-overview-breakdown-empty" role="status">No recorded style or role data in {scopeLabel} yet.</p>}
      </>}
      {showUsage && <p className="sr-only">Usage is calculated separately for configurations with a known running style and configurations with a known role.</p>}
    </div>
  </section>
}
