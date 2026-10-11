import { useEffect, useId, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import type { CM } from "../types/types"
import UmaDatabaseIcon from "../Umas/UmaDatabaseIcon"
import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import UmaStatisticsName from "./UmaStatisticsName"
import type { UmaStatisticsEntry } from "./umaStatistics"
import { formatUmaComparisonValue, getUmaComparisonValues, getUmaComparisonWinners, UMA_COMPARISON_SECTIONS } from "./umaComparison"
import { useUmaComparisonStickyHeader } from "./useUmaComparisonStickyHeader"
import "../components/BadgeTooltip.css"
import "./UmaComparisonTable.css"

type Props = {
  cms: CM[]
  slots: (UmaStatisticsEntry | null)[]
  activeSlot: number | null
  headerPinned: boolean
  onToggleHeaderPinned: () => void
  onAdd: (index: number) => void
  onRemove: (index: number) => void
  onSlotButton: (index: number, button: HTMLButtonElement | null) => void
}

export default function UmaComparisonTable({ cms, slots, activeSlot, headerPinned, onToggleHeaderPinned, onAdd, onRemove, onSlotButton }: Props) {
  const [cmExpanded, setCmExpanded] = useState(true)
  const [pinTooltip, setPinTooltip] = useState<{ left: number; top: number } | null>(null)
  const pinTooltipId = useId()
  const pinLabel = headerPinned ? "Keep Uma avatars visible while scrolling" : "Keep Uma avatars in their original position"
  const values = useMemo(() => slots.map((uma) => getUmaComparisonValues(cms, uma?.versionId ?? null)), [cms, slots])
  const { containerRef, sentinelRef, headerRowRef } = useUmaComparisonStickyHeader(slots, headerPinned)
  useEffect(() => {
    if (!pinTooltip) return
    const dismiss = () => setPinTooltip(null)
    window.addEventListener("scroll", dismiss, true)
    window.addEventListener("resize", dismiss)
    return () => {
      window.removeEventListener("scroll", dismiss, true)
      window.removeEventListener("resize", dismiss)
    }
  }, [pinTooltip])
  const showPinTooltip = (button: HTMLButtonElement) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    const bounds = button.getBoundingClientRect()
    setPinTooltip({ left: Math.max(8, Math.min(bounds.left, window.innerWidth - 268)), top: Math.min(bounds.bottom + 8, window.innerHeight - 64) })
  }
  const pinButton = (
    <button type="button" className="uma-comparison-pin" aria-label={pinLabel} aria-pressed={headerPinned} aria-describedby={pinTooltip ? pinTooltipId : undefined}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") showPinTooltip(event.currentTarget) }}
      onPointerLeave={(event) => { if (!event.currentTarget.matches(":focus-visible")) setPinTooltip(null) }}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) showPinTooltip(event.currentTarget) }}
      onBlur={() => setPinTooltip(null)}
      onKeyDown={(event) => { if (event.key === "Escape") setPinTooltip(null) }}
      onClick={() => { setPinTooltip(null); onToggleHeaderPinned() }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill={headerPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6l-1 5 3 4v2H7v-2l3-4-1-5ZM12 14v7" /></svg>
    </button>
  )

  return (
    <>
      <p id="uma-comparison-legend" className="uma-comparison-legend"><span aria-hidden="true" />Cyan marks the highest valid values, including ties. Gold marks the most final wins. — means unavailable.</p>
      <div ref={containerRef} className="uma-comparison-scroll" role="region" aria-label="Uma comparison table" aria-describedby="uma-comparison-note uma-comparison-legend">
        <span ref={sentinelRef} className="uma-comparison-sticky-sentinel" aria-hidden="true" />
        <table id="uma-comparison-table" className="uma-comparison-table">
          <caption className="sr-only">Compare individual Uma versions across General and Champions Meeting statistics. Final Appearance Rate = Final Appearances / CM Events. Podium Rate = top-three finishes / finals with known individual placement. Final Win Rate = 1st Finishes / finals with known individual placement.</caption>
          <colgroup><col className="uma-comparison-stat-column" />{slots.map((uma, index) => <col key={index} className={uma ? "uma-comparison-selected-column" : "uma-comparison-empty-column"} />)}</colgroup>
          <thead>
            <tr ref={headerRowRef}>
              <th scope="col" className="uma-comparison-corner" aria-label="Statistic">
                <span className="uma-comparison-corner-label">Statistic</span>
                {pinButton}
              </th>
              {slots.map((uma, index) => (
                <th key={index} scope="col" className="uma-comparison-column-header" aria-label={uma?.name ?? `Empty comparison slot ${index + 1}`} title={uma?.name}>
                  {uma ? (
                    <div className="uma-statistics-comparison-slot">
                      <button ref={(element) => onSlotButton(index, element)} type="button" className="uma-statistics-icon-button uma-statistics-remove" aria-label={`Remove ${uma.name} from comparison`} onClick={() => onRemove(index)}><UmaDatabaseIcon name="close" /></button>
                      <UmaStatisticsAvatar uma={uma} />
                      <span className="uma-statistics-comparison-slot-name" title={uma.name}><UmaStatisticsName name={uma.name} /></span>
                    </div>
                  ) : (
                    <button ref={(element) => onSlotButton(index, element)} type="button" className="uma-statistics-add-slot" aria-label={`Add Uma to comparison slot ${index + 1}`} aria-expanded={activeSlot === index} aria-controls="uma-statistics-comparison-selector" onClick={() => onAdd(index)}>
                      <UmaDatabaseIcon name="plus" className="h-6 w-6" /><span>Add<span className="uma-comparison-add-word"> Uma</span></span>
                    </button>
                  )}
                </th>
              ))}
            </tr>
            <tr className="uma-comparison-header-space" aria-hidden="true"><td colSpan={slots.length + 1} /></tr>
          </thead>
          {UMA_COMPARISON_SECTIONS.map((section) => (
            <tbody key={section.id}>
              <tr className="uma-comparison-group" data-section={section.id} data-tone={section.tone}>
                <th scope="rowgroup" colSpan={slots.length + 1}>
                  <span className="uma-comparison-section-label">{section.label}{section.status === "soon" && <span className="uma-comparison-soon">SOON</span>}</span>
                  {section.id === "cm" && <button type="button" className="uma-comparison-section-toggle" aria-label={`${cmExpanded ? "Collapse" : "Expand"} Champions Meeting statistics`} aria-expanded={cmExpanded} onClick={() => setCmExpanded((expanded) => !expanded)}><span aria-hidden="true">{cmExpanded ? "−" : "+"}</span></button>}
                </th>
              </tr>
              {(section.id !== "cm" || cmExpanded) && section.rows.map((row) => {
                const cells = values.map((column) => row.getValue(column))
                const winners = getUmaComparisonWinners(cells, row.format, row.ranking)
                return (
                  <tr key={row.id} data-stat={row.id}>
                    <th scope="row">{row.label}</th>
                    {cells.map((value, index) => (
                      <td key={index} data-best={winners[index] || undefined} data-unavailable={value === null || undefined}>
                        {formatUmaComparisonValue(value, row.format)}
                        {winners[index] && <span className="sr-only"> (highest value in this row)</span>}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>
      {pinTooltip && createPortal(<div id={pinTooltipId} role="tooltip" className="badge-tooltip" style={pinTooltip}>{pinLabel}</div>, document.body)}
    </>
  )
}
