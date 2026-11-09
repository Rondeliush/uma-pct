import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import UmaStatisticsName from "./UmaStatisticsName"
import { formatUmaWinRate, sortUmaPerformance } from "./umaStatistics"
import type { UmaOverviewData, UmaOverviewScope } from "./umaOverviewTypes"

export default function UmaOverviewUsed({ statistics, scope, onSelect }: {
  statistics: UmaOverviewData
  scope: UmaOverviewScope
  onSelect: (versionId: string, trigger: HTMLButtonElement) => void
}) {
  const umas = sortUmaPerformance(statistics.umas, "races")
  const byVersion = new Map(statistics.umas.map(uma => [uma.versionId, uma]))
  const showRawPoints = scope !== "cm"
  const totalUmaRaces = umas.reduce((sum, uma) => sum + uma.races, 0)

  if (!umas.length) return <p className="uma-overview-breakdown-empty" role="status">No Umas have recorded races in this scope yet.</p>

  return <div className="uma-overview-breakdown-scroll uma-overview-used-scroll" role="region" aria-label="Umas used in the selected statistics scope" tabIndex={0}>
    <table aria-label="Umas used performance">
      <caption className="sr-only">Usage is each Uma's share of all recorded Uma race participations in the selected scope.</caption>
      <thead><tr><th scope="col">Uma</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th>{showRawPoints && <th scope="col">Raw PT</th>}<th scope="col">Usage</th></tr></thead>
      <tbody>{umas.map(uma => <tr key={uma.versionId}>
        <th scope="row"><button type="button" className="uma-overview-used-uma" aria-label={`View ${uma.name} statistics`} onClick={event => onSelect(uma.versionId, event.currentTarget)}>
          <UmaStatisticsAvatar uma={uma} /><UmaStatisticsName name={uma.name} />
        </button></th>
        <td>{uma.races.toLocaleString("en")}</td><td>{uma.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(uma.winRate)}</td>
        {showRawPoints && <td>{byVersion.get(uma.versionId)?.rawPoints === null ? "—" : (byVersion.get(uma.versionId)?.rawPoints ?? 0).toLocaleString("en")}</td>}
        <td data-stat="usage">{formatUmaWinRate(totalUmaRaces > 0 ? uma.races / totalUmaRaces * 100 : null)}</td>
      </tr>)}</tbody>
    </table>
  </div>
}
