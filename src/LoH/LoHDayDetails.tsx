import { useEffect, useRef, useState } from "react"
import { formatLoHNumber } from "./format"
import { getLoHLeagueScoreAtDay, getLoHMainStage, getLoHProgress, hasCompleteLoHLineup } from "./progress"
import { LOH_BRONZE_CAP } from "./scoring"
import { LOH_TICKET_CAP, LOH_TICKETS_PER_DAY } from "./constants"
import LoHRaceSetDetails, { LoHRaceSetSummary } from "./LoHRaceSetDetails"
import LoHFinishDayConfirmation from "./LoHFinishDayConfirmation"
import LoHModalFrame from "./LoHModalFrame"
import { EventChevronIcon } from "../components/EventIcons"
import type { LoH } from "./types"

function DayMetricIcon({ ticket = false }: { ticket?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-300 drop-shadow-[0_0_6px_rgba(251,113,133,0.4)]">
    {ticket ? <><path d="m3 13 10-10 3 3a3 3 0 0 0 4 4l1 1-10 10-3-3a3 3 0 0 0-4-4Z" /><path d="m8 13 5-5 3 3-5 5Z" /></>
      : <><path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 5 4M16 5h4v2a4 4 0 0 1-5 4M12 12v6M8 21h8M9 18h6v3" /></>}
  </svg>
}

type Props = {
  event: LoH
  day: number
  onClose: () => void
  onAddSet: () => void
  onEditSet: (id: string) => void
  onDeleteSet: (id: string) => void
  onFinishDay: () => void
}

export default function LoHDayDetails({ event, day, onClose, onAddSet, onEditSet, onDeleteSet, onFinishDay }: Props) {
  const [lineupRequired, setLineupRequired] = useState(false)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const panelRef = useRef<HTMLElement>(null)
  const resultsAnchorRef = useRef<HTMLElement>(null)
  const confirmationRef = useRef<HTMLDivElement>(null)
  const listScrollTop = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const history = getLoHProgress(event)
  const stage = getLoHMainStage(event, history)
  const summary = stage.days[day - 1]
  const dayLeagueScore = getLoHLeagueScoreAtDay(event, day, history)
  const active = summary.state === "active" && !event.completed
  const ticketCapacity = Math.min(LOH_TICKET_CAP, day * LOH_TICKETS_PER_DAY)
  const freeNextSet = active && history.leagueScore < LOH_BRONZE_CAP
  const selectedSet = summary.sets.find(set => set.id === selectedSetId)

  useEffect(() => {
    resultsAnchorRef.current = panelRef.current?.closest<HTMLElement>("[data-loh-results]") ?? null
    panelRef.current?.focus({ preventScroll: true })
    panelRef.current?.scrollIntoView({ block: "nearest" })
    if (listRef.current) listRef.current.scrollTop = listScrollTop.current
  }, [])
  useEffect(() => {
    if (confirmingFinish || confirmingDelete) confirmationRef.current?.scrollIntoView({ block: "nearest" })
  }, [confirmingFinish, confirmingDelete])

  function closeSet() { setSelectedSetId(null); setConfirmingDelete(false); setDeleteError("") }

  return <section ref={panelRef} tabIndex={-1} data-loh-day-details={day} aria-label={`Day ${day} details`} className="relative z-20 mx-4 pt-3 outline-none">
    {selectedSet && <LoHModalFrame title={`Day ${day} · Set #${selectedSet.setNumber}`} variant="editor" anchorRef={resultsAnchorRef} onClose={closeSet}>
      <div data-loh-set-details={selectedSet.id} className="loh-set-window relative isolate overflow-hidden rounded-xl border border-rose-400/40">
      <header className="loh-day-panel-header relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-rose-400/35 px-4 py-3">
        <h3 className="text-xl font-black italic tracking-tight text-rose-50 sm:text-2xl">Day {day} · Set #{selectedSet.setNumber}</h3>
        <button type="button" onClick={closeSet} className="loh-day-action inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-rose-50 focus-visible:outline-2 focus-visible:outline-rose-300"><span aria-hidden="true" className="rotate-180"><EventChevronIcon /></span>Back to Day {day}</button>
      </header>
      <div className="loh-day-set-row relative z-10 m-3 grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-xl border border-rose-300/35 px-3 py-2 sm:m-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><LoHRaceSetSummary set={selectedSet} polished /></div>
      <LoHRaceSetDetails event={event} set={selectedSet} showcase onEditSet={onEditSet} onDeleteSet={() => { setDeleteError(""); setConfirmingDelete(true) }} />
      {confirmingDelete && active && <div ref={confirmationRef} className="m-3 rounded-xl border border-rose-500/30 bg-slate-950 p-4" role="region" aria-label="Confirm delete race set">
        <h4 className="text-sm font-black text-white">Delete Race Set #{selectedSet.setNumber}?</h4>
        <p className="mt-2 text-xs leading-5 text-slate-400">League Score, Bronze cap, daily totals and Uma statistics will be recalculated from the remaining race history.</p>
        {deleteError && <p role="alert" className="mt-2 text-xs text-rose-300">{deleteError}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmingDelete(false)} className="min-h-10 rounded-lg border border-white/10 px-4 text-xs font-bold text-slate-300 hover:bg-white/5">Cancel</button>
          <button type="button" onClick={() => {
            try { onDeleteSet(selectedSet.id); closeSet() }
            catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "Unable to delete race set.") }
          }} className="min-h-10 rounded-lg border border-rose-500/50 bg-rose-950/70 px-4 text-xs font-black text-rose-100 hover:bg-rose-900/70">Confirm Delete Set</button>
        </div>
      </div>}
      </div>
    </LoHModalFrame>}
    <div className="loh-day-details-grid grid items-start gap-3 md:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
      <div data-loh-day-header className="loh-day-panel loh-scrollbar relative flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-2xl border border-rose-400/40">
        <header className="loh-day-panel-header relative isolate flex flex-wrap items-center justify-between gap-3 border-b border-rose-400/20 px-4 py-3">
          <div className="flex items-center gap-3"><button type="button" onClick={onClose} aria-label="Back to all days" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200/25 bg-slate-950/35 text-lg text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-rose-300/60 hover:bg-rose-950/60 focus-visible:outline-2 focus-visible:outline-rose-300">←<span className="sr-only">All days</span></button><h3 className="text-2xl font-black tracking-tight text-rose-50 sm:text-3xl">Day {day}</h3></div>
          {active && <button type="button" disabled={!stage.canAddSet} onClick={() => {
            if (hasCompleteLoHLineup(event)) { setLineupRequired(false); onAddSet() }
            else setLineupRequired(true)
          }} className="loh-day-action inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black text-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-40">+ Add Set</button>}
        </header>
        <div className="flex flex-1 flex-col p-4">
        <dl aria-label="Day progress summary" className="space-y-2">
          <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-center rounded-xl border border-rose-200/15 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <dt className="flex min-w-0 items-center gap-2 border-r border-rose-300/25 px-2 py-2 text-xs font-bold text-rose-50/90 sm:gap-3 sm:px-3 sm:text-sm"><DayMetricIcon /><span>League Score</span></dt>
            <dd className="flex flex-wrap items-baseline gap-x-1.5 px-2 py-2 text-lg font-black tabular-nums text-white sm:px-3 sm:text-xl">{formatLoHNumber(dayLeagueScore)} <span className="text-xs text-rose-300">PT</span></dd>
          </div>
          <div aria-live="polite" className="grid min-h-11 grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-center rounded-xl border border-rose-200/15 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <dt className="flex min-w-0 items-center gap-2 border-r border-rose-300/25 px-2 py-2 text-xs font-bold text-rose-50/90 sm:gap-3 sm:px-3 sm:text-sm"><DayMetricIcon ticket /><span>Tickets</span></dt>
            <dd className="min-w-0 px-2 py-2 sm:px-3"><span className="flex flex-wrap items-baseline gap-x-1.5 text-lg font-black text-rose-50 sm:text-xl">{freeNextSet ? "FREE" : <><span className="whitespace-nowrap tabular-nums">{summary.ticketsRemaining}/{ticketCapacity}</span><span className="text-[10px] font-semibold text-rose-200/65">remaining</span></>}</span>
              {freeNextSet && <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-400">{formatLoHNumber(LOH_BRONZE_CAP - history.leagueScore)} PT until tickets are required</span>}
            </dd>
          </div>
        </dl>
        {active && !stage.canAddSet && <p role="status" className="mt-2 text-xs leading-5 text-rose-200">No League Tickets remaining for Day {day}. Finish the day to continue.</p>}
        {lineupRequired && <p role="alert" className="mt-2 text-xs leading-5 text-rose-200">Complete your current lineup in Edit LoH before adding a set.</p>}
        <section aria-label="Current day status" className="mt-auto pt-4">
          <div className="border-t border-rose-200/15 pt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-300/90">Current Status</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 basis-40 items-center gap-2.5 rounded-xl border border-rose-300/20 bg-rose-300/[0.055] px-3 py-2.5">
              {active ? <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-dotted border-rose-300/80" /> : <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-300" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="8" /><path d="m6 10 2.5 2.5L14 7" /></svg>}
              <h4 className="text-xs font-bold leading-5 text-rose-50 sm:text-sm">Day {day} {active ? "in progress" : summary.state}</h4>
            </div>
            {active && !confirmingFinish && <button type="button" onClick={() => setConfirmingFinish(true)} className="loh-day-action ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300">Finish Day {day}<span aria-hidden="true" className="flex -space-x-2"><EventChevronIcon /><EventChevronIcon /></span></button>}
            </div>
          </div>
          {confirmingFinish && <div ref={confirmationRef}><LoHFinishDayConfirmation day={day} onClose={() => setConfirmingFinish(false)} onConfirm={onFinishDay} /></div>}
        </section>
        </div>
      </div>
      <div ref={listRef} data-loh-day-set-list role="region" aria-label={`Day ${day} race sets`} tabIndex={0} onScroll={change => { listScrollTop.current = change.currentTarget.scrollTop }} className="loh-day-panel loh-scrollbar relative h-[300px] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-rose-400/40 p-2.5 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-rose-400/50">
        {summary.sets.length ? <div className="relative space-y-1">{summary.sets.map(set => <button key={set.id} type="button" data-loh-open-set={set.id} aria-label={`View Race Set ${set.setNumber}`} onClick={() => setSelectedSetId(set.id)} className="loh-day-set-list-row loh-day-set-row grid min-h-12 w-full items-center gap-x-1.5 rounded-xl border border-rose-300/25 px-3 py-1.5 text-left transition hover:border-rose-300/60 focus-visible:outline-2 focus-visible:outline-rose-300"><LoHRaceSetSummary set={set} polished /></button>)}</div>
          : <p className="py-6 text-center text-xs leading-6 text-slate-400">No sets recorded.</p>}
      </div>
    </div>
  </section>
}
