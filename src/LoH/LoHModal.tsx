import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import type { LoH, LoHExtraStageResult, LoHRaceSetInput } from "./types"
import { getTrackImage } from "../data/trackData"
import LoHRaceConditions from "./components/LoHRaceConditions"
import LoHModalFrame from "./LoHModalFrame"
import LoHResults from "./LoHResults"
import LoHUmas from "./LoHUmas"
import LoHLog from "./LoHLog"
import AddLoHResultsModal from "./AddLoHResultsModal"
import LoHDayDetails from "./LoHDayDetails"
import LoHMainStageStatus from "./LoHMainStageStatus"
import LoHExtraStageResultEditor from "./LoHExtraStageResultEditor"
import { LOH_MAIN_STAGE_DAYS } from "./constants"
import { deleteLoHRaceSet, getLoHMainStage, getLoHProgress } from "./progress"

type Props = { event: LoH; onClose: () => void; onSaveRaceSet: (input: LoHRaceSetInput) => void; onDeleteRaceSet: (id: string) => void; onFinishDay: (day: number) => void; onEnd: () => void; onConfirmRank: (rank: number) => void; onRegisterExtraStage: (ids: string[]) => void; onAddExtraStageCandidate: () => void; onSaveExtraStage: (input: LoHExtraStageResult) => void; initialFocus?: { day: number | null; tab: "results" | "umas" } }

const tabIcons = {
  results: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>,
  umas: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 14c3 0 5 1.5 5.5 5" /></svg>,
  log: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l3 3v15H6ZM15 3v4h4M9 11h6M9 15h6" /></svg>,
}

