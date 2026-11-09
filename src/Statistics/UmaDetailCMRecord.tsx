import { CM_FINAL_PLACEMENTS, CM_FINAL_PLACEMENT_LABELS } from "../CMs/cmFinalPlacements"
import { EventCardSymbol } from "../components/event-card/EventCardBadge"
import { getUmaDetailInsights } from "./umaDetailStatistics"
import type { UmaDetailStatistics } from "./umaDetailStatistics"
import { formatUmaWinRate } from "./umaStatistics"

const count = (value: number) => value.toLocaleString("en")

export default function UmaDetailCMRecord({ statistics }: { statistics: UmaDetailStatistics }) {
  const { finalAppearanceRate } = getUmaDetailInsights(statistics).eventPerformance
  const unclassified = statistics.finals.some(row => row.group === null)
  const metrics: [string, string][] = [
    ["CM Events", count(statistics.cmEvents)], ["CM Races", count(statistics.races)],
    ["CM Wins", count(statistics.wins)], ["CM Win Rate", formatUmaWinRate(statistics.winRate)],
  ]
  const finalMetrics: [string, string][] = [
    ["Final Appearances", count(statistics.finalAppearances)], ["Final Wins", count(statistics.finalWins)],
    ["Final App. Rate", formatUmaWinRate(finalAppearanceRate)], ["Final Podium Rate", formatUmaWinRate(statistics.podiumRate)],
    ["Final Win Rate", formatUmaWinRate(statistics.finalWinRate)],
  ]
  return <section className="uma-detail-category uma-detail-mode-record" data-mode="cm" aria-labelledby="uma-detail-cm-title">
    <h2 id="uma-detail-cm-title" className="uma-detail-category-heading"><EventCardSymbol theme="cm" /><span>Champions Meeting</span></h2>
    <div className="uma-detail-mode-content">
      <dl className="uma-detail-metric-strip">{metrics.map(([label, value]) => <div key={label} data-metric={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <section className="uma-detail-inset uma-detail-finals-overview" aria-label="Final statistics">
        <div className="uma-detail-finals-columns">
          <dl className="uma-detail-metric-strip uma-detail-final-wins">{(["Final A", "Final B"] as const).map(group => <div key={group}>
            <dt>{group} Wins</dt><dd>{unclassified ? "—" : count(statistics.finals.find(row => row.group === group)?.placements.first ?? 0)}</dd>
          </div>)}</dl>
          <div><h4>Final Placements</h4><dl className="uma-detail-metric-strip uma-detail-final-places">{CM_FINAL_PLACEMENTS.map(place => <div key={place}>
            <dt>{CM_FINAL_PLACEMENT_LABELS[place]}</dt><dd>{count(statistics.finals.reduce((sum, row) => sum + row.placements[place], 0))}</dd>
          </div>)}</dl></div>
          <dl className="uma-detail-metric-strip uma-detail-podium-total"><div><dt>Podium Finishes</dt><dd>{count(statistics.podiumFinishes)}</dd></div></dl>
        </div>
        {statistics.unrecordedFinalPlacements > 0 && <p className="uma-detail-note">{count(statistics.unrecordedFinalPlacements)} final placements unrecorded.</p>}
        {unclassified && <p className="uma-detail-note">Final A/B is unavailable for some historical finals.</p>}
      </section>
      <dl className="uma-detail-metric-strip uma-detail-final-rates-strip">{finalMetrics.map(([label, value]) => <div key={label} data-metric={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
  </section>
}
