import { useState } from "react"
import UmaAvatarImage from "../components/UmaAvatarImage"
import UmaDatabaseIcon from "../Umas/UmaDatabaseIcon"
import UmaStatisticsName from "./UmaStatisticsName"
import type { UmaStatisticsEntry } from "./umaStatistics"

export function UmaStatisticsAvatar({ uma }: { uma: Pick<UmaStatisticsEntry, "name" | "avatar"> }) {
  return (
    <span className="uma-statistics-avatar">
      {uma.avatar ? (
        <UmaAvatarImage avatar={uma.avatar} alt="" loading="lazy" />
      ) : (
        <span aria-hidden="true">{uma.name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  )
}

type Props = {
  id: string
  umas: UmaStatisticsEntry[]
  selectedIds: string[]
  onSelect: (versionId: string) => void
  onClose: () => void
  comparison?: boolean
}

export default function UmaStatisticsSelector({
  id,
  umas,
  selectedIds,
  onSelect,
  onClose,
  comparison = false,
}: Props) {
  const [search, setSearch] = useState("")
  const normalizedSearch = search.toLowerCase().trim()
  const filtered = umas.filter((uma) => uma.name.toLowerCase().includes(normalizedSearch))

  return (
    <section id={id} className="uma-statistics-panel uma-statistics-selector" aria-label="Uma selector" onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }}>
      <div className="uma-statistics-section-heading">
        <div>
          <h2>{comparison ? "Add to comparison" : "All Umas"}</h2>
          <p>All Uma versions · Individual versions</p>
        </div>
        <button type="button" className="uma-statistics-icon-button" onClick={onClose} aria-label="Close Uma selector">
          <UmaDatabaseIcon name="close" />
        </button>
      </div>
      <label className="uma-statistics-search">
        <UmaDatabaseIcon name="search" />
        <span className="sr-only">Search Umas</span>
        <input type="search" autoFocus={comparison} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name…" />
      </label>
      <div className="uma-statistics-selector-grid cm-scrollbar">
        {filtered.map((uma) => {
          const selected = selectedIds.includes(uma.versionId)
          return (
            <button
              key={uma.versionId}
              type="button"
              className="uma-statistics-selector-tile"
              aria-pressed={selected}
              aria-label={comparison && selected ? `${uma.name}, already in comparison` : uma.name}
              disabled={comparison && selected}
              onClick={() => onSelect(uma.versionId)}
              title={uma.name}
            >
              <UmaStatisticsAvatar uma={uma} />
              <span className="uma-statistics-selector-name">{comparison ? <UmaStatisticsName name={uma.name} /> : uma.name}</span>
              {selected && <UmaDatabaseIcon name="check" className="uma-statistics-selection-check" />}
            </button>
          )
        })}
      </div>
      {filtered.length === 0 && <p className="uma-statistics-empty-search">No Umas match this name.</p>}
    </section>
  )
}