export default function LoHModal({ event, onClose, onSaveRaceSet, onDeleteRaceSet, onFinishDay, onEnd, onConfirmRank, onRegisterExtraStage, onAddExtraStageCandidate, onSaveExtraStage, initialFocus }: Props) {
  const [activeTab, setActiveTab] = useState<"results" | "umas" | "log">(initialFocus?.tab ?? "results")
  const [selectedDay, setSelectedDay] = useState<number | null>(initialFocus?.day ?? null)
  const [resultForm, setResultForm] = useState<{ id?: string; day?: number } | null>(null)
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null)
  const [endingEvent, setEndingEvent] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const dayViewRef = useRef<HTMLDivElement>(null)
  const dayAnimationRef = useRef<Animation | null>(null)
  const umasRef = useRef<HTMLDivElement>(null)
  const scrollTarget = useRef<"status" | "umas" | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const stage = getLoHMainStage(event)
  const deletingSet = getLoHProgress(event).raceSets.find(set => set.id === deletingSetId)
  const trackImage = getTrackImage(event.racecourse)
  useEffect(() => {
    const target = scrollTarget.current === "status" && activeTab === "results" ? statusRef.current : scrollTarget.current === "umas" && activeTab === "umas" ? umasRef.current : null
    if (target) { scrollTarget.current = null; target.scrollIntoView({ block: "nearest" }) }
  }, [activeTab, event])
  useEffect(() => () => { dayAnimationRef.current?.cancel() }, [activeTab])

  async function showDay(day: number | null) {
    const view = dayViewRef.current
    const currentStyle = view ? getComputedStyle(view) : null
    const opacity = currentStyle?.opacity ?? "1"
    const transform = currentStyle?.transform ?? "none"
    dayAnimationRef.current?.cancel()
    dayAnimationRef.current = null
    if (!view || typeof view.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSelectedDay(day)
      return
    }
    const direction = day === null ? -1 : 1
    const outgoing = view.animate([
      { opacity, transform },
      { opacity: 0, transform: `translateX(${-direction * 8}px)` },
    ], { duration: 100, easing: "ease-in", fill: "forwards" })
    dayAnimationRef.current = outgoing
    try {
      await outgoing.finished
      if (dayViewRef.current !== view) { outgoing.cancel(); return }
      flushSync(() => setSelectedDay(day))
      const incoming = view.animate([
        { opacity: 0, transform: `translateX(${direction * 12}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ], { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" })
      outgoing.cancel()
      dayAnimationRef.current = incoming
      await incoming.finished
      if (dayAnimationRef.current === incoming) dayAnimationRef.current = null
    } catch {
      // Cancelling a transition on another click, tab change or close is expected.
      outgoing.cancel()
    }
  }

  function showResultsStatus() { scrollTarget.current = "status"; setActiveTab("results"); setSelectedDay(null) }

  function editSet(id: string) {
    const set = event.raceSets?.find(item => item.id === id)
    if (set && !event.completed && stage.days[set.day - 1].state === "active") {
      setSelectedDay(set.day)
      setActiveTab("results")
      setResultForm({ id, day: set.day })
    }
  }

  function deleteSet(id: string) {
    const set = event.raceSets?.find(item => item.id === id)
    if (set && !event.completed && stage.days[set.day - 1].state === "active") { setDeleteError(""); setDeletingSetId(id) }
  }

  const resultEditor = resultForm ? <LoHModalFrame key={resultForm.id ?? "new"} title={resultForm.id ? "Edit Race Results" : "Add Race Results"} variant="editor" anchorRef={resultsRef} fitContent onClose={() => setResultForm(null)}>
    <AddLoHResultsModal event={event} initialSet={event.raceSets?.find(set => set.id === resultForm.id)} initialDay={resultForm.day} onSave={input => { onSaveRaceSet(input); setSelectedDay(input.day) }} onClose={() => setResultForm(null)} />
  </LoHModalFrame> : null

  return (
    <LoHModalFrame title={`LOH${event.number}: ${event.name}`} onClose={onClose}>
      <div className="relative h-[190px] overflow-hidden">
        {trackImage && <img src={trackImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-rose-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20" />
        <div className="absolute inset-0">
          <div className="absolute left-5 right-16 top-6 min-w-0 sm:left-7 sm:right-[42%]">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200/90"><svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>League of Heroes</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">LOH{event.number}</p>
            <h3 className="mt-1 line-clamp-2 max-w-[55%] break-words text-lg font-bold leading-tight text-white/95 sm:max-w-none sm:text-2xl">{event.name}</h3>
          </div>
          <div className="absolute bottom-6 right-5 max-w-[48%] text-right sm:right-7 sm:max-w-[42%]">
            <p className="truncate text-2xl font-semibold italic tracking-tight text-white/95 sm:text-3xl">{event.racecourse || "Racecourse not recorded"}</p>
            <p className="mt-1 text-base font-medium text-rose-100/80 sm:text-lg">{event.surface ?? "\u2014"} {event.distance === null ? "\u2014" : `${event.distance}m`}</p>
          </div>
        </div>
      </div>
      <div className="px-3 py-3 md:px-5"><LoHRaceConditions event={event} /></div>
      <nav aria-label="LoH event views" className="relative grid grid-cols-3 border-b border-white/[0.06] px-3">
        {([{ id: "results", label: "Results" }, { id: "umas", label: "Umas" }, { id: "log", label: "Log" }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex h-[50px] items-center justify-center gap-2 text-sm font-bold transition focus-visible:outline-none focus-visible:text-rose-100 ${activeTab === tab.id ? "text-rose-300 after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-20 after:-translate-x-1/2 after:bg-rose-400 after:shadow-[0_0_10px_rgba(244,63,94,0.35)] after:content-['']" : "text-slate-400 hover:text-white"}`}>{tabIcons[tab.id]}{tab.label}</button>)}
      </nav>
      {activeTab === "results" && <>
        <LoHResults ref={resultsRef} dayViewRef={dayViewRef} event={event} onOpenDay={day => { const state = stage.days[day - 1]?.state; if (state === "active" || state === "completed") void showDay(day) }}>
          {selectedDay !== null ? <LoHDayDetails key={`day-${selectedDay}`} event={event} day={selectedDay} onClose={() => { void showDay(null) }} onAddSet={() => { if (stage.canAddSet && stage.activeDay === selectedDay) setResultForm({ day: selectedDay }) }} onEditSet={editSet} onDeleteSet={id => { deleteLoHRaceSet(event, id); onDeleteRaceSet(id) }} onFinishDay={() => { onFinishDay(selectedDay); if (selectedDay === LOH_MAIN_STAGE_DAYS) showResultsStatus() }} /> : undefined}
        </LoHResults>
        <div ref={statusRef}><LoHMainStageStatus event={event} onProceed={() => { scrollTarget.current = "umas"; setActiveTab("umas") }} onEnd={() => { if (event.extraStage?.result) onEnd(); else setEndingEvent(true) }}
          onConfirmRank={rank => { onConfirmRank(rank); showResultsStatus() }} />
          {event.extraStage && !event.extraStage.result && !event.completed && <LoHExtraStageResultEditor event={event} onComplete={input => { onSaveExtraStage(input); statusRef.current?.closest("dialog")?.scrollTo({ top: 0 }) }} />}
        </div>
      </>}
      {activeTab === "umas" && <div ref={umasRef}><LoHUmas event={event} onRegisterExtraStage={ids => { onRegisterExtraStage(ids); showResultsStatus() }} onAddExtraStageCandidate={onAddExtraStageCandidate} /></div>}
      {activeTab === "log" && <LoHLog event={event} onEditSet={editSet} onDeleteSet={deleteSet} />}
      {resultEditor}
      {deletingSet && <LoHModalFrame title={`Delete Race Set #${deletingSet.setNumber}?`} onClose={() => setDeletingSetId(null)}>
        <div className="p-6 sm:p-8">
          <h3 className="pr-12 text-xl font-black text-white">Delete Race Set #{deletingSet.setNumber}?</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">League Score, Bronze cap, daily totals and Uma statistics will be recalculated from the remaining race history.</p>
          {deleteError && <p role="alert" className="mt-3 text-sm text-rose-300">{deleteError}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setDeletingSetId(null)} className="min-h-11 rounded-lg border border-white/10 px-5 text-sm font-bold text-slate-300 hover:bg-white/5">Cancel</button>
            <button type="button" onClick={() => {
              try { deleteLoHRaceSet(event, deletingSet.id); onDeleteRaceSet(deletingSet.id); setDeletingSetId(null) }
              catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "Unable to delete race set.") }
            }} className="min-h-11 rounded-lg border border-rose-500 bg-rose-600/25 px-5 text-sm font-black text-rose-100 hover:bg-rose-600/40">Delete</button>
          </div>
        </div>
      </LoHModalFrame>}
      {endingEvent && <LoHModalFrame title="End LoH?" onClose={() => setEndingEvent(false)}><div className="p-6 sm:p-8">
        <h3 className="pr-12 text-xl font-black text-white">End LoH?</h3><p className="mt-3 text-sm text-slate-400">Main Stage is complete. All recorded days, sets and lineups will be preserved.</p>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEndingEvent(false)} className="min-h-11 rounded-lg border border-white/10 px-5 text-sm font-bold text-slate-300">Cancel</button>
          <button type="button" onClick={() => { onEnd(); setEndingEvent(false) }} className="min-h-11 rounded-lg border border-rose-500 bg-rose-600/25 px-5 text-sm font-black text-rose-100">End LoH</button></div>
      </div></LoHModalFrame>}
    </LoHModalFrame>
  )
}
