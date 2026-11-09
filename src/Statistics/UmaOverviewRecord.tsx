import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import UmaStatisticsName from "./UmaStatisticsName"
import { formatUmaWinRate } from "./umaStatistics"
import type { UmaStatisticsEntry } from "./umaStatistics"
import type { OverviewUma, UmaOverviewScope } from "./umaOverviewTypes"

type Props = {
  uma: UmaStatisticsEntry
  record: OverviewUma | undefined
  scope: UmaOverviewScope
  onBack: () => void
  onOpenCmDetails: () => void
}

/** The same version totals as the overview; CM's existing detailed record stays available. */
export default function UmaOverviewRecord({ uma, record, scope, onBack, onOpenCmDetails }: Props) {
  const scopeLabel = scope === "loh" ? "League of Heroes" : "Overall · CM + LoH"
  const count = (value: number) => value.toLocaleString("en")
  const metrics: [string, string][] = [
    ["Races", count(record?.races ?? 0)], ["Wins", count(record?.wins ?? 0)], ["Win Rate", formatUmaWinRate(record?.winRate ?? null)],
    ...(scope === "overall" ? [["CM Events", count(record?.cmEvents ?? 0)], ["CM Final Appearances", count(record?.finalAppearances ?? 0)]] as [string, string][] : []),
    ["LoH Events", count(record?.lohEvents ?? 0)], ["Extra Stage Appearances", count(record?.extraStageAppearances ?? 0)],
    ["LoH Raw Points", record?.rawPoints === null ? "—" : count(record?.rawPoints ?? 0)],
  ]
  return <div className="uma-overview-record">
    <button type="button" className="uma-statistics-text-button" onClick={onBack}>← Back to Uma Statistics</button>
    <header><UmaStatisticsAvatar uma={uma} /><div><p>{scopeLabel}</p><h1 id="uma-statistics-detail-title" tabIndex={-1}><UmaStatisticsName name={uma.name} /></h1></div></header>
    <section aria-label={`${scopeLabel} career totals`}>
      <dl>{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {!record && <p>No recorded races for this Uma in this scope.</p>}
      <p>{scope === "loh" ? "LoH records include Main Stage and recorded Extra Stage races." : "Individual records include raced CM finals and LoH Extra Stage."} Raw Points come from LoH Main Stage placements.</p>
    </section>
    {!!record?.distances.length && <section aria-labelledby="uma-overview-record-distance"><h2 id="uma-overview-record-distance">Distance Performance</h2><div className="uma-overview-performance-table">
      <table><thead><tr><th scope="col">Distance</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th></tr></thead><tbody>
        {[...record.distances].sort((a, b) => a.distance - b.distance).map(row => <tr key={row.distance}><th scope="row">{count(row.distance)} m</th><td>{count(row.races)}</td><td>{count(row.wins)}</td><td>{formatUmaWinRate(row.winRate)}</td></tr>)}
      </tbody></table>
    </div></section>}
    <button type="button" className="uma-statistics-text-button" onClick={onOpenCmDetails}>View detailed CM record →</button>
  </div>
}
