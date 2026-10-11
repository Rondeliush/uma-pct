import type { CM } from "../types/types"
import { calculateUmaEntrySourceStatistics } from "./umaEntrySourceStatistics"
import { formatUmaWinRate } from "./umaStatistics"

export default function UmaEntrySourcePerformance({ cms, versionId }: { cms: CM[]; versionId: string }) {
  const performance = calculateUmaEntrySourceStatistics(cms, versionId)
  return (
    <section className="uma-statistics-panel uma-detail-entry-source" aria-labelledby="uma-detail-entry-source-title">
      <div className="uma-statistics-section-heading"><h2 id="uma-detail-entry-source-title">Entry Source Performance</h2></div>
      <table className="uma-statistics-distance-table uma-detail-style-table">
        <caption className="sr-only">Recorded CM entry sources. Usage is a share of round races with an attributable saved entry source.</caption>
        <colgroup><col className="uma-detail-style-label-column" /><col /><col /><col /><col /></colgroup>
        <thead><tr><th scope="col">Source</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th><th scope="col">Usage</th></tr></thead>
        <tbody>{performance.rows.map((row) => (
          <tr key={row.source} data-entry-source={row.source}>
            <th scope="row">{row.label}</th><td>{row.races.toLocaleString("en")}</td><td data-stat="wins">{row.wins.toLocaleString("en")}</td>
            <td className="uma-statistics-rate" data-unavailable={row.winRate === null}>{formatUmaWinRate(row.winRate)}</td>
            <td data-unavailable={row.usage === null}>{formatUmaWinRate(row.usage)}</td>
          </tr>
        ))}</tbody>
      </table>
      {performance.totalRaces === 0 && <p className="uma-detail-note">No recorded round races for this version.</p>}
      {performance.unknownSourceRaces > 0 && <p className="uma-detail-note">{performance.unknownSourceRaces.toLocaleString("en")} of {performance.totalRaces.toLocaleString("en")} races have missing or conflicting saved entry sources and are excluded from these rows and Usage.</p>}
    </section>
  )
}
