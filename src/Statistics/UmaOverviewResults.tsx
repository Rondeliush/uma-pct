import { useMemo } from "react"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import UmaStatisticsName from "./UmaStatisticsName"
import { formatUmaWinRate, MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"
import { formatUmaRankingValue } from "./umaRankingStatistics"
import { getCMUmaResultRecords, getLoHUmaResultRecords, rankUmaResults, UMA_RESULT_METRICS } from "./umaResultRankings"
import type { UmaResultEventType, UmaResultLeague, UmaResultMetric } from "./umaResultRankings"
import type { UmaOverviewData, UmaOverviewScope } from "./umaOverviewTypes"

export default function UmaOverviewResults({ cms, lohs, scope, scopes, metric, league, onSelect }: {
  cms: CM[]
  lohs: LoH[]
  scope: UmaResultEventType
  scopes: Record<UmaOverviewScope, UmaOverviewData>
  metric: UmaResultMetric
  league: UmaResultLeague
  onSelect: (versionId: string, trigger: HTMLButtonElement) => void
}) {
  const eventType = scope
  const definition = UMA_RESULT_METRICS[eventType].find(item => item.id === metric)!
  const records = useMemo(() => eventType === "cm" ? getCMUmaResultRecords(cms, scopes.cm.umas, league)
    : getLoHUmaResultRecords(lohs, scopes.loh.umas), [cms, lohs, eventType, scopes.cm.umas, scopes.loh.umas, league])
  const ranking = useMemo(() => rankUmaResults(records, metric), [records, metric])
  const typeLabel = eventType === "cm" ? "Champions Meeting" : "League of Heroes"
  const unknownGroups = metric.startsWith("final-a-") || metric.startsWith("final-b-")
    ? records.filter(record => record.values[metric] === null).length : 0

  return <div className="uma-overview-result-rankings">
    <div className="sr-only">
      {metric === "win-rate" && <p>Minimum {MIN_RACES_FOR_WIN_RATE} recorded races in the selected event type{eventType === "cm" && " and league"}.</p>}
      {metric === "raw-points" && <p>Main Stage raw points before the Bronze cap. Extra Stage adds no Raw PT.</p>}
      {eventType === "cm" && metric.startsWith("final-") && <p>Recorded individual finals only.{unknownGroups > 0 && " " + unknownGroups + " Uma records with an unknown Final A/B group are excluded."}</p>}
      {metric.startsWith("extra-stage-") && <p>Recorded individual Extra Stage results only.</p>}
    </div>
    {ranking.length > 0 ? <div className="uma-overview-breakdown-scroll uma-overview-result-scroll" role="region" aria-label={typeLabel + " Uma results ranking"} tabIndex={0}>
      <table aria-label={typeLabel + " " + definition.label + " ranking"}>
        <thead><tr><th scope="col">Rank</th><th scope="col">Uma</th><th scope="col">{definition.label}</th><th scope="col">Record</th></tr></thead>
        <tbody>{ranking.map(row => <tr key={row.uma.versionId} data-version-id={row.uma.versionId} data-place={row.place}>
          <td className="uma-overview-result-place">{row.place}</td>
          <th scope="row"><button type="button" className="uma-overview-used-uma" aria-label={"View " + row.uma.name + " statistics"} onClick={event => onSelect(row.uma.versionId, event.currentTarget)}>
            <UmaStatisticsAvatar uma={row.uma} /><UmaStatisticsName name={row.uma.name} />
          </button></th>
          <td className="uma-statistics-rate">{formatUmaRankingValue(row.value, metric === "win-rate" ? "win-rate" : metric === "raw-points" ? "raw-points" : "wins")}</td>
          <td><span className="uma-overview-result-record"><span>{row.uma.races.toLocaleString("en")} races · {row.uma.wins.toLocaleString("en")} wins</span><small>{row.events.toLocaleString("en")} events · {formatUmaWinRate(row.uma.winRate)} WR</small></span></td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="uma-overview-breakdown-empty" role="status">No qualifying Uma results for this statistic and these filters.</p>}
  </div>
}
