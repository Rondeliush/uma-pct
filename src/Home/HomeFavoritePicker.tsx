import { useEffect, useId, useRef, useState } from "react"
import type { UmaVersion } from "../types/types"
import UmaAvatarImage from "../components/UmaAvatarImage"
import UmaName from "../LoH/components/LoHUmaName"

export default function HomeFavoritePicker({ versions, selectedId, onSelect, onClose }: { versions: UmaVersion[]; selectedId: string; onSelect: (id: string) => Promise<void>; onClose: (restoreFocus?: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [search, setSearch] = useState("")
  const [highlighted, setHighlighted] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const query = search.toLowerCase().trim()
  const matching = query ? versions.filter(version => (!version.archived || version.id === selectedId) && version.displayName.toLowerCase().includes(query))
    .sort((a, b) => a.displayName.localeCompare(b.displayName)) : []
  const activeIndex = Math.min(highlighted, Math.max(0, matching.length - 1))

  useEffect(() => { inputRef.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const list = optionsRef.current
    const option = list?.children[activeIndex] as HTMLElement | undefined
    if (!list || !option) return
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
  }, [activeIndex, query])

  async function choose(version: UmaVersion) {
    if (saving) return
    setSaving(true); setError("")
    try { await onSelect(version.id); onClose() }
    catch { setError("Unable to save your favorite. Please try again."); setSaving(false); requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true })) }
  }

  return <div className="home-favorite-picker" onBlur={event => { if (!saving && !event.currentTarget.contains(event.relatedTarget)) onClose(false) }}>
    <div className="home-favorite-search-bar">
      <input ref={inputRef} type="search" role="combobox" aria-label="Search favorite Uma by name" aria-autocomplete="list" aria-controls={listId} aria-expanded={matching.length > 0} aria-activedescendant={matching.length ? `${listId}-${activeIndex}` : undefined} value={search} disabled={saving} placeholder="Search Uma…" onChange={event => { setSearch(event.target.value); setHighlighted(0) }} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!saving) onClose() }
        else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && matching.length) { event.preventDefault(); setHighlighted((activeIndex + (event.key === "ArrowDown" ? 1 : -1) + matching.length) % matching.length) }
        else if (event.key === "Enter") { event.preventDefault(); if (matching[activeIndex]) void choose(matching[activeIndex]) }
      }} />
      <button type="button" disabled={saving} onClick={() => onClose()} aria-label="Cancel favorite selection">×</button>
    </div>
    <p className="home-favorite-search-hint" role="status">{saving ? "Saving favorite…" : !query ? "Type a name to find an Uma version." : !matching.length ? "No matching Uma versions." : `${matching.length} ${matching.length === 1 ? "version" : "versions"} found`}</p>
    {error && <p role="alert">{error}</p>}
    {matching.length > 0 && <div ref={optionsRef} id={listId} role="listbox" aria-label="Matching Uma versions" className="home-favorite-options">{matching.map((version, index) => <button type="button" role="option" id={`${listId}-${index}`} key={version.id} tabIndex={-1} aria-selected={index === activeIndex} disabled={saving} onPointerDown={event => { if (event.pointerType === "mouse") event.preventDefault() }} onMouseEnter={() => setHighlighted(index)} onClick={() => { void choose(version) }}>
      <span className="home-favorite-option-avatar"><UmaAvatarImage avatar={version.avatar ?? ""} alt="" loading="lazy" /></span><strong><UmaName name={version.displayName} /></strong>{version.id === selectedId && <span aria-label="Current favorite">✓</span>}
    </button>)}</div>}
  </div>
}
