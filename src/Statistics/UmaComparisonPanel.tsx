import { useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import type { UmaStatisticsEntry } from "./umaStatistics"
import UmaComparisonTable from "./UmaComparisonTable"
import UmaStatisticsSelector from "./UmaStatisticsSelector"
import { MAX_COMPARISON_UMAS, normalizeUmaComparisonSlots } from "./umaComparisonSelection"

export default function UmaComparisonPanel({ cms, lohs, catalogue, savedSlots, setSlots, onClose }: {
  cms: CM[]
  lohs: LoH[]
  catalogue: UmaStatisticsEntry[]
  savedSlots: (string | null)[]
  setSlots: Dispatch<SetStateAction<(string | null)[]>>
  onClose: () => void
}) {
  const validIds = useMemo(() => new Set(catalogue.map(uma => uma.versionId)), [catalogue])
  const slots = useMemo(() => normalizeUmaComparisonSlots(savedSlots, validIds), [savedSlots, validIds])
  const umas = useMemo(() => slots.map(id => catalogue.find(uma => uma.versionId === id) ?? null), [slots, catalogue])
  const selectedIds = slots.filter((id): id is string => id !== null)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [headerPinned, setHeaderPinned] = useState(true)
  const slotButtons = useRef<(HTMLButtonElement | null)[]>([])

  const closeSelector = () => {
    const index = activeSlot
    setActiveSlot(null)
    requestAnimationFrame(() => {
      if (index !== null) slotButtons.current[index]?.focus({ preventScroll: true })
    })
  }
  const addUma = (versionId: string) => {
    if (activeSlot === null || !validIds.has(versionId)) return
    setSlots(saved => {
      const current = normalizeUmaComparisonSlots(saved, validIds)
      return current.includes(versionId) || current[activeSlot] !== null
        ? current : current.map((id, index) => index === activeSlot ? versionId : id)
    })
    closeSelector()
  }
  const removeUma = (index: number) => {
    setSlots(saved => normalizeUmaComparisonSlots(saved, validIds).map((id, slot) => slot === index ? null : id))
    requestAnimationFrame(() => slotButtons.current[index]?.focus({ preventScroll: true }))
  }

  return <section id="uma-statistics-compare" className="uma-overview-comparison" aria-labelledby="uma-statistics-compare-title">
    <header className="uma-overview-comparison-heading">
      <h2 id="uma-statistics-compare-title" className="uma-statistics-eyebrow" tabIndex={-1}>Compare Umas</h2>
      <span className="uma-statistics-comparison-count" role="status">{selectedIds.length} / {MAX_COMPARISON_UMAS} selected</span>
      <button type="button" className="uma-statistics-text-button" onClick={onClose}>Back to Stats</button>
    </header>
    <div className="uma-overview-comparison-content">
      <p id="uma-comparison-note" className="uma-comparison-note">Select up to {MAX_COMPARISON_UMAS} versions to compare their competitive history.</p>
      {activeSlot !== null && <UmaStatisticsSelector key={activeSlot} id="uma-statistics-comparison-selector" umas={catalogue}
        selectedIds={selectedIds} onSelect={addUma} onClose={closeSelector} comparison />}
      <UmaComparisonTable cms={cms} lohs={lohs} slots={umas} activeSlot={activeSlot} headerPinned={headerPinned}
        onToggleHeaderPinned={() => setHeaderPinned(pinned => !pinned)}
        onAdd={index => activeSlot === index ? closeSelector() : setActiveSlot(index)} onRemove={removeUma}
        onSlotButton={(index, button) => { slotButtons.current[index] = button }} />
    </div>
  </section>
}
