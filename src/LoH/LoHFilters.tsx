import { formatTrackLength } from "../formatting"
import { useEffect, useId, useRef, useState } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import { TRACK_LENGTHS, TRACK_SURFACES } from "../types/types"
import { LOH_RANK_THRESHOLDS } from "./ranks"
import { EMPTY_LOH_FILTERS, getLoHOverviewUmaIds, LOH_PHASE_LABELS } from "./overview"
import type { LoHOverviewFilters } from "./overview"
import type { LoH } from "./types"

type Option = { value: string; label: string; avatar?: string }
type Props = { events: LoH[]; filters: LoHOverviewFilters; onChange: (filters: LoHOverviewFilters) => void; filteredCount: number }

export default function LoHFilters({ events, filters, onChange, filteredCount }: Props) {
  const { versions } = useUmaDatabase()
  const [open, setOpen] = useState<keyof LoHOverviewFilters | null>(null)
  const [search, setSearch] = useState("")
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    function outside(change: PointerEvent) { if (!root.current?.contains(change.target as Node)) setOpen(null) }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [])
  const ids = [...new Set(events.flatMap(getLoHOverviewUmaIds))]
  const umaOptions: Option[] = ids.map(value => {
    const version = versions.find(item => item.id === value)
    return { value, label: version?.displayName ?? value, avatar: version?.avatar }
  }).sort((a, b) => a.label.localeCompare(b.label))
  const options = (values: readonly string[]): Option[] => values.map(value => ({ value, label: value }))
  const groups: { key: keyof LoHOverviewFilters; label: string; options: Option[] }[] = [
    { key: "lengths", label: "Length", options: TRACK_LENGTHS.map(value => ({ value, label: formatTrackLength(value) })) },
    { key: "surfaces", label: "Surface", options: options(TRACK_SURFACES) },
    { key: "racecourses", label: "Racecourse", options: options([...new Set(events.map(event => event.racecourse).filter(Boolean))].sort()) },
    { key: "ranks", label: "League Rank", options: options(LOH_RANK_THRESHOLDS.map(([rank]) => rank)) },
    { key: "phases", label: "Stage", options: Object.entries(LOH_PHASE_LABELS).map(([value, label]) => ({ value, label })) },
    { key: "extraStage", label: "Extra Stage", options: [{ value: "qualified", label: "Qualified (Top 96)" }, { value: "not-qualified", label: "Not Qualified" }, { value: "winner", label: "Winner" }, { value: "participated", label: "Participant" }] },
    { key: "umaIds", label: "Uma", options: umaOptions },
  ]
  function toggle(key: keyof LoHOverviewFilters, value: string) {
    onChange({ ...filters, [key]: filters[key].includes(value) ? filters[key].filter(item => item !== value) : [...filters[key], value] })
  }
  return <section id="loh-overview-filters" aria-label="LoH filters" className="relative z-40 rounded-xl border border-gray-700 bg-gray-950/70 p-4">
    <div ref={root} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-start">
      {groups.map(group => {
        const selected = filters[group.key]
        const label = selected.length === 0 ? "All" : selected.length === 1 ? group.options.find(option => option.value === selected[0])?.label ?? selected[0] : `${selected.length} selected`
        const visible = group.key === "umaIds" ? group.options.filter(option => option.label.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => Number(selected.includes(b.value)) - Number(selected.includes(a.value))) : group.options
        return <div key={group.key} className={`relative min-w-0 lg:w-48 ${group.key === "umaIds" ? "sm:col-span-2 lg:w-80" : ""}`} onKeyDown={change => {
          if (change.key === "Escape" && open === group.key) { change.preventDefault(); setOpen(null); change.currentTarget.querySelector("button")?.focus() }
        }}>
          <button type="button" aria-label={`${group.label} filter`} aria-expanded={open === group.key} aria-controls={`${id}-${group.key}`} onClick={() => { setOpen(open === group.key ? null : group.key); setSearch("") }} className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${selected.length ? "border-rose-500 bg-rose-600/20 text-rose-200" : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"}`}>
            <span className="min-w-0 truncate">{group.label}: {label}</span><span className="shrink-0 text-[10px]" aria-hidden="true">{open === group.key ? "▲" : "▼"}</span>
          </button>
          {open === group.key && <div id={`${id}-${group.key}`} role="group" aria-label={`${group.label} options`} className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-rose-900/60 bg-[#0a1220] p-2 shadow-2xl">
            {group.key === "umaIds" && <input aria-label="Search LoH Umas" value={search} onChange={change => setSearch(change.target.value)} placeholder="Search Uma…" className="mb-2 h-9 w-full rounded-md border border-gray-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-rose-400" />}
            {selected.length > 0 && <button type="button" onClick={() => onChange({ ...filters, [group.key]: [] })} className="mb-1 min-h-8 w-full text-left text-xs font-bold text-rose-300 hover:text-rose-100">Clear selection</button>}
            <div className="loh-scrollbar max-h-60 space-y-0.5 overflow-y-auto">
              {visible.map(option => <label key={option.value} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-200 hover:bg-rose-400/10">
                <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(group.key, option.value)} className="h-3.5 w-3.5 shrink-0 accent-rose-500" />
                {option.avatar && <UmaAvatarImage avatar={option.avatar} alt="" className="h-6 w-6 shrink-0 rounded object-contain" />}<span className="min-w-0 break-words">{option.label}</span>
              </label>)}
              {!visible.length && <p className="px-2 py-3 text-xs text-slate-400">No matching Umas.</p>}
            </div>
          </div>}
        </div>
      })}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
      <button type="button" disabled={!Object.values(filters).some(values => values.length > 0)} onClick={() => { onChange(EMPTY_LOH_FILTERS); setOpen(null); setSearch("") }} className="min-h-8 font-bold text-rose-300 hover:text-rose-100 disabled:cursor-default disabled:opacity-30">Reset filters</button>
      <p aria-live="polite">Showing <span className="font-bold text-rose-300">{filteredCount}</span> of {events.length} LoH events</p>
    </div>
  </section>
}
