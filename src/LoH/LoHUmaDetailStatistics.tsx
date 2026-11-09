import { EventCardSymbol } from "../components/event-card/EventCardBadge"
import { formatUmaComparisonValue } from "../Statistics/umaComparison"
import { formatUmaWinRate } from "../Statistics/umaStatistics"
import LoHRank from "./LoHRank"
import type { LoHUmaDetailStatistics } from "./umaDetailStatistics"

const count = (value: number | null) => formatUmaComparisonValue(value, "number")
const finishLabels = { first: "1st", second: "2nd", third: "3rd", fourth_or_lower: "4th+" }

export function LoHUmaDetailSummary({ statistics }: { statistics: LoHUmaDetailStatistics }) {
  const { totals, mainStage, extraStage } = statistics
  const metrics = [
    ["LoH Events", count(totals.events ?? 0)], ["Sets", count(statistics.sets)],
    ["Races", count(totals.races ?? 0)], ["Wins", count(totals.wins ?? 0)],
    ["Win Rate", formatUmaWinRate(totals.winRate)], ["Total Raw Points", count(totals.rawPoints ?? (statistics.rows.length ? null : 0))],
    ["Avg. Raw PT / Event", count(statistics.averageRawPointsPerEvent)], ["Top #96 Qual.", count(statistics.top96)],
    ["Extra Stage Wins", count(totals.extraStageFirstPlaces ?? 0)],
  ]
  return <section className="uma-detail-category uma-detail-mode-record" data-mode="loh" aria-labelledby="uma-detail-loh-title">
    <h2 id="uma-detail-loh-title" className="uma-detail-category-heading"><EventCardSymbol theme="loh" /><span>League of Heroes</span></h2>
    <div className="uma-detail-mode-content">
      <dl className="uma-detail-metric-strip uma-detail-loh-totals">{metrics.map(([label, value]) => <div key={label} data-metric={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="uma-detail-loh-breakdowns">
        <section className="uma-detail-inset" aria-labelledby="uma-detail-stages-title">
          <h3 id="uma-detail-stages-title">Stage Breakdown</h3>
          <table className="uma-statistics-distance-table"><thead><tr><th scope="col">Stage</th><th scope="col">Events</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th></tr></thead>
            <tbody>{[{ label: "Main Stage", ...mainStage }, { label: "Extra Stage", ...extraStage }].map(row =>
              <tr key={row.label}><th scope="row">{row.label}</th><td>{count(row.events)}</td><td>{count(row.races)}</td><td data-stat="wins">{count(row.wins)}</td><td className="uma-statistics-rate">{formatUmaWinRate(row.winRate)}</td></tr>
            )}</tbody></table>
        </section>
        <section className="uma-detail-inset" aria-labelledby="uma-detail-ranks-title">
          <h3 id="uma-detail-ranks-title">League Rank Counts</h3>
          <dl className="uma-detail-metric-strip uma-detail-rank-counts">{statistics.ranks.map(({ tier, count: amount }) => <div key={tier}><dt>{tier}</dt><dd>{count(amount)}</dd></div>)}</dl>
        </section>
      </div>
      <section className="uma-detail-inset uma-detail-placement-strip" aria-labelledby="uma-detail-placements-title">
        <h3 id="uma-detail-placements-title">Placement Results</h3>
        <dl className="uma-detail-metric-strip">{[totals.firstPlaces, totals.secondPlaces, totals.thirdPlaces, totals.fourthPlaces, totals.fifthPlaces, totals.sixthOrLowerPlaces].map((value, i) => <div key={i}><dt>{["1st", "2nd", "3rd", "4th", "5th", "6th+"][i]}</dt><dd>{count(value ?? (statistics.rows.length ? null : 0))}</dd></div>)}</dl>
      </section>
    </div>
  </section>
}

export function LoHUmaDetailHistory({ statistics, onOpen }: { statistics: LoHUmaDetailStatistics; onOpen?: (number: number) => void }) {
  return <section className="uma-statistics-panel uma-detail-loh-history" aria-label="League of Heroes history">
    {statistics.rows.length ? <div className="uma-detail-history-scroll"><table className="uma-statistics-distance-table">
      <colgroup><col className="uma-detail-loh-event-column" /><col /><col /><col /><col /><col /><col /><col /></colgroup>
      <thead><tr><th scope="col">Event</th><th scope="col">Sets</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th><th scope="col">Raw PT</th><th scope="col">League Rank</th><th scope="col">Extra Stage</th></tr></thead>
      <tbody>{statistics.rows.map(row => <tr key={row.event.id} className="uma-detail-loh-entry">
        <th scope="row">
          {onOpen && <button type="button" className="uma-detail-history-open" data-loh-number={row.event.number} onClick={() => onOpen(row.event.number)} aria-label={`Open LoH ${row.event.number}: ${row.event.name}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
          </button>}
          <div className="uma-detail-loh-event-heading"><strong>{row.event.name || `League of Heroes ${row.event.number}`}</strong><span>LoH{row.event.number} · {row.event.racecourse} · {row.event.surface} · {row.event.distance}m</span></div>
        </th>
        <td>{count(row.sets)}</td><td>{count(row.races)}</td><td data-stat="wins">{count(row.wins)}</td><td className="uma-statistics-rate">{formatUmaWinRate(row.winRate)}</td><td>{count(row.rawPoints)}</td>
        <td><LoHRank rank={row.rank} /></td><td>{row.extraPlacement ? finishLabels[row.extraPlacement] : "—"}</td>
      </tr>)}</tbody>
    </table></div> : <p className="uma-detail-note">No recorded League of Heroes history for this version yet.</p>}
  </section>
}
