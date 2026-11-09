import { useState } from "react"
import "./LoH.css"
import type { Dispatch, SetStateAction } from "react"
import EventPageHeader from "../components/EventPageHeader"
import { useIsMobile } from "../responsive/useIsMobile"
import type { LoH } from "./types"
import LoHCard from "./LoHCard"
import LoHCardMobile from "./LoHCardMobile"
import LoHCompactCard from "./LoHCompactCard"
import LoHOverviewStats from "./LoHOverviewStats"
import LoHOverviewControls from "./LoHOverviewControls"
import LoHFilters from "./LoHFilters"
import { useLoHViewMode } from "./useLoHViewMode"
import { EMPTY_LOH_FILTERS, filterLoHEvents, paginateLoHEvents, sortLoHEvents } from "./overview"
import type { LoHOverviewFilters, LoHSortMode } from "./overview"
import LoHEventForm from "./LoHEventForm"
import LoHEventModal from "./LoHEventModal"
import LoHModalFrame from "./LoHModalFrame"
import LoHNotesModal from "./LoHNotesModal"
import { createLoHEvent, updateLoHEvent } from "./lohData"
import type { LoHEventDetails } from "./types"

type Props = { lohs: LoH[]; setLohs: Dispatch<SetStateAction<LoH[]>>; selectedEvent: LoH | null; onOpen: (number: number) => void; onClose: () => void; profileId?: string | null; initialFocus?: { day: number | null; tab: "results" | "umas" } }

export default function LeagueOfHeroesPage({ lohs, setLohs, selectedEvent, onOpen, onClose, profileId = null, initialFocus }: Props) {
  const isMobile = useIsMobile()
  const [view, setView] = useLoHViewMode(profileId)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<LoHOverviewFilters>(EMPTY_LOH_FILTERS)
  const [sort, setSort] = useState<LoHSortMode>("number-desc")
  const [currentPage, setCurrentPage] = useState(1)
  const filtered = filterLoHEvents(lohs, filters)
  const pagination = paginateLoHEvents(sortLoHEvents(filtered, sort), currentPage)
  const filterCount = Object.values(filters).filter(values => values.length > 0).length
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notesId, setNotesId] = useState<string | null>(null)
  const editingEvent = lohs.find(event => event.id === editingId)
  const deletingEvent = lohs.find(event => event.id === deletingId)
  const notesEvent = lohs.find(event => event.id === notesId)

  function handleCreate(details: LoHEventDetails) {
    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    setLohs(current => [...current, createLoHEvent(current, details, id, timestamp)])
    setShowCreate(false)
    setCurrentPage(1)
  }

  function handleEdit(details: LoHEventDetails) {
    const timestamp = new Date().toISOString()
    const logId = crypto.randomUUID()
    setLohs(current => current.map(event => event.id === editingId ? updateLoHEvent(event, current, details, timestamp, logId) : event))
  }

  function handleDelete() {
    setCurrentPage(paginateLoHEvents(sortLoHEvents(filterLoHEvents(lohs.filter(event => event.id !== deletingId), filters), sort), pagination.page).page)
    setLohs(current => current.filter(event => event.id !== deletingId))
    if (selectedEvent?.id === deletingId) onClose()
    setDeletingId(null)
  }

  return (
    <main className="loh-overview relative space-y-5" aria-labelledby="loh-title">
      <EventPageHeader title="League of Heroes" accent="loh" mobile={isMobile} titleId="loh-title" />
      <LoHOverviewStats events={lohs} />
      <LoHOverviewControls mobile={isMobile} onAdd={() => setShowCreate(true)} filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen(current => !current)} filterCount={filterCount}
        sort={sort} onSort={next => { setSort(next); setCurrentPage(1) }} page={pagination.page} totalPages={pagination.totalPages} onPage={setCurrentPage} view={view} onView={setView} />
      {filtersOpen && <LoHFilters events={lohs} filters={filters} onChange={next => { setFilters(next); setCurrentPage(1) }} filteredCount={filtered.length} />}
      {lohs.length === 0 ? <div className="py-8 text-center">
      </div> : !filtered.length ? <div className="py-8 text-center">
        <p className="text-sm font-semibold text-slate-300">No League of Heroes events match the selected filters.</p>
        <button type="button" onClick={() => { setFilters(EMPTY_LOH_FILTERS); setCurrentPage(1) }} className="mt-3 min-h-10 text-xs font-bold text-rose-300 hover:text-rose-100">Reset filters</button>
      </div> : <section aria-label="League of Heroes events" data-loh-view={view} className={view === "compact" && !isMobile ? "loh-scrollbar overflow-x-auto pb-1" : "space-y-3"}>
        {view === "compact" && !isMobile && <div className="loh-compact-grid mb-2 rounded-xl border border-rose-950/70 bg-gray-950/75 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-gray-500" aria-hidden="true">
          {["LoH", "Name", "Racecourse", "Length", "League Score", "League Rank", "Overall Rank", "Umas", "Actions"].map(label => <span key={label}>{label}</span>)}
        </div>}
        {pagination.events.map(event => view === "compact"
          ? <LoHCompactCard key={event.id} event={event} mobile={isMobile} onOpen={() => onOpen(event.number)} onEdit={() => setEditingId(event.id)} onNotes={() => setNotesId(event.id)} onDelete={() => setDeletingId(event.id)} />
          : isMobile
            ? <LoHCardMobile key={event.id} event={event} onOpen={() => onOpen(event.number)} onEdit={() => setEditingId(event.id)} onNotes={() => setNotesId(event.id)} onDelete={() => setDeletingId(event.id)} />
            : <LoHCard key={event.id} event={event} onOpen={() => onOpen(event.number)} onEdit={() => setEditingId(event.id)} onNotes={() => setNotesId(event.id)} onDelete={() => setDeletingId(event.id)} />)}
      </section>}
      {showCreate && <LoHEventForm lohs={lohs} onCreate={handleCreate} onClose={() => setShowCreate(false)} />}
      {editingEvent && <LoHEventForm key={editingEvent.id} initialEvent={editingEvent} lohs={lohs} onCreate={handleEdit} onClose={() => setEditingId(null)} />}
      {notesEvent && <LoHNotesModal key={notesEvent.id} event={notesEvent} onClose={() => setNotesId(null)}
        onSave={notes => setLohs(current => current.map(event => event.id === notesEvent.id ? { ...event, notes } : event))} />}
      {deletingEvent && <LoHModalFrame title={`Delete LOH${deletingEvent.number}?`} onClose={() => setDeletingId(null)}>
        <div className="p-6 sm:p-8">
          <h3 className="pr-10 text-xl font-black text-white">Delete LOH{deletingEvent.number}?</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">Delete {deletingEvent.name || `League of Heroes #${deletingEvent.number}`} and its recorded results?</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setDeletingId(null)} className="min-h-11 rounded-lg border border-white/10 px-5 text-sm font-bold text-slate-300 hover:bg-white/5">Cancel</button>
            <button type="button" onClick={handleDelete} className="min-h-11 rounded-lg border border-rose-500 bg-rose-600/25 px-5 text-sm font-black text-rose-100 hover:bg-rose-600/40">Delete</button>
          </div>
        </div>
      </LoHModalFrame>}
      {selectedEvent && <LoHEventModal key={selectedEvent.id} event={selectedEvent} lohs={lohs} setLohs={setLohs} initialFocus={initialFocus} onClose={onClose} />}
    </main>
  )
}
