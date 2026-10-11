import type { CM } from "../types/types"
import { calculateUmaRoleStatistics } from "./umaRoleStatistics"
import { formatUmaWinRate } from "./umaStatistics"

export default function UmaRolePerformance({ cms, versionId }: { cms: CM[]; versionId: string }) {
  const performance = calculateUmaRoleStatistics(cms, versionId)
  return (
    <section className="uma-statistics-panel uma-detail-role" aria-labelledby="uma-detail-role-title">
      <div className="uma-statistics-section-heading"><h2 id="uma-detail-role-title">Role Performance</h2></div>
      <table className="uma-statistics-distance-table uma-detail-style-table">
        <caption className="sr-only">Recorded CM role configurations. Usage is a share of all recorded round races for this version, including Unknown.</caption>
        <colgroup><col className="uma-detail-style-label-column" /><col /><col /><col /><col /></colgroup>
        <thead><tr><th scope="col">Role</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th><th scope="col">Usage</th></tr></thead>
        <tbody>{performance.rows.map((row) => (
          <tr key={row.role} data-role={row.role}>
            <th scope="row">{row.label}</th><td>{row.races.toLocaleString("en")}</td><td data-stat="wins">{row.wins.toLocaleString("en")}</td>
            <td className="uma-statistics-rate" data-unavailable={row.winRate === null}>{formatUmaWinRate(row.winRate)}</td>
            <td data-unavailable={row.usage === null}>{formatUmaWinRate(row.usage)}</td>
          </tr>
        ))}</tbody>
      </table>
      {performance.totalRaces === 0 && <p className="uma-detail-note">No recorded round races for this version.</p>}
      {performance.unknownRoleRaces > 0 && <p className="uma-detail-note">{performance.unknownRoleRaces.toLocaleString("en")} of {performance.totalRaces.toLocaleString("en")} races have missing or conflicting saved roles and are shown as Unknown. Usage includes these races.</p>}
    </section>
  )
}
