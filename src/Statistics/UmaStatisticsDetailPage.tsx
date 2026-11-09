import { useState } from "react"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import UnavailablePage from "../components/UnavailablePage"
import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import UmaStatisticsName from "./UmaStatisticsName"
import UmaDetailPerformanceBreakdown from "./UmaDetailPerformanceBreakdown"
import UmaChampionsMeetingHistory from "./UmaChampionsMeetingHistory"
import UmaDetailCMRecord from "./UmaDetailCMRecord"
import { getUmaChampionsMeetingHistory } from "./umaCMHistory"
import UmaStatisticsIcon from "./UmaStatisticsIcon"
import { calculateUmaDetailStatistics, getUmaDetailInsights } from "./umaDetailStatistics"
import { getUmaCareerOverall } from "./umaCareerStatistics"
import { formatUmaComparisonValue } from "./umaComparison"
import { formatUmaWinRate, MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"
import { calculateUmaRoleStatistics } from "./umaRoleStatistics"
import type { UmaStatisticsEntry } from "./umaStatistics"
import { getLoHUmaDetailStatistics } from "../LoH/umaDetailStatistics"
import { LoHUmaDetailSummary, LoHUmaDetailHistory } from "../LoH/LoHUmaDetailStatistics"
import "./UmaStatisticsDetailPage.css"

type Props = {
  uma: UmaStatisticsEntry | undefined
  cms: CM[]
  lohs?: LoH[]
  onBack: () => void
  onOpenCm: (cmNumber: CM["number"]) => void
  onOpenLoH?: (number: number) => void
}

const count = (value: number | null) => formatUmaComparisonValue(value, "number")

export default function UmaStatisticsDetailPage({ uma, cms, lohs = [], onBack, onOpenCm, onOpenLoH }: Props) {
  const [historyMode, setHistoryMode] = useState<"cm" | "loh">("cm")
  if (!uma) return <UnavailablePage />
  const statistics = calculateUmaDetailStatistics(cms, uma.versionId)
  const loh = getLoHUmaDetailStatistics(lohs, uma.versionId)
  const overall = getUmaCareerOverall(statistics, [loh.totals])
  const insights = getUmaDetailInsights(statistics)
  const { bestDistance, bestRunningStyle, mostUsedRunningStyle, bestSurface, bestCM } = insights.highlights
  const bestRole = calculateUmaRoleStatistics(cms, uma.versionId).rows.filter(row => row.role !== "unknown" && row.races >= MIN_RACES_FOR_WIN_RATE)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0) || b.races - a.races)[0]
  const highlights = [
    { label: "Best Distance", icon: "route" as const, value: bestDistance ? `${bestDistance.distance}m` : "—", detail: bestDistance ? `${formatUmaWinRate(bestDistance.winRate)} WR` : "" },
    { label: "Best Surface", icon: "route" as const, value: bestSurface?.surface ?? "—", detail: bestSurface ? `${formatUmaWinRate(bestSurface.winRate)} WR` : "" },
    { label: "Best Running Style", icon: "activity" as const, value: bestRunningStyle?.label ?? "—", detail: bestRunningStyle ? `${formatUmaWinRate(bestRunningStyle.winRate)} WR` : "" },
    { label: "Best Role", icon: "record" as const, value: bestRole?.label ?? "—", detail: bestRole ? `${formatUmaWinRate(bestRole.winRate)} WR` : "" },
    { label: "Best CM", icon: "trophy" as const, value: bestCM ? bestCM.name?.trim() || `CM${bestCM.number}` : "—", detail: bestCM ? `${formatUmaWinRate(bestCM.winRate)} WR` : "" },
    { label: "Best LoH Rank", icon: "trophy" as const, value: loh.bestRank ?? "—", detail: "" },
    { label: "Most Used Style", icon: "activity" as const, value: mostUsedRunningStyle?.label ?? "—", detail: mostUsedRunningStyle ? `${formatUmaWinRate(mostUsedRunningStyle.usage)} usage` : "" },
  ]
  const headline: [string, string][] = [["Races", count(overall.races)], ["Wins", count(overall.wins)], ["Win Rate", formatUmaWinRate(overall.winRate)], ["Events", count(overall.events)]]

  return <div className="uma-detail uma-detail-dashboard">
    <button type="button" className="uma-detail-back" onClick={onBack}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m14 6-6 6 6 6M8 12h12" /></svg>Back to Uma Statistics
    </button>
    <div className="uma-detail-dashboard-columns">
      <div className="uma-detail-dashboard-left">
        <header className="uma-statistics-panel uma-detail-record-header">
          <div className="uma-detail-profile">
            <UmaStatisticsAvatar uma={uma} />
            <div className="uma-detail-heading">
              <p className="uma-detail-profile-eyebrow">Individual Uma Record</p>
              <h1 id="uma-statistics-detail-title" tabIndex={-1}><UmaStatisticsName name={uma.name} deferResize /></h1>
            </div>
          </div>
          <dl className="uma-detail-metric-strip uma-detail-record-totals" aria-label="Career totals">{headline.map(([label, value]) => <div key={label} data-metric={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {uma.unresolved && <p className="uma-detail-note">Exact version unavailable. These historical records remain separate from known versions.</p>}
        </header>
        <UmaDetailCMRecord statistics={statistics} />
        <LoHUmaDetailSummary statistics={loh} />
      </div>

      <div className="uma-detail-dashboard-right">
        <UmaDetailPerformanceBreakdown cms={cms} lohs={lohs} versionId={uma.versionId} />
        <section className="uma-detail-category uma-detail-highlights-panel" aria-labelledby="uma-detail-highlights-title">
          <h2 id="uma-detail-highlights-title" className="uma-detail-category-heading"><UmaStatisticsIcon name="trophy" /><span>Highlights</span></h2>
          <dl className="uma-detail-compact-highlights">{highlights.map(row => <div key={row.label}><dt><UmaStatisticsIcon name={row.icon} />{row.label}</dt><dd><strong>{row.value}</strong>{row.detail && <span>{row.detail}</span>}</dd></div>)}</dl>
        </section>
      </div>
    </div>

    <section className="uma-detail-category uma-detail-history-category" aria-labelledby="uma-detail-history-title">
      <h2 id="uma-detail-history-title" className="uma-detail-category-heading"><UmaStatisticsIcon name="history" /><span>Event History</span></h2>
      <div className="uma-detail-history-tabs" role="group" aria-label="Event history type">
        {(["cm", "loh"] as const).map(mode => <button type="button" key={mode} aria-pressed={historyMode === mode} data-mode={mode} onClick={() => setHistoryMode(mode)}>{mode === "cm" ? "CM History" : "LoH History"}</button>)}
      </div>
      {historyMode === "cm" ? <UmaChampionsMeetingHistory compact cmHistory={getUmaChampionsMeetingHistory(cms, uma.versionId, statistics.events)} unresolved={uma.unresolved} onOpenCm={onOpenCm} />
        : <LoHUmaDetailHistory statistics={loh} onOpen={onOpenLoH} />}
    </section>
  </div>
}
