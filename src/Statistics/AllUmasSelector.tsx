import { useRef, useState } from "react"
import UmaDatabaseIcon from "../Umas/UmaDatabaseIcon"
import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import UmaStatisticsName from "./UmaStatisticsName"
import type { UmaPerformance } from "./umaStatistics"

type Props = {
  umas: Pick<UmaPerformance, "versionId" | "name" | "avatar">[]
  onSelect: (versionId: string, trigger: HTMLButtonElement) => void
  onCompare?: (trigger: HTMLButtonElement) => void
}

export default function AllUmasSelector({ umas, onSelect, onCompare }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState("")
  const railRef = useRef<HTMLDivElement>(null)
  const normalizedSearch = search.toLowerCase().trim()
  // The catalogue is supplied in version Name A-Z order, independently
  // of the performance-card sort. Both modes use the same grid and tile keys.
  const matchingUmas = umas.filter((uma) => uma.name.toLowerCase().includes(normalizedSearch))
  const visibleUmas = matchingUmas
  const scrollRail = (direction: number) => {
    const rail = railRef.current
    rail?.scrollBy({ left: direction * rail.clientWidth * .75, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
  }

  const toggleExpanded = () => {
    railRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" })
    setExpanded((current) => !current)
    if (expanded) setSearch("")
  }

  return (
    <section className="uma-statistics-browser" aria-labelledby="uma-statistics-browser-title">
      <div className="uma-statistics-all-header">
        <h2 id="uma-statistics-browser-title" className="uma-statistics-eyebrow">
          All Umas <span aria-label={`${umas.length} versions`}>{umas.length}</span>
        </h2>
        <label className="uma-statistics-search uma-statistics-all-search">
          <UmaDatabaseIcon name="search" />
          <span className="sr-only">Search Uma version names</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Uma…"
          />
        </label>
        {onCompare && <button type="button" className="uma-statistics-compare-toggle" onClick={event => onCompare(event.currentTarget)}>Compare</button>}
        <button
          type="button"
          className="uma-statistics-show-more"
          aria-expanded={expanded}
          aria-controls="uma-statistics-all-grid"
          onClick={toggleExpanded}
        >
          {expanded ? "Show Less" : "Show More"}
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={expanded ? "is-open" : ""}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      <div className="uma-statistics-selection-rail" data-expanded={expanded}>
      {!expanded && <button type="button" className="uma-statistics-rail-arrow" aria-label="Previous Uma versions" onClick={() => scrollRail(-1)}><UmaDatabaseIcon name="back" /></button>}
      <div
        ref={railRef}
        id="uma-statistics-all-grid"
        className="uma-statistics-all-grid"
        data-collapsed={!expanded}
        role="region"
        tabIndex={expanded ? 0 : undefined}
        aria-label={expanded ? "All Uma versions" : "Quick Uma selection"}
      >
        {visibleUmas.map((uma) => (
          <button
            key={uma.versionId}
            type="button"
            className="uma-statistics-avatar-tile"
            title={uma.name}
            aria-label={uma.name}
            onClick={(event) => onSelect(uma.versionId, event.currentTarget)}
          >
            <UmaStatisticsAvatar uma={uma} />
            <span><UmaStatisticsName name={uma.name} /></span>
          </button>
        ))}
      </div>
      {!expanded && <button type="button" className="uma-statistics-rail-arrow is-next" aria-label="Next Uma versions" onClick={() => scrollRail(1)}><UmaDatabaseIcon name="back" /></button>}
      </div>
      {visibleUmas.length === 0 && (
        <p className="uma-statistics-empty-search" role="status">No Umas match this name.</p>
      )}
    </section>
  )
}
