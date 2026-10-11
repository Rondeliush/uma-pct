import type { CM } from "../types/types"
import UnavailablePage from "../components/UnavailablePage"
import { CM_FINAL_PLACEMENTS, CM_FINAL_PLACEMENT_LABELS } from "../CMs/cmFinalPlacements"
import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import UmaDistancePerformance, { UmaDetailPerformanceTable } from "./UmaDistancePerformance"
import UmaRunningStylePerformance from "./UmaRunningStylePerformance"
import UmaRolePerformance from "./UmaRolePerformance"
import UmaEntrySourcePerformance from "./UmaEntrySourcePerformance"
import UmaChampionsMeetingHistory from "./UmaChampionsMeetingHistory"
import { getUmaChampionsMeetingHistory } from "./umaCMHistory"
import UmaEventPanelHeader from "./UmaEventPanelHeader"
import UmaStatisticsIcon from "./UmaStatisticsIcon"
import { calculateUmaDetailStatistics, getUmaDetailInsights } from "./umaDetailStatistics"
import type { UmaEventStatistics } from "./umaDetailStatistics"
import { getUmaCareerOverall } from "./umaCareerStatistics"
import { formatUmaComparisonValue } from "./umaComparison"
import { formatUmaWinRate } from "./umaStatistics"
import type { UmaStatisticsEntry } from "./umaStatistics"
import "./UmaStatisticsDetailPage.css"

type Props = {
  uma: UmaStatisticsEntry | undefined
  cms: CM[]
  onBack: () => void
  onOpenCm: (cmNumber: CM["number"]) => void
}

const formatCount = (value: number) => value.toLocaleString("en")
const eventName = (event: UmaEventStatistics) => event.name?.trim() || `Champions Meeting ${event.number}`

function CategoryHeading({ id, title, icon }: { id: string; title: string; icon: "record" | "route" | "activity" | "trophy" | "history" }) {
  return <h2 id={id} className="uma-detail-category-heading"><UmaStatisticsIcon name={icon} /><span>{title}</span></h2>
}

