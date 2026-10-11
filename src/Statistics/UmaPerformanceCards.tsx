import { useId } from "react"
import RankingBadge from "../components/RankingBadge"
import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import { formatUmaWinRate } from "./umaStatistics"
import type { UmaPerformance, UmaStatisticsSort } from "./umaStatistics"
import useUmaPerformanceSwipe from "./useUmaPerformanceSwipe"
import "./UmaPerformanceCards.css"

type Props = {
  umas: UmaPerformance[]
  sort: UmaStatisticsSort
  selectedVersionId: string | null
  onSelect: (versionId: string, trigger: HTMLButtonElement) => void
}

const rankingSlotCount = 10

// Reuse the Event Statistics podium colors and shadow utilities; keep card sizing intact.
const podiumFrameClasses = {
  gold: "triple-tie-shimmer border-[#facc15]/85! before:border-[2.5px] before:border-[#facc15]/85 shadow-[0_0_20px_rgba(250,204,21,0.18)]! hover:shadow-[0_0_32px_rgba(250,204,21,0.38)]!",
  silver: "border-gray-400/70! before:border-2 before:border-gray-400/70 hover:border-gray-300! hover:before:border-gray-300 shadow-lg! hover:shadow-2xl!",
  bronze: "border-orange-500/70! before:border-2 before:border-orange-500/70 hover:border-orange-300! hover:before:border-orange-300 shadow-lg! hover:shadow-2xl!",
}

function ordinal(position: number) {
  const lastTwoDigits = position % 100
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13 ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[position % 10] ?? "th"
  return `${position}${suffix}`
}

export default function UmaPerformanceCards({ umas, sort, selectedVersionId, onSelect }: Props) {
  const { attachFrame, visibleCards, startIndex, lastStartIndex, isDragging, isVisible, cardStyle, style, handlers } = useUmaPerformanceSwipe(rankingSlotCount)
  const positionId = useId()
  const performanceRanking = sort !== "name-az" && sort !== "name-za"
  const cards = Array.from({ length: rankingSlotCount }, (_, index) => {
    const uma = umas[index] ?? null
    const rank = performanceRanking ? ordinal(index + 1) : `#${index + 1}`
    const slotStyle = cardStyle(index)
    if (!uma) return (
      <div key={`empty-${index}`} className="uma-statistics-performance-card uma-performance-empty-card" role="group" aria-label={`${rank} ranking position, no data yet`} data-position={index + 1} data-empty="true" aria-hidden={!isVisible(index) || undefined} inert={!isVisible(index)} style={{ ...slotStyle, opacity: Number(slotStyle.opacity ?? 1) * 0.72 }}>
        <RankingBadge className="uma-performance-card-rank">{rank}</RankingBadge>
        <span className="uma-performance-empty-portrait" aria-hidden="true">—</span>
        <div className="uma-statistics-performance-body">
          <h3>No data yet</h3>
          <dl className="uma-statistics-card-values">
            <div><dt>Races</dt><dd>—</dd></div>
            <div><dt>Wins</dt><dd>—</dd></div>
            <div><dt>Win Rate</dt><dd>—</dd></div>
          </dl>
        </div>
      </div>
    )
    const medal = performanceRanking && index < 3 ? (["gold", "silver", "bronze"] as const)[index] : undefined
    return (
      <button key={uma.versionId} type="button" className={`uma-statistics-performance-card${medal ? ` ${podiumFrameClasses[medal]}` : ""}`} title={uma.name} data-version-id={uma.versionId} data-position={index + 1} data-medal={medal} aria-pressed={selectedVersionId === uma.versionId} aria-label={`View ${uma.name} statistics, ${rank}`} aria-hidden={!isVisible(index) || undefined} inert={!isVisible(index)} style={slotStyle} onClick={(event) => onSelect(uma.versionId, event.currentTarget)}>
        <RankingBadge className="uma-performance-card-rank" medal={medal}>{rank}</RankingBadge>
        <UmaStatisticsAvatar uma={uma} />
        <div className="uma-statistics-performance-body">
          <h3 title={uma.name}>{uma.name}</h3>
          <dl className="uma-statistics-card-values">
            <div><dt>Races</dt><dd>{uma.races.toLocaleString("en")}</dd></div>
            <div><dt>Wins</dt><dd data-stat="wins">{uma.wins.toLocaleString("en")}</dd></div>
            <div><dt>Win Rate</dt><dd className="uma-statistics-rate" data-unavailable={uma.winRate === null}>{formatUmaWinRate(uma.winRate)}</dd></div>
          </dl>
        </div>
      </button>
    )
  })

  return (
    <div ref={attachFrame} className="uma-performance-carousel" role="region" aria-roledescription="carousel" aria-labelledby="uma-statistics-performance-title" aria-describedby={positionId} tabIndex={lastStartIndex > 0 ? 0 : undefined} aria-keyshortcuts={lastStartIndex > 0 ? "ArrowLeft ArrowRight Home End" : undefined} data-window-start={startIndex} data-visible-count={visibleCards} data-scrollable={lastStartIndex > 0 || undefined} data-dragging={isDragging || undefined} data-has-previous={startIndex > 0 || undefined} data-has-next={startIndex < lastStartIndex || undefined} style={style} {...handlers}>
      <div className="uma-performance-carousel-viewport">
        <div className="uma-performance-carousel-track">{cards}</div>
      </div>
      <div id={positionId} className="uma-performance-carousel-position" role="status">
        <span className="uma-performance-carousel-progress" aria-hidden="true"><span style={{ width: `${visibleCards / rankingSlotCount * 100}%`, left: `${startIndex / rankingSlotCount * 100}%` }} /></span>
        <span><span className="sr-only">Positions </span>{startIndex + 1}–{startIndex + visibleCards} / {rankingSlotCount}</span>
      </div>
    </div>
  )
}