export default function UmaStatisticsDetailPage({ uma, cms, onBack, onOpenCm }: Props) {
  const backAction = (
    <button type="button" className="uma-detail-back uma-statistics-text-button" onClick={onBack}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m14 6-6 6 6 6M8 12h12" /></svg>
      Back to Uma Statistics
    </button>
  )
  if (!uma) return <UnavailablePage />
  const statistics = calculateUmaDetailStatistics(cms, uma.versionId)
  const overall = getUmaCareerOverall(statistics)
  const insights = getUmaDetailInsights(statistics)
  const { bestDistance, mostUsedDistance, bestRunningStyle, mostUsedRunningStyle, bestSurface, bestCM } = insights.highlights
  const highlights = [
    { label: "Best Distance", icon: "route" as const, tone: "cyan", value: bestDistance ? `${bestDistance.distance} m` : "—", detail: bestDistance ? `${formatUmaWinRate(bestDistance.winRate)} WR · ${formatCount(bestDistance.races)} races` : "Not enough recorded races" },
    { label: "Most Used Distance", icon: "activity" as const, tone: "blue", value: mostUsedDistance ? `${mostUsedDistance.distance} m` : "—", detail: mostUsedDistance ? `${formatCount(mostUsedDistance.races)} races` : "No recorded distances" },
    { label: "Best Running Style", icon: "activity" as const, tone: "violet", value: bestRunningStyle?.label ?? "—", detail: bestRunningStyle ? `${formatUmaWinRate(bestRunningStyle.winRate)} WR · ${formatCount(bestRunningStyle.races)} races` : "Not enough recorded races" },
    { label: "Most Used Running Style", icon: "flag" as const, tone: "blue", value: mostUsedRunningStyle?.label ?? "—", detail: mostUsedRunningStyle ? `${formatUmaWinRate(mostUsedRunningStyle.usage)} usage · ${formatCount(mostUsedRunningStyle.races)} races` : "No recorded running styles" },
    { label: "Best Surface", icon: "route" as const, tone: "cyan", value: bestSurface?.surface ?? "—", detail: bestSurface ? `${formatUmaWinRate(bestSurface.winRate)} WR · ${formatCount(bestSurface.races)} races` : "Not enough recorded races" },
    { label: "Best CM", icon: "trophy" as const, tone: "gold", value: bestCM ? eventName(bestCM) : "—", detail: bestCM ? `${formatUmaWinRate(bestCM.winRate)} WR · ${formatCount(bestCM.races)} races` : "Not enough recorded races" },
  ]
  const finalSummary: [string, string][] = [
    ["Final Appearances", formatCount(statistics.finalAppearances)],
    ["Podium Finishes", formatCount(statistics.podiumFinishes)],
    ["Podium Rate", formatUmaWinRate(statistics.podiumRate)],
    ["Final Win Rate", formatUmaWinRate(statistics.finalWinRate)],
  ]
  const classifiedFinals = statistics.finals.filter((record) => record.group !== null)
  const unclassifiedFinals = statistics.finals.find((record) => record.group === null)
  const hasUnrecordedPlacements = statistics.unrecordedFinalPlacements > 0
  const hasFinalGroups = classifiedFinals.length > 0 || statistics.finalAppearances === 0
  const finalRows = (["Final A", "Final B"] as const).map((group) => ({
    group,
    record: classifiedFinals.find((record) => record.group === group),
  }))
  const summaryGroups: { name: string; values: [string, string][] }[] = [
    { name: "Overall", values: [
      ["Races", formatUmaComparisonValue(overall.races, "number")],
      ["Wins", formatUmaComparisonValue(overall.wins, "number")],
      ["Win Rate", formatUmaWinRate(overall.winRate)],
      ["Events", formatUmaComparisonValue(overall.events, "number")],
    ] },
    { name: "Champions Meeting", values: [
      ["Final Appearances", formatCount(statistics.finalAppearances)],
      ["Final Wins", formatCount(statistics.finalWins)],
      ...finalRows.map(({ group, record }): [string, string] => [
        `${group} Appearances`, hasFinalGroups ? formatCount(record?.appearances ?? 0) : "—",
      ]),
    ] },
  ]

  return (
    <div className="uma-detail">
      {backAction}

      <header className="uma-statistics-panel uma-detail-header">
        <UmaStatisticsAvatar uma={uma} />
        <div className="uma-detail-heading">
          <p className="uma-detail-profile-eyebrow">Individual Uma Record</p>
          <h1 id="uma-statistics-detail-title" tabIndex={-1}>{uma.name}</h1>
          <p className="uma-detail-headline" aria-live="polite">{formatCount(statistics.races)} races · {formatCount(statistics.wins)} wins · {formatUmaWinRate(statistics.winRate)} WR</p>
          {uma.unresolved && <p className="uma-detail-note">Exact version unavailable. These historical records are kept separate from known versions.</p>}
        </div>
      </header>

      <section className="uma-statistics-panel uma-detail-career" aria-labelledby="uma-detail-career-category">
        <CategoryHeading id="uma-detail-career-category" title="Career Overview" icon="record" />
        <div className="uma-detail-summary-groups">
          {summaryGroups.map((group) => (
            <div key={group.name} className="uma-detail-summary-group">
              <h3 className="uma-detail-summary-label">{group.name}</h3>
              <dl className="uma-detail-summary">
                {group.values.map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd data-unavailable={value === "—"} className={label === "Win Rate" ? "uma-statistics-rate" : label === "Wins" || label === "Final Wins" ? "uma-detail-value-gold" : label.includes("Appearances") ? "uma-detail-value-violet" : undefined}>{value}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        {unclassifiedFinals && <p className="uma-detail-note">{hasFinalGroups ? "Final A/B counts exclude" : "Final A/B is unavailable for"} {formatCount(unclassifiedFinals.appearances)} {unclassifiedFinals.appearances === 1 ? "final" : "finals"} with unavailable qualification records.</p>}
      </section>

      <section className="uma-detail-category uma-detail-race-category" aria-labelledby="uma-detail-race-category">
        <CategoryHeading id="uma-detail-race-category" title="Race Performance" icon="route" />
        <div className="uma-detail-breakdowns">
          <UmaDistancePerformance events={statistics.events} />

          <section className="uma-statistics-panel uma-detail-surface" aria-labelledby="uma-detail-surface-title">
            <div className="uma-statistics-section-heading"><h2 id="uma-detail-surface-title">Surface Performance</h2></div>
            {insights.surfaces.length > 0 ? <UmaDetailPerformanceTable label="Surface" rows={insights.surfaces.map((surface) => ({ ...surface, label: surface.surface }))} /> : <p className="uma-detail-note">No recorded round races on a known surface.</p>}
            {insights.unknownSurfaceRaces > 0 && <p className="uma-detail-note">{formatCount(insights.unknownSurfaceRaces)} races have no saved Turf/Dirt surface and are excluded here.</p>}
          </section>
        </div>
      </section>

      <section className="uma-detail-category uma-detail-strategy-category" aria-labelledby="uma-detail-strategy-category">
        <CategoryHeading id="uma-detail-strategy-category" title="Strategy Performance" icon="activity" />
        <div className="uma-detail-breakdowns">
          <UmaRunningStylePerformance cms={cms} versionId={uma.versionId} />
          <UmaRolePerformance cms={cms} versionId={uma.versionId} />
          <UmaEntrySourcePerformance cms={cms} versionId={uma.versionId} />
        </div>
      </section>

      <section className="uma-detail-category uma-detail-competitive-category" aria-labelledby="uma-detail-competitive-category">
        <CategoryHeading id="uma-detail-competitive-category" title="Competitive Results" icon="trophy" />
        <div className="uma-detail-breakdowns">
          <section className="uma-statistics-panel uma-detail-finals" aria-labelledby="uma-detail-finals-title">
            <UmaEventPanelHeader title="CM Final Record" titleId="uma-detail-finals-title" />
            {statistics.finalAppearances > 0 ? (
              <>
                <table className="uma-statistics-distance-table uma-detail-final-table">
                  <caption>Individual placements when this Uma was in the final lineup</caption>
                  <thead><tr><th scope="col">Final</th>{CM_FINAL_PLACEMENTS.map((place) => <th key={place} scope="col">{CM_FINAL_PLACEMENT_LABELS[place]}</th>)}{hasUnrecordedPlacements && <th scope="col" aria-label="Unrecorded"><span className="hidden sm:inline">Unrecorded</span><span className="sm:hidden" aria-hidden="true">N/A</span></th>}</tr></thead>
                  <tbody>
                    {finalRows.map(({ group, record }) => (
                      <tr key={group} data-final-group={group}>
                        <th scope="row">{group}</th>
                        {CM_FINAL_PLACEMENTS.map((place) => (
                          <td key={place} data-unavailable={!hasFinalGroups}>{hasFinalGroups ? formatCount(record?.placements[place] ?? 0) : "—"}</td>
                        ))}
                        {hasUnrecordedPlacements && <td data-unavailable={!hasFinalGroups}>{hasFinalGroups ? formatCount(record?.unknownPlacements ?? 0) : "—"}</td>}
                      </tr>
                    ))}
                    {unclassifiedFinals && <tr><th scope="row">Group unavailable</th>{CM_FINAL_PLACEMENTS.map((place) => <td key={place}>{formatCount(unclassifiedFinals.placements[place])}</td>)}{hasUnrecordedPlacements && <td>{formatCount(unclassifiedFinals.unknownPlacements)}</td>}</tr>}
                  </tbody>
                </table>
                {hasUnrecordedPlacements && <p className="uma-detail-note">Some historical final placements were not recorded. Rates exclude unrecorded placements.</p>}
              </>
            ) : <p className="uma-detail-note">No recorded finals for {uma.unresolved ? "this entry" : "this version"}.</p>}
            <dl className="uma-detail-final-rates">
              {finalSummary.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd data-unavailable={value === "—"} className={label.endsWith("Rate") ? "uma-statistics-rate" : undefined}>{value}</dd></div>
              ))}
            </dl>
          </section>
          <section className="uma-statistics-panel uma-detail-highlights-panel" aria-labelledby="uma-detail-highlights-title">
            <UmaEventPanelHeader title="Highlights" titleId="uma-detail-highlights-title" />
            <dl className="uma-detail-highlights">
              {highlights.map((highlight) => (
                <div key={highlight.label} data-tone={highlight.tone} data-unavailable={highlight.value === "—"}><dt><UmaStatisticsIcon name={highlight.icon} />{highlight.label}</dt><dd><strong>{highlight.value}</strong><span>{highlight.detail}</span></dd></div>
              ))}
            </dl>
          </section>

        </div>
      </section>

      <section className="uma-detail-category uma-detail-history-category" aria-labelledby="uma-detail-history-category">
        <CategoryHeading id="uma-detail-history-category" title="Event History" icon="history" />
        <UmaChampionsMeetingHistory cmHistory={getUmaChampionsMeetingHistory(cms, uma.versionId, statistics.events)} unresolved={uma.unresolved} onOpenCm={onOpenCm} />
      </section>
    </div>
  )
}
